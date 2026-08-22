# CLAUDE.md — NARW Council ML Backend

Context for every session/iteration working in this repo.

## What this repo is
ML backend + frontend for a hackathon project (Ignition Hacks V.7). Takes an audio clip, classifies whether it's a North Atlantic Right Whale (NARW) upcall, and returns a confidence breakdown across independent sub-checks ("council"). Backend is a stateless API, no database.

As of 2026-08-22: Base44 was dropped. The frontend lives in `frontend/` (React + Vite) in this same repo, built from the Figma design at figma.com/design/MmrDyKmIQHXZsVybvHoO9X. It talks to the backend only via the `/classify` HTTP contract below — no other coupling.

## Method (do not change without asking)
Two-stage detection grounded in Esfahanian et al. 2017 (arxiv.org/pdf/1611.04947):
1. Energy-based pre-filter to discard obvious non-upcalls
2. Two independent feature extractors: contour/shape-based, and Local Binary Pattern (LBP) texture-based
3. Classical classifier (SVM/LDA/TreeBagger via scikit-learn) — NOT a CNN, this is intentional

Do not swap the architecture, add a CNN, or "improve" the method beyond what PRD.md asks for. Verification and deployment-readiness only.

## Data
Watkins Marine Mammal Sound Database only (NARW + humpback/fin/minke as comparison classes). Never reference, import, or reuse any other dataset, and never fabricate data.

## Stack
Backend: Python, FastAPI, scikit-learn. Deploy target: Render (`uvicorn main:app --host 0.0.0.0 --port $PORT`).
Frontend: React + Vite, in `frontend/`. Design source of truth is Figma (see link above) — implement to match it, don't freelance the UI. Map is Mapbox GL.

## API contract (do not change the shape without updating README.md too)
`POST /classify` takes multipart audio, returns:
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
Tiers: high >= 0.75, medium 0.4–0.75, low < 0.4.

## Ground rules for every iteration
- Never mark a task complete in `progress.md` unless its stated "Check" in `PRD.md` actually ran and passed — no assuming, no fabricating numbers.
- Never fabricate accuracy/precision/recall numbers. If a metric can't be computed, say so explicitly rather than guessing.
- Commit after each completed task with a message referencing the task number from PRD.md.
- If a check fails after 2-3 genuine attempts, stop and log it clearly in `progress.md` instead of looping on it indefinitely.
- Stay inside PRD.md's scope for the backend/method. Frontend work stays inside `frontend/` and should not change the `/classify` API contract without updating README.md too. Do not attempt real Render deployment — prepare the repo to be deploy-ready and stop there.
- No real notification/contact infrastructure of any kind — the notify button is simulated/demo-only, never wired to real fisheries orgs or contacts.

## Testing
Run the local dev server with `uvicorn main:app --reload --port 8000` and test with:
```bash
curl -X POST http://localhost:8000/classify -F "audio=@sample_clips/test.wav"
```

## When you're done
All PRD.md tasks checked off, `outputs/verification_notes.md` and `outputs/final_metrics.md` exist with real content, endpoint verified locally. Write `ALL_TASKS_COMPLETE` to `progress.md` and stop.