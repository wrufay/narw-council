"""
Heuristic stand-in for the trained NARW call classifier.

Scope note: this is ONE model with multiple sub-scores presented as
"council votes" (frequency pattern, call duration, background noise) -
not four separate classifiers. Swap `run_council` for real
model inference once a classifier is trained on labeled clips
(see project to-dos: Watkins Marine Mammal Sound DB).

NARW upcalls are characterized by a rising frequency sweep roughly in
the 50-200 Hz band, lasting on the order of 0.5-2.5 seconds. The checks
below approximate detection of those characteristics from raw audio so
the API is testable end-to-end before real training data is sourced.
"""

import io

import librosa
import numpy as np

from schemas import ClassifyResponse, CouncilCheck

MODEL_VERSION = "heuristic-stub-v0"

NARW_FREQ_LOW_HZ = 50
NARW_FREQ_HIGH_HZ = 200
NARW_MIN_DURATION_SEC = 0.4
NARW_MAX_DURATION_SEC = 2.5


def _load_audio(audio_bytes: bytes) -> tuple[np.ndarray, int]:
    y, sr = librosa.load(io.BytesIO(audio_bytes), sr=None, mono=True)
    return y, sr


def _frequency_pattern_check(y: np.ndarray, sr: int) -> CouncilCheck:
    stft = np.abs(librosa.stft(y))
    freqs = librosa.fft_frequencies(sr=sr)
    band_mask = (freqs >= NARW_FREQ_LOW_HZ) & (freqs <= NARW_FREQ_HIGH_HZ)

    band_energy = stft[band_mask, :].sum()
    total_energy = stft.sum() + 1e-9
    band_ratio = float(band_energy / total_energy)

    dominant_freq_per_frame = freqs[np.argmax(stft, axis=0)]
    first_half = dominant_freq_per_frame[: len(dominant_freq_per_frame) // 2]
    second_half = dominant_freq_per_frame[len(dominant_freq_per_frame) // 2 :]
    rising_contour = float(np.mean(second_half) > np.mean(first_half))

    score = min(1.0, band_ratio * 2.5) * (0.7 + 0.3 * rising_contour)
    score = float(np.clip(score, 0.0, 1.0))

    if score >= 0.6:
        vote = "pass"
        detail = f"{band_ratio:.0%} of energy in NARW upcall band (50-200Hz), rising contour detected"
    elif score >= 0.3:
        vote = "warn"
        detail = f"{band_ratio:.0%} of energy in NARW upcall band, contour unclear"
    else:
        vote = "fail"
        detail = f"only {band_ratio:.0%} of energy in NARW upcall band (50-200Hz)"

    return CouncilCheck(check="frequency_pattern", vote=vote, score=score, detail=detail)


def _active_frame_mask(y: np.ndarray) -> np.ndarray:
    rms = librosa.feature.rms(y=y)[0]
    threshold = rms.max() * 0.3 if rms.max() > 0 else 0
    return rms > threshold


def _call_duration_check(sr: int, active_frames: np.ndarray) -> CouncilCheck:
    hop_length = 512
    active_duration = float(active_frames.sum() * hop_length / sr)

    in_range = NARW_MIN_DURATION_SEC <= active_duration <= NARW_MAX_DURATION_SEC
    near_range = (NARW_MIN_DURATION_SEC * 0.5) <= active_duration <= (NARW_MAX_DURATION_SEC * 1.5)

    if in_range:
        vote = "pass"
        score = 0.85
    elif near_range:
        vote = "warn"
        score = 0.5
    else:
        vote = "fail"
        score = 0.15

    detail = f"active call segment ~{active_duration:.2f}s (NARW upcalls: {NARW_MIN_DURATION_SEC}-{NARW_MAX_DURATION_SEC}s)"
    return CouncilCheck(check="call_duration", vote=vote, score=score, detail=detail)


def _background_noise_check(y: np.ndarray, active_frames: np.ndarray) -> CouncilCheck:
    flatness = librosa.feature.spectral_flatness(y=y)[0]
    # measured only over the active call segment, since silence/padding has an
    # arbitrarily flat/noisy spectrum that isn't representative of "background noise"
    relevant_flatness = flatness[active_frames] if active_frames.any() else flatness
    mean_flatness = float(np.mean(relevant_flatness))
    # lower spectral flatness -> more tonal/less noisy signal, easier to trust the other checks
    clarity_score = float(np.clip(1.0 - mean_flatness * 1.5, 0.0, 1.0))

    if clarity_score >= 0.6:
        vote = "pass"
        detail = "low background noise, signal is clear"
    elif clarity_score >= 0.3:
        vote = "warn"
        detail = "moderate background noise present"
    else:
        vote = "fail"
        detail = "high background noise, other checks may be unreliable"

    return CouncilCheck(check="background_noise", vote=vote, score=clarity_score, detail=detail)


def run_council(audio_bytes: bytes) -> ClassifyResponse:
    y, sr = _load_audio(audio_bytes)
    duration_sec = float(len(y) / sr) if sr else 0.0
    active_frames = _active_frame_mask(y)

    council = [
        _frequency_pattern_check(y, sr),
        _call_duration_check(sr, active_frames),
        _background_noise_check(y, active_frames),
    ]

    weights = {"frequency_pattern": 0.5, "call_duration": 0.3, "background_noise": 0.2}
    confidence_score = sum(c.score * weights[c.check] for c in council)

    if confidence_score >= 0.65:
        tier = "high"
        prediction = "NARW"
    elif confidence_score >= 0.35:
        tier = "medium"
        prediction = "uncertain"
    else:
        tier = "low"
        prediction = "not_NARW"

    return ClassifyResponse(
        species_prediction=prediction,
        confidence_tier=tier,
        confidence_score=round(confidence_score, 3),
        council=council,
        audio_duration_sec=round(duration_sec, 3),
        model_version=MODEL_VERSION,
    )
