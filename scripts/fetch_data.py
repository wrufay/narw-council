"""
Downloads the Watkins Marine Mammal Sound Database (via the HuggingFace
`confit/wmms-parquet` mirror, since the original WHOI site was down for
maintenance at the time this was written) and extracts just the four
species this classifier cares about into slim, repo-friendly parquet
files: data/clips_train.parquet and data/clips_test.parquet.

The HF dataset ships its own train/test split (1357/340 rows) - we use
that split as-is rather than re-splitting, so "test" here means clips
this project's training code has never touched.

Usage: python scripts/fetch_data.py
"""

import pathlib

import pandas as pd
import requests

RAW_DIR = pathlib.Path(__file__).parent.parent / "data" / "raw"
OUT_DIR = pathlib.Path(__file__).parent.parent / "data"

TARGET_SPECIES = {
    "Northern_Right_Whale": "NARW",
    "Humpback_Whale": "humpback",
    "Fin,_Finback_Whale": "fin",
    "Minke_Whale": "minke",
}

DATASET = "confit/wmms-parquet"


def _shard_urls() -> list[dict]:
    resp = requests.get(
        f"https://datasets-server.huggingface.co/parquet?dataset={DATASET}", timeout=30
    )
    resp.raise_for_status()
    return resp.json()["parquet_files"]


def _download(url: str, dest: pathlib.Path) -> None:
    if dest.exists():
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=600) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)


def main() -> None:
    shards = _shard_urls()

    frames = {"train": [], "test": []}
    for shard in shards:
        split = shard["split"]
        dest = RAW_DIR / f"{split}-{shard['filename']}"
        _download(shard["url"], dest)
        df = pd.read_parquet(dest)
        df = df[df["species"].isin(TARGET_SPECIES.keys())].copy()
        df["group"] = df["species"].map(TARGET_SPECIES)
        frames[split].append(df)

    train_df = pd.concat(frames["train"], ignore_index=True)
    test_df = pd.concat(frames["test"], ignore_index=True)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    train_df.to_parquet(OUT_DIR / "clips_train.parquet")
    test_df.to_parquet(OUT_DIR / "clips_test.parquet")

    print("train:", train_df["group"].value_counts().to_dict())
    print("test:", test_df["group"].value_counts().to_dict())


if __name__ == "__main__":
    main()
