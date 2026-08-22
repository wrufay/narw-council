<div align="center">

# 🐋 Right Call

### Was that really a right whale? Find out in seconds — not hours.

**Ignition Hacks V.7** · Nova Scotia ADT

[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=white)](https://render.com)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

**[🚀 Live app](https://right-call.vercel.app)** · **[📦 Repo](https://github.com/wrufay/narw-council)**

*Right Call — North Atlantic **Right** whale · the **right call** · a whale **call***

</div>

---

## The problem

A researcher on a boat thinks they heard a North Atlantic Right Whale (**~370 left on Earth**). Right now that's one person's ear, in the moment — no fast way to verify. But the stakes force a decision anyway: contact fisheries, consider a slowdown zone, disrupt operations, all off a guess. Get it wrong either way and it costs something — a false alarm wastes disruption and trust; a dismissed real call misses a protection window that won't come back.

**The bottleneck isn't the science. It's confidence and speed.**

## The solution

Record or upload a clip → an ML **council** of independent checks votes on what it hears → a confidence tier tells you what to do next → a map shows who to contact if it matters. Built to be trusted by a scientist on a moving boat: legible, honest about uncertainty, one clear action per screen.

```
🎙️ record/upload → 🧩 council of checks → 📊 confidence tier → 🗺️ map + action
```

## Stack

```
/frontend (Vercel)              /backend (Render)
HTML/CSS/JS, Mapbox GL   ──▶     FastAPI + scikit-learn
record UI, council panel        energy filter → contour +
map, notify (simulated)   ◀──   LBP features → classifier
```

One repo, two deploys. Frontend is hand-built (Claude Code, against locked Figma + `style.md` tokens) — dropped an earlier Base44 prototype to remove a paywall and a Mapbox-compatibility risk, and to match the design spec exactly.

## The council

Two independent feature channels vote instead of one black-box score:

| Check | What it looks at |
|---|---|
| **Contour / Shape** | Frequency sweep + duration of the call |
| **Texture (LBP)** | Fine-grained spectrogram texture |
| **Noise** | Signal cleanliness |

Agreement → high confidence, act fast. Disagreement → medium confidence, flag for review. The disagreement *is the signal* a single number can't give you.

## Grounded in real research

> Esfahanian, Zhuang, Erdol & Gerstein (2017). *Detection of North Atlantic Right Whale Upcalls Using Local Binary Patterns in a Two-Stage Strategy.* Applied Acoustics, 120, 158–166. [Free preprint →](https://arxiv.org/pdf/1611.04947)

Our council mirrors their two-stage method: energy filter → contour + LBP texture features → classical classifier (SVM/LDA/TreeBagger). Their reported result: 92.73% accuracy (Linear SVM + LBP) on their dataset — cited here for method grounding, not compared directly (different data, different task framing; our own numbers are below).

**Why NARW specifically:** NARW calls are easily confused with the louder, more common humpback. "Whale detected" isn't useful — "this is the endangered one" is.

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

Trained on 682 real Watkins DB clips (up from an initial 148). Precision jumped by eliminating our worst confusion case — humpback false positives, 3/13 → 0/13. Recall dropped as a real tradeoff: we chose precision deliberately, since the problem we're solving is *uncertain guesses triggering costly escalation* — fewer confidently-wrong "yes" calls matters more here, and a missed real call still degrades gracefully into the medium tier rather than vanishing. Four NARW clips remain misclassified at high confidence in both old and new models — flagged as a known limitation, likely atypical calls or source-data noise, not something more data fixed.

Full breakdown: `backend/outputs/final_metrics.md` · Confusion matrix: `backend/outputs/confusion_matrix.png`

**Data:** Watkins Marine Mammal Sound Database only — public, no reused prior work.

## Run it

```bash
# backend
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn main:app --reload --port 8000

# frontend — no build step
cd frontend && python3 -m http.server 3000
```

## Deploy

**Backend (Render):** root dir `backend`, start command `uvicorn main:app --host 0.0.0.0 --port $PORT` → `narw-council.onrender.com`
**Frontend (Vercel):** root dir `frontend`, no build step → `right-call.vercel.app`

> ⚠️ Render free tier cold-starts (~30–60s) — pinged before demos.

## Design

Full tokens (palette, type, spacing) locked in `style.md` — shared source of truth for Figma mockups and the live build.

## What this doesn't do

No real contact infrastructure (notify is simulated) · council = one pipeline, multiple sub-scores, not four models · not claiming state-of-the-art, claiming **real, grounded, honest about uncertainty**

---
<div align="center">

*Built with 🐋 at Ignition Hacks V.7*

</div>