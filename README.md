<div align="center">

# 🐋 NARW Council

### Was that really a right whale? Find out in seconds, not hours.

**Built at Ignition Hacks V.7** · Nova Scotia ADT

[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Render](https://img.shields.io/badge/Deployed-Render-46E3B7?logo=render&logoColor=white)](https://render.com)
[![Base44](https://img.shields.io/badge/Frontend-Base44-6C4EF6)](https://app.base44.com/apps/6a88f4f9ee2b1286f93f1356/editor/preview/)

**[🚀 Live app](https://app.base44.com/apps/6a88f4f9ee2b1286f93f1356/editor/preview/)** · **[📦 This repo](https://github.com/wrufay/narw-council)**

</div>

---

## The problem

A researcher on a boat thinks they heard a North Atlantic Right Whale call. That's it — one person's ear, in the moment, no way to verify it fast. Because NARW are critically endangered (**~370 left on Earth**), protocol kicks in anyway: contact fisheries, consider a slowdown zone, disrupt operations — all riding on a single subjective judgment call.

- **False alarm** → wasted disruption, eroded trust in the system
- **Dismissed real call** → a missed protection window for one of the rarest large animals alive

The bottleneck was never the science. It's **confidence and speed of confirmation**.

## The solution

Record or upload a clip → the classifier scores it through independent checks, not one opaque number → a confidence tier drives what happens next → the map shows who to contact.

```
🎙️ record/upload  →  🧩 council of checks  →  📊 confidence tier  →  🗺️ map + action
```

## Stack & how it connects

Two pieces, one HTTP call between them: **this repo** is the ML backend (FastAPI + scikit-learn, deployed on Render). **The frontend lives entirely in [Base44](https://app.base44.com/apps/6a88f4f9ee2b1286f93f1356/editor/preview/)** — record/upload UI, council display, Mapbox GL map, simulated notify button — hosted by Base44 itself, no separate repo. Base44 just POSTs audio to this repo's `/classify` endpoint and renders the JSON.

`Python` · `FastAPI` · spectrogram/LBP signal processing · `scikit-learn` · `Render` — `Base44` · `Mapbox GL` (frontend, separate platform)

## Meet the council

One pipeline, three independent sub-scores shown as votes instead of a black-box number:

| Council member | What it checks |
|---|---|
| **Contour / Shape** | Frequency sweep and duration shape of the call |
| **Texture (LBP)** | Fine-grained texture pattern in the spectrogram |
| **Noise check** | How clean vs. noisy the surrounding signal is |

Agreement → high confidence, act fast. Disagreement → medium confidence, flag for human review instead of guessing. That disagreement is the point — a single number could never show it.

## Grounded in real research

Two-stage method from a peer-reviewed acoustic detection approach, not an invented architecture:

> Esfahanian, Zhuang, Erdol & Gerstein (2017). *Detection of North Atlantic Right Whale Upcalls Using Local Binary Patterns in a Two-Stage Strategy.* Applied Acoustics, 120, 158–166. [arxiv.org/pdf/1611.04947](https://arxiv.org/pdf/1611.04947)

```
raw audio → energy pre-filter → [contour-shape features] + [LBP texture histogram] → SVM votes
```

The paper's own numbers (Cornell Bioacoustics dataset, not ours): LBP + Linear SVM hit 92.73%, beating contour-only by ~3–4% across every classifier tested — why texture is one of our two core channels. **Our numbers, on our own held-out test set, are below** — different dataset, don't expect them to match.

**Why NARW specifically:** NARW calls are frequently confused with humpback calls, which are louder and far more common in the same waters. "Whale detected" isn't useful — "specifically the endangered one" is.

## API

### `POST /classify`

In: multipart audio (wav/mp3). Out:

```json
{
  "prediction": "NARW",
  "confidence": 0.87,
  "confidence_tier": "high",
  "council": {
    "contour_shape": { "vote": true,  "score": 0.91 },
    "texture_lbp":   { "vote": true,  "score": 0.88 },
    "noise_check":   { "vote": true,  "score": 0.79 }
  }
}
```

| Tier | Meaning | Frontend action |
|---|---|---|
| 🟢 High | Strong, aligned signal | Map lights up, notify becomes primary action |
| 🟡 Medium | Ambiguous / mixed votes | Human review recommended, clip saved, no auto-escalation |
| 🔴 Low | Likely not NARW | Logged anyway — patterns over time still matter |

## Running it

```bash
git clone https://github.com/wrufay/narw-council && cd narw-council
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Model weights (`models/council_models.joblib`) are committed directly — no download step needed. To retrain from scratch:

```bash
python scripts/fetch_data.py         # base Watkins DB clips → data/
python scripts/fetch_extra_data.py   # additional clips from the full Watkins archive (optional, see Data)
python train.py                      # → models/council_models.joblib
python verify.py                     # evaluates on held-out data/clips_test.parquet → outputs/
```

Run + test locally:

```bash
uvicorn main:app --reload --port 8000
curl -X POST http://localhost:8000/classify -F "audio=@sample_clips/test.wav"
```

## Data

Public sources only — **Watkins Marine Mammal Sound Database** (NARW + comparison species: humpback, fin, minke). No reuse of prior/internal work. Started from a 148-clip curated subset (HuggingFace mirror), expanded to 682 by pulling additional real clips from the full Watkins archive on archive.org — same public source, just more of it.

## Verified, not just claimed

Evaluated against a **frozen 37-clip held-out test set** (11 NARW, 13 humpback, 10 fin, 3 minke) that training code never touches — exact list in `outputs/test_manifest.json`, full writeup in `outputs/verification_notes.md`.

| Check | Result |
|---|---|
| Held-out test set confirmed | ✅ 0 duplicate clips between train/test |
| Not just predicting NARW for everything | ✅ produces both predictions |
| Confidence tracks correctness | ✅ correct calls score higher confidence than wrong ones |
| Council sub-scores are independent | ✅ contour/LBP disagree on 5/37 (14%) of clips |
| Data leakage | Checked — 0 duplicate hashes between train and test |

**Accuracy: 83.8% · Precision (NARW): 85.7% · Recall (NARW): 54.5%** (n=37, same frozen test set throughout — `outputs/final_metrics.md`, `outputs/confusion_matrix.png`)

**The honest tradeoff:** expanding training data from 148 → 682 clips improved precision substantially (70.0% → 85.7%) by fully eliminating the model's worst confusion — humpback calls misread as NARW (3/13 false positives → 0/13). Recall dropped (63.6% → 54.5%): the model now misses more real NARW calls. **We chose this deliberately.** A confidently-wrong "yes, NARW" triggers costly escalation with no safety net; a missed real call still lands in the medium/low tier and gets logged, not discarded. Traced clip-by-clip, not just the aggregate delta: 4 of 6 wrong calls are the same clips the old model already missed at similarly high confidence (pre-existing hard cases, not new), 1 is a new minke false positive, 1 is a hairline clip that crossed the decision boundary by a few hundredths.

**Known limitation:** four NARW clips (`81015005`, `56025009`, `81015002`, `81014029`) are misclassified at high confidence by both the old and new model — likely atypical calls, not something more data fixed. Worth a manual listen; flagged here rather than hidden.

Fin and minke stay cleanly separated. These are the numbers we quote in the pitch — not the source paper's 92.73%, which is a different dataset and task.

## Deployment

```
Render → New → Web Service → connect this repo
Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Live: `https://narw-council.onrender.com` *(update once deployed)*

> ⚠️ Free tier cold-starts after inactivity (~30–60s first request) — ping it before demoing.

## What this intentionally does not do

- No real contact/notification infrastructure — "notify" is simulated for the demo
- Council = one pipeline, multiple independent sub-scores — not four separately trained models
- Not claiming to beat state-of-the-art — claiming to be **real, grounded, and honest about uncertainty**

---

<div align="center">

*Built with 🐋 and not enough sleep at Ignition Hacks V.7*

</div>
