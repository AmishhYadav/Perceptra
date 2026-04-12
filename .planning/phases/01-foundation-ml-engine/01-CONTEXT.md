# Phase 01: Foundation ML Engine - Context

**Gathered:** April 2026
**Status:** Ready for planning
**Source:** Interaction Decisions

<domain>
## Phase Boundary

This phase strictly covers the raw Python backend setup, unifying baseline models and initializing the custom AMNP architecture for training. It establishes execution workflows and inputs, but does right now not map the live frontend WebSocket pipeline nor the generation of the actual synthetic data.
</domain>

<decisions>
## Implementation Decisions

### Model Interface Design
- **Decision**: Enforce a strict Object-Oriented design globally.
- **Details**: Implement a `BaseModel` class that guarantees `train()`, `predict()`, `predict_proba()`, and `explain()` methods exist across every single model used (Perceptron, SVM, NN, AMNP).

### Input Data Structures
- **Decision**: Pre-processing normalization funnel.
- **Details**: Frontend telemetry JSON will immediately be parsed down into fixed-size NumPy arrays and PyTorch tensors. Direct structural type constraints on inference endpoints.

### Execution Approach
- **Decision**: Hybrid scikit-learn / PyTorch setup.
- **Details**: Baseline Perceptron and SVM models will utilize heavily-optimized `scikit-learn` algorithms for raw execution speed. The Neural Network and custom AMNP models will be implemented fully within `PyTorch` for custom architecture control.

### AMNP Math Structure
- **Decision**: Fully linked Neural/Adaptive implementation.
- **Details**: The architecture will specifically use a neural feature transformation layer mapped into an adaptive decision layer. The margin is NOT a constant parameter; it must be a dynamic `learned` parameter optimized during propagation to shift boundaries per classification task complexity.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**
- No external specs or ADRs exist yet. All implementation decisions are strictly defined by this context document and `ROADMAP.md`.
</canonical_refs>

<specifics>
## Specific Ideas
- The `explain()` method in particular needs to bridge `scikit-learn` standard inference with deep `PyTorch` gradient analysis cleanly for parity.
</specifics>

<deferred>
## Deferred Ideas
- Exact synthetic data JSON schema bounds (belongs in Phase 2).
- FastAPI WebSocket pipeline mapping (belongs in Phase 4).
</deferred>

---

*Phase: 01-foundation-ml-engine*
