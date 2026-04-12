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
        assert hasattr(model, "train"), f"{model.name} missing train()"
        assert hasattr(model, "predict"), f"{model.name} missing predict()"
        assert hasattr(model, "predict_proba"), f"{model.name} missing predict_proba()"
        assert hasattr(model, "explain"), f"{model.name} missing explain()"
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
        assert proba.shape == (150, N_CLASSES), (
            f"{model.name} proba shape: {proba.shape}, expected (150, {N_CLASSES})"
        )

        # Probabilities should sum to ~1
        row_sums = proba.sum(axis=1)
        assert np.allclose(row_sums, 1.0, atol=0.05), (
            f"{model.name} probabilities don't sum to 1"
        )
        print(f"  ✓ {model.name} predictions OK")


def test_explain():
    """explain() must return dict with 'feature_importance' key."""
    for model in ALL_MODELS:
        expl = model.explain(X)
        assert isinstance(expl, dict), f"{model.name} explain() must return dict"
        assert "feature_importance" in expl, f"{model.name} missing 'feature_importance'"
        imp = expl["feature_importance"]
        assert len(imp) == N_FEATURES, (
            f"{model.name} importance length: {len(imp)}, expected {N_FEATURES}"
        )
        print(f"  ✓ {model.name} explain OK")


def test_amnp_margin_updates():
    """AMNP margin parameter must change during training."""
    amnp = AMNPModel(n_features=N_FEATURES, n_classes=N_CLASSES)
    history = amnp.train(X, y, epochs=20)
    margins = history.get("margin_mean", [])
    assert len(margins) > 1, "AMNP must track margin_mean in history"
    # Margin should not be stuck at exactly the same value
    assert not all(m == margins[0] for m in margins), (
        "AMNP margin did not update during training!"
    )
    print(f"  ✓ AMNP margin updated: {margins[0]:.4f} → {margins[-1]:.4f}")

    # Alpha should also be tracked
    alphas = history.get("alpha", [])
    assert len(alphas) > 0, "AMNP must track alpha in history"
    print(f"  ✓ AMNP alpha (nonlinear weight): {alphas[-1]:.4f}")


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

    # Test predict_all and explain_all
    all_preds = trainer.predict_all(X)
    assert len(all_preds) == 4
    all_expl = trainer.explain_all(X)
    assert len(all_expl) == 4
    print(f"  ✓ predict_all and explain_all OK")


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
