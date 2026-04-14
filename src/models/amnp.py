"""Adaptive Multimodal Neural Perceptron (AMNP) — Perceptra's novel hybrid model.

Combines:
- Linear decision-making (Perceptron path)
- Margin-based learning (adaptive hinge loss)
- Non-linear feature transformation (neural network path)
- Input-conditioned dynamic gating between linear and non-linear branches

v3 Architectural Improvements:
- Input-conditioned alpha gate (per-sample path weighting replaces global scalar)
- Margin-based confidence at inference (margin satisfaction metric)
- Margin regularization (target penalty + diversity term prevents collapse/explosion)
- Mini-batch stochastic training (correct BatchNorm + implicit regularization)
- Path-decomposed explanations (per-path gradient attribution)

v2 Generalization enhancements:
- Dropout regularization in the non-linear transform path
- Hybrid loss: AdaptiveMarginLoss + λ·CrossEntropyLoss for smooth gradients
- Softplus-activated margin net (unbounded positive margins)
"""

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from typing import Dict
from .base import BaseModel


class AdaptiveMarginLoss(nn.Module):
    """Custom loss incorporating per-sample adaptive margins into a hinge-style objective.

    The margin is not fixed — it is produced by a learned sub-network and varies
    per sample based on the transformed feature representation.
    """

    def __init__(self, base_margin: float = 1.0):
        super().__init__()
        self.base_margin = base_margin

    def forward(
        self, logits: torch.Tensor, targets: torch.Tensor, margins: torch.Tensor
    ) -> torch.Tensor:
        """Compute adaptive margin hinge loss.

        Args:
            logits: (batch, n_classes) raw model output.
            targets: (batch,) integer class labels.
            margins: (batch,) per-sample adaptive margin values.

        Returns:
            Scalar loss value.
        """
        one_hot = torch.zeros_like(logits).scatter_(1, targets.unsqueeze(1), 1.0)

        # Score for the correct class
        correct_scores = (logits * one_hot).sum(dim=1)

        # Highest score among incorrect classes
        masked_logits = logits.clone()
        masked_logits[one_hot.bool()] = float("-inf")
        max_incorrect = masked_logits.max(dim=1).values

        # Hinge loss: penalize when margin between correct and best-incorrect is too small
        loss = torch.clamp(margins - (correct_scores - max_incorrect), min=0.0)
        return loss.mean()


class _AMNPNetwork(nn.Module):
    """The core AMNP v3 architecture with input-conditioned gating.

    Architecture:
        Input → [Feature Transform (MLP)] → transformed_features
                                           ↳ [Margin Net] → per-sample margins
                                           ↳ [Decision Layer] → non-linear logits
                                           ↳ [Alpha Gate] → per-sample path weights
        Input → [Linear Path] → linear logits
        Combined = α(x) · non-linear + (1−α(x)) · linear

    Key difference from v2: α is no longer a single learned scalar. It is produced
    by a small gating network conditioned on the transformed input, allowing the
    model to route easy samples through the fast linear path and hard samples
    through the deep nonlinear path.
    """

    def __init__(self, n_features: int, n_classes: int, hidden_dim: int = 64):
        super().__init__()

        # Feature Transformation Layer (non-linear path)
        self.transform = nn.Sequential(
            nn.Linear(n_features, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
        )

        # Adaptive Margin Layer — produces per-sample margin adjustments
        self.margin_base = nn.Parameter(torch.tensor(1.0))
        # Softplus activation — unbounded positive margins
        self.margin_net = nn.Sequential(
            nn.Linear(hidden_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Softplus(),  # unbounded positive output
        )

        # Decision Layer (linear classification on transformed features)
        self.decision = nn.Linear(hidden_dim, n_classes)

        # [v3] Input-conditioned alpha gate — per-sample path weighting.
        # Replaces the global scalar nn.Parameter(1.4) from v2.
        # Each sample gets its own nonlinear/linear blend ratio based on
        # its transformed representation — easy inputs lean on the fast
        # linear path, ambiguous inputs rely on the deep nonlinear path.
        self.alpha_gate = nn.Sequential(
            nn.Linear(hidden_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
        )
        # Initialise output bias to 1.4 → sigmoid(1.4) ≈ 0.80, preserving
        # the v2 default of favouring the non-linear path early in training
        nn.init.constant_(self.alpha_gate[-1].bias, 1.4)

        # Linear path (perceptron-style direct classification)
        self.linear_path = nn.Linear(n_features, n_classes)

    def forward(self, x: torch.Tensor) -> tuple:
        """Forward pass returning logits, margins, transformed features, and alpha weights.

        Returns:
            Tuple of (combined_logits, margins, transformed_features, alpha_weights).
        """
        # Non-linear path: transform → decide
        transformed = self.transform(x)
        nonlinear_logits = self.decision(transformed)

        # Linear path: direct classification
        linear_logits = self.linear_path(x)

        # [v3] Per-sample gating — each input decides its own blend ratio
        alpha_weights = torch.sigmoid(self.alpha_gate(transformed))  # (batch, 1)
        combined_logits = alpha_weights * nonlinear_logits + (1 - alpha_weights) * linear_logits

        # Adaptive margin computation
        margin_adjustment = self.margin_net(transformed).squeeze(-1)
        margins = self.margin_base + margin_adjustment

        return combined_logits, margins, transformed, alpha_weights

    def get_component_weights(self, alpha_weights: torch.Tensor = None) -> Dict[str, float]:
        """Return the mean dynamic weighting between linear and non-linear paths.

        Args:
            alpha_weights: Per-sample alpha tensor from the most recent forward pass.
                If None, returns a placeholder value.
        """
        if alpha_weights is not None:
            weight = float(alpha_weights.mean().item())
        else:
            weight = 0.5  # fallback when no forward-pass data is available
        return {"nonlinear_weight": weight, "linear_weight": 1.0 - weight}


class AMNPModel(BaseModel):
    """Adaptive Multimodal Neural Perceptron (v3) — hybrid model combining
    linear decision-making, margin-based learning, non-linear feature
    transformation, and input-conditioned gating.

    This is Perceptra's core innovation. The model uses a learned gating
    network to dynamically balance between a simple linear classifier and
    a deep feature transformer *per sample*, while learning per-sample
    adaptive margins that adjust the decision boundary based on input
    complexity.

    v3 additions over v2:
        - Per-sample alpha via gating network (not a global scalar)
        - Margin satisfaction metric for principled confidence / reject-option
        - Margin regularisation (target + diversity terms)
        - Mini-batch SGD with DataLoader
        - Path-decomposed gradient attribution for explain()
    """

    def __init__(self, n_features: int, n_classes: int, hidden_dim: int = 64):
        super().__init__(name="AMNP", n_features=n_features, n_classes=n_classes)
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._model = _AMNPNetwork(n_features, n_classes, hidden_dim).to(self._device)
        self._margin_criterion = AdaptiveMarginLoss(base_margin=1.0)
        # Hybrid loss — smooth CE gradients + interpretable margins
        self._ce_criterion = nn.CrossEntropyLoss()
        self._ce_lambda = 1.0  # blending weight for cross-entropy component
        self._hidden_dim = hidden_dim

        # [v3] Margin regularisation hyperparameters
        self._margin_target = 1.0        # target value margins are pulled toward
        self._margin_reg_weight = 0.1    # strength of target-pull regularisation
        self._margin_div_weight = 0.01   # strength of diversity encouragement

    def train(
        self,
        X: np.ndarray,
        y: np.ndarray,
        epochs: int = 100,
        lr: float = 1e-3,
        batch_size: int = 128,
    ) -> Dict:
        self._model.train()

        if not hasattr(self, "_optimizer"):
            self._optimizer = optim.Adam(self._model.parameters(), lr=lr, weight_decay=1e-4)
            self._scheduler = optim.lr_scheduler.ReduceLROnPlateau(
                self._optimizer, mode="min", factor=0.5, patience=5
            )

        optimizer = self._optimizer
        scheduler = self._scheduler

        # Internal validation split (80/20) for early stopping
        n = len(X)
        if n >= 100:
            n_val = max(int(n * 0.2), 10)
            indices = np.random.permutation(n)
            X_train_np, X_val_np = X[indices[n_val:]], X[indices[:n_val]]
            y_train_np, y_val_np = y[indices[n_val:]], y[indices[:n_val]]
        else:
            X_train_np, X_val_np = X, X
            y_train_np, y_val_np = y, y

        X_t = torch.tensor(X_train_np, dtype=torch.float32).to(self._device)
        y_t = torch.tensor(y_train_np, dtype=torch.long).to(self._device)
        X_v = torch.tensor(X_val_np, dtype=torch.float32).to(self._device)
        y_v = torch.tensor(y_val_np, dtype=torch.long).to(self._device)

        # [v3] Mini-batch DataLoader — stochastic gradients provide implicit
        # regularisation and give BatchNorm realistic batch statistics
        train_dataset = TensorDataset(X_t, y_t)
        train_loader = DataLoader(
            train_dataset, batch_size=batch_size, shuffle=True, drop_last=False,
        )

        history = {
            "loss": [],
            "accuracy": [],
            "margin_mean": [],
            "alpha": [],
            "val_loss": [],
            "lr": [],
        }

        # Early stopping state
        best_val_loss = float("inf")
        best_state = None
        patience_counter = 0
        patience = 15

        for epoch in range(epochs):
            self._model.train()

            # ── Mini-batch training loop ──
            epoch_loss = 0.0
            epoch_correct = 0
            epoch_total = 0
            batch_margins = []
            batch_alphas = []

            for X_batch, y_batch in train_loader:
                optimizer.zero_grad()
                logits, margins, _, alpha_weights = self._model(X_batch)

                # Hybrid loss: margin-based + cross-entropy
                margin_loss = self._margin_criterion(logits, y_batch, margins)
                ce_loss = self._ce_criterion(logits, y_batch)

                # [v3] Margin regularisation — two complementary terms:
                #   1) Target pull: prevent margins from collapsing to zero
                #      or exploding to infinity by anchoring them near the base value
                #   2) Diversity bonus: penalise uniform margins across samples so
                #      the network learns input-dependent separation requirements
                margin_reg = ((margins - self._margin_target) ** 2).mean()
                if len(margins) > 1:
                    margin_diversity = -torch.log(margins.std() + 1e-8)
                else:
                    margin_diversity = torch.tensor(0.0, device=self._device)

                loss = (
                    margin_loss
                    + self._ce_lambda * ce_loss
                    + self._margin_reg_weight * margin_reg
                    + self._margin_div_weight * margin_diversity
                )

                loss.backward()

                # Gradient clipping to prevent explosion
                torch.nn.utils.clip_grad_norm_(self._model.parameters(), max_norm=1.0)

                optimizer.step()

                # Accumulate epoch-level metrics across mini-batches
                batch_n = len(X_batch)
                epoch_loss += loss.item() * batch_n
                epoch_correct += (logits.argmax(dim=1) == y_batch).sum().item()
                epoch_total += batch_n
                batch_margins.append(float(margins.mean().item()))
                batch_alphas.append(float(alpha_weights.mean().item()))

            avg_loss = epoch_loss / max(epoch_total, 1)
            avg_acc = epoch_correct / max(epoch_total, 1)
            avg_margin = sum(batch_margins) / max(len(batch_margins), 1)
            avg_alpha = sum(batch_alphas) / max(len(batch_alphas), 1)

            # Validation loss (full-batch for stability)
            self._model.eval()
            with torch.no_grad():
                val_logits, val_margins, _, _ = self._model(X_v)
                val_margin_loss = self._margin_criterion(
                    val_logits, y_v, val_margins
                )
                val_ce_loss = self._ce_criterion(val_logits, y_v)
                val_loss = (
                    val_margin_loss + self._ce_lambda * val_ce_loss
                ).item()

            scheduler.step(val_loss)

            history["loss"].append(avg_loss)
            history["accuracy"].append(avg_acc)
            history["margin_mean"].append(avg_margin)
            history["alpha"].append(avg_alpha)
            history["val_loss"].append(val_loss)
            history["lr"].append(optimizer.param_groups[0]["lr"])

            # Early stopping check
            if val_loss < best_val_loss - 1e-4:
                best_val_loss = val_loss
                best_state = {k: v.clone() for k, v in self._model.state_dict().items()}
                patience_counter = 0
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    break

        # Restore best weights
        if best_state is not None:
            self._model.load_state_dict(best_state)

        self.is_trained = True
        self.training_history = history
        return history

    def predict(self, X: np.ndarray) -> np.ndarray:
        self._model.eval()
        with torch.no_grad():
            X_t = torch.tensor(X, dtype=torch.float32).to(self._device)
            logits, _, _, _ = self._model(X_t)
            return logits.argmax(dim=1).cpu().numpy()

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        self._model.eval()
        with torch.no_grad():
            X_t = torch.tensor(X, dtype=torch.float32).to(self._device)
            logits, _, _, _ = self._model(X_t)
            return torch.softmax(logits, dim=1).cpu().numpy()

    def predict_with_confidence(self, X: np.ndarray) -> Dict:
        """[v3] Margin-aware inference with principled confidence estimation.

        Unlike raw softmax probabilities, margin_satisfaction indicates how well
        the actual score separation meets the model's *learned* margin requirement:
            > 1.0 → the model exceeds its own confidence threshold (high certainty)
            < 1.0 → the sample is near the decision boundary (low certainty)
            ≈ 0.0 → essentially a coin flip — reject-option candidate

        This enables principled "I don't know" decisions that none of the
        baseline models (Perceptron, SVM, NeuralNetwork) can provide.

        Returns:
            Dictionary with:
                predictions: (n,) int array of class indices
                margin_satisfaction: (n,) float — actual_gap / required_margin
                alpha_weights: (n,) float — per-sample nonlinear path weight
        """
        self._model.eval()
        with torch.no_grad():
            X_t = torch.tensor(X, dtype=torch.float32).to(self._device)
            logits, margins, _, alpha_weights = self._model(X_t)

            # How well does the actual class separation satisfy the learned margin?
            top2 = logits.topk(2, dim=1).values
            actual_gap = top2[:, 0] - top2[:, 1]
            margin_satisfaction = actual_gap / (margins + 1e-8)

            return {
                "predictions": logits.argmax(dim=1).cpu().numpy(),
                "margin_satisfaction": margin_satisfaction.cpu().numpy(),
                "alpha_weights": alpha_weights.squeeze(-1).cpu().numpy(),
            }

    def explain(self, X: np.ndarray) -> Dict[str, object]:
        """[v3] Path-decomposed gradient attribution with margin confidence.

        Decomposes feature importance into contributions from each architectural
        path separately — a capability unique to AMNP's dual-path design:

        - nonlinear_importance: |∂(decision(transform(x)))/∂x| per feature
        - linear_importance:    |∂(linear_path(x))/∂x| per feature
        - feature_importance:   α·nonlinear + (1−α)·linear (weighted combination)

        Also computes margin_satisfaction for confidence estimation.
        """
        self._model.eval()
        X_t = torch.tensor(X, dtype=torch.float32, requires_grad=True).to(self._device)

        # Full forward pass to get predictions and per-sample alpha weights
        combined, margins, _transformed, alpha_weights = self._model(X_t)
        predicted = combined.argmax(dim=1)
        mean_alpha = float(alpha_weights.mean().item())

        # ── Path-decomposed gradient attribution ──

        # 1) Nonlinear path importance: backprop through transform → decision
        nl_logits = self._model.decision(self._model.transform(X_t))
        nl_selected = nl_logits[torch.arange(len(predicted)), predicted]
        nl_grads = torch.autograd.grad(
            nl_selected.sum(), X_t, retain_graph=True, create_graph=False,
        )[0]
        nl_importance = nl_grads.abs().mean(0).detach().cpu().numpy()

        # 2) Linear path importance: backprop through linear_path only
        lin_logits = self._model.linear_path(X_t)
        lin_selected = lin_logits[torch.arange(len(predicted)), predicted]
        lin_grads = torch.autograd.grad(
            lin_selected.sum(), X_t, create_graph=False,
        )[0]
        lin_importance = lin_grads.abs().mean(0).detach().cpu().numpy()

        # 3) Weighted combination using mean alpha
        combined_importance = mean_alpha * nl_importance + (1 - mean_alpha) * lin_importance

        # ── Margin-based confidence ──
        with torch.no_grad():
            top2 = combined.topk(2, dim=1).values
            actual_gap = top2[:, 0] - top2[:, 1]
            margin_sat = (actual_gap / (margins + 1e-8)).mean().item()

        return {
            "feature_importance": combined_importance,
            "nonlinear_importance": nl_importance,
            "linear_importance": lin_importance,
            "component_weights": {
                "nonlinear_weight": mean_alpha,
                "linear_weight": 1.0 - mean_alpha,
            },
            "mean_margin": float(margins.mean().item()),
            "margin_satisfaction": float(margin_sat),
        }

    def save(self, path: str) -> None:
        torch.save(self._model.state_dict(), path)

    def load(self, path: str) -> None:
        self._model.load_state_dict(
            torch.load(path, map_location=self._device, weights_only=True)
        )
        self._model.eval()
        self.is_trained = True
