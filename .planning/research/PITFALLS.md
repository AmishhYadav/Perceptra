# Common Technical Pitfalls

## 1. Feature Shape Mismatch
- **Warning Sign**: High accuracy on synthetic testing set, random (0.33) accuracy on live React UI.
- **Why**: The synthetic dataset generates variables (e.g., standard deviations of cursor X/Y) using an idealistic mathematical distribution that raw human behavior completely violates, OR the fixed array size of windowed telemetry gets shifted by network lag.
- **Prevention**: Map *strictly* normalized heuristics during synthetic generation (e.g., scale everything to absolute ranges [0,1] based on viewport % instead of raw pixels). 
- **Phase Addressed**: *Synthetic Data Generation & Data Pipeline*.

## 2. Inconsistent Latency Spiking
- **Warning Sign**: Frontend visualization dashboards stutter heavily or drop frames when making inference requests.
- **Why**: Hitting a REST API endpoint every 100ms opens/closes TCP sockets relentlessly. Python GIL constraints block concurrent ML execution over multiple endpoints. 
- **Prevention**: Establish a long-lived WebSocket connection. Run inference batching.
- **Phase Addressed**: *Full Stack Pipeline*.

## 3. The AMNP Math "Collapsing"
- **Warning Sign**: The custom AMNP hybrid model's loss plateaus early or predictions collapse into predicting a single class universally.
- **Why**: Combining linear updates with non-linear deep layers causes severe gradient vanishing or explosion if the dynamic weights aren't clipped or if the "margin bounds" strictly override backpropagation paths.
- **Prevention**: Extremely strict gradient clipping, careful tuning of the learning rate separately for the linear vs non-linear branches, and starting the "dynamic weighting" mostly clamped to standard Perceptron logic before fading it in.
- **Phase Addressed**: *AMNP Implementation*.
