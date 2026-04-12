---
phase: 6
plan: 2
title: "Latency Benchmarking"
wave: 2
depends_on: ["06-PLAN-1"]
files_modified:
  - src/evaluation/benchmarks.py
autonomous: true
requirements: []
---

# Plan 2: Latency Benchmarking

## Goal
To properly contextualize the AMNP model within a production-ready system, we must mathematically establish that its dynamic path routing (non-linear vs linear evaluation) does not induce unbearable inference latencies compared to simpler pipelines.

## must_haves
- Create `src/evaluation/benchmarks.py`.
- Function natively isolating an initialized model instance and forcing consecutive `predict_proba` checks.
- Usage of `time.perf_counter` mapping tight intervals.
- Delivery of macroscopic timings (`mean_time_ms`, `std_time_ms`, `p95_time_ms`, `p99_time_ms`).

## Tasks

<task id="6.2.1">
<title>Isolate Inference Trace Timings</title>
<action>
1. Create `src/evaluation/benchmarks.py`.
2. Import `time` and `numpy`.
3. Construct `run_latency_benchmark(model, sample_batch, runs=10000)`.
4. Wrap `model.predict_proba(sample_batch)` inside a continuous loop wrapped perfectly by `start = time.perf_counter()` boundaries.
5. Record individual runtimes in a buffer array, multiply by `1000.0` for milliseconds.
6. Use `np.percentile` and standard statistics to extract standard p-values. Return dict formatting.
</action>
<acceptance_criteria>
- The benchmarking algorithm reliably captures the sub-millisecond execution duration and reports normalized percentile constraints suitable for the JSON report payload.
</acceptance_criteria>
</task>

## Verification
```bash
# Developer-side: Run Python subshell mapping a dummy model into the benchmark suite to verify the returned dictionary has valid p95 logic isolated.
```
