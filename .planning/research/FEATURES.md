# Features Research: Behavioral Intelligence ML

## Domain Features Overview
Behavioral tracking ML endpoints (like traditional fraud detection or captchas) rely heavily on temporal heuristics. Perceptra differs by evaluating custom hybrid models (AMNP) in real-time on a unified dashboard.

## 1. Table Stakes (Must Have)
- **Real-Time Client Telemetry**: Background capture of `[x, y, timestamp]` mouse maps, explicit DOM clicks, page focus status, scroll depths.
- **Normalizing Windowing**: Slicing indefinite real-time tracking data into fixed N-second windows to feed ML inputs correctly formatted.
- **Model Training Loop Evaluation**: Dashboard charting loss rate, epoch completion, and real-time accuracy against synthetic ground truth.
- **Side-by-Side Model Inferencing**: Standardized interfaces where the same normalized feature vector triggers predictions from SVM, Perceptron, NN, and AMNP simultaneously.
- **Classification Output**: Binary or Multi-class output showing confidence bounds for (Focused, Distracted, Confused).

## 2. Differentiators (Competitive Advantage)
- **Live Decision Boundary Visualization**: 2D/3D visualizations mapped to PCA components displaying exactly *where* in the vector space the current user interaction lands.
- **AMNP Interpretability Layer**: Mapping the adaptive weights back to feature importance (e.g. "Model claims user was Confused specifically due to the *hesitation timing* heuristic").
- **Intentional Interaction Sandbox**: Instead of arbitrary tracking, building specialized tasks (timed click targets) built explicitly to provoke the states of hesitation or confusion for high-quality ground-truth.

## 3. Anti-Features (Do Not Build)
- **Generic Analytics Ecosystems**: Avoid replicating Google Analytics. We don't care about bounce rates or page view sessions. 
- **Offline Batch Processing Systems**: Everything must run in an instant, live feedback loop.
- **Camera/Facial Expression Tracking**: To preserve the clean mathematical boundaries of AMNP based solely on UI interaction physics, do not introduce external CV streams.
