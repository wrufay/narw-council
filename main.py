import io
import logging

import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from classifier import classify_audio
from schemas import ClassifyResponse, HealthResponse

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="NARW Council")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def warm_up() -> None:
    """First real inference call pays a one-time JIT-compilation cost
    (numba, pulled in transitively by librosa/scikit-image) - tens of
    seconds on Render's free tier. Running one dummy classification at
    startup moves that cost into the deploy/health-check window instead
    of a live user's first request."""
    try:
        silence = np.zeros(int(2.5 * 8000), dtype=np.float32)
        buf = io.BytesIO()
        sf.write(buf, silence, 8000, format="WAV")
        classify_audio(buf.getvalue())
        logger.info("warm-up classification complete")
    except Exception:
        logger.exception("warm-up classification failed - continuing anyway")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post("/classify", response_model=ClassifyResponse)
async def classify(audio: UploadFile = File(...)) -> ClassifyResponse:
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="empty audio file")

    try:
        result = classify_audio(audio_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"could not process audio: {exc}") from exc

    return ClassifyResponse(**result)
