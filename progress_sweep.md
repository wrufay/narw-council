# Progress Log — Hyperparameter/Feature Sweep

Status log for PRD_SWEEP.md. Separate from `progress.md` (which tracks the original verify/deploy PRD and already reads ALL_TASKS_COMPLETE) so the two loops never collide.

## Checklist (mirrors PRD_SWEEP.md)

- [x] Validation split created from training data only (never touches `data/clips_test.parquet`)
- [x] Sweep run (up to 25 iterations / early-stop at 10 no-improvement), logged to `outputs/sweep_log.csv`
- [x] Best config finalized: retrained on full training set, verified against the real test set exactly once
- [x] Decision logged: adopted new config, or kept baseline (both are valid outcomes)

## Log

- **2026-08-22** (`scripts/sweep_split.py`) — Created an 80/20 stratified (by `group`) train/val split from `data/clips_train.parquet` only, fixed `random_state=42` so every future sweep iteration scores against the same 30 validation clips (118 train-fold / 30 val-fold). **Check passed for real**: ran `python3 scripts/sweep_split.py`, which computes MD5 audio-byte hashes and asserts zero overlap between the val fold and `data/clips_test.parquet` (0/30), zero overlap between the train fold and the test set (0/118), and zero overlap between train fold and val fold (0). Output logged to `outputs/sweep_val_manifest.json`. Next task: run the actual sweep (up to 25 iterations) scored against this split, logged to `outputs/sweep_log.csv`.

- **2026-08-22** (`scripts/sweep.py`) — Ran the coordinate-descent sweep against the train/val split from `scripts/sweep_split.py` (never `data/clips_test.parquet`). Own parameterized copy of feature extraction (does not touch `features.py`/`classifier.py`/`train.py`); baseline = the current production config (n_fft=512, hop=128, LBP radius=1, Otsu contour threshold, SVM-RBF C=1, weights 0.45/0.55). Varied one axis at a time: spectrogram window (n_fft/hop), LBP radius, contour threshold, classifier type (SVM linear/rbf/poly at various C, LDA, RandomForest), and contour/LBP vote weighting. **Check passed for real**: ran `python3 scripts/sweep.py`, 17 configs tried before the loop's own "10 consecutive no-improvement" rule fired for real (best found at iteration 7, no improvement through iteration 17), all 17 logged to `outputs/sweep_log.csv` with config params + val_accuracy/val_precision/val_recall/timestamp. Best config on the validation split (30 clips): fixed contour threshold = 0.3 (replacing Otsu auto-threshold), val_accuracy 96.7% (29/30) vs baseline's 93.3% (28/30) — everything else left at production defaults. This is a validation-split result only; it has NOT been checked against the real test set yet. Next task: retrain that config on the full training set and run `verify.py` against the real held-out test set exactly once.

- **2026-08-22** (finalization) — Applied the winning config (`CONTOUR_THRESHOLD = 0.3` fixed, replacing `threshold_otsu`) directly to `features.py`'s `contour_features`, retrained the real pipeline via `python3 train.py` on the full `data/clips_train.parquet` (148 clips), then ran `python3 verify.py` against `data/clips_test.parquet` (37 clips) — **the one and only time the test set was touched in this whole sweep**. Confirmed the model actually changed (per-clip confidence/scores in `outputs/test_predictions.json` differed from the committed baseline before reverting), so this was a real retrain, not a no-op. **Result: no improvement.** New test-set numbers: accuracy 81.1%, precision (NARW) 70.0%, recall (NARW) 63.6% — identical to the current baseline in `outputs/final_metrics.md`. The 96.7%-vs-93.3% gain seen on the 30-clip validation split did not generalize to the 37-clip held-out test set (the same clips ended up correctly/incorrectly classified either way). **Decision: kept baseline.** Per PRD_SWEEP.md's decision point, since the new config did not improve real test-set accuracy, `models/council_models.joblib` and all `outputs/` files were left untouched — reverted `features.py`, `models/council_models.joblib`, and every `outputs/*` file changed by the retrain/verify run back to their committed baseline via `git checkout --`, confirmed with `git diff --stat` (no diff). This is a valid, useful outcome per the PRD, not a failure: the sweep ran honestly, found a plausible-looking validation-split win, and correctly caught that it didn't hold up on the real test set rather than shipping it anyway.

## Sweep summary
- 17 configs tried against the train/val split (`outputs/sweep_log.csv`), best candidate found: fixed contour threshold = 0.3.
- Finalization retrained + verified that candidate against the real test set exactly once; it did not beat baseline (81.1% / 70.0% / 63.6% both before and after).
- Baseline model, `features.py`, and all `outputs/` artifacts are unchanged from before the sweep started.

SWEEP_COMPLETE
