"""Training orchestrator for running all Perceptra models on the same dataset."""
import numpy as np
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
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

    @staticmethod
    def _train_single(model: BaseModel, X: np.ndarray, y: np.ndarray,
                      epochs: int, lr: float) -> Dict:
        """Train a single model and return its results. Runs in a thread."""
        start = time.time()
        history = model.train(X, y, epochs=epochs, lr=lr)
        elapsed = time.time() - start
        preds = model.predict(X)
        metrics = compute_all_metrics(y, preds, model.n_classes)
        return {
            "name": model.name,
            "history": history,
            "metrics": metrics,
            "training_time": elapsed,
        }

    def train_all(
        self,
        X: np.ndarray,
        y: np.ndarray,
        epochs: int = 100,
        lr: float = 1e-3,
        verbose: bool = True,
        parallel: bool = True,
    ) -> Dict[str, Dict]:
        """Train all models on the same data.

        Args:
            X: Feature matrix (n_samples, n_features).
            y: Labels (n_samples,).
            epochs: Training iterations per model.
            lr: Learning rate.
            verbose: Print progress.
            parallel: If True, train models concurrently via ThreadPoolExecutor.

        Returns:
            Dictionary mapping model name to training results.
        """
        results = {}

        if parallel and len(self.models) > 1:
            if verbose:
                print(f"Training {len(self.models)} models in parallel...")
            with ThreadPoolExecutor(max_workers=len(self.models)) as executor:
                futures = {
                    executor.submit(self._train_single, model, X, y, epochs, lr): model
                    for model in self.models
                }
                for future in as_completed(futures):
                    result = future.result()
                    name = result.pop("name")
                    results[name] = result
                    if verbose:
                        print(f"  ✓ {name}: accuracy={result['metrics']['accuracy']:.4f}, "
                              f"time={result['training_time']:.2f}s")
        else:
            for model in self.models:
                if verbose:
                    print(f"Training {model.name}...")
                result = self._train_single(model, X, y, epochs, lr)
                name = result.pop("name")
                results[name] = result
                if verbose:
                    print(f"  ✓ {name}: accuracy={result['metrics']['accuracy']:.4f}, "
                          f"time={result['training_time']:.2f}s")

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
