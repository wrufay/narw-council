"""
Inference for the two-stage NARW upcall detector (Esfahanian et al.
2017 method - see README). Loads the models trained by train.py and
scores a raw audio clip through the exact same feature pipeline
(features.py) used at training time.
"""

import io
import pathlib

import joblib
import librosa

from features import extract_all

MODELS_PATH = pathlib.Path(__file__).parent / "models" / "council_models.joblib"

# Combining the two independent classifiers: LBP scored marginally
# higher in our own cross-validation (0.859 vs 0.838, see train.py
# output / outputs/verification_notes.md), so it gets slightly more
# weight rather than a flat average.
CONTOUR_WEIGHT = 0.45
LBP_WEIGHT = 0.55

HIGH_THRESHOLD = 0.75
MEDIUM_THRESHOLD = 0.4

_bundle = None


def _get_bundle():
    global _bundle
    if _bundle is None:
        _bundle = joblib.load(MODELS_PATH)
    return _bundle


def _confidence_tier(confidence: float) -> str:
    if confidence >= HIGH_THRESHOLD:
        return "high"
    if confidence >= MEDIUM_THRESHOLD:
        return "medium"
    return "low"


def classify_audio(audio_bytes: bytes, bundle: dict | None = None) -> dict:
    """bundle defaults to the production model; pass a different loaded
    bundle (e.g. via joblib.load on another .joblib file) to score audio
    against a candidate model without touching the production one -
    used by scripts/compare_expanded.py."""
    if bundle is None:
        bundle = _get_bundle()
    y, sr = librosa.load(io.BytesIO(audio_bytes), sr=None, mono=True)

    feats = extract_all(y, sr)

    contour_x = bundle["contour_scaler"].transform(feats["contour"].reshape(1, -1))
    lbp_x = bundle["lbp_scaler"].transform(feats["lbp"].reshape(1, -1))

    contour_prob = float(bundle["contour_model"].predict_proba(contour_x)[0, 1])
    lbp_prob = float(bundle["lbp_model"].predict_proba(lbp_x)[0, 1])
    noise = float(feats["noise"])

    confidence = CONTOUR_WEIGHT * contour_prob + LBP_WEIGHT * lbp_prob
    prediction = "NARW" if confidence >= 0.5 else "not_NARW"

    return {
        "prediction": prediction,
        "confidence": round(confidence, 4),
        "confidence_tier": _confidence_tier(confidence),
        "council": {
            "contour_shape": {"vote": contour_prob >= 0.5, "score": round(contour_prob, 4)},
            "texture_lbp": {"vote": lbp_prob >= 0.5, "score": round(lbp_prob, 4)},
            "noise_check": {"vote": noise >= 0.5, "score": round(noise, 4)},
        },
    }
