"""SVM model wrapping scikit-learn's SVC with BaseModel interface."""
import numpy as np
import joblib
from sklearn.svm import SVC
from sklearn.inspection import permutation_importance
from typing import Dict
from .base import BaseModel


class SVMModel(BaseModel):
    """Scikit-learn RBF-kernel SVM wrapped in the Perceptra BaseModel interface.

    Uses probability=True (Platt scaling) for native predict_proba support
    and permutation importance for explain().
    """

    def __init__(self, n_features: int, n_classes: int, kernel: str = "rbf"):
        super().__init__(name="SVM", n_features=n_features, n_classes=n_classes)
        self._model = SVC(kernel=kernel, probability=True, max_iter=1000)
        self._X_train = None
        self._y_train = None

    def train(self, X: np.ndarray, y: np.ndarray, epochs: int = 100, lr: float = 0.01) -> Dict:
        # SVM doesn't have epochs — train once. epochs controls max_iter.
        self._model.max_iter = epochs * 10
        self._model.fit(X, y)
        self._X_train = X.copy()
        self._y_train = y.copy()

        preds = self._model.predict(X)
        acc = float(np.mean(preds == y))
        self.is_trained = True
        history = {"loss": [1.0 - acc], "accuracy": [acc]}
        self.training_history = history
        return history

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self._model.predict(X)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self._model.predict_proba(X)

    def explain(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        if self._X_train is not None and self._y_train is not None:
            result = permutation_importance(
                self._model,
                self._X_train,
                self._y_train,
                n_repeats=10,
                random_state=42,
                n_jobs=-1,
            )
            return {"feature_importance": result.importances_mean}
        return {"feature_importance": np.zeros(self.n_features)}

    def save(self, path: str) -> None:
        joblib.dump({"model": self._model, "X_train": self._X_train, "y_train": self._y_train}, path)

    def load(self, path: str) -> None:
        data = joblib.load(path)
        self._model = data["model"]
        self._X_train = data["X_train"]
        self._y_train = data["y_train"]
        self.is_trained = True
