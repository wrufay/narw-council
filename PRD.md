# PRD: NARW Classifier — Verify, Prove, Deploy

## Goal
The classifier is trained. This PRD covers everything between "trained" and "genuinely demo-ready": verification, proof artifacts, and deployment. Work through tasks in order — each has a clear pass/fail check. Do not mark a task complete unless its check actually passes.

## Context
- Method: two-stage NARW upcall detector (energy-filter → contour-based features + LBP texture features → classical classifier), grounded in Esfahanian et al. 2017 (arxiv.org/pdf/1611.04947)
- Data: Watkins Marine Mammal Sound Database only (NARW + humpback/fin/minke as negative/confusion classes)
- Stack: Python, FastAPI, scikit-learn
- Target deploy: Render, endpoint `POST /classify`

## Tasks

### 1. Held-out test set
- [ ] Confirm a test split exists that was NOT used in training (check for accidental full-dataset training)
- [ ] If no clean split exists, create one now: minimum 10-15 clips per class, held out before any further work
- **Check:** a file/manifest exists listing exactly which clips are test-only, and training code provably never touches them

### 2. Confusion matrix
- [ ] Run the trained classifier against the held-out test set
- [ ] Generate a confusion matrix (NARW vs. each other species class)
- [ ] Save it as an image file: `outputs/confusion_matrix.png`
- **Check:** the model correctly distinguishes NARW from at least one other species above chance — it is not just predicting NARW for everything (verify this explicitly, don't assume)

### 3. Data leakage check
- [ ] If overall accuracy is 95%+, investigate before trusting it: check for near-duplicate clips or same-recording-session overlap between train and test sets
- **Check:** state explicitly in `outputs/verification_notes.md` whether leakage was checked and what was found

### 4. Confidence calibration check
- [ ] Compare confidence scores on correct vs. incorrect predictions in the test set
- **Check:** correct predictions have meaningfully higher average confidence than incorrect ones (log the two averages to `outputs/verification_notes.md`). If this fails, flag it clearly — do not silently proceed.

### 5. Council sub-score independence check
- [ ] Confirm the contour-based feature score and the LBP texture score are computed independently
- [ ] Run both against a handful of ambiguous/borderline test clips and confirm they don't always agree
- **Check:** at least one test clip exists where the two sub-scores disagree (logged in `outputs/verification_notes.md`). If they always agree, investigate whether the features are actually distinct signals.

### 6. Proof artifacts for the demo
- [ ] Save the confusion matrix image (from task 2)
- [ ] Select and save 2 example clips: one high-confidence correct NARW detection, one medium/ambiguous-confidence detection — export the spectrogram image and council sub-scores for each to `outputs/example_high_confidence.png` and `outputs/example_ambiguous.png`
- [ ] Write final accuracy/precision/recall numbers (from the real test set, not estimated) to `outputs/final_metrics.md`
- **Check:** all four files exist and contain real numbers/images, not placeholders

### 7. `/classify` endpoint
- [ ] Confirm FastAPI endpoint at `POST /classify` accepts multipart audio and returns this exact JSON shape:
```json
{
  "prediction": "NARW" | "not_NARW",
  "confidence": 0.0,
  "confidence_tier": "high" | "medium" | "low",
  "council": {
    "contour_shape": {"vote": true, "score": 0.0},
    "texture_lbp": {"vote": true, "score": 0.0},
    "noise_check": {"vote": true, "score": 0.0}
  }
}
```
- [ ] Confidence tiers: high >= 0.75, medium 0.4-0.75, low < 0.4 (adjust only if there's a documented reason, log the reason)
- **Check:** a local curl/test call against the running endpoint returns valid JSON matching this shape for at least 3 different sample clips

### 8. Deployment readiness
- [ ] `requirements.txt` exists, is complete, and has pinned versions
- [ ] `.gitignore` excludes model weight files if they're large — confirm they're committed via Git LFS or a documented alternative, not silently missing
- [ ] Start command documented in README: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Check:** a fresh `pip install -r requirements.txt` in a clean venv succeeds with no errors

## Out of scope (do not touch)
- No changes to Base44/frontend code — this repo is backend-only
- No real notification/contact infrastructure — that's simulated on the frontend
- Do not swap the core method to a CNN or different architecture — verification and deployment only, not a redesign
- Do not attempt to deploy to Render directly (requires account/dashboard access) — prepare the repo to be deploy-ready and stop there

## Definition of done
All 8 tasks checked off, `outputs/verification_notes.md` and `outputs/final_metrics.md` both exist with real content, and the endpoint returns valid responses locally. When all of this is true, write `ALL_TASKS_COMPLETE` to `progress.md` and stop.