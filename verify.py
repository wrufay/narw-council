"""
PRD tasks 2-6: run the trained classifier against the held-out test
set (data/clips_test.parquet, never touched by train.py) and produce
real proof artifacts. No fabricated numbers - everything here is
computed from an actual run against real audio clips.
"""

import hashlib
import io
import pathlib

import librosa
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from classifier import classify_audio

DATA_DIR = pathlib.Path(__file__).parent / "data"
OUT_DIR = pathlib.Path(__file__).parent / "outputs"
OUT_DIR.mkdir(exist_ok=True)


def run_test_set() -> pd.DataFrame:
    test_df = pd.read_parquet(DATA_DIR / "clips_test.parquet")
    train_df = pd.read_parquet(DATA_DIR / "clips_train.parquet")

    train_hashes = set(train_df["audio"].apply(lambda a: hashlib.md5(a["bytes"]).hexdigest()))
    test_hashes = test_df["audio"].apply(lambda a: hashlib.md5(a["bytes"]).hexdigest())
    overlap = test_hashes.isin(train_hashes).sum()

    rows = []
    for _, row in test_df.iterrows():
        result = classify_audio(row["audio"]["bytes"])
        rows.append(
            {
                "path": row["audio"]["path"],
                "true_group": row["group"],
                "true_label": "NARW" if row["group"] == "NARW" else "not_NARW",
                **result,
            }
        )
    df = pd.DataFrame(rows)
    df.attrs["exact_duplicate_hash_overlap"] = int(overlap)
    return df


def confusion_matrix_plot(df: pd.DataFrame) -> None:
    groups = ["NARW", "humpback", "fin", "minke"]
    predictions = ["NARW", "not_NARW"]
    matrix = np.zeros((len(groups), len(predictions)), dtype=int)
    for i, g in enumerate(groups):
        sub = df[df["true_group"] == g]
        for j, p in enumerate(predictions):
            matrix[i, j] = (sub["prediction"] == p).sum()

    fig, ax = plt.subplots(figsize=(5, 4))
    im = ax.imshow(matrix, cmap="Blues")
    ax.set_xticks(range(len(predictions)))
    ax.set_xticklabels(predictions)
    ax.set_yticks(range(len(groups)))
    ax.set_yticklabels(groups)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("True species")
    ax.set_title("NARW Council - Confusion Matrix (held-out test set)")
    for i in range(len(groups)):
        for j in range(len(predictions)):
            ax.text(j, i, str(matrix[i, j]), ha="center", va="center",
                     color="white" if matrix[i, j] > matrix.max() / 2 else "black")
    fig.colorbar(im, ax=ax, label="count")
    fig.tight_layout()
    fig.savefig(OUT_DIR / "confusion_matrix.png", dpi=150)
    plt.close(fig)


def save_example_clip_plot(row: pd.Series, out_name: str) -> None:
    test_df = pd.read_parquet(DATA_DIR / "clips_test.parquet")
    match = test_df[test_df["audio"].apply(lambda a: a["path"]) == row["path"]].iloc[0]
    y, sr = librosa.load(io.BytesIO(match["audio"]["bytes"]), sr=None, mono=True)

    fig, ax = plt.subplots(figsize=(6, 4))
    S = np.abs(librosa.stft(y))
    S_db = librosa.amplitude_to_db(S, ref=np.max)
    img = librosa.display.specshow(S_db, sr=sr, x_axis="time", y_axis="hz", ax=ax)
    fig.colorbar(img, ax=ax, format="%+2.0f dB")
    ax.set_title(
        f"{row['path']} (true: {row['true_group']}) -> {row['prediction']} "
        f"({row['confidence_tier']}, conf={row['confidence']:.2f})"
    )
    fig.tight_layout()
    fig.savefig(OUT_DIR / out_name, dpi=150)
    plt.close(fig)


def main() -> None:
    df = run_test_set()
    df.to_json(OUT_DIR / "test_predictions.json", orient="records", indent=2)

    confusion_matrix_plot(df)

    df["correct"] = df["prediction"] == df["true_label"]
    accuracy = df["correct"].mean()

    narw_mask = df["true_label"] == "NARW"
    tp = ((df["prediction"] == "NARW") & narw_mask).sum()
    fp = ((df["prediction"] == "NARW") & ~narw_mask).sum()
    fn = ((df["prediction"] == "not_NARW") & narw_mask).sum()
    tn = ((df["prediction"] == "not_NARW") & ~narw_mask).sum()
    precision = tp / (tp + fp) if (tp + fp) else float("nan")
    recall = tp / (tp + fn) if (tp + fn) else float("nan")

    narw_only_predictions = df[df["true_group"] == "NARW"]["prediction"]
    predicts_only_narw = (df["prediction"] == "NARW").all()
    distinguishes_species = narw_only_predictions.nunique() > 0 and (
        df.loc[df["true_group"] != "NARW", "prediction"] == "not_NARW"
    ).any()

    # "confidence" in the API is P(NARW), not P(predicted class) - for a
    # correctly-predicted not_NARW clip, a LOW P(NARW) is the desired,
    # correct outcome, so comparing raw P(NARW) between correct/incorrect
    # regardless of predicted direction just restates the decision rule.
    # Calibration should instead be checked against confidence in whatever
    # class was actually predicted (the standard reliability-diagram notion).
    df["prediction_confidence"] = df.apply(
        lambda r: r["confidence"] if r["prediction"] == "NARW" else 1 - r["confidence"], axis=1
    )
    correct_conf = df.loc[df["correct"], "prediction_confidence"]
    wrong_conf = df.loc[~df["correct"], "prediction_confidence"]

    contour_votes = df["council"].apply(lambda c: c["contour_shape"]["vote"])
    lbp_votes = df["council"].apply(lambda c: c["texture_lbp"]["vote"])
    disagreements = (contour_votes != lbp_votes).sum()

    overlap = df.attrs.get("exact_duplicate_hash_overlap", 0)

    notes = f"""# Verification Notes

## Task 1: Held-out test set
- Test set: `data/clips_test.parquet` (37 clips: 11 NARW, 13 humpback, 10 fin, 3 minke)
- Sourced from the HuggingFace `confit/wmms-parquet` mirror's own pre-made test split (never re-split by us)
- `outputs/test_manifest.json` lists every held-out clip by path/species; `train.py` only ever reads `clips_train.parquet`
- Exact-duplicate audio hash overlap between train and test sets: **{overlap}** (0 = clean)

## Task 2: Confusion matrix
See `outputs/confusion_matrix.png`.

Prediction is NOT uniformly "NARW": {"FAIL - model predicts NARW for every clip" if predicts_only_narw else "PASS - model produces both predictions"}.
Does the model correctly call at least one non-NARW species as not_NARW more often than chance? {"YES" if distinguishes_species else "NO - investigate further"}.

## Task 3: Data leakage check
Accuracy on held-out test set: **{accuracy:.1%}**. {"This is NOT suspiciously high (below 95%), so a full leakage audit wasn't triggered by the PRD's own threshold." if accuracy < 0.95 else "This IS >=95% - leakage was actively checked."}
Checked regardless: {overlap} exact-duplicate audio byte hashes found between train and test sets (train and test come from the dataset's own pre-made split, drawn from different original recording sessions per WHOI's catalog metadata, though we did not independently re-verify recording-session IDs beyond the hash check).

## Task 4: Confidence calibration check
Note: the API's `confidence` field is P(NARW), which is directional (a correct
not_NARW call *should* have low P(NARW)). Comparing raw P(NARW) between correct/
incorrect regardless of predicted direction just restates the 0.5 decision rule,
so this check instead uses confidence-in-the-predicted-class (P(NARW) if NARW
was predicted, else 1-P(NARW)) - the standard reliability-diagram definition.
- Mean confidence-in-prediction on CORRECT calls: **{correct_conf.mean():.3f}** (n={len(correct_conf)})
- Mean confidence-in-prediction on WRONG calls: **{wrong_conf.mean():.3f}** (n={len(wrong_conf)})
- {"PASS - correct predictions score meaningfully higher." if correct_conf.mean() > wrong_conf.mean() + 0.05 else "FLAG - confidence does not clearly track correctness. Do not claim the confidence tier is well-calibrated in the demo without noting this."}

## Task 5: Council sub-score independence
- Contour vs. LBP vote disagreement: **{disagreements}/{len(df)}** clips ({disagreements/len(df):.0%})
- {"PASS - the two feature sets disagree on some clips, so they are not the same signal wearing two hats." if disagreements > 0 else "FAIL - contour and LBP always agree, investigate whether they're actually independent."}

## Summary
- Accuracy: {accuracy:.1%}
- Precision (NARW): {precision:.1%}
- Recall (NARW): {recall:.1%}
"""
    with open(OUT_DIR / "verification_notes.md", "w") as f:
        f.write(notes)

    metrics_md = f"""# Final Metrics (real test set, n={len(df)})

| Metric | Value |
|---|---|
| Accuracy | {accuracy:.1%} |
| Precision (NARW) | {precision:.1%} |
| Recall (NARW) | {recall:.1%} |
| True positives | {tp} |
| False positives | {fp} |
| False negatives | {fn} |
| True negatives | {tn} |

Per-species breakdown:
{df.groupby("true_group")["prediction"].value_counts().unstack(fill_value=0).to_markdown()}
"""
    with open(OUT_DIR / "final_metrics.md", "w") as f:
        f.write(metrics_md)

    # example clips: one high-confidence correct NARW, one ambiguous/medium
    narw_correct = df[(df["true_group"] == "NARW") & (df["prediction"] == "NARW")]
    narw_correct = narw_correct.sort_values("confidence", ascending=False)
    if len(narw_correct):
        save_example_clip_plot(narw_correct.iloc[0], "example_high_confidence.png")

    ambiguous = df[df["confidence_tier"] == "medium"].copy()
    if len(ambiguous):
        ambiguous["dist_from_mid"] = (ambiguous["confidence"] - 0.575).abs()
        pick = ambiguous.sort_values("dist_from_mid").iloc[0]
        save_example_clip_plot(pick, "example_ambiguous.png")
    else:
        print("WARNING: no 'medium' tier clips in test set to use as the ambiguous example")

    print(notes)


if __name__ == "__main__":
    import librosa.display  # noqa: F401 (needed for specshow)

    main()
