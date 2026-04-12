# Phase 04: Inference Server - Context

**Gathered:** April 2026
**Status:** Ready for planning
**Source:** Interaction Decisions

<domain>
## Phase Boundary

This phase bridges the Python ML engine with the future React frontend. It introduces the FastAPI server, the real-time telemetry WebSocket endpoint, Model memory management (singleton loaders), and the inference routing needed to make real-time interaction predictions using the chosen model (Perceptron, SVM, NN, or AMNP).
</domain>

<decisions>
## Implementation Decisions

### A. Data Intake Format (WebSocket)
- **Decision**: Stream telemetry and predictions via WebSockets.
- **Details**: The frontend will send JSON telemetry over a WebSocket connection. The backend will parse it into the 8-feature schema, run inference, and immediately broadcast the classification (focus, distracted, confused) and explanation (feature importances / AMNP margins) back to the client. This handles latency organically and avoids polling overhead.

### B. Preprocessing State Continuity
- **Decision**: Persist and restore the `FeaturePreprocessor`.
- **Details**: Telemetry sent by the UI must undergo identical MinMax scaling used in training.
  - Implement `save(path)` and `load(path)` in `FeaturePreprocessor` using `joblib`.
  - Update `DatasetManager.generate_and_save` (from Phase 2) to dump the fitted `preprocessor.joblib` to `data/synthetic/`.
  - The API will load `preprocessor.joblib` at startup alongside model weights.

### C. Model Loader Pattern (Eager Loading)
- **Decision**: Load all 4 models into memory at API startup.
- **Details**: Implement a `ModelManager` that acts as a singleton repository. At startup (`@app.on_event("startup")` or equivalent), it will instantiate and `.load()` the Perceptron, SVM, Neural Network, and AMNP. This allows the websocket router to instantly execute `manager.get_model("AMNP").predict_proba(x)` without load penalties, supporting real-time rapid A/B testing on the frontend.
</decisions>

<canonical_refs>
## Canonical References
- `src/data/preprocessing.py` — Needs `save()` / `load()` updates.
- `src/data/dataset.py` — Needs to save the preprocessor dynamically when the dataset is created.
- `src/api/` (new directory) — Fast API application structures, websockets, routing.
</canonical_refs>
