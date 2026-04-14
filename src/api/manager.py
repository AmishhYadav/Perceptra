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

        # AMNP-specific extras (v3: margin confidence + path-decomposed importance)
        if model_name == "AMNP":
            result["extras"] = {
                "component_weights": explanation.get("component_weights", {}),
                "mean_margin": explanation.get("mean_margin", 0.0),
                "margin_satisfaction": explanation.get("margin_satisfaction", 0.0),
                "nonlinear_importance": {
                    FEATURE_NAMES[i]: float(
                        explanation.get("nonlinear_importance", np.zeros(N_FEATURES))[i]
                    )
                    for i in range(N_FEATURES)
                },
                "linear_importance": {
                    FEATURE_NAMES[i]: float(
                        explanation.get("linear_importance", np.zeros(N_FEATURES))[i]
                    )
                    for i in range(N_FEATURES)
                },
            }

        return result

    def get_all_predictions(self, telemetry: Dict[str, float]) -> Dict[str, Dict]:
        """Run inference on ALL models for the same telemetry payload.

        Preprocesses once, then predicts with every loaded model.
        """
        # Detect "Idle" state: if no movement, no clicks, no scroll, no dwell.
        # This prevents "End of Game" silence from being classified as "Distracted".
        is_idle = all(
            telemetry.get(f, 0.0) == 0.0 
            for f in ["click_frequency", "navigation_speed", "scroll_depth"]
        )

        # Convert dict → numpy array and preprocess once
        raw = np.array(
            [[telemetry.get(f, 0.0) for f in FEATURE_NAMES]], dtype=np.float32
        )
        X = self.preprocessor.transform(raw)

        results = {}
        for model_name, model in self.models.items():
            proba = model.predict_proba(X)[0]
            pred_idx = int(np.argmax(proba))
            pred_class = BEHAVIOR_CLASSES[pred_idx]
            confidence = float(proba[pred_idx])
            
            # Override for idle if necessary (optional - let's see if we need it)
            # if is_idle:
            #     pred_class = "focused" # or maintain last state if we had a stateful manager

            explanation = model.explain(X)
            importance = explanation.get("feature_importance", np.zeros(N_FEATURES))

            result = {
                "model_name": model_name,
                "predicted_class": pred_class,
                "confidence": confidence,
                "is_idle": is_idle,
                "probabilities": {
                    BEHAVIOR_CLASSES[i]: float(proba[i]) for i in range(N_CLASSES)
                },
                "feature_importance": {
                    FEATURE_NAMES[i]: float(importance[i]) for i in range(N_FEATURES)
                },
            }

            # AMNP-specific extras (v3: margin confidence + path-decomposed importance)
            if model_name == "AMNP":
                result["extras"] = {
                    "component_weights": explanation.get("component_weights", {}),
                    "mean_margin": explanation.get("mean_margin", 0.0),
                    "margin_satisfaction": explanation.get("margin_satisfaction", 0.0),
                    "nonlinear_importance": {
                        FEATURE_NAMES[i]: float(
                            explanation.get("nonlinear_importance", np.zeros(N_FEATURES))[i]
                        )
                        for i in range(N_FEATURES)
                    },
                    "linear_importance": {
                        FEATURE_NAMES[i]: float(
                            explanation.get("linear_importance", np.zeros(N_FEATURES))[i]
                        )
                        for i in range(N_FEATURES)
                    },
                }

            results[model_name] = result

        return results

    def list_models(self):
        """Return available model names."""
        return list(self.models.keys())
