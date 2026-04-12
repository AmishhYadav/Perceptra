---
phase: 1
plan: 4
title: "Training Orchestrator & Smoke Tests"
wave: 3
depends_on: ["01-PLAN-2", "01-PLAN-3"]
files_modified:
  - src/training/__init__.py
  - src/training/trainer.py
  - tests/test_models.py
autonomous: true
requirements: []
---

# Plan 4: Training Orchestrator & Smoke Tests

## Goal
Build the training orchestrator that can train all 4 models in parallel on the same dataset and create comprehensive smoke tests that validate every model's interface compliance.

## must_haves
- ModelTrainer class that trains all models and collects comparative metrics
- Smoke tests verifying train/predict/predict_proba/explain on all 4 models
- AMNP-specific test: margin parameter updates after training

## Tasks

<task id="1.4.1">
<title>Implement ModelTrainer orchestrator</title>
<read_first>
- src/models/__init__.py
- src/models/base.py
- src/utils/metrics.py
- src/data/schemas.py
</read_first>
<action>
Create `src/training/trainer.py`:

```python
import numpy as np
import time
from typing import Dict, List, Optional
from src.models.base import BaseModel
from src.utils.metrics import compute_all_metrics
from src.data.schemas import N_FEATURES, N_CLASSES

class ModelTrainer:
    """Orchestrates training of multiple models on the same dataset."""
    
    def __init__(self, models: List[BaseModel]):
        self.models = models
        self.results: Dict[str, Dict] = {}
    
    def train_all(self, X: np.ndarray, y: np.ndarray, 
                  epochs: int = 100, lr: float = 1e-3,
                  verbose: bool = True) -> Dict[str, Dict]:
        """Train all models sequentially on the same data."""
        results = {}
        for model in self.models:
            if verbose:
                print(f"Training {model.name}...")
            start = time.time()
            history = model.train(X, y, epochs=epochs, lr=lr)
            elapsed = time.time() - start
            
            preds = model.predict(X)
            metrics = compute_all_metrics(y, preds, model.n_classes)
            
            results[model.name] = {
                "history": history,
                "metrics": metrics,
                "training_time": elapsed,
            }
            if verbose:
                print(f"  {model.name}: accuracy={metrics['accuracy']:.4f}, time={elapsed:.2f}s")
        
        self.results = results
        return results
    
    def predict_all(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        """Get predictions from all trained models."""
        predictions = {}
        for model in self.models:
            if model.is_trained:
                predictions[model.name] = model.predict(X)
        return predictions
    
    def predict_proba_all(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        """Get probability predictions from all trained models."""
        probas = {}
        for model in self.models:
            if model.is_trained:
                probas[model.name] = model.predict_proba(X)
        return probas
    
    def explain_all(self, X: np.ndarray) -> Dict[str, Dict]:
        """Get explanations from all trained models."""
        explanations = {}
        for model in self.models:
            if model.is_trained:
                explanations[model.name] = model.explain(X)
        return explanations
    
    def get_comparison(self) -> Dict:
        """Return a summary comparison of all training results."""
        if not self.results:
            return {}
        comparison = {}
        for name, result in self.results.items():
            comparison[name] = {
                "accuracy": result["metrics"]["accuracy"],
                "f1_macro": float(np.mean(result["metrics"]["f1"])),
                "training_time": result["training_time"],
            }
        return comparison
```

Update `src/training/__init__.py`:
```python
from .trainer import ModelTrainer
```
</action>
<acceptance_criteria>
- `src/training/trainer.py` contains `class ModelTrainer`
- `src/training/trainer.py` contains `def train_all(`
- `src/training/trainer.py` contains `def predict_all(`
- `src/training/trainer.py` contains `def explain_all(`
- `src/training/trainer.py` contains `def get_comparison(`
- `src/training/__init__.py` contains `from .trainer import ModelTrainer`
</acceptance_criteria>
</task>

<task id="1.4.2">
<title>Create comprehensive smoke tests</title>
<read_first>
- src/models/__init__.py
- src/models/base.py
- src/training/trainer.py
- src/data/schemas.py
</read_first>
<action>
Create `tests/test_models.py`:

```python
"""Smoke tests for all Perceptra models — validates interface compliance."""
import numpy as np
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models import PerceptronModel, SVMModel, NeuralNetModel, AMNPModel, BaseModel
from src.data import FeaturePreprocessor, FEATURE_NAMES, N_FEATURES, N_CLASSES
from src.training import ModelTrainer
from src.utils.metrics import compute_all_metrics

# Generate small synthetic test data
np.random.seed(42)
X_raw = np.random.randn(150, N_FEATURES).astype(np.float32)
y = np.random.randint(0, N_CLASSES, 150)

# Preprocess
preprocessor = FeaturePreprocessor()
X = preprocessor.fit_transform(X_raw)

ALL_MODELS = [
    PerceptronModel(n_features=N_FEATURES, n_classes=N_CLASSES),
    SVMModel(n_features=N_FEATURES, n_classes=N_CLASSES),
    NeuralNetModel(n_features=N_FEATURES, n_classes=N_CLASSES),
    AMNPModel(n_features=N_FEATURES, n_classes=N_CLASSES),
]

def test_interface_compliance():
    """Every model must implement all BaseModel methods."""
    for model in ALL_MODELS:
        assert isinstance(model, BaseModel), f"{model.name} is not a BaseModel"
        assert hasattr(model, 'train'), f"{model.name} missing train()"
        assert hasattr(model, 'predict'), f"{model.name} missing predict()"
        assert hasattr(model, 'predict_proba'), f"{model.name} missing predict_proba()"
        assert hasattr(model, 'explain'), f"{model.name} missing explain()"
        print(f"  ✓ {model.name} interface OK")

def test_training():
    """All models must train without error and return history dicts."""
    for model in ALL_MODELS:
        history = model.train(X, y, epochs=10, lr=0.01)
        assert isinstance(history, dict), f"{model.name} train() must return dict"
        assert "loss" in history, f"{model.name} history missing 'loss'"
        assert "accuracy" in history, f"{model.name} history missing 'accuracy'"
        assert model.is_trained, f"{model.name} is_trained not set after train()"
        print(f"  ✓ {model.name} training OK (final acc: {history['accuracy'][-1]:.3f})")

def test_predictions():
    """predict() must return (n_samples,), predict_proba() must return (n_samples, n_classes)."""
    for model in ALL_MODELS:
        preds = model.predict(X)
        assert preds.shape == (150,), f"{model.name} predict shape: {preds.shape}, expected (150,)"
        
        proba = model.predict_proba(X)
        assert proba.shape == (150, N_CLASSES), f"{model.name} proba shape: {proba.shape}, expected (150, {N_CLASSES})"
        
        # Probabilities should sum to ~1
        row_sums = proba.sum(axis=1)
        assert np.allclose(row_sums, 1.0, atol=0.01), f"{model.name} probabilities don't sum to 1"
        print(f"  ✓ {model.name} predictions OK")

def test_explain():
    """explain() must return dict with 'feature_importance' key."""
    for model in ALL_MODELS:
        expl = model.explain(X)
        assert isinstance(expl, dict), f"{model.name} explain() must return dict"
        assert "feature_importance" in expl, f"{model.name} missing 'feature_importance'"
        imp = expl["feature_importance"]
        assert len(imp) == N_FEATURES, f"{model.name} importance length: {len(imp)}, expected {N_FEATURES}"
        print(f"  ✓ {model.name} explain OK")

def test_amnp_margin_updates():
    """AMNP margin parameter must change during training."""
    amnp = AMNPModel(n_features=N_FEATURES, n_classes=N_CLASSES)
    history = amnp.train(X, y, epochs=20)
    margins = history.get("margin_mean", [])
    assert len(margins) > 1, "AMNP must track margin_mean in history"
    # Margin should not be stuck at exactly the same value
    assert not all(m == margins[0] for m in margins), "AMNP margin did not update during training!"
    print(f"  ✓ AMNP margin updated: {margins[0]:.4f} → {margins[-1]:.4f}")

def test_trainer_orchestrator():
    """ModelTrainer must train all models and produce comparison."""
    models = [
        PerceptronModel(n_features=N_FEATURES, n_classes=N_CLASSES),
        SVMModel(n_features=N_FEATURES, n_classes=N_CLASSES),
        NeuralNetModel(n_features=N_FEATURES, n_classes=N_CLASSES),
        AMNPModel(n_features=N_FEATURES, n_classes=N_CLASSES),
    ]
    trainer = ModelTrainer(models)
    results = trainer.train_all(X, y, epochs=10, verbose=False)
    assert len(results) == 4, f"Expected 4 results, got {len(results)}"
    comparison = trainer.get_comparison()
    assert len(comparison) == 4
    for name, stats in comparison.items():
        assert "accuracy" in stats
        assert "f1_macro" in stats
        assert "training_time" in stats
    print(f"  ✓ Trainer orchestrator OK — {len(comparison)} models compared")

if __name__ == "__main__":
    print("=" * 60)
    print("PERCEPTRA — Model Smoke Tests")
    print("=" * 60)
    
    print("\n1. Interface Compliance:")
    test_interface_compliance()
    
    print("\n2. Training:")
    test_training()
    
    print("\n3. Predictions:")
    test_predictions()
    
    print("\n4. Explainability:")
    test_explain()
    
    print("\n5. AMNP Margin Updates:")
    test_amnp_margin_updates()
    
    print("\n6. Trainer Orchestrator:")
    test_trainer_orchestrator()
    
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED ✓")
    print("=" * 60)
```
</action>
<acceptance_criteria>
- `tests/test_models.py` contains `def test_interface_compliance()`
- `tests/test_models.py` contains `def test_training()`
- `tests/test_models.py` contains `def test_predictions()`
- `tests/test_models.py` contains `def test_explain()`
- `tests/test_models.py` contains `def test_amnp_margin_updates()`
- `tests/test_models.py` contains `def test_trainer_orchestrator()`
- `tests/test_models.py` contains `ALL TESTS PASSED`
- Running `python tests/test_models.py` exits with code 0
</acceptance_criteria>
</task>

## Verification
```bash
pip install -r requirements.txt
python tests/test_models.py
```
