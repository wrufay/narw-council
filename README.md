<div align="center">

# 🐋 Right Call

### Make the right call to the right whale's call

**Ignition Hacks V.7** · Nova Scotia ADT

[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=white)](https://render.com)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

**[🚀 Live app](https://right-call.vercel.app)**

</div>

---

## The problem

A researcher on a boat thinks they heard a North Atlantic Right Whale (**~370 left on Earth**). That's one person's ear, in the moment, with no fast way to verify — yet the stakes force a decision anyway: contact fisheries, consider a slowdown zone, disrupt operations, all off a guess. A false alarm wastes disruption and trust; a dismissed real call misses a protection window that won't come back.

**The bottleneck isn't the science. It's confidence and speed.**

## The solution

Record or upload a clip → an ML **council** of independent checks votes on what it hears → a confidence tier tells you what to do next → a map shows who to contact if it matters.

```
🎙️ record/upload → 🧩 council of checks → 📊 confidence tier → 🗺️ map + action
```

## The council

Two independent feature channels vote instead of one black-box score:

| Check | What it looks at |
|---|---|
| **Contour / Shape** | Frequency sweep + duration of the call |
| **Texture (LBP)** | Fine-grained spectrogram texture |
| **Noise** | Signal cleanliness |

Agreement → high confidence, act fast. Disagreement → medium confidence, flag for review. The disagreement *is the signal* a single number can't give you.

Grounded in [Esfahanian, Zhuang, Erdol & Gerstein (2017)](https://arxiv.org/pdf/1611.04947) — energy filter → contour + LBP texture features → classical classifier (SVM/LDA/TreeBagger), same two-stage shape as their published method (their number: 92.73% accuracy on their own dataset, cited for grounding, not a direct comparison).

## Stack

- **Backend** (repo root): Python, FastAPI, scikit-learn — deployed on Render
- **Frontend** (`frontend/`): React + Vite, Mapbox GL, hand-built against a locked Figma + `STYLE.md` tokens — deployed on Vercel

One repo, two deploys, talking over one HTTP call.

## API

**`POST /classify`** — audio in, JSON out:
```json
{
  "prediction": "NARW",
  "confidence": 0.87,
  "confidence_tier": "high",
  "council": {
    "contour_shape": { "vote": true, "score": 0.91 },
    "texture_lbp":   { "vote": true, "score": 0.88 },
    "noise_check":   { "vote": true, "score": 0.79 }
  }
}
```

| Tier | Meaning |
|---|---|
| 🟢 High | Strong signal → notify becomes primary action |
| 🟡 Medium | Mixed votes → flagged for human review, no auto-escalation |
| 🔴 Low | Likely not NARW → logged, not discarded |

## Verified numbers

Frozen 37-clip held-out test set, untouched across every retrain, zero hash overlap confirmed.

**Accuracy 83.8% · Precision (NARW) 85.7% · Recall (NARW) 54.5%**

Trained on 682 real Watkins DB clips. We chose precision over recall deliberately — the problem here is *uncertain guesses triggering costly escalation*, so a confidently-wrong "yes" costs more than a missed call, which still degrades gracefully into the medium tier rather than vanishing. Four NARW clips remain misclassified at high confidence in every version of the model — a known limitation, flagged rather than hidden.

Full breakdown: `outputs/final_metrics.md` · Confusion matrix: `outputs/confusion_matrix.png`

**Data:** Watkins Marine Mammal Sound Database only — public, no reused prior work.

## Run it

```bash
# backend (repo root)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn main:app --reload --port 8000

# frontend
cd frontend && npm install && npm run dev
```

## Deploy

**Backend (Render):** root dir `.`, start command `uvicorn main:app --host 0.0.0.0 --port $PORT` → `narw-council.onrender.com`
**Frontend (Vercel):** root dir `frontend` → `right-call.vercel.app`

> ⚠️ Render free tier cold-starts (~30–60s) — ping `/health` before demos.

## What this doesn't do

No real contact infrastructure (notify is simulated) · council = one pipeline, multiple sub-scores, not four models · not claiming state-of-the-art, claiming **real, grounded, honest about uncertainty**
