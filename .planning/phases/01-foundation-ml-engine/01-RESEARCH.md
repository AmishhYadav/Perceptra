# Phase 1: Foundation ML Engine — Research

## Objective
Research how to implement the foundational ML engine with a unified BaseModel interface, hybrid scikit-learn/PyTorch execution, and the novel AMNP architecture.

## 1. Unified Model Interface (BaseModel Pattern)

### Recommended Approach
Use Python's `abc.ABC` (Abstract Base Class) to define a `BaseModel` that enforces `train()`, `predict()`, `predict_proba()`, and `explain()` across all implementations.

**For scikit-learn models (Perceptron, SVM):** Wrap them in adapter classes that delegate to the scikit-learn estimator internally but expose the BaseModel interface externally.

**For PyTorch models (NN, AMNP):** Subclass both `BaseModel` and compose a `torch.nn.Module` internally. Keep the `nn.Module` as a private attribute; the public API is always `BaseModel`.

### Project Structure (Recommended)
```
src/
├── models/
│   ├── __init__.py
│   ├── base.py           # BaseModel ABC
│   ├── perceptron.py     # Scikit-learn Perceptron wrapper
│   ├── svm.py            # Scikit-learn SVM wrapper
│   ├── neural_net.py     # PyTorch NN
│   └── amnp.py           # Custom AMNP (PyTorch)
├── data/
│   ├── __init__.py
│   ├── preprocessing.py  # Feature vector normalization
│   └── schemas.py        # Input/output type definitions
├── training/
│   ├── __init__.py
│   └── trainer.py        # Orchestrates training across all models
└── utils/
    ├── __init__.py
    └── metrics.py         # Accuracy, F1, precision, recall helpers
```

### Key Design Decisions
- `train(X, y)` accepts NumPy arrays universally. PyTorch models convert internally to tensors.
- `predict(X)` returns NumPy arrays of class labels.
- `predict_proba(X)` returns NumPy arrays of shape `(n_samples, n_classes)`.
- `explain(X)` returns a dict mapping feature names to importance scores.

## 2. AMNP Architecture Research

### Core Components
Based on research, the AMNP should be structured as a `torch.nn.Module` with three distinct sub-modules:

1. **Feature Transformation Layer** — A small MLP (2-3 hidden layers, ReLU activation) that maps raw feature vectors into a learned representation space.
2. **Adaptive Margin Layer** — Uses `nn.Parameter` for the margin, making it a learnable parameter optimized via backpropagation. The margin adjusts per-sample based on the transformed feature representation.
3. **Decision Layer** — Linear classification head that produces logits, combined with the adaptive margin for final predictions.

### Critical Implementation Notes
- **Gradient Clipping**: Essential to prevent gradient explosion when combining linear and non-linear branches. Use `torch.nn.utils.clip_grad_norm_` with max_norm=1.0.
- **Numerical Stability**: Add epsilon (1e-6) to all division and sqrt operations.
- **Vectorization**: All margin computations must be batched — no Python loops over samples.
- **Loss Function**: Custom `AdaptiveMarginLoss` as an `nn.Module` subclass, incorporating the dynamic margin into the hinge-style loss.

### Adaptive Margin Formula
```
margin(x) = base_margin + sigmoid(W_margin @ transform(x) + b_margin)
```
Where `W_margin` and `b_margin` are learnable parameters. The sigmoid bounds the adjustment to [0, 1], preventing unbounded margin expansion.

## 3. Scikit-learn Baseline Models

### Perceptron
- Use `sklearn.linear_model.Perceptron` with default configuration.
- Wrap with `StandardScaler` in preprocessing (not inside the model class — handled upstream).
- `explain()` maps `coef_` weights directly to feature names.

### SVM
- Use `sklearn.svm.SVC(kernel='rbf', probability=True)` to enable `predict_proba()`.
- `probability=True` enables Platt scaling for probability calibration.
- `explain()` uses permutation importance (`sklearn.inspection.permutation_importance`) since RBF kernel SVM doesn't have direct feature coefficients.

## 4. Neural Network (Standard PyTorch)
- 3-layer MLP: input → 64 → 32 → n_classes.
- ReLU activations, dropout(0.3), batch normalization.
- CrossEntropyLoss, Adam optimizer, lr=1e-3.
- `explain()` uses input gradient saliency (backprop gradients w.r.t. input features).

## 5. Risk Mitigations
| Risk | Mitigation |
|------|-----------|
| AMNP margin collapse (all margins → 0) | Initialize base_margin=1.0, add L2 regularization on margin parameters |
| SVM predict_proba slow on large data | Platt scaling is O(n²) — acceptable for behavioral telemetry batch sizes (<10k) |
| Gradient explosion in AMNP | clip_grad_norm_ with max_norm=1.0 on every backward pass |
| Feature shape mismatch between frameworks | Single `preprocessing.py` module normalizes ALL inputs before any model sees them |

## Validation Architecture
- Unit tests for each model's interface compliance (does it have train/predict/predict_proba/explain).
- Smoke test: train each model on a tiny synthetic array (100 samples, 5 features, 3 classes) and verify predictions shape.
- AMNP-specific: verify margin parameter is updating (not stuck at initialization) after 10 training steps.

---
*Research complete — ready for planning*
