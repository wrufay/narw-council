"""
PRD_SWEEP.md sweep loop: try classifier/feature-extraction configs,
score each ONLY against the train/val split from sweep_split.py
(never data/clips_test.parquet), log every result to
outputs/sweep_log.csv.

Coordinate-descent style: starts from the current production config
(the actual defaults in features.py/classifier.py/train.py) as the
baseline, varies one axis at a time, then combines the best value
found on each axis. Caps at 25 iterations total; stops early if 10
consecutive iterations show no improvement over the running best.

This script never modifies features.py/classifier.py/train.py - it
has its own parameterized copies of feature extraction so the
sweep can vary settings those modules hardcode. If a config wins,
sweep_finalize.py (next task) is responsible for retraining the real
pipeline with the winning values and updating the shipped model.
"""

import csv
import io
import pathlib
import sys
import time

import librosa
import numpy as np
from skimage.feature import local_binary_pattern
from skimage.filters import threshold_otsu
from skimage.measure import label, regionprops
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from sweep_split import make_split  # noqa: E402

OUTPUTS_DIR = pathlib.Path(__file__).parent.parent / "outputs"
LOG_PATH = OUTPUTS_DIR / "sweep_log.csv"

# Production baseline, matching features.py / classifier.py / train.py exactly.
WINDOW_SEC = 2.5
BASELINE = {
    "n_fft": 512,
    "hop_length": 128,
    "lbp_radius": 1,
    "contour_threshold": "otsu",
    "classifier": "svm",
    "kernel": "rbf",
    "C": 1.0,
    "contour_weight": 0.45,
    "lbp_weight": 0.55,
}

MAX_ITERATIONS = 25
NO_IMPROVEMENT_PATIENCE = 10

FIELDNAMES = [
    "iteration", "timestamp", "label",
    "n_fft", "hop_length", "lbp_radius", "lbp_points", "contour_threshold",
    "classifier", "kernel", "C", "contour_weight", "lbp_weight",
    "val_accuracy", "val_precision", "val_recall",
]


# ---------------------------------------------------------------------------
# Parameterized feature extraction (independent copy of features.py so the
# real pipeline is never touched during the search).
# ---------------------------------------------------------------------------

def select_best_window(y: np.ndarray, sr: int) -> np.ndarray:
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


def spectrogram(y: np.ndarray, sr: int, n_fft: int, hop_length: int) -> np.ndarray:
    S = np.abs(librosa.stft(y, n_fft=n_fft, hop_length=hop_length))
    return librosa.amplitude_to_db(S, ref=np.max)


def contour_features(spec_db: np.ndarray, sr: int, hop_length: int, threshold) -> np.ndarray:
    norm = (spec_db - spec_db.min()) / (spec_db.max() - spec_db.min() + 1e-9)
    if threshold == "otsu":
        try:
            thresh = threshold_otsu(norm)
        except ValueError:
            thresh = 0.5
    else:
        thresh = float(threshold)
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
    time_duration = float((max_col - min_col) * hop_length / sr)

    return np.array(
        [float(largest.area), float(largest.perimeter), freq_low, freq_high,
         freq_high - freq_low, time_duration],
        dtype=np.float32,
    )


def lbp_features(spec_db: np.ndarray, radius: int, points: int) -> np.ndarray:
    norm = (spec_db - spec_db.min()) / (spec_db.max() - spec_db.min() + 1e-9)
    img = (norm * 255).astype(np.uint8)
    lbp = local_binary_pattern(img, points, radius, method="uniform")
    n_bins = points + 2
    hist, _ = np.histogram(lbp, bins=n_bins, range=(0, n_bins), density=True)
    return hist.astype(np.float32)


def make_classifier(kind: str, kernel: str, C: float):
    if kind == "svm":
        return SVC(kernel=kernel, C=C, probability=True, random_state=0)
    if kind == "lda":
        return LinearDiscriminantAnalysis()
    if kind == "random_forest":
        return RandomForestClassifier(n_estimators=200, random_state=0)
    raise ValueError(kind)


# ---------------------------------------------------------------------------
# Caching: raw audio loaded once; spectrograms cached per (n_fft, hop_length)
# so varying only lbp_radius/contour_threshold doesn't re-run librosa.stft.
# ---------------------------------------------------------------------------

_audio_cache = {}
_spec_cache = {}


def _load_audio(df, split_name):
    key = split_name
    if key in _audio_cache:
        return _audio_cache[key]
    windows, srs, labels = [], [], []
    for _, row in df.iterrows():
        y, sr = librosa.load(io.BytesIO(row["audio"]["bytes"]), sr=None, mono=True)
        windows.append(select_best_window(y, sr))
        srs.append(sr)
        labels.append(1 if row["group"] == "NARW" else 0)
    _audio_cache[key] = (windows, srs, np.array(labels))
    return _audio_cache[key]


def _get_specs(split_name, windows, srs, n_fft, hop_length):
    key = (split_name, n_fft, hop_length)
    if key in _spec_cache:
        return _spec_cache[key]
    specs = [spectrogram(w, sr, n_fft, hop_length) for w, sr in zip(windows, srs)]
    _spec_cache[key] = specs
    return specs


def score_config(train_windows, train_srs, y_train, val_windows, val_srs, y_val, cfg):
    n_fft, hop_length = cfg["n_fft"], cfg["hop_length"]
    radius = cfg["lbp_radius"]
    points = 8 * radius
    threshold = cfg["contour_threshold"]

    train_specs = _get_specs("train", train_windows, train_srs, n_fft, hop_length)
    val_specs = _get_specs("val", val_windows, val_srs, n_fft, hop_length)

    X_contour_train = np.vstack([contour_features(s, sr, hop_length, threshold)
                                  for s, sr in zip(train_specs, train_srs)])
    X_lbp_train = np.vstack([lbp_features(s, radius, points) for s in train_specs])
    X_contour_val = np.vstack([contour_features(s, sr, hop_length, threshold)
                                for s, sr in zip(val_specs, val_srs)])
    X_lbp_val = np.vstack([lbp_features(s, radius, points) for s in val_specs])

    contour_scaler = StandardScaler().fit(X_contour_train)
    lbp_scaler = StandardScaler().fit(X_lbp_train)
    Xc_tr = contour_scaler.transform(X_contour_train)
    Xl_tr = lbp_scaler.transform(X_lbp_train)
    Xc_val = contour_scaler.transform(X_contour_val)
    Xl_val = lbp_scaler.transform(X_lbp_val)

    contour_model = make_classifier(cfg["classifier"], cfg["kernel"], cfg["C"])
    lbp_model = make_classifier(cfg["classifier"], cfg["kernel"], cfg["C"])
    contour_model.fit(Xc_tr, y_train)
    lbp_model.fit(Xl_tr, y_train)

    contour_prob = contour_model.predict_proba(Xc_val)[:, 1]
    lbp_prob = lbp_model.predict_proba(Xl_val)[:, 1]
    confidence = cfg["contour_weight"] * contour_prob + cfg["lbp_weight"] * lbp_prob
    pred = (confidence >= 0.5).astype(int)

    accuracy = float((pred == y_val).mean())
    tp = int(((pred == 1) & (y_val == 1)).sum())
    fp = int(((pred == 1) & (y_val == 0)).sum())
    fn = int(((pred == 0) & (y_val == 1)).sum())
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    return accuracy, precision, recall


def build_configs():
    """Coordinate-descent candidate list: baseline, then one-change-at-a-
    time variations per axis. The combination round (best axis values
    layered together) happens separately in main()."""
    configs = [("baseline", dict(BASELINE))]

    for n_fft, hop in [(1024, 256), (256, 64), (1024, 128)]:
        c = dict(BASELINE, n_fft=n_fft, hop_length=hop)
        configs.append((f"spec_nfft{n_fft}_hop{hop}", c))

    for radius in [2, 3]:
        c = dict(BASELINE, lbp_radius=radius)
        configs.append((f"lbp_radius{radius}", c))

    for thresh in [0.3, 0.5, 0.7]:
        c = dict(BASELINE, contour_threshold=thresh)
        configs.append((f"contour_thresh{thresh}", c))

    for kind, kernel, C, label_ in [
        ("svm", "linear", 1.0, "svm_linear_C1"),
        ("svm", "rbf", 10.0, "svm_rbf_C10"),
        ("svm", "rbf", 0.1, "svm_rbf_C0.1"),
        ("svm", "poly", 1.0, "svm_poly_C1"),
        ("lda", "n/a", None, "lda"),
        ("random_forest", "n/a", None, "random_forest"),
    ]:
        c = dict(BASELINE, classifier=kind, kernel=kernel, C=C)
        configs.append((label_, c))

    for cw, lw in [(0.5, 0.5), (0.6, 0.4), (0.4, 0.6), (0.3, 0.7)]:
        c = dict(BASELINE, contour_weight=cw, lbp_weight=lw)
        configs.append((f"weight_{cw}_{lw}", c))

    return configs


def main():
    train_fold, val_fold = make_split()
    train_windows, train_srs, y_train = _load_audio(train_fold, "train")
    val_windows, val_srs, y_val = _load_audio(val_fold, "val")

    configs = build_configs()

    OUTPUTS_DIR.mkdir(exist_ok=True)
    best = {"val_accuracy": -1.0, "label": None, "cfg": None}
    no_improve_streak = 0
    rows = []

    with open(LOG_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()

        for i, (label_, cfg) in enumerate(configs, start=1):
            if i > MAX_ITERATIONS:
                print(f"Reached iteration cap ({MAX_ITERATIONS}); stopping.")
                break

            acc, prec, rec = score_config(
                train_windows, train_srs, y_train, val_windows, val_srs, y_val, cfg
            )
            row = {
                "iteration": i,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "label": label_,
                "n_fft": cfg["n_fft"],
                "hop_length": cfg["hop_length"],
                "lbp_radius": cfg["lbp_radius"],
                "lbp_points": 8 * cfg["lbp_radius"],
                "contour_threshold": cfg["contour_threshold"],
                "classifier": cfg["classifier"],
                "kernel": cfg["kernel"],
                "C": cfg["C"],
                "contour_weight": cfg["contour_weight"],
                "lbp_weight": cfg["lbp_weight"],
                "val_accuracy": round(acc, 4),
                "val_precision": round(prec, 4),
                "val_recall": round(rec, 4),
            }
            writer.writerow(row)
            f.flush()
            rows.append(row)
            print(f"[{i}/{min(len(configs), MAX_ITERATIONS)}] {label_}: "
                  f"acc={acc:.3f} prec={prec:.3f} rec={rec:.3f}")

            if acc > best["val_accuracy"]:
                best = {"val_accuracy": acc, "label": label_, "cfg": cfg}
                no_improve_streak = 0
            else:
                no_improve_streak += 1

            if no_improve_streak >= NO_IMPROVEMENT_PATIENCE:
                print(f"No improvement for {NO_IMPROVEMENT_PATIENCE} consecutive "
                      f"iterations; stopping early at iteration {i}.")
                break

        # Combination round: mix the best value found on each independent
        # axis so far (only if we still have budget and haven't early-stopped).
        if no_improve_streak < NO_IMPROVEMENT_PATIENCE and len(rows) < MAX_ITERATIONS:
            combo_cfg = dict(best["cfg"]) if best["cfg"] else dict(BASELINE)
            remaining = MAX_ITERATIONS - len(rows)
            combo_candidates = []
            # Best single-axis result is already `best`; try layering the
            # runner-up axis changes on top of it, one more combined config.
            sorted_rows = sorted(rows, key=lambda r: r["val_accuracy"], reverse=True)
            for r in sorted_rows[:remaining]:
                if r["label"] == best["label"]:
                    continue
                combo = dict(combo_cfg)
                combo["n_fft"] = r["n_fft"]
                combo["hop_length"] = r["hop_length"]
                combo["lbp_radius"] = r["lbp_radius"]
                combo["contour_threshold"] = r["contour_threshold"]
                combo["classifier"] = r["classifier"]
                combo["kernel"] = r["kernel"]
                combo["C"] = r["C"]
                combo["contour_weight"] = r["contour_weight"]
                combo["lbp_weight"] = r["lbp_weight"]
                combo_candidates.append((f"combo_best+{r['label']}", combo))

            for label_, cfg in combo_candidates:
                i = len(rows) + 1
                if i > MAX_ITERATIONS:
                    break
                acc, prec, rec = score_config(
                    train_windows, train_srs, y_train, val_windows, val_srs, y_val, cfg
                )
                row = {
                    "iteration": i,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                    "label": label_,
                    "n_fft": cfg["n_fft"],
                    "hop_length": cfg["hop_length"],
                    "lbp_radius": cfg["lbp_radius"],
                    "lbp_points": 8 * cfg["lbp_radius"],
                    "contour_threshold": cfg["contour_threshold"],
                    "classifier": cfg["classifier"],
                    "kernel": cfg["kernel"],
                    "C": cfg["C"],
                    "contour_weight": cfg["contour_weight"],
                    "lbp_weight": cfg["lbp_weight"],
                    "val_accuracy": round(acc, 4),
                    "val_precision": round(prec, 4),
                    "val_recall": round(rec, 4),
                }
                writer.writerow(row)
                f.flush()
                rows.append(row)
                print(f"[{i}] {label_}: acc={acc:.3f} prec={prec:.3f} rec={rec:.3f}")

                if acc > best["val_accuracy"]:
                    best = {"val_accuracy": acc, "label": label_, "cfg": cfg}
                    no_improve_streak = 0
                else:
                    no_improve_streak += 1
                if no_improve_streak >= NO_IMPROVEMENT_PATIENCE:
                    print(f"No improvement for {NO_IMPROVEMENT_PATIENCE} consecutive "
                          f"iterations; stopping early.")
                    break

    print(f"\nSweep done: {len(rows)} configs tried, logged to {LOG_PATH}")
    print(f"Best by val_accuracy: {best['label']} = {best['val_accuracy']:.3f}")
    print(f"Best config: {best['cfg']}")
    return best, rows


if __name__ == "__main__":
    main()
