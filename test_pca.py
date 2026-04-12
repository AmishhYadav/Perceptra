import numpy as np
import sys
from pathlib import Path

sys.path.append("/Users/amish/Perceptra")
from src.api.visualization import _load_pca_data, _make_boundary_grid
from src.models import PerceptronModel

X_sub, y_sub, X_2d, pca = _load_pca_data()
pad = 0.5
x_range = [float(X_2d[:, 0].min() - pad), float(X_2d[:, 0].max() + pad)]
y_range = [float(X_2d[:, 1].min() - pad), float(X_2d[:, 1].max() + pad)]

print("x_range:", x_range)
print("y_range:", y_range)

model = PerceptronModel(8, 3)
model.train(X_sub, y_sub)

try:
    grid = _make_boundary_grid(pca, model, x_range, y_range)
    print("Grid len:", len(grid))
    print("Sample proba:", grid[0])
except Exception as e:
    print("Error:", e)
