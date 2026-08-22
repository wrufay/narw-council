# Verification Notes

## Task 1: Held-out test set
- Test set: `data/clips_test.parquet` (37 clips: 11 NARW, 13 humpback, 10 fin, 3 minke)
- Sourced from the HuggingFace `confit/wmms-parquet` mirror's own pre-made test split (never re-split by us)
- `outputs/test_manifest.json` lists every held-out clip by path/species; `train.py` only ever reads `clips_train.parquet`
- Exact-duplicate audio hash overlap between train and test sets: **0** (0 = clean)

## Task 2: Confusion matrix
See `outputs/confusion_matrix.png`.

Prediction is NOT uniformly "NARW": PASS - model produces both predictions.
Does the model correctly call at least one non-NARW species as not_NARW more often than chance? YES.

## Task 3: Data leakage check
Accuracy on held-out test set: **81.1%**. This is NOT suspiciously high (below 95%), so a full leakage audit wasn't triggered by the PRD's own threshold.
Checked regardless: 0 exact-duplicate audio byte hashes found between train and test sets (train and test come from the dataset's own pre-made split, drawn from different original recording sessions per WHOI's catalog metadata, though we did not independently re-verify recording-session IDs beyond the hash check).

## Task 4: Confidence calibration check
Note: the API's `confidence` field is P(NARW), which is directional (a correct
not_NARW call *should* have low P(NARW)). Comparing raw P(NARW) between correct/
incorrect regardless of predicted direction just restates the 0.5 decision rule,
so this check instead uses confidence-in-the-predicted-class (P(NARW) if NARW
was predicted, else 1-P(NARW)) - the standard reliability-diagram definition.
- Mean confidence-in-prediction on CORRECT calls: **0.847** (n=30)
- Mean confidence-in-prediction on WRONG calls: **0.734** (n=7)
- PASS - correct predictions score meaningfully higher.

## Task 5: Council sub-score independence
- Contour vs. LBP vote disagreement: **5/37** clips (14%)
- PASS - the two feature sets disagree on some clips, so they are not the same signal wearing two hats.

## Summary
- Accuracy: 81.1%
- Precision (NARW): 70.0%
- Recall (NARW): 63.6%
