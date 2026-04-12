"""ModelManager — eagerly loads all trained models and preprocessor at startup.

Serves as the single in-memory inference gateway for the Perceptra API.
"""

import numpy as np
from pathlib import Path
from typing import Dict

from src.data.preprocessing import FeaturePreprocessor
from src.data.schemas import FEATURE_NAMES, BEHAVIOR_CLASSES, N_FEATURES, N_CLASSES
from src.models import PerceptronModel, SVMModel, NeuralNetModel, AMNPModel


WEIGHTS_DIR = Path("data/weights")
PREPROCESSOR_PATH = Path("data/synthetic/preprocessor.joblib")


class ModelManager:
    """Singleton-style manager that holds all 4 trained models in memory.

    Usage:
        manager = ModelManager()
        result = manager.get_prediction("AMNP", {"click_frequency": 0.5, ...})
    """

    def __init__(
        self,
        weights_dir: Path = WEIGHTS_DIR,
        preprocessor_path: Path = PREPROCESSOR_PATH,
    ):
        self.weights_dir = Path(weights_dir)
        self.preprocessor = FeaturePreprocessor()
        self.preprocessor.load(str(preprocessor_path))

        # Instantiate and load all models
        self.models: Dict[str, object] = {}
        model_specs = [
            ("Perceptron", PerceptronModel, "perceptron.joblib"),
            ("SVM", SVMModel, "svm.joblib"),
            ("NeuralNetwork", NeuralNetModel, "neuralnetwork.pt"),
            ("AMNP", AMNPModel, "amnp.pt"),
        ]
        for name, ModelClass, filename in model_specs:
            model = ModelClass(n_features=N_FEATURES, n_classes=N_CLASSES)
            model.load(str(self.weights_dir / filename))
            self.models[name] = model

    def get_prediction(self, model_name: str, telemetry: Dict[str, float]) -> Dict:
        """Run a single inference given a raw telemetry dictionary.

        Args:
            model_name: One of 'Perceptron', 'SVM', 'NeuralNetwork', 'AMNP'.
            telemetry: Dictionary with 8 feature keys.

        Returns:
            Dictionary with predicted_class, confidence, probabilities,
            feature_importance, and optional extras.
        """
        if model_name not in self.models:
            raise ValueError(
                f"Unknown model '{model_name}'. "
                f"Available: {list(self.models.keys())}"
            )

        model = self.models[model_name]

        # Convert dict → numpy array and preprocess
        raw = np.array(
            [[telemetry.get(f, 0.0) for f in FEATURE_NAMES]], dtype=np.float32
        )
        X = self.preprocessor.transform(raw)

        # Predict
        proba = model.predict_proba(X)[0]
        pred_idx = int(np.argmax(proba))
        pred_class = BEHAVIOR_CLASSES[pred_idx]
        confidence = float(proba[pred_idx])

        # Explain
        explanation = model.explain(X)
        importance = explanation.get("feature_importance", np.zeros(N_FEATURES))

        result = {
            "model_name": model_name,
            "predicted_class": pred_class,
            "confidence": confidence,
            "probabilities": {
                BEHAVIOR_CLASSES[i]: float(proba[i]) for i in range(N_CLASSES)
            },
            "feature_importance": {
                FEATURE_NAMES[i]: float(importance[i]) for i in range(N_FEATURES)
            },
        }

        # AMNP-specific extras
        if model_name == "AMNP":
            result["extras"] = {
                "component_weights": explanation.get("component_weights", {}),
                "mean_margin": explanation.get("mean_margin", 0.0),
            }

        return result

    def list_models(self):
        """Return available model names."""
        return list(self.models.keys())
