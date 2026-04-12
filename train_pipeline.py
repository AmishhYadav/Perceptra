#!/usr/bin/env python3
"""Perceptra — Offline Training Pipeline.

Loads the synthetic behavioral dataset, trains all 4 models in parallel,
validates on the test set, saves weights, and prints a comparison table.
"""
import sys
import os
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.data import DatasetManager, N_FEATURES, N_CLASSES, BEHAVIOR_CLASSES
from src.models import PerceptronModel, SVMModel, NeuralNetModel, AMNPModel
from src.training import ModelTrainer
from src.utils.metrics import compute_all_metrics


def main():
    print("=" * 65)
    print("  PERCEPTRA — Offline Training Pipeline")
    print("=" * 65)

    # 1. Load dataset
    print("\n▸ Loading dataset...")
    dm = DatasetManager()
    X_train, X_test, y_train, y_test = dm.load()
    meta = dm.load_metadata()
    print(f"  Train: {len(X_train)} samples | Test: {len(X_test)} samples")

    # 2. Initialize models
    models = [
        PerceptronModel(n_features=N_FEATURES, n_classes=N_CLASSES),
        SVMModel(n_features=N_FEATURES, n_classes=N_CLASSES),
        NeuralNetModel(n_features=N_FEATURES, n_classes=N_CLASSES),
        AMNPModel(n_features=N_FEATURES, n_classes=N_CLASSES),
    ]

    # 3. Train all models (parallel)
    print("\n▸ Training all models in parallel...")
    trainer = ModelTrainer(models)
    results = trainer.train_all(X_train, y_train, epochs=200, lr=1e-3, verbose=True)

    # 4. Evaluate on test set
    print("\n▸ Evaluating on test set...")
    print(f"\n{'Model':<16} {'Train Acc':>10} {'Test Acc':>10} {'F1 Macro':>10} {'Time':>8} {'Epochs':>8}")
    print("-" * 65)

    for model in models:
        train_preds = model.predict(X_train)
        test_preds = model.predict(X_test)
        train_metrics = compute_all_metrics(y_train, train_preds, N_CLASSES)
        test_metrics = compute_all_metrics(y_test, test_preds, N_CLASSES)
        result = results[model.name]
        n_epochs = len(result["history"]["loss"])
        f1_macro = float(np.mean(test_metrics["f1"]))

        print(f"{model.name:<16} {train_metrics['accuracy']:>10.4f} {test_metrics['accuracy']:>10.4f} "
              f"{f1_macro:>10.4f} {result['training_time']:>7.2f}s {n_epochs:>8}")

    # 5. Save weights
    print("\n▸ Saving model weights...")
    weights_dir = "data/weights"
    os.makedirs(weights_dir, exist_ok=True)

    extensions = {"Perceptron": ".joblib", "SVM": ".joblib", "NeuralNetwork": ".pt", "AMNP": ".pt"}
    for model in models:
        ext = extensions[model.name]
        path = os.path.join(weights_dir, f"{model.name.lower()}{ext}")
        model.save(path)
        print(f"  ✓ {model.name} → {path}")

    # 6. AMNP-specific details
    amnp = [m for m in models if m.name == "AMNP"][0]
    amnp_history = results["AMNP"]["history"]
    print(f"\n▸ AMNP Diagnostics:")
    print(f"  Epochs trained: {len(amnp_history['loss'])}")
    print(f"  Final margin mean: {amnp_history['margin_mean'][-1]:.4f}")
    print(f"  Final alpha (nonlinear weight): {amnp_history['alpha'][-1]:.4f}")
    if "val_loss" in amnp_history:
        print(f"  Final val_loss: {amnp_history['val_loss'][-1]:.4f}")
    if "lr" in amnp_history:
        print(f"  Final learning rate: {amnp_history['lr'][-1]:.6f}")

    print("\n" + "=" * 65)
    print("  Training complete! Weights saved to data/weights/")
    print("=" * 65)


if __name__ == "__main__":
    main()
