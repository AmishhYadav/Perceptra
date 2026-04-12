# Project Requirements: Perceptra

## Overview
Perceptra is a behavioral intelligence ML platform requiring a Python backend for hybrid modeling (AMNP, Perceptron, SVM, NN) and a React/TypeScript frontend for real-time telemetry streaming and visualization.

## Core Features
1. **Synthetic Data Pipeline**
   - Generate structured telemetry datasets simulating hesitation, misclicks, fast scrolling, and smoothness.
   - Define exact numeric models to map to labels: `Focused`, `Distracted`, `Confused`.

2. **Core ML Implementation (Backend)**
   - Train Perceptron, SVM, and Neural Network using scikit-learn / PyTorch.
   - Implement the novel AMNP model:
     - Linear sub-layer.
     - Margin-based boundary constraints.
     - Deep non-linear transformation layer.
     - Adaptive learning rate / weighting algorithm.

3. **Telemetry WebSocket Pipeline**
   - Stream normalized mouse/click arrays from the React client to Python at high frequency (10Hz+).
   - Compute batched inference across all 4 models within 50ms total.

4. **Sandbox UI (Frontend)**
   - Interactive testing scenarios (forms, targets to provoke specific behavior).
   - "Behind the Scenes" Dashboard visualizing the data points relative to decision boundaries (PCA reduced if needed).

5. **Comparisons & Explainability**
   - Dashboard displaying accuracy, F1-Score, precision, recall for all models.
   - Highlight the *reasoning*—map high-activation weights back to features like "dwell time".

## Technical Constraints
- The UI must NOT stutter while gathering data.
- The AMNP must run mathematically distinct from standard models; its dynamic weights must be observable.

## Out of Scope
- Cross-site tracker scripts (analytics.js-style).
- Computer Vision / Webcam integration.
