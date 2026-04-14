#!/usr/bin/env python3
"""Perceptra — Offline Training Pipeline.

Supports two modes:
  --synthetic   Train on generated Gaussian data (default)
  --recorded    Train on real user telemetry from recording sessions
  --mixed       Combine synthetic + recorded data for training

Loads the dataset, trains all 4 models, validates on the test set,
saves weights, and prints a comparison table.
"""
import sys
import os
import argparse
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.data import DatasetManager, RecordedDataManager, N_FEATURES, N_CLASSES, BEHAVIOR_CLASSES
from src.data.preprocessing import FeaturePreprocessor
from src.models import PerceptronModel, SVMModel, NeuralNetModel, AMNPModel
from src.training import ModelTrainer
from src.utils.metrics import compute_all_metrics


def load_data(mode: str):
    """Load training data based on the selected mode."""
    if mode == "synthetic":
        print("▸ Loading synthetic dataset...")
        dm = DatasetManager()
        X_train, X_test, y_train, y_test = dm.load()
        print(f"  Train: {len(X_train)} samples | Test: {len(X_test)} samples")
        return X_train, X_test, y_train, y_test

    elif mode == "recorded":
        print("▸ Loading recorded (real) telemetry...")
        rm = RecordedDataManager()
        stats = rm.get_stats()
        if stats["total_samples"] == 0:
            print("  ✗ No recorded data found!")
            print("  Record sessions via the BehaviorAssessment game first.")
            sys.exit(1)

        # Show stats
        for cls in BEHAVIOR_CLASSES:
            info = stats["per_class"][cls]
            print(f"  {cls}: {info['samples']} samples ({info['sessions']} sessions)")

        X_train, X_test, y_train, y_test = rm.prepare_training_data()
        print(f"  Train: {len(X_train)} samples | Test: {len(X_test)} samples")

        # Warn if data is unbalanced
        for i, cls in enumerate(BEHAVIOR_CLASSES):
            count = int(np.sum(y_train == i))
            if count < 20:
                print(f"  ⚠ WARNING: Only {count} training samples for '{cls}' — record more sessions!")

        return X_train, X_test, y_train, y_test

    elif mode == "mixed":
        print("▸ Loading mixed dataset (synthetic + recorded)...")

        # Load synthetic
        dm = DatasetManager()
        X_syn_train, X_syn_test, y_syn_train, y_syn_test = dm.load()
        print(f"  Synthetic: {len(X_syn_train)} train | {len(X_syn_test)} test")

        # Load recorded (if available)
        rm = RecordedDataManager()
        X_rec, y_rec = rm.load_all()
        if len(X_rec) > 0:
            # Preprocess recorded data to match synthetic distribution
            preprocessor = FeaturePreprocessor()
            preprocessor.load("data/synthetic/preprocessor.joblib")
            X_rec = preprocessor.transform(X_rec)

            # Add recorded to training set (not test — test stays synthetic for consistency)
            X_train = np.concatenate([X_syn_train, X_rec])
            y_train = np.concatenate([y_syn_train, y_rec])
            print(f"  Recorded:  {len(X_rec)} samples added to training")
            print(f"  Combined:  {len(X_train)} train | {len(X_syn_test)} test")
        else:
            X_train = X_syn_train
            y_train = y_syn_train
            print("  No recorded data found — using synthetic only")

        return X_train, X_syn_test, y_syn_train, y_syn_test

    else:
        raise ValueError(f"Unknown mode: {mode}")


def main():
    parser = argparse.ArgumentParser(description="Perceptra Training Pipeline")
    parser.add_argument(
        "--mode",
        choices=["synthetic", "recorded", "mixed"],
        default="synthetic",
        help="Data source: synthetic (default), recorded (real user data), mixed (both)",
    )
    # Shorthand flags
    parser.add_argument("--synthetic", action="store_const", dest="mode", const="synthetic")
    parser.add_argument("--recorded", action="store_const", dest="mode", const="recorded")
    parser.add_argument("--mixed", action="store_const", dest="mode", const="mixed")
    args = parser.parse_args()

    mode = args.mode or "synthetic"

    print("=" * 65)
    print(f"  PERCEPTRA — Offline Training Pipeline [{mode.upper()} DATA]")
    print("=" * 65)

    # 1. Load dataset
    X_train, X_test, y_train, y_test = load_data(mode)

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
    results = trainer.train_all(X_train, y_train, epochs=300, lr=1e-3, verbose=True)

    # 4. Evaluate on test set
    print("\n▸ Evaluating on test set...")
    print(
        f"\n{'Model':<16} {'Train Acc':>10} {'Test Acc':>10} {'F1 Macro':>10} {'Time':>8} {'Epochs':>8}"
    )
    print("-" * 65)

    for model in models:
        train_preds = model.predict(X_train)
        test_preds = model.predict(X_test)
        train_metrics = compute_all_metrics(y_train, train_preds, N_CLASSES)
        test_metrics = compute_all_metrics(y_test, test_preds, N_CLASSES)
        result = results[model.name]
        n_epochs = len(result["history"]["loss"])
        f1_macro = float(np.mean(test_metrics["f1"]))

        print(
            f"{model.name:<16} {train_metrics['accuracy']:>10.4f} {test_metrics['accuracy']:>10.4f} "
            f"{f1_macro:>10.4f} {result['training_time']:>7.2f}s {n_epochs:>8}"
        )

    # 5. Save weights
    print("\n▸ Saving model weights...")
    weights_dir = "data/weights"
    os.makedirs(weights_dir, exist_ok=True)

    extensions = {
        "Perceptron": ".joblib",
        "SVM": ".joblib",
        "NeuralNetwork": ".pt",
        "AMNP": ".pt",
    }
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
    print(f"  Training complete ({mode} data)! Weights saved to data/weights/")
    print("=" * 65)


if __name__ == "__main__":
    main()
