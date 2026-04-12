#!/usr/bin/env python3
"""Entrypoint script to generate and save the synthetic Perceptra dataset."""
import sys
import os

# Ensure src is importable from project root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.data import DatasetManager

if __name__ == "__main__":
    print("=" * 50)
    print("Perceptra — Generating Synthetic Dataset")
    print("=" * 50)

    manager = DatasetManager()
    metadata = manager.generate_and_save(
        n_samples=15000,
        noise_std=0.08,
        test_ratio=0.2,
        random_seed=42,
        verbose=True,
    )

    print(f"\nMetadata saved to data/synthetic/metadata.json")
    print("Done! Run training next.")
