# NARW Council — ML Backend

Acoustic classifier that detects North Atlantic Right Whale (NARW) upcalls from audio recordings, built for Ignition Hacks V.7. Gives field researchers a fast, objective, multi-signal confirmation instead of relying on a single subjective "I think I heard something."

## What this does

Takes an audio clip → runs it through a two-stage detection pipeline → returns a confidence score plus a breakdown of independent sub-checks ("council votes") instead of one opaque number. The goal is to replace slow, manual escalation (contact local fisheries, trigger possible closures) with something fast enough to use in the field and transparent enough to trust.

## Method

This isn't an arbitrary architecture choice — it's grounded in a real, peer-reviewed approach:

> Esfahanian, M., Zhuang, H., Erdol, N., & Gerstein, E. (2017). *Detection of North Atlantic Right Whale Upcalls Using Local Binary Patterns in a Two-Stage Strategy.* Applied Acoustics, 120, 158–166.
> Free preprint: https://arxiv.org/pdf/1611.04947

**Stage 1 — energy-based pre-filter**
A cheap energy-detection pass eliminates obvious non-upcalls before the more expensive classification stage. Reduces compute cost and balances the dataset going into the classifier.

**Stage 2 — two independent feature extractors ("the council")**
Signals that survive Stage 1 are scored by two separate channels, each capturing a different property of the call:

| Council member | What it checks | How |
|---|---|---|
| Contour / shape | Frequency range, duration, and shape of the call | Spectrogram → normalize/equalize → binarize → trace contour objects → extract perimeter, area, frequency band, time duration |
| Texture (LBP) | Fine-grained texture pattern of the spectrogram | Local Binary Pattern operator scans the spectrogram, feature vector built from the LBP histogram |

Both feature sets feed independent classifiers. Their outputs are surfaced separately in the API response rather than collapsed into a single black-box score — this is the "council" the frontend displays as individual votes (✅ / ⚠️ / ❌) instead of one number.

**Reference numbers from the source paper** (Cornell Bioacoustics Research Program dataset, not our data): LBP features + Linear SVM reached 92.73% overall detection rate; LBP outperformed contour-only features by ~3–4% across identical classifiers. Our own numbers on our own test set are what actually gets reported in the demo — see [Verification](#verification) below.

**Why NARW specifically, not "any whale":** NARW calls are frequently confused with humpback whale upcalls, which are more common and louder in the same waters. Distinguishing NARW from lookalike species (not just "whale vs. no whale") is the actual point of the classifier — a generic detector isn't enough to make the tool decision-relevant.

## Data

Public sources only — no reuse of prior/DFO-internal work or datasets:
- Watkins Marine Mammal Sound Database (NARW + comparison species: humpback, fin, minke)

## API

### `POST /classify`

**Request:** multipart audio file (wav/mp3)

**Response:**
```json
{
  "prediction": "NARW" | "not_NARW",
  "confidence": 0.0-1.0,
  "confidence_tier": "high" | "medium" | "low",
  "council": {
    "contour_shape": { "vote": true, "score": 0.0-1.0 },
    "texture_lbp": { "vote": true, "score": 0.0-1.0 },
    "noise_check": { "vote": false, "score": 0.0-1.0 }
  }
}
```

**Confidence tiers** (drives the frontend's messaging, not just a raw number):
- **High** → strong signal, map lights up, "notify" becomes the primary action
- **Medium** → "possible detection, human review recommended" — clip saved for later expert review, not auto-escalated
- **Low** → "likely not NARW" but still logged (patterns over time may still matter)

## Setup

```bash
git clone <repo-url>
cd narw-council
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Trained model weights (`models/council_models.joblib`, ~15KB) are committed directly — small enough that Git LFS isn't needed. You only need to retrain if you're changing the method:

```bash
python scripts/fetch_data.py   # pulls Watkins DB clips (HuggingFace confit/wmms-parquet mirror) into data/ (gitignored, regenerable)
python train.py                # trains on data/clips_train.parquet, writes models/council_models.joblib
python verify.py               # evaluates on the held-out data/clips_test.parquet, writes outputs/
```

## Running locally

```bash
uvicorn main:app --reload --port 8000
```

Test:
```bash
curl -X POST http://localhost:8000/classify -F "audio=@sample_clips/test.wav"
```

## Verification

Run against a held-out test set (37 clips from the Watkins DB's own pre-made test split: 11 NARW, 13 humpback, 10 fin, 3 minke) that `train.py` never touches — see `outputs/test_manifest.json` (exact list of held-out clips) and `outputs/verification_notes.md` for the full writeup. Results, real and unfudged:

| Check | Result |
|---|---|
| Held-out test set confirmed | ✅ 0 exact-duplicate clips between train/test |
| Not just predicting NARW for everything | ✅ produces both predictions; fin/minke both 0% false-positive on this test set |
| Confidence tracks correctness | ✅ 0.847 mean confidence-in-prediction on correct calls vs. 0.734 on wrong calls |
| Council sub-scores are independent | ✅ contour and LBP disagree on 5/37 (14%) of clips |
| Leakage check | not triggered — accuracy (81.1%) is below the 95% suspicion threshold; checked anyway, 0 duplicate hashes found |

**Accuracy: 81.1% · Precision (NARW): 70.0% · Recall (NARW): 63.6%** — full breakdown in `outputs/final_metrics.md`, confusion matrix in `outputs/confusion_matrix.png`. The main remaining confusion is NARW/humpback (matches the "why NARW specifically" note above) — fin and minke are both cleanly separated on this test set.

These are the numbers that get quoted in the pitch — not the source paper's 92.73% (different dataset, different task framing).

## Deployment (Render)

1. Confirm `requirements.txt` is complete with pinned versions
2. Push to GitHub
3. Render → New → Web Service → connect this repo
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Test the **live** URL with a real audio clip immediately after deploy
6. Ping the live URL a couple of times before any demo — Render's free tier cold-starts after inactivity (~30–60s first-request delay)

## Stack

- Python, FastAPI
- Signal processing: FFT/spectrogram generation, LBP feature extraction
- Classical ML classifier (SVM / LDA / TreeBagger via scikit-learn)
- Deployed on Render

## Notes

- Notify/escalation actions are **simulated only** in this build — no real contact infrastructure, no real emails/calls to fisheries organizations.
- Council = one pipeline with multiple independent sub-scores, not four separately trained models.
- Full project plan, story, and build tracking: see team Notion.