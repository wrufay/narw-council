from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from classifier import MODEL_VERSION, run_council
from schemas import ClassifyResponse, HealthResponse

app = FastAPI(title="NARW Council", version=MODEL_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", model_version=MODEL_VERSION)


@app.post("/classify", response_model=ClassifyResponse)
async def classify(audio: UploadFile = File(...)) -> ClassifyResponse:
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="empty audio file")

    try:
        return run_council(audio_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"could not process audio: {exc}") from exc
