# Phase 02: Synthetic Data Generation - Context

**Gathered:** April 2026
**Status:** Ready for planning
**Source:** Interaction Decisions

<domain>
## Phase Boundary

This phase builds the synthetic behavioral dataset generator in Python. It produces a labeled NumPy dataset aligned with the 8-feature schema from Phase 1, saved to disk for use in Phase 3 (offline training). It does NOT cover live telemetry streaming or UI data capture.
</domain>

<decisions>
## Implementation Decisions

### A. Class Separation Strategy
- **Decision**: Partial overlap — focused is well-clustered, distracted/confused overlap.
- **Details**: This creates a realistic challenge where linear models (Perceptron) struggle on the distracted/confused boundary while non-linear models (NN, AMNP) have room to demonstrate superiority. The separation must be intentional and controlled, not accidental.

### B. Feature Distribution Rules (Per Class)

Use Gaussian distributions with class-specific means and variances. Reference the Phase 1 feature schema (`src/data/schemas.py`).

| Feature | Focused | Distracted | Confused |
|---------|---------|-----------|---------|
| `click_frequency` | μ=0.8, σ=0.1 | μ=0.5, σ=0.2 | μ=0.3, σ=0.15 |
| `hesitation_time` | μ=0.1, σ=0.05 | μ=0.5, σ=0.2 | μ=0.8, σ=0.15 |
| `misclick_rate` | μ=0.05, σ=0.03 | μ=0.3, σ=0.15 | μ=0.6, σ=0.2 |
| `scroll_depth` | μ=0.7, σ=0.1 | μ=0.4, σ=0.2 | μ=0.2, σ=0.15 |
| `movement_smoothness` | μ=0.9, σ=0.05 | μ=0.5, σ=0.2 | μ=0.2, σ=0.15 |
| `dwell_time` | μ=0.3, σ=0.1 | μ=0.6, σ=0.2 | μ=0.7, σ=0.15 |
| `navigation_speed` | μ=0.7, σ=0.1 | μ=0.4, σ=0.25 | μ=0.2, σ=0.15 |
| `direction_changes` | μ=0.1, σ=0.05 | μ=0.4, σ=0.2 | μ=0.8, σ=0.15 |

All values in normalized [0, 1] range — clip any samples that fall outside.

### C. Dataset Size & Class Balance
- **Total samples**: 15,000 (middle of the 10k-20k range)
- **Class distribution** (realistic imbalance):
  - `focused` = 50% → 7,500 samples
  - `distracted` = 30% → 4,500 samples
  - `confused` = 20% → 3,000 samples

### D. Noise & Realism
- Add Gaussian noise with σ=0.08 (8% of [0,1] range) to all features post-generation.
- This is on top of per-class σ values in the table above (i.e., additional noise layer).
- Clip all final values to [0, 1] to enforce valid feature range.
- Use a seeded random generator (numpy seed=42) for reproducibility.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**
- `src/data/schemas.py` — defines FEATURE_NAMES, BEHAVIOR_CLASSES, N_FEATURES, N_CLASSES. The generator must produce vectors in exactly this order.
</canonical_refs>

<specifics>
## Specific Ideas
- Save the generated dataset as `.npy` files: `data/synthetic/X_train.npy`, `data/synthetic/y_train.npy`, `data/synthetic/X_test.npy`, `data/synthetic/y_test.npy` with an 80/20 train-test split.
- Also save a metadata JSON: `data/synthetic/metadata.json` with class counts, feature stats, and generation parameters for reproducibility.
</specifics>

<deferred>
## Deferred Ideas
- Online data augmentation during training (belongs in Phase 3).
- Realistic temporal sequences (belongs in Phase 5, real-time pipeline).
</deferred>

---

*Phase: 02-synthetic-data-generation*
*Context gathered: April 2026*
