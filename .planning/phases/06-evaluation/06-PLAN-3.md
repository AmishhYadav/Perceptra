---
phase: 6
plan: 3
title: "Report Controller Pipeline"
wave: 3
depends_on: ["06-PLAN-2"]
files_modified:
  - evaluate_models.py
autonomous: true
requirements: []
---

# Plan 3: Report Controller Pipeline

## Goal
Integrate the evaluation subsets, plotting capabilities, and latency components directly into an executive master script capable of generating the definitive ML documentation block for the project.

## must_haves
- Create `evaluate_models.py` in the root directory.
- Hook into `.planning/phases/03-offline-training-pipeline/` models logic conceptually, eagerly fetching weights from `data/weights/` and arrays from `data/synthetic/`.
- Perform loops invoking `compute_classification_metrics`, `plot_confusion_matrices`, and `run_latency_benchmark`.
- Safely stringify objects via json.dumps and execute `write` bindings resulting in `data/benchmark.json`.
- Dynamically template a `.md` markdown string populating explicit mathematical gaps from the results and write the output directly into `BENCHMARK.md` at the project root format exactly mimicking standard ML comparison literature.

## Tasks

<task id="6.3.1">
<title>Develop evaluation executable</title>
<read_first>
- src/data/dataset.py
- src/evaluation/metrics.py
</read_first>
<action>
1. Define `evaluate_models.py`.
2. `DatasetManager.load()` to parse the test splits.
3. Instantiate and `Model.load()` the four components iteratively.
4. Execute `metrics.py` quantitative bindings saving them to a massive tracking dictionary.
</action>
<acceptance_criteria>
- The script actively consumes exact weights without error, successfully scoring the validation parameters in full synchronization.
</acceptance_criteria>
</task>

<task id="6.3.2">
<title>Format Generation & Report Export</title>
<action>
1. Feed the tracking matrices into `plots.py` functions to output graphics mapping paths directly to `data/plots/`.
2. Format the global dict array utilizing `json.dumps()` into `data/benchmark.json`.
3. Construct a standard `BENCHMARK.md` Python string literal. Inject Accuracy scores, Latencies, and relative filepath bindings allowing native GitHub rendering of the generated plot `.png`s.
4. Conclude script execution cleanly.
</action>
<acceptance_criteria>
- `BENCHMARK.md` provides an absolute, transparent assessment of the algorithm confirming completion of the ML pipeline objectives.
</acceptance_criteria>
</task>

## Verification
```bash
python evaluate_models.py
ls -la data/benchmark.json
ls -la BENCHMARK.md
```
