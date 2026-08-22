"""
Pulls additional real training clips from the FULL Watkins Marine Mammal
Sound Database ("Full Cuts", ~15,000 clips / 51+ species) hosted on
archive.org, rather than the curated 32-species/1,697-row HuggingFace
mirror used by fetch_data.py (which only had 43 NARW / 51 humpback /
40 fin / 14 minke training clips - thin, especially for NARW itself).

The archive is a single 6.2GB ZIP. Rather than download all of it, this
downloads just the ZIP central directory (the last few MB, via an HTTP
range request) to get the full file listing without pulling the whole
archive, then range-fetches only the ~200-per-species files we want.

Critical safety property: every clip already in data/clips_test.parquet
(the frozen 37-clip held-out set) is excluded from this fetch by
filename AND by audio-byte MD5 hash - both the HF mirror and this
archive.org copy are repackagings of the same underlying Watkins
recordings, so a naive fetch would silently leak test clips into
training. Output is additive only: data/clips_train.parquet (used by
train.py for the currently-shipped model) is never modified by this
script - new clips go to data/clips_train_expanded.parquet instead.
"""

import io
import json
import pathlib
import struct
import zlib
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed

import pandas as pd
import requests

DATA_DIR = pathlib.Path(__file__).parent.parent / "data"

ZIP_ITEM_URL = "https://archive.org/download/watkins-marine-mammal-sound-database-full-cuts/Watkins_Marine_Mammal_Sound_Database_full_cuts.zip"
TARGET_FOLDERS = {
    "Fin_FinbackWhale": "fin",
    "HumpbackWhale": "humpback",
    "MinkeWhale": "minke",
    "NorthernRightWhale": "NARW",
}
PER_SPECIES_CAP = 200
CENTRAL_DIR_TAIL_BYTES = 5_000_000
LOCAL_HEADER_PADDING = 4096


def _resolve_zip_url() -> tuple[str, int]:
    head = requests.head(ZIP_ITEM_URL, allow_redirects=True, timeout=30)
    head.raise_for_status()
    return head.url, int(head.headers["content-length"])


def _list_target_entries(zip_url: str, total_size: int) -> list[dict]:
    """Fetch just the ZIP central directory (tail of the file) and parse
    it with the stdlib zipfile module via a virtual file object, so we
    get the full file listing + byte offsets without downloading 6.2GB."""
    import zipfile

    start = total_size - CENTRAL_DIR_TAIL_BYTES
    r = requests.get(zip_url, headers={"Range": f"bytes={start}-{total_size - 1}"}, timeout=60)
    r.raise_for_status()
    tail = r.content

    class VirtualZipFile(io.RawIOBase):
        def __init__(self, tail_bytes, tail_start, total_size):
            self.tail_bytes = tail_bytes
            self.tail_start = tail_start
            self.total_size = total_size
            self.pos = 0

        def seekable(self):
            return True

        def readable(self):
            return True

        def seek(self, offset, whence=0):
            if whence == 0:
                self.pos = offset
            elif whence == 1:
                self.pos += offset
            elif whence == 2:
                self.pos = self.total_size + offset
            return self.pos

        def tell(self):
            return self.pos

        def readinto(self, b):
            n = len(b)
            s, e = self.pos, min(self.pos + n, self.total_size)
            if s >= self.tail_start:
                chunk = self.tail_bytes[s - self.tail_start : e - self.tail_start]
            elif e <= self.tail_start:
                chunk = b"\x00" * (e - s)
            else:
                chunk = b"\x00" * (self.tail_start - s) + self.tail_bytes[0 : e - self.tail_start]
            b[: len(chunk)] = chunk
            self.pos += len(chunk)
            return len(chunk)

    vf = VirtualZipFile(tail, start, total_size)
    zf = zipfile.ZipFile(io.BufferedReader(vf, buffer_size=1024 * 1024))

    entries = []
    for zi in zf.infolist():
        parts = zi.filename.split("/")
        if len(parts) < 2 or not zi.filename.lower().endswith(".wav"):
            continue
        if parts[1] not in TARGET_FOLDERS:
            continue
        entries.append(
            {
                "basename": parts[-1],
                "group": TARGET_FOLDERS[parts[1]],
                "header_offset": zi.header_offset,
                "compress_size": zi.compress_size,
                "file_size": zi.file_size,
                "compress_type": zi.compress_type,
            }
        )
    return entries


def _fetch_one(zip_url: str, entry: dict) -> tuple[str, bytes | None, str | None]:
    start = entry["header_offset"]
    end = start + 30 + LOCAL_HEADER_PADDING + entry["compress_size"]
    r = requests.get(zip_url, headers={"Range": f"bytes={start}-{end}"}, timeout=60)
    r.raise_for_status()
    buf = r.content
    if buf[:4] != b"PK\x03\x04":
        return entry["basename"], None, "bad local header signature"

    fname_len, extra_len = struct.unpack("<HH", buf[26:30])
    data_start = 30 + fname_len + extra_len
    compressed = buf[data_start : data_start + entry["compress_size"]]
    if len(compressed) != entry["compress_size"]:
        return entry["basename"], None, "short read"

    raw = compressed if entry["compress_type"] == 0 else zlib.decompress(compressed, -15)
    if len(raw) != entry["file_size"]:
        return entry["basename"], None, "size mismatch after decompress"
    return entry["basename"], raw, None


def main() -> None:
    with open(DATA_DIR / "test_manifest.json") as f:
        test_basenames = {row["path"] for row in json.load(f)}

    zip_url, total_size = _resolve_zip_url()
    print(f"resolved zip url, total size {total_size / 1e9:.2f} GB")

    entries = _list_target_entries(zip_url, total_size)
    print(f"target-species wav entries in archive: {len(entries)}")

    candidates = [e for e in entries if e["basename"] not in test_basenames]
    print(f"after excluding {len(entries) - len(candidates)} filename matches to the frozen test set")

    selected = []
    for group in TARGET_FOLDERS.values():
        group_items = sorted([e for e in candidates if e["group"] == group], key=lambda x: x["basename"])
        selected.extend(group_items[:PER_SPECIES_CAP])
    print("selected per group (pre hash-dedup):", Counter(e["group"] for e in selected))

    results: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(_fetch_one, zip_url, e): e for e in selected}
        for fut in as_completed(futures):
            entry = futures[fut]
            basename, raw, err = fut.result()
            if err:
                print(f"WARNING: fetch failed for {basename}: {err}")
                continue
            results[basename] = {"group": entry["group"], "bytes": raw}
    print(f"fetched {len(results)}/{len(selected)} clips successfully")

    train_df = pd.read_parquet(DATA_DIR / "clips_train.parquet")
    test_df = pd.read_parquet(DATA_DIR / "clips_test.parquet")
    existing_hashes = set()
    import hashlib

    for df in (train_df, test_df):
        for a in df["audio"]:
            existing_hashes.add(hashlib.md5(a["bytes"]).hexdigest())

    rows = []
    dupe_count = 0
    for basename, item in results.items():
        h = hashlib.md5(item["bytes"]).hexdigest()
        if h in existing_hashes:
            dupe_count += 1
            continue
        rows.append({"audio": {"bytes": item["bytes"], "path": basename}, "group": item["group"]})

    print(f"hash-level duplicates vs existing train+test excluded: {dupe_count}")
    print(f"final new clips: {len(rows)}")
    print(Counter(r["group"] for r in rows))

    expanded = pd.DataFrame(rows)
    expanded.to_parquet(DATA_DIR / "clips_train_expanded.parquet")
    print(f"wrote {DATA_DIR / 'clips_train_expanded.parquet'}")


if __name__ == "__main__":
    main()
