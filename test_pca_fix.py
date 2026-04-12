import numpy as np
import sys
sys.path.append("/Users/amish/Perceptra")
from src.api.visualization import _load_pca_data
X_sub, y_sub, X_2d, pca = _load_pca_data()

x_range = [-4.0, 6.0]
y_range = [-3.0, 3.0]
xs = np.linspace(x_range[0], x_range[1], 50)
ys = np.linspace(y_range[0], y_range[1], 50)
xx, yy = np.meshgrid(xs, ys)
grid_2d = np.c_[xx.ravel(), yy.ravel()]

# WITH FLOAT32
try:
    grid_8d_32 = pca.inverse_transform(grid_2d.astype(np.float32))
    print("Float32 inverse_transform succeeded without warnings!")
except Exception as e:
    print("Float32 error:", e)
