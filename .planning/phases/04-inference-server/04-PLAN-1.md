---
phase: 4
plan: 1
title: "Preprocessor Persistence Pipeline"
wave: 1
depends_on: []
files_modified:
  - src/data/preprocessing.py
  - src/data/dataset.py
autonomous: true
requirements: []
---

# Plan 1: Preprocessor Persistence Pipeline

## Goal
To maintain continuous data-processing constraints between training and real-time inference, we must natively persist the learned scaling parameters. The API needs access to this to accurately score incoming live data.

## must_haves
- Add `.save(path)` and `.load(path)` via `joblib` inside `FeaturePreprocessor`.
- Modify `generate_and_save()` inside `DatasetManager` to persist `preprocessor.joblib`.
- Temporarily re-run dataset generation to produce this missing file.

## Tasks

<task id="4.1.1">
<title>Add FeaturePreprocessor Persistence</title>
<read_first>
- src/data/preprocessing.py
</read_first>
<action>
1. Import `joblib`.
2. Implement `save(self, path)` executing `joblib.dump(self.scalers, path)`.
3. Implement `load(self, path)` iterating `joblib.load(path)` to assign saved `MinMaxScaler`s back into `self.scalers`.
</action>
<acceptance_criteria>
- `FeaturePreprocessor` correctly supports `.save()` and `.load()`.
</acceptance_criteria>
</task>

<task id="4.1.2">
<title>Persist Preprocessor During Dataset Generation</title>
<read_first>
- src/data/dataset.py
</read_first>
<action>
1. Edit `generate_and_save`. Immediately after calling `self.preprocessor.fit_transform(X_train_raw)`, execute `self.preprocessor.save(self.data_dir / 'preprocessor.joblib')`.
</action>
<acceptance_criteria>
- Generation pipeline reliably outputs `data/synthetic/preprocessor.joblib`.
</acceptance_criteria>
</task>

## Verification
```bash
python generate_dataset.py
ls -la data/synthetic/preprocessor.joblib
```
