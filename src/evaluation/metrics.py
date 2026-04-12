"""Classification metrics computation for model evaluation."""
import numpy as np
from typing import Dict, Any
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)


def compute_classification_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    class_names: list,
) -> Dict[str, Any]:
    """Compute comprehensive classification metrics.

    Args:
        y_true: Ground truth labels.
        y_pred: Predicted labels.
        class_names: List of class name strings.

    Returns:
        Dictionary with accuracy, precision, recall, f1, and confusion matrix.
    """
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_macro": float(precision_score(y_true, y_pred, average="macro")),
        "recall_macro": float(recall_score(y_true, y_pred, average="macro")),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro")),
        "per_class": {
            name: {
                "precision": float(precision_score(y_true, y_pred, average=None)[i]),
                "recall": float(recall_score(y_true, y_pred, average=None)[i]),
                "f1": float(f1_score(y_true, y_pred, average=None)[i]),
            }
            for i, name in enumerate(class_names)
        },
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }
