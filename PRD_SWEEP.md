# PRD: Hyperparameter/Feature Sweep — NARW Classifier

## Goal
The classifier is trained and verified (81.1% accuracy on the held-out test set, see `outputs/final_metrics.md`). This PRD is an OPTIONAL overnight improvement pass: sweep hyperparameters and feature-extraction settings to see if real accuracy can be improved — without touching the demo-critical pipeline, endpoint, or held-out test set integrity.

This is idle-time work. Nothing downstream is blocked on it. If it produces no improvement, that is a fine outcome — do not force a "better" result.

## Absolute rule — read this first
**The held-out test set (`data/clips_test.parquet`, the 37 clips listed in `outputs/test_manifest.json`) must NEVER be used for tuning decisions during the sweep.** Only the training data may be touched during search (e.g. via a validation split carved out of the training set). `verify.py` against the real test set is run ONLY at the very end, once, on the single best config chosen from training/validation performance — not run repeatedly to cherry-pick.

If at any point you find yourself running `verify.py` against the test set more than once per candidate config, or letting test-set performance influence which config to try next, STOP — this is the exact data leakage failure mode already documented in `outputs/verification_notes.md` as a checked-and-passed concern. Do not reintroduce it.

## Context
- Classifier: two-stage NARW upcall detector — energy filter → contour-based features + LBP texture features → classical classifier (see `classifier.py`, `features.py`, `train.py`)
- Method grounded in Esfahanian et al. 2017 (arxiv.org/pdf/1611.04947)
- Current baseline: 81.1% accuracy, 70.0% precision (NARW), 63.6% recall (NARW) — see `outputs/final_metrics.md`
- Data: Watkins Marine Mammal Sound Database (NARW, humpback, fin, minke)

## Setup
1. Create a validation split from the TRAINING data only (`data/clips_train.parquet`) — e.g. an 80/20 train/val split, or k-fold cross-validation within training data. This is separate from and never overlaps with `data/clips_test.parquet`.
2. All sweep iterations are scored against this validation split, never against the real test set.
3. Log every config tried and its validation score to `outputs/sweep_log.csv` (columns: config params, val_accuracy, val_precision, val_recall, timestamp).

## Parameters to sweep
Try reasonable variations of:
- [ ] SVM kernel (linear, RBF, polynomial) and C value
- [ ] Alternative classifiers already in scope per the paper (LDA, TreeBagger/RandomForest) — compare against SVM
- [ ] Spectrogram window length / frame overlap
- [ ] LBP radius and number of points (P, R parameters)
- [ ] Contour extraction threshold (the binarization threshold for isolating upcall contours)
- [ ] Feature combination weighting if contour + LBP scores are combined for a single vote

Do not sweep architecture (no CNN, no deep learning) — stay within the classical two-stage method. Do not change the data source.

## Process
1. Run iterations, each trying one changed parameter (or a small reasonable grid) against the validation split
2. Log each result to `outputs/sweep_log.csv`
3. Track the best-performing config by validation accuracy
4. Cap: **maximum 25 iterations total**. Stop early if 10 consecutive iterations show no improvement over the current best.

## Finalization (do this once, at the end)
1. Take the single best config found (by validation performance)
2. Retrain the model with that config on the FULL training set
3. Run `verify.py` against the real held-out test set — this is the ONLY time the test set gets touched in this entire process
4. Compare the new test-set accuracy/precision/recall to the current baseline (81.1% / 70.0% / 63.6%)

## Decision point
- **If the new config improves real test-set accuracy:** update `models/council_models.joblib` with the new trained model, update `outputs/final_metrics.md` and `outputs/confusion_matrix.png` with the new numbers, and note in `progress_sweep.md` what changed and why.
- **If the new config does NOT improve real test-set accuracy (or is worse):** do NOT replace the current model. Leave `models/council_models.joblib` and all `outputs/` files untouched. Log in `progress_sweep.md` that the sweep was run and did not yield an improvement — this is a valid, useful outcome, not a failure.

Either outcome is acceptable. Do not iterate further to try to force an improvement once the sweep cap or finalization step is reached.

## Out of scope
- Do not touch `main.py`, the `/classify` endpoint, or the API contract
- Do not touch Base44/frontend code (none should exist in this repo)
- Do not touch `render.yaml` or deployment config
- Do not modify `data/clips_test.parquet` or `outputs/test_manifest.json` under any circumstances
- Do not swap the core architecture away from the classical two-stage method

## Definition of done
Sweep completed (iteration cap or early-stop reached), `outputs/sweep_log.csv` contains a full log of every config tried, ONE final verification against the real test set has been run, and a clear decision (adopted new config / kept baseline) is logged in `progress_sweep.md`. Write `SWEEP_COMPLETE` to `progress_sweep.md` and stop.
