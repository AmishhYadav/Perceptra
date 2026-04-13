"""WebSocket route for real-time training visualization with explainable PCA.

Instead of arbitrary axes, PCA projects the 8D behavioral clusters onto an
interpretable 2D subspace. We extract the strongest numerical feature loadings
from the PCA components to dynamically name the axes for the end-user (e.g.,
"Hesitation Time vs Movement Smoothness").
"""

import json
import asyncio
import numpy as np
from pathlib import Path
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sklearn.decomposition import PCA

from src.data.schemas import (
    BEHAVIOR_CLASSES,
    FEATURE_NAMES,
    N_FEATURES,
    N_CLASSES,
)
from src.models import PerceptronModel, SVMModel, NeuralNetModel, AMNPModel

router = APIRouter()

DATA_DIR = Path("data/synthetic")
MAX_POINTS = 400
GRID_SIZE = 50
DEFAULT_EPOCHS = 100
DEFAULT_DELAY_MS = 80


def _get_axis_label(component: np.ndarray) -> str:
    """Extract interpretable feature name labels from a PCA component."""
    loadings = np.abs(component)
    top2_idx = np.argsort(loadings)[-2:][::-1]
    
    label_parts = []
    for idx in top2_idx:
        feat = FEATURE_NAMES[idx].replace("_", " ").title()
        label_parts.append(feat)
        
    return " vs ".join(label_parts)


def _load_pca_data():
    """Load synthetic dataset, subsample, and fit PCA to 2D."""
    X_train = np.load(DATA_DIR / "X_train.npy")
    y_train = np.load(DATA_DIR / "y_train.npy")

    # Subsample for smooth rendering
    n = len(X_train)
    if n > MAX_POINTS:
        indices = np.random.RandomState(42).choice(n, MAX_POINTS, replace=False)
        X_sub = X_train[indices]
        y_sub = y_train[indices]
    else:
        X_sub = X_train
        y_sub = y_train

    # Fit PCA on the full training set for stable axes preserving original covariance
    pca = PCA(n_components=2)
    pca.fit(X_train)

    X_2d = pca.transform(X_sub)
    
    x_label = f"Composite ({_get_axis_label(pca.components_[0])})"
    y_label = f"Composite ({_get_axis_label(pca.components_[1])})"

    return X_sub, y_sub, X_2d, pca, x_label, y_label


def _make_boundary_grid(pca: PCA, model, x_range, y_range):
    """Sample a grid in 2D PCA space, inverse-transform to 8D, predict probabilities.
    
    This geometrically maps 2D coordinates back into the full 8D feature space using
    the natural covariance profile of the data so all classes are fairly evaluated.
    """
    xs = np.linspace(x_range[0], x_range[1], GRID_SIZE)
    ys = np.linspace(y_range[0], y_range[1], GRID_SIZE)
    xx, yy = np.meshgrid(xs, ys)
    grid_2d = np.c_[xx.ravel(), yy.ravel()]

    # Inverse transform back to original 8D space
    grid_8d = pca.inverse_transform(grid_2d).astype(np.float32)

    # Clamp to prevent math overflow since PCA spaces are theoretically infinite
    grid_8d = np.clip(grid_8d, -10.0, 10.0)
    grid_8d = np.nan_to_num(grid_8d, nan=0.0, posinf=10.0, neginf=-10.0)

    try:
        probas = model.predict_proba(grid_8d)
        probas = np.nan_to_num(probas, nan=1.0 / N_CLASSES)
    except Exception:
        # Fallback
        probas = np.full((GRID_SIZE * GRID_SIZE, N_CLASSES), 1.0 / N_CLASSES)

    return probas.tolist()


def _create_model(model_name: str):
    """Instantiate a fresh untrained model."""
    constructors = {
        "Perceptron": PerceptronModel,
        "SVM": SVMModel,
        "NeuralNetwork": NeuralNetModel,
        "AMNP": AMNPModel,
    }
    if model_name not in constructors:
        return None
    return constructors[model_name](n_features=N_FEATURES, n_classes=N_CLASSES)


@router.websocket("/visualization/{model_name}")
async def visualization_ws(websocket: WebSocket, model_name: str):
    """WebSocket endpoint for streaming training visualization frames."""
    await websocket.accept()

    valid_models = ["Perceptron", "SVM", "NeuralNetwork", "AMNP"]
    if model_name not in valid_models:
        await websocket.send_json({"error": f"Unknown model: {model_name}"})
        await websocket.close()
        return

    try:
        X_sub, y_sub, X_2d, pca, x_axis_label, y_axis_label = _load_pca_data()
    except FileNotFoundError as e:
        await websocket.send_json({"error": f"Dataset not found: {e}"})
        await websocket.close()
        return

    # Compute axis ranges with padding
    pad = 0.08
    x_range = [float(X_2d[:, 0].min() - pad), float(X_2d[:, 0].max() + pad)]
    y_range = [float(X_2d[:, 1].min() - pad), float(X_2d[:, 1].max() + pad)]

    # Send initial data frame
    init_frame = {
        "type": "init",
        "model_name": model_name,
        "points": [
            {
                "x": float(X_2d[i, 0]),
                "y": float(X_2d[i, 1]),
                "true_label": int(y_sub[i]),
            }
            for i in range(len(X_2d))
        ],
        "classes": BEHAVIOR_CLASSES,
        "x_range": x_range,
        "y_range": y_range,
        "grid_size": GRID_SIZE,
        "total_epochs": DEFAULT_EPOCHS,
        "x_axis_label": x_axis_label,
        "y_axis_label": y_axis_label,
    }
    await websocket.send_json(init_frame)

    playing = False
    paused = False
    delay_ms = DEFAULT_DELAY_MS
    current_model = None

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            action = msg.get("action", "")

            if action == "speed":
                delay_ms = max(20, min(500, int(msg.get("value", DEFAULT_DELAY_MS))))
                continue

            if action == "pause":
                paused = True
                continue

            if action == "resume":
                paused = False
                continue

            if action == "reset":
                playing = False
                paused = False
                await websocket.send_json({"type": "reset"})
                continue

            if action == "start":
                playing = True
                paused = False

                current_model = _create_model(model_name)
                if current_model is None:
                    continue

                if model_name == "SVM":
                    # Fix applied: SVM now simulates exactly 100 epoch steps to match others
                    steps = DEFAULT_EPOCHS
                    for step in range(1, steps + 1):
                        if not playing:
                            break

                        # Check for incoming control messages (non-blocking)
                        while paused and playing:
                            try:
                                ctrl = await asyncio.wait_for(
                                    websocket.receive_text(), timeout=0.2
                                )
                                ctrl_msg = json.loads(ctrl)
                                if ctrl_msg.get("action") == "resume":
                                    paused = False
                                elif ctrl_msg.get("action") == "pause":
                                    paused = True
                                elif ctrl_msg.get("action") == "speed":
                                    delay_ms = max(20, min(500, int(ctrl_msg.get("value", DEFAULT_DELAY_MS))))
                                elif ctrl_msg.get("action") == "reset":
                                    playing = False
                                    await websocket.send_json({"type": "reset"})
                            except asyncio.TimeoutError:
                                continue

                        if not playing:
                            break

                        # Progressive subset training for simulation
                        frac = step / steps
                        n_use = max(20, int(len(X_sub) * frac))
                        current_model = _create_model(model_name)
                        # We use 100 max_iter inside train method
                        current_model.train(
                            X_sub[:n_use], y_sub[:n_use], epochs=100, lr=0.01
                        )

                        preds = current_model.predict(X_sub)
                        acc = float(np.mean(preds == y_sub))
                        
                        # Use resilient PCA grid inverse transform
                        boundary = _make_boundary_grid(
                            pca, current_model, x_range, y_range
                        )

                        frame = {
                            "type": "epoch",
                            "epoch": step,
                            "total_epochs": steps,
                            "predictions": preds.tolist(),
                            "accuracy": acc,
                            "loss": 1.0 - acc,
                            "boundary": {
                                "x_range": x_range,
                                "y_range": y_range,
                                "grid_size": GRID_SIZE,
                                "probabilities": boundary,
                            },
                        }
                        await websocket.send_json(frame)
                        await asyncio.sleep(delay_ms / 1000.0)

                    if playing:
                        await websocket.send_json({"type": "complete"})
                    playing = False

                else:
                    # Epoch-by-epoch training for NN, AMNP, Perceptron
                    total_epochs = DEFAULT_EPOCHS
                    for epoch in range(1, total_epochs + 1):
                        if not playing:
                            break

                        # Non-blocking control check
                        try:
                            ctrl = await asyncio.wait_for(
                                websocket.receive_text(), timeout=0.001
                            )
                            ctrl_msg = json.loads(ctrl)
                            if ctrl_msg.get("action") == "pause":
                                paused = True
                            elif ctrl_msg.get("action") == "speed":
                                delay_ms = max(20, min(500, int(ctrl_msg.get("value", DEFAULT_DELAY_MS))))
                            elif ctrl_msg.get("action") == "reset":
                                playing = False
                                await websocket.send_json({"type": "reset"})
                                continue
                        except asyncio.TimeoutError:
                            pass

                        while paused and playing:
                            try:
                                ctrl = await asyncio.wait_for(
                                    websocket.receive_text(), timeout=0.2
                                )
                                ctrl_msg = json.loads(ctrl)
                                if ctrl_msg.get("action") == "resume":
                                    paused = False
                                elif ctrl_msg.get("action") == "pause":
                                    paused = True
                                elif ctrl_msg.get("action") == "speed":
                                    delay_ms = max(20, min(500, int(ctrl_msg.get("value", DEFAULT_DELAY_MS))))
                                elif ctrl_msg.get("action") == "reset":
                                    playing = False
                                    await websocket.send_json({"type": "reset"})
                            except asyncio.TimeoutError:
                                continue

                        if not playing:
                            break

                        # Train one epoch piecewise
                        current_model.train(X_sub, y_sub, epochs=1, lr=1e-3)

                        preds = current_model.predict(X_sub)
                        acc = float(np.mean(preds == y_sub))

                        # Compute PCA boundary grid dynamically occasionally for perf
                        boundary = None
                        if epoch % 2 == 0 or epoch == 1 or epoch == total_epochs:
                            boundary_data = _make_boundary_grid(
                                pca, current_model, x_range, y_range
                            )
                            boundary = {
                                "x_range": x_range,
                                "y_range": y_range,
                                "grid_size": GRID_SIZE,
                                "probabilities": boundary_data,
                            }

                        loss = 0.0
                        if hasattr(current_model, "training_history"):
                            hist = current_model.training_history
                            if isinstance(hist, dict) and "loss" in hist:
                                loss = hist["loss"][-1] if hist["loss"] else 0.0

                        frame = {
                            "type": "epoch",
                            "epoch": epoch,
                            "total_epochs": total_epochs,
                            "predictions": preds.tolist(),
                            "accuracy": acc,
                            "loss": loss,
                        }
                        if boundary is not None:
                            frame["boundary"] = boundary

                        await websocket.send_json(frame)
                        await asyncio.sleep(delay_ms / 1000.0)

                    if playing:
                        await websocket.send_json({"type": "complete"})
                    playing = False

    except WebSocketDisconnect:
        pass
