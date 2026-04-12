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

## Phase 5: Client-Side Foundation (React)
- **Goal**: Stand up the web UI logic for gathering telemetry.
- **Plans**:
  1. Scaffold Vite/React configuration with Tailwind.
  2. Implement `requestAnimationFrame` sampling of mouse/scroll hooks.
  3. Pre-process and batch arrays and wire up WebSocket client.

## Phase 6: Core Sandbox UI
- **Goal**: Create intentional layouts designed to provoke the 3 labels.
- **Plans**:
  1. Build a timed action sequence component (tests focus).
  2. Build a high-noise pop-up interruption component (tests distraction).
  3. Build a complex multi-step puzzle form (tests confusion).

## Phase 7: Visualization Layer (Real-time Feedback)
- **Goal**: Overlay ML predictions live onto the sandbox environment.
- **Plans**:
  1. Establish real-time JSON polling logic for model boundary states.
  2. Visualize PCA-reduced coordinates on floating canvases over the UI.
  3. Graph training epochs/curves in a comparative side-chart.

## Phase 8: Model Explainability Dashboards
- **Goal**: Translate abstract vector activations into understandable insights.
- **Plans**:
  1. Build radar charts analyzing relative feature significance metrics.
  2. Expose the "AMNP vs Neural Network" differences explicitly on UI.
  3. Final system tuning and polishing.
