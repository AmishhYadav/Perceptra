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

        Realistic traits:
          - Reaction times are log-normal (fast median, occasional slow)
          - Smoothness is high but drifts slightly as fatigue sets in
          - Very low misclicks but not zero
          - Some sessions have "autopilot" stretches that look like mild distraction
        """
        rng = self.rng

        # Per-session personality (each focused user is slightly different)
        skill_level = rng.beta(8, 2)  # 0.6-1.0 range, most users are good
        fatigue_rate = rng.uniform(0.0005, 0.003)  # how fast they tire
        has_autopilot = rng.random() < 0.25  # 25% chance of an autopilot stretch
        autopilot_start = rng.randint(80, 150) if has_autopilot else n + 1
        autopilot_duration = rng.randint(20, 50) if has_autopilot else 0

        samples = []
        for t in range(n):
            fatigue = 1.0 - fatigue_rate * t  # slowly degrades
            in_autopilot = autopilot_start <= t < autopilot_start + autopilot_duration

            if in_autopilot:
                # Autopilot: still clicking but less engaged
                click_freq = rng.beta(4, 3) * 0.7
                hesitation = rng.beta(3, 4) * 0.4
                misclick = rng.beta(2, 8) * 0.2
                smoothness = rng.beta(5, 3) * 0.7
                dwell = rng.beta(3, 5) * 0.4
                nav_speed = rng.beta(4, 4) * 0.6
                dir_changes = rng.beta(3, 6) * 0.35
            else:
                click_freq = rng.beta(8, 2) * skill_level * fatigue
                hesitation = rng.exponential(0.08) * (2.0 - skill_level)
                misclick = rng.beta(1, 15) * (1.1 - skill_level)
                smoothness = rng.beta(10, 2) * skill_level * fatigue
                dwell = rng.exponential(0.1) * (1.5 - skill_level)
                nav_speed = rng.beta(8, 3) * skill_level * fatigue
                dir_changes = rng.beta(2, 10) * (1.2 - skill_level)

            scroll = rng.beta(1, 12)  # focused users barely scroll

            sample = self._clip_and_jitter([
                click_freq, hesitation, misclick, scroll,
                smoothness, dwell, nav_speed, dir_changes,
            ])
            samples.append(sample)

        return samples

    def _sim_distracted(self, n: int) -> List[List[float]]:
        """Distracted: sporadic bursts of activity between long idle periods.

        Realistic traits:
          - Bimodal click pattern: bursts of fast clicks, then nothing
          - Mouse movement is sparse or absent during idle stretches
          - When they DO engage, can look briefly focused (the tricky part)
          - Higher scroll (aimless scrolling)
          - Variable hesitation (sometimes instant, sometimes very long)
        """
        rng = self.rng

        # Per-session traits
        engagement_prob = rng.beta(3, 5)  # how often they pay attention (0.2-0.6)
        burst_skill = rng.beta(5, 3)  # when engaged, how good are they
        idle_depth = rng.uniform(0.3, 0.8)  # how "checked out" idle periods are

        samples = []
        is_engaged = rng.random() < 0.5  # start state
        state_duration = rng.geometric(0.05)  # how long current state lasts
        state_timer = 0

        for t in range(n):
            state_timer += 1
            if state_timer >= state_duration:
                is_engaged = not is_engaged
                state_duration = rng.geometric(0.08 if is_engaged else 0.04)
                state_timer = 0

            if is_engaged:
                # Brief engagement burst — looks somewhat focused
                click_freq = rng.beta(5, 3) * burst_skill * 0.8
                hesitation = rng.beta(2, 5) * 0.35
                misclick = rng.beta(2, 6) * 0.25
                smoothness = rng.beta(5, 3) * burst_skill * 0.75
                dwell = rng.beta(2, 5) * 0.3
                nav_speed = rng.beta(5, 3) * burst_skill * 0.7
                dir_changes = rng.beta(3, 6) * 0.3
            else:
                # Idle / checked out
                click_freq = rng.exponential(0.08) * (1 - idle_depth)
                hesitation = rng.beta(5, 2) * idle_depth
                misclick = rng.beta(3, 4) * 0.4
                smoothness = rng.beta(2, 6) * (1 - idle_depth)
                dwell = rng.beta(4, 3) * idle_depth
                nav_speed = rng.exponential(0.1) * (1 - idle_depth)
                dir_changes = rng.beta(4, 5) * 0.5

            scroll = rng.beta(3, 4) * 0.6  # distracted users scroll more

            sample = self._clip_and_jitter([
                click_freq, hesitation, misclick, scroll,
                smoothness, dwell, nav_speed, dir_changes,
            ])
            samples.append(sample)

        return samples

    def _sim_confused(self, n: int) -> List[List[float]]:
        """Confused: hesitant, erratic, uncertain — but actively trying.

        Realistic traits:
          - High hesitation (hover → pull away → hover → click)
          - Direction changes are frequent (moving toward target, changing mind)
          - Misclicks are high (clicking wrong things)
          - Movement is jerky, not smooth
          - Nav speed varies wildly (slow then sudden panicked movement)
          - Sometimes confused users accidentally look focused for brief moments
        """
        rng = self.rng

        # Per-session traits
        confusion_level = rng.beta(6, 3)  # how confused (0.4-0.9)
        panic_tendency = rng.beta(3, 4)  # do they rush or freeze
        has_clarity = rng.random() < 0.3  # 30% chance of a brief clarity window
        clarity_start = rng.randint(60, 140) if has_clarity else n + 1
        clarity_duration = rng.randint(10, 30) if has_clarity else 0

        samples = []
        for t in range(n):
            in_clarity = clarity_start <= t < clarity_start + clarity_duration

            if in_clarity:
                # Brief moment of understanding — looks focused-ish
                click_freq = rng.beta(5, 3) * 0.7
                hesitation = rng.beta(2, 5) * 0.25
                misclick = rng.beta(2, 7) * 0.15
                smoothness = rng.beta(6, 3) * 0.7
                dwell = rng.beta(2, 5) * 0.25
                nav_speed = rng.beta(5, 3) * 0.65
                dir_changes = rng.beta(2, 6) * 0.2
            else:
                # Standard confused behavior
                base_hesitation = confusion_level * 0.8

                click_freq = rng.beta(3, 5) * (1 - confusion_level * 0.5)
                hesitation = rng.beta(5, 2) * base_hesitation + rng.exponential(0.1)
                misclick = rng.beta(4, 3) * confusion_level * 0.7
                smoothness = rng.beta(2, 7) * (1 - confusion_level * 0.6)
                dwell = rng.beta(6, 2) * confusion_level * 0.7
                nav_speed = rng.beta(2, 4) * (1 - confusion_level * 0.3)
                dir_changes = rng.beta(6, 2) * confusion_level * 0.8

                # Panic spikes: sudden fast movement
                if rng.random() < panic_tendency * 0.15:
                    nav_speed = rng.beta(7, 2) * 0.9
                    dir_changes = rng.beta(8, 2) * 0.9
                    smoothness = rng.beta(1, 8) * 0.3

            scroll = rng.beta(2, 5) * 0.35  # some confused scrolling

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
