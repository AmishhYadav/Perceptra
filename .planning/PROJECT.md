# Perceptra

## What This Is
Perceptra is an AI-powered behavioral intelligence system that classifies human interaction in real-time. It monitors telemetry—mouse movement, click timing, dwell time, scroll behavior, and navigation paths—to classify the user's behavioral state (e.g., focused, distracted, confused). 

The system operates on a dual-environment basis:
1. **Model Comparison & Training Visualization**: A dashboard demonstrating parallel training of four models (Perceptron, SVM, Neural Network, and the novel AMNP) against a synthetic dataset.
2. **Real-Time Classification**: A controlled Sandbox UI that captures live interactions, streams them to the backend, and presents the models' predictions, reasoning, and confidences side-by-side.

At its core, Perceptra introduces **AMNP (Adaptive Multimodal Neural Perceptron)**—a custom hybrid model bridging linear decision-making (Perceptron), margin-based learning (SVM), and non-linear feature transformation (Neural Network) enhanced with adaptive margin adjustment and dynamic weighting.

## Why It Matters
Behavioral intelligence traditionally operates offline using batch-processed data. Perceptra offers a real-time explainability framework that not only classifies behavior on the fly but makes the ML evaluation fully interpretable by comparing novel models (AMNP) against industry baselines simultaneously.

## Context
- **Target Users**: Data scientists, behavioral analysts, or developers testing novel models.
- **Problem**: Understanding why an ML model classified an interaction is typically a black box. Capturing nuanced interaction (hesitation, misclicks) requires highly structured testing.
- **Current State**: Greenfield.

## Requirements

### Validated
*(None yet — ship to validate)*

### Active
- [ ] **Data Pipeline**: Capture live client-side telemetry (mouse, scroll, timing, clicks) and structure it into feature vectors.
- [ ] **Synthetic Dataset**: Generate a structured dataset with features simulating click frequency, hesitation, misclicks, and movement smoothness.
- [ ] **Baseline Models**: Implement and train standard Perceptron, SVM, and Neural Network models in Python.
- [ ] **AMNP Implementation**: Develop the AMNP hybrid model with linear, margin-based, and non-linear components plus adaptive weights.
- [ ] **Training Visualization**: UI showing real-time training progress, decision boundaries, and data point classification.
- [ ] **Comparison Dashboard**: UI evaluating models simultaneously on accuracy, precision, recall, F1, convergence, and calibration.
- [ ] **Real-Time Full Stack Pipeline**: Connect the React frontend sandbox to the Python backend via API/WebSockets for live metric streaming and prediction.
- [ ] **Sandbox UI**: A dedicated interface with structured tasks (forms, timed actions) to intentionally draw out focused, distracted, or confused behavior patterns.
- [ ] **Explainability Layer**: Visualization of why predictions are made, mapping weights back to feature contributions (e.g., hesitation vs misclicks).

### Out of Scope
- [ ] Integrating the tracker into third-party web apps (Focus is restricted to the controlled sandbox UI for high-fidelity evaluation).
- [ ] Client-side ML Execution (All inference and training will explicitly stay in the Python backend).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full Stack Architecture (Python + React) | Affords maximum control over complex ML implementations (PyTorch, SciKit) while maintaining a rich visualization layer. | — Pending |
| Controlled Sandbox UI for Telemetry | Ensures collected data matches the features structure of the synthetic training set, avoiding the noise of a generic tracker. | — Pending |
| AMNP as Hybrid | Reaps the benefits of explicit margin bounds while allowing deep feature transformation. | — Pending |
| Real-time WebSockets/APIs | Necessary to provide live feedback on interaction behavior without polling lag. | — Pending |

## Evolution
This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: April 2026 after initialization*
