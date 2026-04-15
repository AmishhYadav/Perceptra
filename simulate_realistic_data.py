#!/usr/bin/env python3
"""Perceptra — Realistic Behavioral Data Simulator.

Generates training data that mimics REAL user telemetry from the
BehaviorAssessment game. Unlike the current Gaussian blob generator,
this produces:

  - Non-Gaussian distributions (Beta, Exponential, Mixture)
  - Feature correlations (smooth movement ↔ fast reaction)
  - Within-session temporal drift (fatigue, adaptation)
  - Cross-class overlap (focused autopilot ≈ mild distraction)
  - Per-session variability (no two "focused" sessions are identical)

The result: ~75-85% accuracy ceiling instead of 99%, which is where
the AMNP's adaptive margins and per-sample gating actually matter.

Usage:
    python simulate_realistic_data.py                    # 150 sessions, saves to recorded data
    python simulate_realistic_data.py --sessions 300     # more sessions
    python simulate_realistic_data.py --preview          # print stats without saving
"""

import sys
import os
import argparse
import numpy as np
from typing import List, Tuple

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.data.recorded import RecordedDataManager
from src.data.schemas import FEATURE_NAMES, BEHAVIOR_CLASSES


# ── Feature index constants ──
F_CLICK_FREQ = 0
F_HESITATION = 1
F_MISCLICK = 2
F_SCROLL = 3
F_SMOOTHNESS = 4
F_DWELL = 5
F_NAV_SPEED = 6
F_DIR_CHANGES = 7


class BehaviorSimulator:
    """Generates realistic telemetry sessions for each behavioral class.

    Each session = 200 snapshots (≈20 seconds at 10Hz), simulating a full
    BehaviorAssessment game with temporal dynamics.
    """

    def __init__(self, rng: np.random.RandomState):
        self.rng = rng

    def simulate_session(
        self, behavior: str, n_snapshots: int = 200
    ) -> List[List[float]]:
        """Generate one session of telemetry for the given behavior.

        Each call produces a unique session with random personality traits,
        fatigue drift, and micro-variation.
        """
        if behavior == "focused":
            return self._sim_focused(n_snapshots)
        elif behavior == "distracted":
            return self._sim_distracted(n_snapshots)
        elif behavior == "confused":
            return self._sim_confused(n_snapshots)
        else:
            raise ValueError(f"Unknown behavior: {behavior}")

    def _sim_focused(self, n: int) -> List[List[float]]:
        """Focused: fast, accurate, smooth, consistent — but not perfect.

        Aligned with the TelemetryEngine output for a player hitting 80-95%
        of targets. Key ranges:
          click_frequency:     0.45-0.85 (active clicking)
          hesitation_time:     0.05-0.20 (fast reactions ~500-1000ms / 5000)
          misclick_rate:       0.02-0.12 (very few errors)
          scroll_depth:        0.45-0.80 (hit proxy: 8-14 hits / 18)
          movement_smoothness: 0.50-0.85 (smooth cursor * high perfScale)
          dwell_time:          0.10-0.30 (quick hover-and-click)
          navigation_speed:    0.35-0.70 (active cursor * high perfScale)
          direction_changes:   0.05-0.20 (purposeful movement)
        """
        rng = self.rng

        # Per-session personality
        skill_level = rng.beta(8, 2)  # 0.6-1.0
        fatigue_rate = rng.uniform(0.0003, 0.002)
        has_autopilot = rng.random() < 0.20
        autopilot_start = rng.randint(80, 150) if has_autopilot else n + 1
        autopilot_duration = rng.randint(15, 40) if has_autopilot else 0

        samples = []
        for t in range(n):
            fatigue = 1.0 - fatigue_rate * t
            in_autopilot = autopilot_start <= t < autopilot_start + autopilot_duration

            if in_autopilot:
                # Autopilot: still clicking but slightly degraded
                click_freq = rng.beta(5, 3) * 0.55 + 0.15
                hesitation = rng.beta(3, 5) * 0.20 + 0.05
                misclick = rng.beta(2, 8) * 0.15
                scroll = rng.beta(5, 3) * 0.25 + 0.30    # fewer hits
                smoothness = rng.beta(6, 3) * 0.35 + 0.30
                dwell = rng.beta(3, 5) * 0.20 + 0.10
                nav_speed = rng.beta(5, 4) * 0.30 + 0.20
                dir_changes = rng.beta(3, 6) * 0.15 + 0.05
            else:
                click_freq = rng.beta(7, 3) * 0.40 * skill_level * fatigue + 0.35
                hesitation = rng.exponential(0.06) * (2.0 - skill_level) + 0.03
                misclick = rng.beta(1, 12) * 0.12 * (1.1 - skill_level)
                scroll = rng.beta(7, 3) * 0.30 * skill_level + 0.40   # 8-14 hits / 18
                smoothness = rng.beta(8, 3) * 0.30 * skill_level * fatigue + 0.45
                dwell = rng.exponential(0.08) * (1.5 - skill_level) + 0.08
                nav_speed = rng.beta(7, 3) * 0.30 * skill_level * fatigue + 0.30
                dir_changes = rng.beta(2, 8) * 0.15 * (1.2 - skill_level) + 0.03

            sample = self._clip_and_jitter([
                click_freq, hesitation, misclick, scroll,
                smoothness, dwell, nav_speed, dir_changes,
            ])
            samples.append(sample)

        return samples

    def _sim_distracted(self, n: int) -> List[List[float]]:
        """Distracted: sporadic bursts of activity between long idle periods.

        Aligned with the TelemetryEngine output for a player hitting 10-30%
        of targets. Key ranges:
          click_frequency:     0.02-0.25 (sparse clicking)
          hesitation_time:     0.25-0.60 (slow / expired targets)
          misclick_rate:       0.20-0.55 (many misses + expired)
          scroll_depth:        0.03-0.22 (hit proxy: 1-4 hits / 18)
          movement_smoothness: 0.05-0.30 (low perfScale dampens even smooth mouse)
          dwell_time:          0.30-0.65 (lingering or absent)
          navigation_speed:    0.01-0.15 (minimal cursor activity * low perfScale)
          direction_changes:   0.15-0.50 (aimless when moving)
        """
        rng = self.rng

        engagement_prob = rng.beta(3, 5)
        burst_skill = rng.beta(4, 4)
        idle_depth = rng.uniform(0.4, 0.8)

        samples = []
        is_engaged = rng.random() < 0.3
        state_duration = rng.geometric(0.05)
        state_timer = 0

        for t in range(n):
            state_timer += 1
            if state_timer >= state_duration:
                is_engaged = not is_engaged
                state_duration = rng.geometric(0.08 if is_engaged else 0.04)
                state_timer = 0

            if is_engaged:
                # Brief engagement burst
                click_freq = rng.beta(4, 4) * 0.20 + 0.05
                hesitation = rng.beta(3, 5) * 0.20 + 0.20
                misclick = rng.beta(3, 5) * 0.20 + 0.15
                scroll = rng.beta(4, 5) * 0.12 + 0.08
                smoothness = rng.beta(4, 4) * 0.20 + 0.10
                dwell = rng.beta(3, 5) * 0.15 + 0.25
                nav_speed = rng.beta(3, 5) * 0.10 + 0.03
                dir_changes = rng.beta(4, 5) * 0.20 + 0.15
            else:
                # Idle / checked out
                click_freq = rng.exponential(0.05) * (1 - idle_depth)
                hesitation = rng.beta(5, 2) * 0.30 * idle_depth + 0.25
                misclick = rng.beta(4, 3) * 0.30 + 0.20
                scroll = rng.beta(2, 8) * 0.10 + 0.02
                smoothness = rng.beta(2, 7) * 0.15 * (1 - idle_depth) + 0.03
                dwell = rng.beta(5, 3) * 0.25 * idle_depth + 0.30
                nav_speed = rng.exponential(0.04) * (1 - idle_depth)
                dir_changes = rng.beta(5, 4) * 0.25 + 0.20

            sample = self._clip_and_jitter([
                click_freq, hesitation, misclick, scroll,
                smoothness, dwell, nav_speed, dir_changes,
            ])
            samples.append(sample)

        return samples

    def _sim_confused(self, n: int) -> List[List[float]]:
        """Confused: hesitant, erratic, uncertain — but actively trying.

        Aligned with the TelemetryEngine output for a player hitting 30-50%
        of targets with erratic movement. Key ranges:
          click_frequency:     0.15-0.45 (trying but hesitant)
          hesitation_time:     0.20-0.55 (long pauses before acting)
          misclick_rate:       0.15-0.45 (many wrong clicks)
          scroll_depth:        0.15-0.40 (hit proxy: 3-7 hits / 18)
          movement_smoothness: 0.10-0.35 (jerky movement * medium perfScale)
          dwell_time:          0.25-0.50 (hovering, uncertain)
          navigation_speed:    0.15-0.50 (bursts of panicked movement)
          direction_changes:   0.30-0.70 (constant course corrections)
        """
        rng = self.rng

        confusion_level = rng.beta(6, 3)  # 0.4-0.9
        panic_tendency = rng.beta(3, 4)
        has_clarity = rng.random() < 0.25
        clarity_start = rng.randint(60, 140) if has_clarity else n + 1
        clarity_duration = rng.randint(10, 25) if has_clarity else 0

        samples = []
        for t in range(n):
            in_clarity = clarity_start <= t < clarity_start + clarity_duration

            if in_clarity:
                # Brief moment of understanding
                click_freq = rng.beta(5, 3) * 0.25 + 0.25
                hesitation = rng.beta(3, 5) * 0.15 + 0.10
                misclick = rng.beta(2, 6) * 0.15 + 0.05
                scroll = rng.beta(5, 3) * 0.15 + 0.25
                smoothness = rng.beta(5, 3) * 0.25 + 0.25
                dwell = rng.beta(3, 5) * 0.15 + 0.15
                nav_speed = rng.beta(5, 3) * 0.20 + 0.20
                dir_changes = rng.beta(3, 6) * 0.15 + 0.15
            else:
                base_conf = confusion_level

                click_freq = rng.beta(4, 5) * 0.25 * (1 - base_conf * 0.3) + 0.12
                hesitation = rng.beta(5, 3) * 0.25 * base_conf + 0.20
                misclick = rng.beta(5, 3) * 0.25 * base_conf + 0.12
                scroll = rng.beta(4, 5) * 0.20 + 0.12
                smoothness = rng.beta(3, 6) * 0.20 * (1 - base_conf * 0.4) + 0.08
                dwell = rng.beta(5, 3) * 0.20 * base_conf + 0.22
                nav_speed = rng.beta(3, 5) * 0.25 * (1 - base_conf * 0.2) + 0.12
                dir_changes = rng.beta(6, 2) * 0.30 * base_conf + 0.25

                # Panic spikes
                if rng.random() < panic_tendency * 0.12:
                    nav_speed = rng.beta(6, 3) * 0.25 + 0.35
                    dir_changes = rng.beta(7, 2) * 0.25 + 0.50
                    smoothness = rng.beta(2, 8) * 0.15 + 0.05

            sample = self._clip_and_jitter([
                click_freq, hesitation, misclick, scroll,
                smoothness, dwell, nav_speed, dir_changes,
            ])
            samples.append(sample)

        return samples

    def _clip_and_jitter(self, features: List[float]) -> List[float]:
        """Clip to [0,1] and add micro-noise to prevent exact duplicates."""
        jitter = self.rng.normal(0, 0.01, len(features))
        return [float(np.clip(f + j, 0.0, 1.0)) for f, j in zip(features, jitter)]


def generate_realistic_data(
    n_sessions_per_class: int = 50,
    snapshots_per_session: int = 200,
    random_seed: int = 42,
    preview_only: bool = False,
) -> dict:
    """Generate realistic behavioral sessions and save to recorded data store.

    Args:
        n_sessions_per_class: Number of sessions per behavior (50 = 150 total).
        snapshots_per_session: Snapshots per session (200 = 20s at 10Hz).
        random_seed: For reproducibility.
        preview_only: If True, compute stats but don't save.

    Returns:
        Statistics dict.
    """
    rng = np.random.RandomState(random_seed)
    sim = BehaviorSimulator(rng)
    rm = RecordedDataManager()

    total_samples = 0
    class_stats = {}

    for behavior in BEHAVIOR_CLASSES:
        print(f"\n  Simulating {n_sessions_per_class} '{behavior}' sessions...")
        class_samples = 0

        for i in range(n_sessions_per_class):
            # Vary session length slightly (±20%)
            n_snap = int(snapshots_per_session * rng.uniform(0.8, 1.2))
            session = sim.simulate_session(behavior, n_snap)

            if not preview_only:
                rm.save_session(
                    label=behavior,
                    samples=session,
                    session_id=f"sim_{behavior}_{i:04d}",
                )

            class_samples += len(session)

            if (i + 1) % 10 == 0:
                print(f"    [{i+1}/{n_sessions_per_class}] {class_samples} samples so far")

        class_stats[behavior] = {
            "sessions": n_sessions_per_class,
            "samples": class_samples,
        }
        total_samples += class_samples

    # Print overlap analysis
    print("\n" + "─" * 50)
    print("  Distribution Analysis:")
    print("─" * 50)

    # Generate a small sample for each class and show feature stats
    analysis_rng = np.random.RandomState(random_seed + 1)
    analysis_sim = BehaviorSimulator(analysis_rng)

    for behavior in BEHAVIOR_CLASSES:
        session = analysis_sim.simulate_session(behavior, 500)
        arr = np.array(session)
        print(f"\n  {behavior.upper()}:")
        for i, name in enumerate(FEATURE_NAMES):
            vals = arr[:, i]
            print(
                f"    {name:<22s} "
                f"mean={vals.mean():.3f}  std={vals.std():.3f}  "
                f"[{vals.min():.2f}, {vals.max():.2f}]"
            )

    return {
        "total_samples": total_samples,
        "per_class": class_stats,
    }


def main():
    parser = argparse.ArgumentParser(description="Generate realistic behavioral training data")
    parser.add_argument(
        "--sessions", type=int, default=50,
        help="Sessions per behavior class (default: 50 → 150 total)",
    )
    parser.add_argument(
        "--snapshots", type=int, default=200,
        help="Snapshots per session (default: 200 ≈ 20 seconds at 10Hz)",
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Random seed for reproducibility",
    )
    parser.add_argument(
        "--preview", action="store_true",
        help="Print distribution stats without saving",
    )
    parser.add_argument(
        "--clear", action="store_true",
        help="Clear existing recorded data before generating",
    )
    args = parser.parse_args()

    total_sessions = args.sessions * 3
    est_samples = args.sessions * args.snapshots * 3

    print("=" * 60)
    print("  PERCEPTRA — Realistic Behavioral Simulator")
    print("=" * 60)
    print(f"\n  Plan: {args.sessions} sessions × 3 classes = {total_sessions} sessions")
    print(f"  Est. total: ~{est_samples:,} samples")

    if args.clear and not args.preview:
        print("\n  Clearing existing recorded data...")
        RecordedDataManager().clear()

    stats = generate_realistic_data(
        n_sessions_per_class=args.sessions,
        snapshots_per_session=args.snapshots,
        random_seed=args.seed,
        preview_only=args.preview,
    )

    print("\n" + "=" * 60)
    print(f"  {'[PREVIEW]' if args.preview else 'Done!'} {stats['total_samples']:,} total samples generated")
    for cls, info in stats["per_class"].items():
        print(f"    {cls}: {info['sessions']} sessions, {info['samples']} samples")

    if not args.preview:
        print(f"\n  Next step: python train_pipeline.py --recorded")
    print("=" * 60)


if __name__ == "__main__":
    main()
