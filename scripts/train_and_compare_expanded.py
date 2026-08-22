"""
Trains a candidate model on the expanded training set (original 148
clips + 534 new real clips from scripts/fetch_extra_data.py) and
verifies it against the SAME frozen 37-clip held-out test set used for
the production model - the one and only time this candidate touches
that test set. Never overwrites models/council_models.joblib or any
committed outputs/ file; only adopts the candidate if it genuinely
beats the current baseline on this real, untouched test set.
"""

import pathlib
import sys

import joblib
import pandas as pd

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
from classifier import classify_audio
from train import train_and_save

DATA_DIR = pathlib.Path(__file__).parent.parent / "data"
MODELS_DIR = pathlib.Path(__file__).parent.parent / "models"
CANDIDATE_PATH = MODELS_DIR / "council_models_expanded.joblib"

BASELINE_METRICS = {"accuracy": 0.811, "precision": 0.700, "recall": 0.636}


def main() -> None:
    original = pd.read_parquet(DATA_DIR / "clips_train.parquet")[["audio", "group"]]
    extra = pd.read_parquet(DATA_DIR / "clips_train_expanded.parquet")[["audio", "group"]]
    combined = pd.concat([original, extra], ignore_index=True)
    print(f"combined training set: {len(combined)} clips ({len(original)} original + {len(extra)} new)")
    print(combined["group"].value_counts())

    train_and_save(combined, CANDIDATE_PATH)

    candidate_bundle = joblib.load(CANDIDATE_PATH)
    test_df = pd.read_parquet(DATA_DIR / "clips_test.parquet")

    rows = []
    for _, row in test_df.iterrows():
        result = classify_audio(row["audio"]["bytes"], bundle=candidate_bundle)
        true_label = "NARW" if row["group"] == "NARW" else "not_NARW"
        rows.append({"true_group": row["group"], "true_label": true_label, **result})

    df = pd.DataFrame(rows)
    df["correct"] = df["prediction"] == df["true_label"]
    accuracy = df["correct"].mean()

    narw_mask = df["true_label"] == "NARW"
    tp = ((df["prediction"] == "NARW") & narw_mask).sum()
    fp = ((df["prediction"] == "NARW") & ~narw_mask).sum()
    fn = ((df["prediction"] == "not_NARW") & narw_mask).sum()
    precision = tp / (tp + fp) if (tp + fp) else float("nan")
    recall = tp / (tp + fn) if (tp + fn) else float("nan")

    print(f"\n=== Candidate (expanded data) vs baseline, on the SAME frozen 37-clip test set ===")
    print(f"{'metric':<12}{'baseline':>10}{'candidate':>12}")
    print(f"{'accuracy':<12}{BASELINE_METRICS['accuracy']:>10.1%}{accuracy:>12.1%}")
    print(f"{'precision':<12}{BASELINE_METRICS['precision']:>10.1%}{precision:>12.1%}")
    print(f"{'recall':<12}{BASELINE_METRICS['recall']:>10.1%}{recall:>12.1%}")

    beats_baseline = accuracy > BASELINE_METRICS["accuracy"]
    print(f"\nCandidate beats baseline accuracy: {beats_baseline}")

    df.to_json(DATA_DIR.parent / "outputs" / "expanded_test_predictions.json", orient="records", indent=2)


if __name__ == "__main__":
    main()
