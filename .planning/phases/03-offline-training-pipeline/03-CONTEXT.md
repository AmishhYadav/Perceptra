# Phase 03: Offline Training Pipeline - Context

**Gathered:** April 2026
**Status:** Ready for planning
**Source:** Interaction Decisions

<domain>
## Phase Boundary

This phase covers building the offline training pipeline, enhancing the `ModelTrainer` for true concurrency, bolstering PyTorch models with advanced training guards (early stopping, LR scheduling), and implementing unified model persistence so trained models can be reliably loaded in Phase 4 (Inference Server).
</domain>

<decisions>
## Implementation Decisions

### A. True Parallelism vs Sequential
- **Decision**: Train all 4 models concurrently using true parallelism.
- **Details**: `joblib` or `multiprocessing` should be integrated into `ModelTrainer.train_all`. This will launch `Perceptron`, `SVM`, `NeuralNetwork`, and `AMNP` training jobs in parallel. Each process returns its history and metrics.

### B. AMNP Mathematical Guards
- **Decision**: Implement advanced training protections for PyTorch models (specifically AMNP and NN).
- **Details**:
  - Add a **Learning Rate Scheduler** (e.g., `torch.optim.lr_scheduler.StepLR` or `ReduceLROnPlateau`).
  - Add **Early Stopping** based on a held-out validation set or validation loss, halting early if performance plateaus, saving the best weights.
  - This is in addition to the existing gradient clipping (`max_norm=1.0`).

### C. Model Persistence Strategy
- **Decision**: Implement a unified `.save(path)` and `.load(path)` method in the `BaseModel` interface.
- **Details**:
  - Abstract base methods in `BaseModel`.
  - Scikit-learn wrappers (`PerceptronModel`, `SVMModel`) will override these to use `joblib.dump` and `joblib.load`.
  - PyTorch wrappers (`NeuralNetModel`, `AMNPModel`) will override these to use `torch.save(model.state_dict())` and `model.load_state_dict(torch.load())`.
  - This ensures Phase 4 can simply call `model.load(path)` without worrying about the underlying framework.
</decisions>

<canonical_refs>
## Canonical References
- `src/training/trainer.py` — The orchestrator built in Plan 4 of Phase 1. Needs upgrading to parallel.
- `src/models/base.py` — The core interface that needs `.save()` and `.load()` abstract methods.
</canonical_refs>
