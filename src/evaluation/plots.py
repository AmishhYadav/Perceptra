"""Visualization utilities for model evaluation — headless Agg backend."""

import matplotlib

matplotlib.use("Agg")  # Force headless rendering before pyplot import

import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from pathlib import Path
from typing import Dict, List


# Perceptra color palette
COLORS = ["#10b981", "#818cf8", "#f59e0b", "#ef4444"]
sns.set_theme(style="darkgrid", palette=COLORS)


def plot_confusion_matrices(
    matrices: Dict[str, np.ndarray],
    class_names: List[str],
    out_path: str,
) -> str:
    """Generate a 2×2 grid of confusion matrix heatmaps.

    Args:
        matrices: Dict mapping model name → confusion matrix (ndarray).
        class_names: Class label strings.
        out_path: File path to save the figure.

    Returns:
        The output file path.
    """
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    fig.suptitle(
        "Confusion Matrices — All Models", fontsize=16, fontweight="bold", y=0.98
    )

    for ax, (name, cm) in zip(axes.flat, matrices.items()):
        sns.heatmap(
            cm,
            annot=True,
            fmt="d",
            cmap="YlGnBu",
            xticklabels=class_names,
            yticklabels=class_names,
            ax=ax,
            cbar_kws={"shrink": 0.8},
        )
        ax.set_title(name, fontsize=13, fontweight="bold")
        ax.set_xlabel("Predicted")
        ax.set_ylabel("Actual")

    plt.tight_layout(rect=[0, 0, 1, 0.95])
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return out_path


def plot_roc_curves(
    model_probs: Dict[str, np.ndarray],
    y_true: np.ndarray,
    class_names: List[str],
    out_path: str,
) -> str:
    """Generate per-class ROC curves overlaid for all models.

    Args:
        model_probs: Dict mapping model name → probability matrix (n_samples, n_classes).
        y_true: Ground truth label indices.
        class_names: Class label strings.
        out_path: File path to save the figure.

    Returns:
        The output file path.
    """
    from sklearn.metrics import roc_curve, auc
    from sklearn.preprocessing import label_binarize

    n_classes = len(class_names)
    y_bin = label_binarize(y_true, classes=list(range(n_classes)))

    fig, axes = plt.subplots(1, n_classes, figsize=(6 * n_classes, 5))
    fig.suptitle("ROC Curves — Per Class", fontsize=16, fontweight="bold", y=1.02)

    for cls_idx, ax in enumerate(axes):
        ax.plot([0, 1], [0, 1], "k--", alpha=0.3, label="Random")

        for color, (model_name, probs) in zip(COLORS, model_probs.items()):
            fpr, tpr, _ = roc_curve(y_bin[:, cls_idx], probs[:, cls_idx])
            roc_auc = auc(fpr, tpr)
            ax.plot(
                fpr, tpr, color=color, lw=2, label=f"{model_name} (AUC={roc_auc:.3f})"
            )

        ax.set_title(f"{class_names[cls_idx]}", fontsize=13, fontweight="bold")
        ax.set_xlabel("False Positive Rate")
        ax.set_ylabel("True Positive Rate")
        ax.legend(fontsize=8, loc="lower right")
        ax.set_xlim([0, 1])
        ax.set_ylim([0, 1.05])

    plt.tight_layout()
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return out_path
