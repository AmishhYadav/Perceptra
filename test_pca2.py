import numpy as np
import sys

sys.path.append("/Users/amish/Perceptra")
from src.api.visualization import _load_pca_data
X_sub, y_sub, X_2d, pca = _load_pca_data()

print("Any NaN in pca.components_?", np.isnan(pca.components_).any())
print("Any Inf in pca.components_?", np.isinf(pca.components_).any())
print("Any NaN in pca.mean_?", np.isnan(pca.mean_).any())
print("Any NaN in X_2d?", np.isnan(X_2d).any())

print("pca.components_:\n", pca.components_)
