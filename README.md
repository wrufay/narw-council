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
cd narw-council-backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
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

Before this is considered production-ready for the demo, confirm:

- [ ] Evaluated on a **held-out test set** never seen during training (not reused training data)
- [ ] **Confusion matrix** built — confirms actual discrimination between NARW and other species, not a bias toward one class
- [ ] **Confidence distribution checked** — correct predictions should generally score higher confidence than incorrect ones
- [ ] **Council sub-scores diverge** on at least some ambiguous clips — if they always agree, they aren't independent signals
- [ ] 🚨 If accuracy is suspiciously high (95%+), checked for train/test data leakage (same recording session or near-duplicate clips in both sets)

Real accuracy/precision/recall numbers from our own test set — not the paper's — are what gets quoted in the pitch.

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