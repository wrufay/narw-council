from typing import Literal

from pydantic import BaseModel, ConfigDict

Vote = Literal["pass", "warn", "fail"]
ConfidenceTier = Literal["high", "medium", "low"]
SpeciesPrediction = Literal["NARW", "uncertain", "not_NARW"]


class CouncilCheck(BaseModel):
    check: str
    vote: Vote
    score: float
    detail: str


class ClassifyResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    species_prediction: SpeciesPrediction
    confidence_tier: ConfidenceTier
    confidence_score: float
    council: list[CouncilCheck]
    audio_duration_sec: float
    model_version: str


class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: Literal["ok"]
    model_version: str
