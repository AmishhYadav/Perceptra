# Project Roadmap: Perceptra

## Phase 1: Foundation ML Engine
- **Goal**: Implement the raw math and foundational Python structure for the AMNP alongside baseline models.
- **Plans**:
  1. Define global ML architecture interfaces and standard data input schemas.
  2. Implement baseline models (Perceptron, SVM, NN) in scikit-learn / PyTorch.
  3. Formulate the core mathematical implementation of the AMNP.
  4. Build the adaptive margins and dynamic weighting loops into AMNP.

## Phase 2: Synthetic Data Generation
- **Goal**: Create the realistic dataset to initially train all models offline.
- **Plans**:
  1. Define mapping constants (e.g., specific X/Y deviation = Confusion).
  2. Build Python generator to simulate thousands of interaction runs.
  3. Validate class separability.

## Phase 3: Offline Training Pipeline
- **Goal**: Train all 4 models simultaneously and ensure AMNP convergence capabilities.
- **Plans**:
  1. Create the parallel execution orchestrator.
  2. Implement mathematical guards vs AMNP gradient collapse.
  3. Validate test set accuracy offline and save weights.

## Phase 4: Inference Server (API & Sockets)
- **Goal**: Serve the loaded models extremely fast over endpoints.
- **Plans**:
  1. Initialize FastAPI architecture.
  2. Implement WebSocket endpoints for binary stream tracking.
  3. Connect incoming telemetry arrays to the scaling/normalizing algorithms and model inferencers.

## Phase 5: Behavioral Intelligence Dashboard (React)
- **Goal**: Build a unified interactive frontend to simulate telemetry and visualize model states.
- **Plans**:
  1. Scaffold Vite/React configuration with Tailwind CSS v4.
  2. Implement Zustand WebSocket store for high-frequency connection management.
  3. Build the 3-panel layout: Control Panel (Sliders), Prediction Card (Live State), and Explanations (Recharts).

## Phase 6: Formal Evaluation Pipeline
- **Goal**: Programmatically benchmark all 4 ML models against the synthetic test pool.
- **Plans**:
  1. Build headless Matplotlib/Seaborn visualizations (Confusion Matrices, ROC curves).
  2. Write latency tracing logic running 10,000 predict_proba() loops.
  3. Generate `benchmark.json` and a formatted `BENCHMARK.md` markdown report.

## Phase 7: Dockerization & Deployment
- **Goal**: Containerize the full stack for production distribution.
- **Plans**:
  1. Write dynamic `.env` and `nginx.conf` routing setups for SPA behaviors.
  2. Create multi-stage `Dockerfile` templates separating Python weights from Node static exports.
  3. Orchestrate via `docker-compose.yml` across an overlay bridge network.

## Phase 8: Documentation & Polish
- **Goal**: Format the codebase and generate the final open-source artifacts.
- **Plans**:
  1. Run `black` over the Python engine and `prettier` over the TSX components globally.
  2. Formulate the definitive algorithmic `README.md` containing architectural Mermaid topologies.
  3. Prepare final artifacts and mark the repository as milestone complete.
