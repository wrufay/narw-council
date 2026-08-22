"""
Trains the two independent classifiers (contour-shape, LBP-texture)
on data/clips_train.parquet, and never touches data/clips_test.parquet
(that split is reserved for verify.py). Run scripts/fetch_data.py first.
"""

import io
import json
import pathlib

import joblib
import librosa
import numpy as np
import pandas as pd
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from features import extract_all

DATA_DIR = pathlib.Path(__file__).parent / "data"
MODELS_DIR = pathlib.Path(__file__).parent / "models"
OUTPUTS_DIR = pathlib.Path(__file__).parent / "outputs"


def _write_test_manifest() -> None:
    """Task 1 artifact: an explicit list of which clips are test-only,
    generated from the held-out split - train.py never reads this file
    or clips_test.parquet, which is what keeps the split honest.
    Written to outputs/ (not data/, which is gitignored/regenerable)
    so it's actually inspectable in the repo."""
    test_df = pd.read_parquet(DATA_DIR / "clips_test.parquet")
    manifest = [
        {"path": row["audio"]["path"], "species": row["species"], "group": row["group"]}
        for _, row in test_df.iterrows()
    ]
    OUTPUTS_DIR.mkdir(exist_ok=True)
    with open(OUTPUTS_DIR / "test_manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"wrote test manifest: {len(manifest)} held-out clips")


def _load_features(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    contour_rows, lbp_rows, labels = [], [], []
    for _, row in df.iterrows():
        y, sr = librosa.load(io.BytesIO(row["audio"]["bytes"]), sr=None, mono=True)
        feats = extract_all(y, sr)
        contour_rows.append(feats["contour"])
        lbp_rows.append(feats["lbp"])
        labels.append(1 if row["group"] == "NARW" else 0)
    return np.vstack(contour_rows), np.vstack(lbp_rows), np.array(labels)


def train_and_save(train_df: pd.DataFrame, output_path: pathlib.Path) -> None:
    print(f"training on {len(train_df)} clips (never reads clips_test.parquet)")

    X_contour, X_lbp, y = _load_features(train_df)

    contour_scaler = StandardScaler().fit(X_contour)
    lbp_scaler = StandardScaler().fit(X_lbp)
    X_contour_s = contour_scaler.transform(X_contour)
    X_lbp_s = lbp_scaler.transform(X_lbp)

    contour_model = SVC(kernel="rbf", C=1.0, probability=True, random_state=0)
    lbp_model = SVC(kernel="rbf", C=1.0, probability=True, random_state=0)

    contour_cv = cross_val_score(contour_model, X_contour_s, y, cv=5).mean()
    lbp_cv = cross_val_score(lbp_model, X_lbp_s, y, cv=5).mean()
    print(f"5-fold CV accuracy (training set only, not the real reported number) - "
          f"contour: {contour_cv:.3f}, lbp: {lbp_cv:.3f}")

    contour_model.fit(X_contour_s, y)
    lbp_model.fit(X_lbp_s, y)

    output_path.parent.mkdir(exist_ok=True)
    joblib.dump(
        {
            "contour_model": contour_model,
            "contour_scaler": contour_scaler,
            "lbp_model": lbp_model,
            "lbp_scaler": lbp_scaler,
        },
        output_path,
    )
    print(f"saved models to {output_path}")


def main() -> None:
    _write_test_manifest()
    train_df = pd.read_parquet(DATA_DIR / "clips_train.parquet")[["audio", "group"]]

    expanded_path = DATA_DIR / "clips_train_expanded.parquet"
    if expanded_path.exists():
        extra_df = pd.read_parquet(expanded_path)[["audio", "group"]]
        train_df = pd.concat([train_df, extra_df], ignore_index=True)
        print(f"including {len(extra_df)} additional clips from scripts/fetch_extra_data.py "
              f"(see README's Data section for provenance)")

    train_and_save(train_df, MODELS_DIR / "council_models.joblib")


if __name__ == "__main__":
    main()
