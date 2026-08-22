from typing import Literal

from pydantic import BaseModel, ConfigDict

ConfidenceTier = Literal["high", "medium", "low"]
Prediction = Literal["NARW", "not_NARW"]


class CouncilVote(BaseModel):
    vote: bool
    score: float


class Council(BaseModel):
    contour_shape: CouncilVote
    texture_lbp: CouncilVote
    noise_check: CouncilVote


class ClassifyResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    prediction: Prediction
    confidence: float
    confidence_tier: ConfidenceTier
    council: Council


class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: Literal["ok"]
