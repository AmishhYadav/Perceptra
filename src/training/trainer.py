"""Training orchestrator for running all Perceptra models on the same dataset."""
import numpy as np
import time
from typing import Dict, List, Optional
from src.models.base import BaseModel
from src.utils.metrics import compute_all_metrics
from src.data.schemas import N_FEATURES, N_CLASSES


class ModelTrainer:
    """Orchestrates training of multiple models on the same dataset and collects
    comparative metrics for the evaluation dashboard."""

    def __init__(self, models: List[BaseModel]):
        self.models = models
        self.results: Dict[str, Dict] = {}

    def train_all(
        self,
        X: np.ndarray,
        y: np.ndarray,
        epochs: int = 100,
        lr: float = 1e-3,
        verbose: bool = True,
    ) -> Dict[str, Dict]:
        """Train all models sequentially on the same data.

        Args:
            X: Feature matrix (n_samples, n_features).
            y: Labels (n_samples,).
            epochs: Training iterations per model.
            lr: Learning rate.
            verbose: Print progress.

        Returns:
            Dictionary mapping model name to training results.
        """
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
