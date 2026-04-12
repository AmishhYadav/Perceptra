"""Perceptron model wrapping scikit-learn's Perceptron with BaseModel interface."""
import numpy as np
import joblib
from sklearn.linear_model import Perceptron
from sklearn.calibration import CalibratedClassifierCV
from typing import Dict
from .base import BaseModel


class PerceptronModel(BaseModel):
    """Scikit-learn Perceptron wrapped in the Perceptra BaseModel interface.

    Uses CalibratedClassifierCV for probability estimates since the raw
    Perceptron only produces hard decisions.
    """

    def __init__(self, n_features: int, n_classes: int):
        super().__init__(name="Perceptron", n_features=n_features, n_classes=n_classes)
        self._model = Perceptron(max_iter=1, warm_start=True, tol=None)
        self._calibrated = None

    def train(self, X: np.ndarray, y: np.ndarray, epochs: int = 100, lr: float = 0.01) -> Dict:
        self._model.eta0 = lr
        history = {"loss": [], "accuracy": []}

        for epoch in range(epochs):
            self._model.max_iter = 1
            self._model.fit(X, y)
            preds = self._model.predict(X)
            acc = float(np.mean(preds == y))

            # Hinge-like loss approximation
            decision = self._model.decision_function(X)
            if decision.ndim == 1:
                loss = float(np.mean(np.maximum(0, 1 - y * decision)))
            else:
                correct_scores = decision[np.arange(len(y)), y]
                loss = float(np.mean(np.maximum(0, 1 - correct_scores)))

            history["loss"].append(loss)
            history["accuracy"].append(acc)

        # Calibrate for probability estimates
        self._calibrated = CalibratedClassifierCV(self._model, cv=3, method="sigmoid")
        self._calibrated.fit(X, y)
        self.is_trained = True
        self.training_history = history
        return history

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self._model.predict(X)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        if self._calibrated is not None:
            return self._calibrated.predict_proba(X)
        # Fallback: one-hot from hard predictions
        n = X.shape[0]
        proba = np.zeros((n, self.n_classes))
        preds = self.predict(X)
        proba[np.arange(n), preds] = 1.0
        return proba

    def explain(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        coefs = self._model.coef_
        if coefs.ndim == 2:
            importance = np.mean(np.abs(coefs), axis=0)
        else:
            importance = np.abs(coefs)
        return {"feature_importance": importance}

    def save(self, path: str) -> None:
        joblib.dump({"model": self._model, "calibrated": self._calibrated}, path)

    def load(self, path: str) -> None:
        data = joblib.load(path)
        self._model = data["model"]
        self._calibrated = data["calibrated"]
        self.is_trained = True

