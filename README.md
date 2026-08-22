# narw-council

ML council to classify North Atlantic right whale (NARW) calls from audio clips. FastAPI backend, deployed on Render; frontend/UI lives separately in Base44 and calls this API.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8123
```

Docs at `http://127.0.0.1:8123/docs`.

## API

### `GET /health`

```json
{ "status": "ok", "model_version": "heuristic-stub-v0" }
```

### `POST /classify`

Multipart form upload, field name `audio` (any format librosa can decode: wav, mp3, flac, etc).

Response:

```json
{
  "species_prediction": "NARW",
  "confidence_tier": "high",
  "confidence_score": 0.955,
  "council": [
    {
      "check": "frequency_pattern",
      "vote": "pass",
      "score": 1.0,
      "detail": "69% of energy in NARW upcall band (50-200Hz), rising contour detected"
    },
    {
      "check": "call_duration",
      "vote": "pass",
      "score": 0.85,
      "detail": "active call segment ~1.41s (NARW upcalls: 0.4-2.5s)"
    },
    {
      "check": "background_noise",
      "vote": "pass",
      "score": 0.998,
      "detail": "low background noise, signal is clear"
    }
  ],
  "audio_duration_sec": 2.2,
  "model_version": "heuristic-stub-v0"
}
```

- `species_prediction`: `"NARW" | "uncertain" | "not_NARW"`
- `confidence_tier`: `"high" | "medium" | "low"` — drives the UI's tiered messaging (notify vs. save-for-review vs. log-only)
- `confidence_score`: 0-1, weighted combination of the council checks
- `council`: each check's individual `vote` (`pass | warn | fail`), numeric `score`, and human-readable `detail` for the council display

## Deploy to Render

This repo includes a `render.yaml` blueprint. In the Render dashboard: **New > Blueprint**, connect this GitHub repo, and Render will pick up the build/start commands and health check automatically. Once live, `GET /health` should return `{"status": "ok", ...}` and `POST /classify` is reachable at `https://<service>.onrender.com/classify`.

Free tier spins down after inactivity — first request after idle takes ~30-60s. Ping `/health` a few minutes before a live demo.

## Current model

`classifier.py` implements the council checks as **DSP heuristics** (frequency-band energy, rising contour, call duration, spectral flatness) tuned to known NARW upcall characteristics — this is a placeholder standing in for a trained classifier, not four separate models. It runs correctly end-to-end and can be swapped out once a model is trained on labeled clips (e.g. Watkins Marine Mammal Sound DB), without changing the `/classify` request/response contract.
