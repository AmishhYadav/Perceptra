---
phase: 6
plan: 1
title: "Metrics & Graphing Core"
wave: 1
depends_on: []
files_modified:
  - requirements.txt
  - src/evaluation/metrics.py
  - src/evaluation/plots.py
autonomous: true
requirements: []
---

# Plan 1: Metrics & Graphing Core

## Goal
Implement the quantitative evaluation engines required to compute mathematically rigorous metrics and generate high-fidelity seaborn plots of our trained models against the synthetic offline dataset.

## must_haves
- Append `matplotlib`, `seaborn` to `requirements.txt`.
- Establish `src/evaluation/metrics.py` yielding Accuracy, Precision, Recall, F1 Macro, and binary Confusion Matrices.
- Establish `src/evaluation/plots.py` utilizing `matplotlib.use('Agg')` as the header definition.
- Build functions capable of serializing multi-model Confusion Matrices and continuous ROC curves explicitly to `data/plots/`.

## Tasks

<task id="6.1.1">
<title>Graphing Dependencies & Metrics Engine</title>
<action>
1. Add `matplotlib>=3.7.0` and `seaborn>=0.12.0` to `requirements.txt`.
2. Create `src/evaluation/metrics.py`. Import required functions from `sklearn.metrics` (`accuracy_score`, `precision_recall_f1_score`, `confusion_matrix`, `roc_curve`, `auc`).
3. Define robust wrapper `compute_classification_metrics(y_true, y_pred)` returning a clean dictionary representation.
</action>
<acceptance_criteria>
- Quantitative logic is strictly abstracted with standard output formatting for external consumption.
</acceptance_criteria>
</task>

<task id="6.1.2">
<title>Headless Visual Pipelines</title>
<read_first>
- src/data/schemas.py
</read_first>
<action>
1. Create `src/evaluation/plots.py`.
2. Explicitly bind `import matplotlib; matplotlib.use('Agg')` before importing pyplot.
3. Build `plot_confusion_matrices(matrices_dict, class_names, out_path)`. Utilize seaborn's `heatmap` in a dynamic 2x2 grid iterating over [Perceptron, SVM, NN, AMNP].
4. Build `plot_roc_curves(model_probs_dict, y_true_binarized, class_names, out_path)`. Generates macroscopic Area Under Curve overlays.
</action>
<acceptance_criteria>
- Plots are saved directly onto the filesystem completely headless, avoiding any UI thread panics or hanging behaviors on remote environments.
</acceptance_criteria>
</task>

## Verification
```bash
# Developer-side: Run Python subshell mapping dummy targets into the plotting endpoints to verify files are cleanly emitted into `data/plots/` without errors.
```
