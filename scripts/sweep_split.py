"""
PRD_SWEEP.md Setup step 1: carve a validation split out of
data/clips_train.parquet ONLY, for use by the hyperparameter/feature
sweep. Never reads or splits data/clips_test.parquet - that file stays
reserved for the single, final verify.py run at the end of the sweep.

Split is stratified by `group` (NARW/humpback/fin/minke) so each fold
keeps the same class balance as the full training set. Fixed
random_state so every sweep iteration scores candidate configs against
the exact same validation clips (apples-to-apples comparison).
"""

import hashlib
import json
import pathlib

import pandas as pd
from sklearn.model_selection import train_test_split

DATA_DIR = pathlib.Path(__file__).parent.parent / "data"
OUTPUTS_DIR = pathlib.Path(__file__).parent.parent / "outputs"

VAL_FRACTION = 0.2
RANDOM_STATE = 42


def _hash(b: bytes) -> str:
    return hashlib.md5(b).hexdigest()


def make_split() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Returns (train_fold_df, val_fold_df), both carved out of
    clips_train.parquet only. Used by sweep.py for every iteration."""
    train_df = pd.read_parquet(DATA_DIR / "clips_train.parquet").reset_index(drop=True)
    train_idx, val_idx = train_test_split(
        train_df.index,
        test_size=VAL_FRACTION,
        stratify=train_df["group"],
        random_state=RANDOM_STATE,
    )
    return (
        train_df.loc[train_idx].reset_index(drop=True),
        train_df.loc[val_idx].reset_index(drop=True),
    )


def verify_and_log_split() -> dict:
    """Real leakage check: val fold must have zero audio-hash overlap
    with data/clips_test.parquet, and the train/val folds must not
    overlap each other. Writes outputs/sweep_val_manifest.json."""
    train_fold, val_fold = make_split()
    test_df = pd.read_parquet(DATA_DIR / "clips_test.parquet")

    train_hashes = set(train_fold["audio"].apply(lambda a: _hash(a["bytes"])))
    val_hashes = set(val_fold["audio"].apply(lambda a: _hash(a["bytes"])))
    test_hashes = set(test_df["audio"].apply(lambda a: _hash(a["bytes"])))

    manifest = {
        "val_fraction": VAL_FRACTION,
        "random_state": RANDOM_STATE,
        "n_train_fold": len(train_fold),
        "n_val_fold": len(val_fold),
        "train_fold_group_counts": train_fold["group"].value_counts().to_dict(),
        "val_fold_group_counts": val_fold["group"].value_counts().to_dict(),
        "val_fold_paths": [row["path"] for row in val_fold["audio"]],
        "overlap_val_vs_test_hashes": len(val_hashes & test_hashes),
        "overlap_trainfold_vs_test_hashes": len(train_hashes & test_hashes),
        "overlap_trainfold_vs_valfold_hashes": len(train_hashes & val_hashes),
    }
    OUTPUTS_DIR.mkdir(exist_ok=True)
    with open(OUTPUTS_DIR / "sweep_val_manifest.json", "w") as f:
        json.dump(manifest, f, indent=2, default=str)

    return manifest


if __name__ == "__main__":
    m = verify_and_log_split()
    print(json.dumps(m, indent=2, default=str))
    assert m["overlap_val_vs_test_hashes"] == 0, "LEAKAGE: val fold overlaps with test set!"
    assert m["overlap_trainfold_vs_test_hashes"] == 0, "LEAKAGE: train fold overlaps with test set!"
    assert m["overlap_trainfold_vs_valfold_hashes"] == 0, "BUG: train/val folds overlap!"
    print("\nPASS: validation split created from training data only, zero overlap with held-out test set.")
