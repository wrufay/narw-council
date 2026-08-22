"""
Feature extraction for the two-stage NARW upcall detector, following
Esfahanian et al. 2017 (arxiv.org/pdf/1611.04947): energy pre-filter,
then contour-shape features and LBP texture features computed
independently from the same spectrogram window.

Used identically by training (train.py) and inference (classifier.py)
so the two never drift apart.
"""

import numpy as np
from skimage.feature import local_binary_pattern
from skimage.filters import threshold_otsu
from skimage.measure import label, regionprops

WINDOW_SEC = 2.5
N_FFT = 512
HOP_LENGTH = 128
LBP_RADIUS = 1
LBP_POINTS = 8 * LBP_RADIUS


def select_best_window(y: np.ndarray, sr: int) -> np.ndarray:
    """Stage 1: energy pre-filter. Slide a WINDOW_SEC window over the
    clip and return the one with the highest RMS energy - the most
    likely location of an actual call, rather than silence/ambient
    noise. Cheap, and avoids whole-clip stats being diluted by long
    recordings that contain far more than one vocalization."""
    win_len = int(WINDOW_SEC * sr)
    if len(y) <= win_len:
        return np.pad(y, (0, win_len - len(y)))

    hop = max(1, int(sr * 0.5))
    best_start, best_energy = 0, -1.0
    for start in range(0, len(y) - win_len + 1, hop):
        window = y[start : start + win_len]
        energy = float(np.sqrt(np.mean(window**2)))
        if energy > best_energy:
            best_energy = energy
            best_start = start
    return y[best_start : best_start + win_len]


def _spectrogram(y: np.ndarray, sr: int) -> np.ndarray:
    import librosa

    S = np.abs(librosa.stft(y, n_fft=N_FFT, hop_length=HOP_LENGTH))
    return librosa.amplitude_to_db(S, ref=np.max)


def contour_features(spec_db: np.ndarray, sr: int) -> np.ndarray:
    """Binarize the spectrogram, trace the largest connected contour,
    and describe its shape: area, perimeter, frequency band, duration.
    This is the "what does the call's shape look like" signal."""
    norm = (spec_db - spec_db.min()) / (spec_db.max() - spec_db.min() + 1e-9)

    try:
        thresh = threshold_otsu(norm)
    except ValueError:
        thresh = 0.5
    binary = norm > thresh

    labeled = label(binary)
    regions = regionprops(labeled)
    if not regions:
        return np.zeros(6, dtype=np.float32)

    largest = max(regions, key=lambda r: r.area)
    min_row, min_col, max_row, max_col = largest.bbox

    freqs = np.linspace(0, sr / 2, spec_db.shape[0])
    freq_low = float(freqs[min(min_row, len(freqs) - 1)])
    freq_high = float(freqs[min(max_row - 1, len(freqs) - 1)])
    time_duration = float((max_col - min_col) * HOP_LENGTH / sr)

    return np.array(
        [
            float(largest.area),
            float(largest.perimeter),
            freq_low,
            freq_high,
            freq_high - freq_low,
            time_duration,
        ],
        dtype=np.float32,
    )


def lbp_features(spec_db: np.ndarray) -> np.ndarray:
    """Local Binary Pattern histogram over the spectrogram image - the
    "fine-grained texture" signal, independent of the contour's coarse
    shape description."""
    norm = (spec_db - spec_db.min()) / (spec_db.max() - spec_db.min() + 1e-9)
    img = (norm * 255).astype(np.uint8)

    lbp = local_binary_pattern(img, LBP_POINTS, LBP_RADIUS, method="uniform")
    n_bins = LBP_POINTS + 2
    hist, _ = np.histogram(lbp, bins=n_bins, range=(0, n_bins), density=True)
    return hist.astype(np.float32)


def noise_score(y_window: np.ndarray, y_full: np.ndarray) -> float:
    """Relative SNR of the selected window vs. the rest of the clip -
    a real per-clip quality signal (not a constant), used to flag
    when the other two council members' input may be unreliable."""
    window_rms = float(np.sqrt(np.mean(y_window**2)))
    full_rms = float(np.sqrt(np.mean(y_full**2))) + 1e-9
    ratio = window_rms / full_rms
    return float(np.clip((ratio - 1.0) / 4.0 + 0.5, 0.0, 1.0))


def extract_all(y: np.ndarray, sr: int) -> dict:
    window = select_best_window(y, sr)
    spec_db = _spectrogram(window, sr)
    return {
        "contour": contour_features(spec_db, sr),
        "lbp": lbp_features(spec_db),
        "noise": noise_score(window, y),
    }
