<div align="center">

# 🐋 NARW Council

### Was that really a right whale? Now you can find out in seconds — not hours.

**Built at Ignition Hacks V.7** · Nova Scotia ADT

[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Render](https://img.shields.io/badge/Deployed-Render-46E3B7?logo=render&logoColor=white)](https://render.com)
[![Base44](https://img.shields.io/badge/Frontend-Base44-6C4EF6)](https://base44.com)
[![Status](https://img.shields.io/badge/Status-hackathon%20build-orange)]()

</div>

---

## 🎣 The problem

A researcher on a boat thinks they heard a North Atlantic Right Whale call.

Right now, that's it — **one person's ear, in the moment.** No way to verify it fast. But because NARW are so critically endangered (**~370 left on Earth**), the protocol kicks in anyway: contact local fisheries, consider a slowdown zone, disrupt operations — all riding on a single subjective judgment call.

Get it wrong either way, and it costs something:
- **False alarm** → wasted disruption, eroded trust in the system
- **Dismissed real call** → a missed protection window for one of the rarest large animals alive

The bottleneck was never the science. **It's confidence and speed of confirmation.**

## 🧠 The solution

**NARW Council** gives researchers instant, objective backup the moment they hear something — not one opaque black-box number, but a transparent panel of independent checks voting on what they heard, plotted against nearby fisheries so the next step is obvious.

```
🎙️ record/upload  →  🧩 council of checks  →  📊 confidence tier  →  🗺️ map + action
```

## 🏗️ Full stack & how the pieces talk

This is a **two-part system**: this repo is the ML backend (the only thing that needs a GitHub repo). The frontend lives entirely in Base44 and calls this API over HTTP — no shared codebase, no shared repo, just a live URL between them.

```
┌─────────────────────────────┐         HTTPS          ┌──────────────────────────────┐
│         BASE44 APP           │  ───── POST /classify ──▶│      THIS REPO (Render)       │
│  (hosted by Base44, no repo) │                          │   Python · FastAPI · sklearn   │
│                               │  ◀──── JSON response ────│                                │
│  • record/upload UI          │                          │  • energy pre-filter           │
│  • council verdict display   │                          │  • contour-shape feature       │
│  • Mapbox GL map              │                          │    extractor                   │
│  • fisheries proximity logic │                          │  • LBP texture feature         │
│  • simulated notify button   │                          │    extractor                   │
│  • detection log/history     │                          │  • classifier (SVM/LDA/         │
│                               │                          │    TreeBagger)                 │
└─────────────────────────────┘                          └──────────────────────────────┘
        ↑                                                            ↑
   what judges see                                          github.com/wrufay/narw-council
   + interact with live                                     (this repo — submit this link)
```

**Why split this way:** Base44 generates a full-stack app (UI, hosting, database) from natural language — great for the map/UI/interaction layer, but not built for training or serving a custom ML classifier. Render hosts a normal Python service — great for the model, useless for generating UI. Each tool does the one job it's actually good at; they're connected by a single HTTP call.

**The connection, concretely:** Base44's AI chat is given this repo's live Render URL and told to call it — e.g. *"POST the recorded audio file to `https://narw-council.onrender.com/classify` and render the JSON response as the council panel."* That's the entire integration. No SDK, no auth (for this hackathon build), just a fetch call to a public endpoint.

**Repo count: 1.** Base44 doesn't require its own repo to run — it hosts itself. If you're looking for "the codebase," this is it; the frontend logic exists inside Base44's platform, not in a second repo.

## ⚖️ Meet the council

Instead of a single confidence score, the classifier runs **two independent detection channels** and shows its work:

| 🗳️ Council member | What it checks |
|---|---|
| **Contour / Shape** | The frequency sweep and time-duration shape of the call |
| **Texture (LBP)** | Fine-grained texture pattern in the spectrogram |
| **Noise check** | How clean vs. noisy the surrounding signal is |

When they agree → high confidence, act fast. When they don't → medium confidence, flag for human review instead of guessing. That disagreement *is the point* — it's what a single number could never show you.

## 📚 Grounded in real research

This isn't an invented method — it's built on a peer-reviewed acoustic detection approach:

> **Esfahanian, Zhuang, Erdol & Gerstein (2017).** *Detection of North Atlantic Right Whale Upcalls Using Local Binary Patterns in a Two-Stage Strategy.* Applied Acoustics, 120, 158–166.
> 📄 Free preprint: [arxiv.org/pdf/1611.04947](https://arxiv.org/pdf/1611.04947)

**Their pipeline, which ours mirrors:**

```
raw audio
   │
   ▼
🔍 Stage 1 — energy-based filter (toss obvious non-upcalls, cheap + fast)
   │
   ▼
🧬 Stage 2 — two parallel feature extractors
   ├── Contour-based:  spectrogram → binarize → trace call shape → extract features
   └── Texture-based:  Local Binary Pattern operator → texture histogram
   │
   ▼
🗳️ classifiers vote (SVM / LDA / TreeBagger)
```

**Published reference numbers** (their dataset, Cornell Bioacoustics Research Program — not ours):

| Feature type | Classifier | Overall accuracy |
|---|---|---|
| LBP (texture) | Linear SVM | 92.73% |
| LBP (texture) | TreeBagger | 92.67% |
| LBP (texture) | LDA | 92.03% |

LBP features beat contour-only features by ~3–4% across every classifier tested in the source paper — which is why texture is one of our council's two core channels. **Our own numbers, on our own held-out test set, are reported below** — different dataset and task framing, so don't expect them to match.

**Why NARW and not "any whale":** NARW upcalls are frequently confused with humpback whale calls — a species that's louder and far more common in the same waters. A tool that just says "whale detected" isn't useful. One that says "this is specifically the endangered one" is.

## 🎯 What the API returns

### `POST /classify`

**In:** an audio clip (wav/mp3)

**Out:**
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
| 🟢 **High** | Strong, aligned signal | Map lights up, "notify" becomes primary action |
| 🟡 **Medium** | Ambiguous / mixed votes | "Human review recommended," clip saved, no auto-escalation |
| 🔴 **Low** | Likely not NARW | Logged anyway — patterns over time still matter |

## 🚀 Running it

```bash
git clone https://github.com/wrufay/narw-council
cd narw-council
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Trained model weights (`models/council_models.joblib`) are committed directly to the repo — no separate download step needed to run inference. You only need to retrain if you're changing the method:

```bash
python scripts/fetch_data.py   # pulls Watkins DB clips into data/ (gitignored, regenerable)
python train.py                # trains on data/clips_train.parquet → models/council_models.joblib
python verify.py               # evaluates on held-out data/clips_test.parquet → outputs/
```

Run the API locally:
```bash
uvicorn main:app --reload --port 8000
```

Test it:
```bash
curl -X POST http://localhost:8000/classify -F "audio=@sample_clips/test.wav"
```

## 🧪 Data

Public sources only — **Watkins Marine Mammal Sound Database** (NARW + comparison species: humpback, fin, minke). No reuse of any prior/internal work or private datasets — built fresh for this event.

## ✅ Verified, not just claimed

Evaluated against a held-out test set (37 clips from the Watkins DB's own pre-made test split: 11 NARW, 13 humpback, 10 fin, 3 minke) that `train.py` never sees. Full writeup in `outputs/verification_notes.md`, exact clip list in `outputs/test_manifest.json`.

| Check | Result |
|---|---|
| Held-out test set confirmed | ✅ 0 exact-duplicate clips between train/test |
| Not just predicting NARW for everything | ✅ produces both predictions; fin/minke both 0% false-positive on this test set |
| Confidence tracks correctness | ✅ 0.847 mean confidence on correct calls vs. 0.734 on wrong calls |
| Council sub-scores are independent | ✅ contour and LBP disagree on 5/37 (14%) of clips |
| Data leakage check | Not triggered (accuracy is below the 95% suspicion threshold) — checked anyway, 0 duplicate hashes found |

**Accuracy: 81.1% · Precision (NARW): 70.0% · Recall (NARW): 63.6%**
Full breakdown: `outputs/final_metrics.md` · Confusion matrix: `outputs/confusion_matrix.png`

The main remaining confusion is NARW vs. humpback — consistent with the "why NARW specifically" note above. Fin and minke are both cleanly separated on this test set. **These are the numbers we quote in the pitch** — not the source paper's 92.73%, which comes from a different dataset and task framing.

## ☁️ Deployment

Deployed on **Render** as a standalone API — this is the piece Base44 talks to:

```
Render → New → Web Service → connect this repo
Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Live URL: `https://narw-council.onrender.com` *(update once deployed)*

> ⚠️ Free tier cold-starts after inactivity (~30–60s first request). We ping it before demoing so Base44's first live call doesn't stall on camera.

## 🎨 The Base44 side (not in this repo)

The full user-facing app — record/upload flow, council verdict panel, Mapbox GL map of nearby fisheries, simulated notify button — is built and hosted in **Base44**, connected to this backend via the `/classify` endpoint above. It doesn't have its own repo by default (Base44 hosts it directly), so if you're reviewing "the codebase," this repo is the whole of it — the UI logic lives in Base44's platform, not in git history.

## 🛠️ Stack

`Python` · `FastAPI` · spectrogram/LBP signal processing · `scikit-learn` classifiers · `Render` (backend) — `Base44` · `Mapbox GL` (frontend, separate platform, no repo)

## 🙅 What this demo intentionally does *not* do

- No real contact/notification infrastructure — "notify" is simulated for the demo
- Council = one pipeline, multiple independent sub-scores — not four separately trained models
- Not claiming to beat state-of-the-art — claiming to be **real, grounded, and honest about uncertainty**

---

<div align="center">

*Built with 🐋 and not enough sleep at Ignition Hacks V.7*

</div>