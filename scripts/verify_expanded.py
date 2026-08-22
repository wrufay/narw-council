"""
Full PRD-style verification of the expanded-data candidate model
against the SAME frozen 37-clip held-out test set used for the
production model. Mirrors verify.py's checks exactly (confusion
matrix / leakage / confidence calibration / council independence) so
the candidate is held to the same bar, not just spot-checked on NARW
recall/precision.
"""

import hashlib
import pathlib
import sys

import joblib
import pandas as pd

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
from classifier import classify_audio

DATA_DIR = pathlib.Path(__file__).parent.parent / "data"
MODELS_DIR = pathlib.Path(__file__).parent.parent / "models"
CANDIDATE_PATH = MODELS_DIR / "council_models_expanded.joblib"


def leakage_check() -> dict:
    original = pd.read_parquet(DATA_DIR / "clips_train.parquet")
    extra = pd.read_parquet(DATA_DIR / "clips_train_expanded.parquet")
    test_df = pd.read_parquet(DATA_DIR / "clips_test.parquet")

    combined_train_hashes = set()
    for df in (original, extra):
        for a in df["audio"]:
            combined_train_hashes.add(hashlib.md5(a["bytes"]).hexdigest())

    test_hashes = set(hashlib.md5(a["bytes"]).hexdigest() for a in test_df["audio"])
    overlap = combined_train_hashes & test_hashes

    return {
        "combined_train_size": len(original) + len(extra),
        "test_size": len(test_df),
        "hash_overlap_count": len(overlap),
    }


def main() -> None:
    leak = leakage_check()
    print("=== Leakage check: combined training set vs frozen test set ===")
    print(f"combined training clips: {leak['combined_train_size']}, test clips: {leak['test_size']}")
    print(f"MD5 audio-byte overlap: {leak['hash_overlap_count']} (0 = clean)")
    assert leak["hash_overlap_count"] == 0, "LEAKAGE DETECTED - stop, do not adopt this candidate"

    bundle = joblib.load(CANDIDATE_PATH)
    test_df = pd.read_parquet(DATA_DIR / "clips_test.parquet")

    rows = []
    for _, row in test_df.iterrows():
        result = classify_audio(row["audio"]["bytes"], bundle=bundle)
        rows.append(
            {
                "path": row["audio"]["path"],
                "true_group": row["group"],
                "true_label": "NARW" if row["group"] == "NARW" else "not_NARW",
                **result,
            }
        )
    df = pd.DataFrame(rows)

    print("\n=== Confusion matrix ===")
    print(pd.crosstab(df["true_group"], df["prediction"]))

    df["correct"] = df["prediction"] == df["true_label"]
    accuracy = df["correct"].mean()

    narw_mask = df["true_label"] == "NARW"
    tp = ((df["prediction"] == "NARW") & narw_mask).sum()
    fp = ((df["prediction"] == "NARW") & ~narw_mask).sum()
    fn = ((df["prediction"] == "not_NARW") & narw_mask).sum()
    tn = ((df["prediction"] == "not_NARW") & ~narw_mask).sum()
    precision = tp / (tp + fp) if (tp + fp) else float("nan")
    recall = tp / (tp + fn) if (tp + fn) else float("nan")

    print(f"\n=== Overall metrics (n={len(df)}) ===")
    print(f"accuracy: {accuracy:.1%}")
    print(f"precision (NARW): {precision:.1%}")
    print(f"recall (NARW): {recall:.1%}")
    print(f"TP={tp} FP={fp} FN={fn} TN={tn}")

    df["prediction_confidence"] = df.apply(
        lambda r: r["confidence"] if r["prediction"] == "NARW" else 1 - r["confidence"], axis=1
    )
    correct_conf = df.loc[df["correct"], "prediction_confidence"]
    wrong_conf = df.loc[~df["correct"], "prediction_confidence"]
    print(f"\n=== Confidence calibration check ===")
    print(f"mean confidence-in-prediction, CORRECT calls: {correct_conf.mean():.3f} (n={len(correct_conf)})")
    print(f"mean confidence-in-prediction, WRONG calls: {wrong_conf.mean():.3f} (n={len(wrong_conf)})")
    calibration_passed = correct_conf.mean() > wrong_conf.mean() + 0.05
    print("PASS" if calibration_passed else "FLAG - confidence does not clearly track correctness")

    contour_votes = df["council"].apply(lambda c: c["contour_shape"]["vote"])
    lbp_votes = df["council"].apply(lambda c: c["texture_lbp"]["vote"])
    disagreements = (contour_votes != lbp_votes).sum()
    print(f"\n=== Council sub-score independence ===")
    print(f"contour vs LBP disagreement: {disagreements}/{len(df)} ({disagreements/len(df):.0%})")
    print("PASS" if disagreements > 0 else "FAIL - contour and LBP always agree")

    df.to_json(
        pathlib.Path(__file__).parent.parent / "outputs" / "expanded_test_predictions.json",
        orient="records",
        indent=2,
    )

    print("\n=== Summary ===")
    print(f"accuracy={accuracy:.1%} precision={precision:.1%} recall={recall:.1%} "
          f"leakage={leak['hash_overlap_count']} calibration_passed={calibration_passed} "
          f"council_disagreement={disagreements}/{len(df)}")


if __name__ == "__main__":
    main()
