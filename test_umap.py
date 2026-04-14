import numpy as np
import umap
X = np.random.rand(100, 8)
mapper = umap.UMAP(n_components=2, random_state=42)
X_2d = mapper.fit_transform(X)
grid = np.random.rand(10, 2)
try:
    X_inv = mapper.inverse_transform(grid)
    print("Success, shape:", X_inv.shape)
except Exception as e:
    print("Error:", str(e))
