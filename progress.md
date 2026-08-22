# Progress Log

Status log for PRD.md (verify, prove, deploy the NARW classifier). One line per iteration, timestamps in America/Argentina (repo's local time).

## Checklist (mirrors PRD.md)

- [x] Task 1: Held-out test set confirmed/created
- [x] Task 2: Confusion matrix
- [x] Task 3: Data leakage check
- [x] Task 4: Confidence calibration check
- [x] Task 5: Council sub-score independence check
- [x] Task 6: Proof artifacts for the demo
- [x] Task 7: `/classify` endpoint matches PRD schema
- [x] Task 8: Deployment readiness

## Log

- **2026-08-22 00:13** — Discovered before starting: PRD.md/README.md/CLAUDE.md all assume a trained contour+LBP classifier already exists. It didn't — only an earlier DSP-heuristic stub (frequency-band/duration/flatness) was in the repo. Flagged this to the user rather than running verification against something that didn't exist; user chose "build it, then verify."
- **2026-08-22 00:13** (`2b47b12`) — Built the actual two-stage method from CLAUDE.md/README.md (Esfahanian et al. 2017): energy pre-filter (best-window selection), independent contour-shape and LBP-texture feature extractors, two classical SVMs. Trained on 148 real Watkins DB clips (43 NARW / 51 humpback / 40 fin / 14 minke) pulled from the `confit/wmms-parquet` HuggingFace mirror (original WHOI site was down for maintenance). **Task 1 check passed**: `outputs/test_manifest.json` lists the 37 held-out clips (the dataset's own pre-made test split); `train.py` never reads `clips_test.parquet`.
- **2026-08-22 00:14** (`38b0f0a`) — Ran the trained classifier against the 37 held-out clips for real. **Tasks 2-6 checks passed**: confusion matrix shows the model does not just predict NARW for everything (fin and minke both 0% false-positive on this test set); accuracy 81.1% (below the 95% leakage-suspicion threshold, checked for duplicate-hash leakage anyway — 0 found); confidence-in-predicted-class averages 0.847 on correct calls vs. 0.734 on wrong calls (confidence tracks correctness); contour/LBP sub-scores disagree on 5/37 clips (14%) — genuinely independent, not the same signal twice; all 4 proof artifacts written with real content (`outputs/confusion_matrix.png`, `outputs/example_high_confidence.png`, `outputs/example_ambiguous.png`, `outputs/final_metrics.md`, `outputs/verification_notes.md`).
  - Note: the first pass of the Task 4 check used raw P(NARW) for both correct and incorrect predictions and looked like a failure (0.293 vs 0.367, inverted). Root-caused as a metric-definition bug in `verify.py`, not the classifier: P(NARW) is directional, so a correct not_NARW call *should* score low. Fixed to use confidence-in-the-predicted-class (the standard reliability-diagram definition) — documented in `outputs/verification_notes.md`.
- **2026-08-22 00:14** (`f4eb64a`) — Wired `/classify` to the trained classifier. **Task 7 check passed**: tested against 3 real held-out clips (NARW/humpback/fin) via a running local server — all 3 return valid JSON matching the PRD's exact schema, all 3 predictions correct.
- **2026-08-22 00:15** — **Task 8 check passed**: fresh `pip install -r requirements.txt` in a throwaway clean venv succeeded with no errors. Model weights (`models/council_models.joblib`, ~15KB) are small enough to commit directly — no Git LFS needed. Start command (`uvicorn main:app --host 0.0.0.0 --port $PORT`) already documented in README.md from an earlier session. `render.yaml` blueprint (committed earlier) is still consistent with the current app.

## Definition of done

All 8 tasks checked off above, `outputs/verification_notes.md` and `outputs/final_metrics.md` both exist with real content, and the endpoint returns valid responses locally (verified against 3 real clips). All true as of this log.

ALL_TASKS_COMPLETE
