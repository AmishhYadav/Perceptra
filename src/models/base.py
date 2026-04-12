"""Abstract base class for all Perceptra models."""

from abc import ABC, abstractmethod
import numpy as np
from typing import Dict, Optional


class BaseModel(ABC):
    """Abstract base class enforcing a unified interface for all Perceptra models.

    Every model (Perceptron, SVM, NeuralNetwork, AMNP) must implement:
    - train(): fit the model on data, return training history
    - predict(): return class label predictions
    - predict_proba(): return class probability distributions
    - explain(): return feature importance scores
    """

    def __init__(self, name: str, n_features: int, n_classes: int):
        self.name = name
        self.n_features = n_features
        self.n_classes = n_classes
        self.is_trained = False
        self.training_history: list = []

    @abstractmethod
    def train(
        self, X: np.ndarray, y: np.ndarray, epochs: int = 100, lr: float = 0.01
    ) -> Dict:
        """Train the model on feature matrix X and labels y.

        Args:
            X: Feature matrix of shape (n_samples, n_features).
            y: Labels of shape (n_samples,).
            epochs: Number of training iterations.
            lr: Learning rate.

        Returns:
            Dictionary with keys 'loss' and 'accuracy', each a list of per-epoch values.
        """
        pass

    @abstractmethod
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Return predicted class labels as shape (n_samples,)."""
        pass

    @abstractmethod
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Return class probabilities as shape (n_samples, n_classes)."""
        pass

    @abstractmethod
    def explain(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        """Return feature importance scores.

        Returns:
            Dictionary with at least 'feature_importance' key mapping to
            an array of shape (n_features,).
        """
        pass

    @abstractmethod
    def save(self, path: str) -> None:
        """Save trained model weights/state to disk.

        Args:
            path: File path to save to (extension depends on framework).
        """
        pass

    @abstractmethod
    def load(self, path: str) -> None:
        """Load model weights/state from disk. Sets is_trained = True.

        Args:
            path: File path to load from.
        """
        pass

    def get_params(self) -> Dict:
        """Return model parameters for serialization."""
        return {
            "name": self.name,
            "n_features": self.n_features,
            "n_classes": self.n_classes,
        }
