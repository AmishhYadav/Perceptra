"""Inference latency benchmarking for model performance profiling."""
import time
import numpy as np
from typing import Dict


def run_latency_benchmark(
    model,
    sample_batch: np.ndarray,
    runs: int = 10000,
    warmup: int = 100,
) -> Dict[str, float]:
    """Benchmark inference latency by timing repeated predict_proba calls.

    Args:
        model: A trained model instance with predict_proba().
        sample_batch: Input array of shape (n_samples, n_features).
        runs: Number of timed iterations.
        warmup: Number of warmup iterations (not timed).

    Returns:
        Dictionary with mean, std, p50, p95, p99 latency in milliseconds.
    """
    # Warmup pass — let JIT/caches stabilize
    for _ in range(warmup):
        model.predict_proba(sample_batch)

    # Timed pass
    timings = np.empty(runs, dtype=np.float64)
    for i in range(runs):
        start = time.perf_counter()
        model.predict_proba(sample_batch)
        end = time.perf_counter()
        timings[i] = (end - start) * 1000.0  # convert to ms

    return {
        "runs": runs,
        "mean_ms": float(np.mean(timings)),
        "std_ms": float(np.std(timings)),
        "p50_ms": float(np.percentile(timings, 50)),
        "p95_ms": float(np.percentile(timings, 95)),
        "p99_ms": float(np.percentile(timings, 99)),
        "min_ms": float(np.min(timings)),
        "max_ms": float(np.max(timings)),
    }
