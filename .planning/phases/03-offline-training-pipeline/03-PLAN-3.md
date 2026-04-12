---
phase: 3
plan: 3
title: "Parallel Orchestrator & Final Script"
wave: 3
depends_on: ["03-PLAN-1", "03-PLAN-2"]
files_modified:
  - src/training/trainer.py
  - train_pipeline.py
autonomous: true
requirements: []
---

# Plan 3: Parallel Orchestrator & Final Script

## Goal
Update `ModelTrainer` to train models concurrently using multiprocessing, and create the main `train_pipeline.py` script that loads the synthetic data, trains all models, and saves the final weights to disk.

## must_haves
- `ModelTrainer.train_all()` altered to support concurrent execution (e.g. `concurrent.futures.ProcessPoolExecutor` or `ThreadPoolExecutor`).
- `train_pipeline.py` created at project root.
- The pipeline loads data from `data/synthetic`, trains, persists models to `data/weights/`, and outputs a rich final comparison table.

## Tasks

<task id="3.3.1">
<title>Make ModelTrainer.train_all Current</title>
<read_first>
- src/training/trainer.py
</read_first>
<action>
1. Edit `src/training/trainer.py`.
2. Modify `train_all()`: use `concurrent.futures.ThreadPoolExecutor` to train the models in parallel. (Thread pool is fine since scikit-learn releases GIL often and PyTorch can utilize multiple threads).
3. Ensure results are aggregated properly into `self.results`.
</action>
<acceptance_criteria>
- `ModelTrainer.train_all()` executes `model.train` across multiple threads.
- Training correctly aggregates data and maintains logging accuracy.
</acceptance_criteria>
</task>

<task id="3.3.2">
<title>Create train_pipeline.py Entrypoint</title>
<read_first>
- src/data/dataset.py
</read_first>
<action>
1. Create `train_pipeline.py` at the project root.
2. Initialize `DatasetManager`, load 15k-sample dataset.
3. Instantiate `PerceptronModel`, `SVMModel`, `NeuralNetModel`, and `AMNPModel`.
4. Run `ModelTrainer(models).train_all()`.
5. Call `model.save(f"data/weights/{model.name.lower()}")` for all models.
6. Print the summary comparison output from `ModelTrainer.get_comparison()`.
</action>
<acceptance_criteria>
- File `train_pipeline.py` runs end-to-end.
- Output models are successfully placed in `data/weights/`.
</acceptance_criteria>
</task>

## Verification
```bash
source .venv/bin/activate
python train_pipeline.py
ls -la data/weights/
assert [ -f "data/weights/amnp" ] || [ -f "data/weights/amnp.pt" ]
print("Pipeline complete & weights saved!")
```
