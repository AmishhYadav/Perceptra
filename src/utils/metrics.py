"""Evaluation metrics for model comparison."""
import numpy as np
from typing import Dict


def accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Compute overall classification accuracy."""
    return float(np.mean(y_true == y_pred))


def precision_per_class(y_true: np.ndarray, y_pred: np.ndarray, n_classes: int) -> np.ndarray:
    """Compute precision for each class."""
    precisions = np.zeros(n_classes)
    for c in range(n_classes):
        tp = np.sum((y_pred == c) & (y_true == c))
        fp = np.sum((y_pred == c) & (y_true != c))
        precisions[c] = tp / (tp + fp + 1e-8)
    return precisions


def recall_per_class(y_true: np.ndarray, y_pred: np.ndarray, n_classes: int) -> np.ndarray:
    """Compute recall for each class."""
    recalls = np.zeros(n_classes)
    for c in range(n_classes):
        tp = np.sum((y_pred == c) & (y_true == c))
        fn = np.sum((y_pred != c) & (y_true == c))
        recalls[c] = tp / (tp + fn + 1e-8)
    return recalls


def f1_per_class(y_true: np.ndarray, y_pred: np.ndarray, n_classes: int) -> np.ndarray:
    """Compute F1 score for each class."""
    p = precision_per_class(y_true, y_pred, n_classes)
    r = recall_per_class(y_true, y_pred, n_classes)
    return 2 * (p * r) / (p + r + 1e-8)


def compute_all_metrics(y_true: np.ndarray, y_pred: np.ndarray, n_classes: int) -> Dict:
    """Compute all evaluation metrics in one call.

    Returns:
        Dictionary with 'accuracy' (float), 'precision' (list), 'recall' (list), 'f1' (list).
    """
    return {
        "accuracy": accuracy(y_true, y_pred),
        "precision": precision_per_class(y_true, y_pred, n_classes).tolist(),
        "recall": recall_per_class(y_true, y_pred, n_classes).tolist(),
        "f1": f1_per_class(y_true, y_pred, n_classes).tolist(),
    }
