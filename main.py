from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from classifier import classify_audio
from schemas import ClassifyResponse, HealthResponse

app = FastAPI(title="NARW Council")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
