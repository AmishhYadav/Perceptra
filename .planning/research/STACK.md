# Tech Stack Recommendations

## Architecture Environment
Full Stack (Python + React) with real-time ML telemetry processing.

## 1. Backend (Python ML Server)
- **FastAPI (v0.100+)**: The absolute standard for serving real-time Python endpoints. High performance due to Starlette/Pydantic, natively supports WebSockets for streaming live predictions.
- **PyTorch (v2.0+)**: Critical for developing the AMNP (Adaptive Multimodal Neural Perceptron) hybrid model. Better suited for custom neural architectures and dynamic graph creation than TensorFlow/Keras.
- **scikit-learn (v1.3+)**: Industry standard for the baseline Perceptron and SVM implementations. Provides standard scalers for telemetry feature normalization.
- **NumPy & Pandas**: Essential for tracking feature vectors (mouse movements, dwells).
- **Poetry**: Modern dependency management for Python.

*Why not Django/Flask?* Flask is too slow for real-time WebSocket inference. Django is too heavy and primarily relational-DB-focused, not suited for a pure AI inference loop.

## 2. Frontend (React/TypeScript)
- **Vite (v5) + React (v18)**: Standard 2025 frontend build tool. Extremely fast.
- **TypeScript**: Mandatory for structuring complex telemetry vectors safely before sending to the backend.
- **TailwindCSS**: For rapid prototyping of the Sandbox UI and custom ML evaluation dashboards.
- **Recharts or Chart.js**: For drawing live Epoch training curves and live metric streaming.
- **Socket.io-client / Native WebSockets**: Necessary for bidirectional telemetry streaming.

*Why not Next.js?* The project is highly interactive and real-time. Server-Side Rendering (SSR) adds unnecessary overhead for a purely client-interactive sandbox ML playground.

## 3. Data Representation
- **MsgPack**: Recommended instead of JSON over WebSockets for performance when streaming continuous X/Y pointer coordinates at 60Hz.

## Risk Assessment
- **High**: AMNP custom architecture via PyTorch requires careful optimization so it completes predictions within the 16ms window to render real-time UI updates alongside the baselines.
