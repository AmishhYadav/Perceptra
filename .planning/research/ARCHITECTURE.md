# Architecture Research: Streaming ML Pipelines

## System Paradigm
For real-time model evaluation of telemetry, the project requires an event-driven, pipeline-oriented architecture bridging frontend physical sampling and backend batched inference.

## Component Boundaries
### 1. Client-Side Sandbox (React)
- **Telemetry Sampler**: Runs a `requestAnimationFrame` loop to sample coordinates at 60Hz. Debounces scrolling. 
- **Feature Preprocessor**: To save bandwidth, the client can preprocess raw data (e.g., calculating acceleration arrays from raw coordinates) before packing.
- **State Visualizer**: Consumes incoming WebSocket predictions and controls CSS/Canvas rendering for the live prediction dashboard.

### 2. Synchronization Layer
- **WebSocket Gateway**: Maintains persistent full-duplex session. Submits fixed-size sliding windows of telemetry exactly every N milliseconds. 

### 3. Inference Engine (Python / FastAPI)
- **Feature Normalizer & Scaler**: Transforms inbound JSON arrays into strict PyTorch Tensors and NumPy arrays using standard scalers trained on the synthetic dataset.
- **Model Orchestrator**: Uses a `concurrent.futures.ThreadPoolExecutor` or `asyncio.gather` so that the AMNP, Perceptron, SVM, and pure NN execute independently and sequentially fast.
- **AMNP Core**: Computes linear output -> margin optimization -> non-linear layer processing to produce the final tensor prediction.

### 4. Training Engine (Offline / Background)
- **Synthetic Data Generator**: Defines generative rules to spit out huge matrices of labeled interaction vectors.
- **Trainer loop**: A decoupled module dedicated to fitting models and saving `model.pkl` or `.pt` weights that the Inference Engine hot-reloads.

## Build Order Implications
1. **Synthetic Data**: MUST be built first to define exactly what the 1xN feature vector looks like.
2. **Models**: Build baseline models against the synthetic dataset.
3. **AMNP Implementation**: Fine-tune AMNP offline.
4. **FastAPI Inference**: Serve those models statically over REST/Sockets.
5. **React Sandbox**: Finally, connect realistic UI telemetry to the pipeline.
