/**
 * TelemetryEngine — Passive behavioral telemetry measurement.
 *
 * Attach to any DOM container. Tracks mouse movement, clicks, scrolling,
 * and hover events to compute all 8 Perceptra features in real-time
 * without any explicit user input (no sliders).
 *
 * Features computed:
 *  - click_frequency:      clicks per second (windowed)
 *  - hesitation_time:      avg delay between target spawn and user click
 *  - misclick_rate:        fraction of clicks that missed a target
 *  - scroll_depth:         cumulative scroll distance / container height
 *  - movement_smoothness:  inverse of avg angular deviation in cursor path
 *  - dwell_time:           avg time cursor stays on a single target
 *  - navigation_speed:     avg cursor pixels per second
 *  - direction_changes:    direction reversals per second (>45° angle change)
 */

export interface TelemetrySnapshot {
  click_frequency: number;
  hesitation_time: number;
  misclick_rate: number;
  scroll_depth: number;
  movement_smoothness: number;
  dwell_time: number;
  navigation_speed: number;
  direction_changes: number;
}

interface CursorSample {
  x: number;
  y: number;
  t: number; // timestamp ms
}

const WINDOW_SEC = 3; // rolling window for rate-based features

export class TelemetryEngine {
  // --- Raw event buffers ---
  private clickTimes: number[] = [];
  private hitTimes: number[] = []; // time from target spawn → click
  private totalClicks = 0;
  private missClicks = 0;
  private expiredTargets = 0;  // targets that disappeared without being clicked
  private scrollAccum = 0;

  // --- Cursor tracking ---
  private samples: CursorSample[] = [];
  private dirChanges: number[] = []; // timestamps of direction changes

  // --- Dwell tracking ---
  private hoverStartTime = 0;
  private hoverDurations: number[] = [];
  private isOverTarget = false;

  // --- Game performance tracking ---
  private greenHits = 0;       // successful target clicks
  private greenTotal = 0;      // total green targets seen (hit + expired)


  reset() {
    this.clickTimes = [];
    this.hitTimes = [];
    this.totalClicks = 0;
    this.missClicks = 0;
    this.expiredTargets = 0;
    this.scrollAccum = 0;
    this.samples = [];
    this.dirChanges = [];
    this.hoverStartTime = 0;
    this.hoverDurations = [];
    this.isOverTarget = false;
    this.greenHits = 0;
    this.greenTotal = 0;
  }

  start(_containerHeight: number) {
    this.reset();
  }

  // --- Event handlers (call from React) ---

  recordClick(hitTarget: boolean, reactionTimeMs?: number) {
    const now = performance.now();
    this.clickTimes.push(now);
    this.totalClicks++;
    if (!hitTarget) {
      this.missClicks++;
    }
    if (hitTarget && reactionTimeMs !== undefined) {
      this.hitTimes.push(reactionTimeMs);
      this.greenHits++;
      this.greenTotal++;
    }
  }

  recordMouseMove(x: number, y: number) {
    const now = performance.now();
    this.samples.push({ x, y, t: now });

    // Detect direction changes (angle > 45° between last 3 points)
    const n = this.samples.length;
    if (n >= 3) {
      const a = this.samples[n - 3];
      const b = this.samples[n - 2];
      const c = this.samples[n - 1];
      const dx1 = b.x - a.x;
      const dy1 = b.y - a.y;
      const dx2 = c.x - b.x;
      const dy2 = c.y - b.y;
      const dot = dx1 * dx2 + dy1 * dy2;
      const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (mag1 > 2 && mag2 > 2) {
        const cos = dot / (mag1 * mag2);
        const angle = Math.acos(Math.min(1, Math.max(-1, cos)));
        if (angle > Math.PI / 4) {
          // > 45°
          this.dirChanges.push(now);
        }
      }
    }
  }

  recordScroll(deltaY: number) {
    this.scrollAccum += Math.abs(deltaY);
  }

  recordHoverEnter() {
    this.hoverStartTime = performance.now();
    this.isOverTarget = true;
  }

  recordHoverLeave() {
    if (this.isOverTarget && this.hoverStartTime > 0) {
      const dur = performance.now() - this.hoverStartTime;
      this.hoverDurations.push(dur);
    }
    this.isOverTarget = false;
  }

  /**
   * Record a target that expired without being clicked.
   * This is a strong inattention signal — the user completely ignored a target.
   * Injects a penalty hesitation (full target lifetime) into the rolling average.
   */
  recordTargetExpired(targetLifetimeMs: number) {
    this.expiredTargets++;
    this.greenTotal++;
    // Treat an expired target as a "click" that took the full lifetime
    // This drags the average hesitation toward confused/distracted territory
    this.hitTimes.push(targetLifetimeMs);
  }

  // --- Compute normalized telemetry snapshot [0..1] ---

  getSnapshot(): TelemetrySnapshot {
    const now = performance.now();
    const windowStart = now - WINDOW_SEC * 1000;

    // ── Game performance (hit rate) ──
    // This is the ground truth: if you're hitting everything, you ARE focused.
    // hitRate ranges from 0.0 (missed everything) to 1.0 (hit everything)
    const hitRate = this.greenTotal > 2
      ? this.greenHits / this.greenTotal
      : 0.5; // not enough data yet → neutral

    // Performance-based engagement scale:
    //   hitRate=1.0 → scale=1.0 (fully focused signals)
    //   hitRate=0.5 → scale=0.6 (neutral)
    //   hitRate=0.0 → scale=0.2 (distracted signals)
    const perfScale = 0.2 + 0.8 * hitRate;

    // ── 1. Click frequency ──
    // Focused ≈ 0.7-0.9, Distracted ≈ 0.2-0.5
    const recentClicks = this.clickTimes.filter((t) => t >= windowStart).length;
    const clicksPerSec = recentClicks / WINDOW_SEC;
    // ~2 clicks in 3s window = 0.67 cps → 0.67/1.0 = 0.67; scale up for focused
    const clickFreq = Math.min(clicksPerSec / 1.0, 1);

    // ── 2. Hesitation time ──
    // Focused ≈ 0.05-0.15, Distracted ≈ 0.3-0.6
    // Focused reaction ≈ 500-800ms → 600/5000 = 0.12
    // Expired targets inject ~2800ms → 2800/5000 = 0.56
    const avgReaction =
      this.hitTimes.length > 0
        ? this.hitTimes.reduce((a, b) => a + b, 0) / this.hitTimes.length
        : 1500;
    const hesitation = Math.min(avgReaction / 5000, 1);

    // ── 3. Misclick rate ──
    // Focused ≈ 0.02-0.10, Distracted ≈ 0.2-0.5
    let misclickRate: number;
    if (this.totalClicks === 0 && this.expiredTargets > 0) {
      misclickRate = 0.7; // complete inattention
    } else if (this.totalClicks === 0 && this.expiredTargets === 0) {
      misclickRate = 0.15; // game just started, slightly neutral
    } else {
      const totalOpportunities = this.totalClicks + this.expiredTargets;
      misclickRate = totalOpportunities > 0
        ? (this.missClicks + this.expiredTargets * 0.5) / totalOpportunities
        : 0.0;
    }

    // ── 4. Scroll depth (proxied as task progress / hit progress) ──
    // Focused ≈ 0.6-0.8, Distracted ≈ 0.1-0.4
    // A focused player hits ~10-13 targets in 20s → 12/18 = 0.67
    // A distracted player hits ~2-5 → 3/18 = 0.17
    const scrollDepth = Math.min(this.greenHits / 18, 1);

    // ── 5. Movement smoothness ──
    // Focused ≈ 0.7-0.9, Distracted ≈ 0.3-0.6
    // computeSmoothness() returns 0..1 based on angular variance
    // Focused gameplay naturally produces 0.6-0.85 — use as-is, no boost
    const rawSmoothness = this.computeSmoothness();
    // Modulate by performance: smooth mouse movement only means "focused"
    // if the user is actually hitting targets
    const smoothness = rawSmoothness * perfScale;

    // ── 6. Dwell time ──
    // Focused ≈ 0.15-0.35, Distracted ≈ 0.4-0.7
    // Quick target clicks ≈ 200-500ms hover → 350/1500 = 0.23
    const avgDwell =
      this.hoverDurations.length > 0
        ? this.hoverDurations.reduce((a, b) => a + b, 0) /
          this.hoverDurations.length
        : 300;
    const dwellTime = Math.min(avgDwell / 1500, 1);

    // ── 7. Navigation speed ──
    // Focused ≈ 0.5-0.8, Distracted ≈ 0.1-0.4
    // In-game cursor typically moves at ~100-250 px/s
    // Normalize: 200 px/s → 200/300 = 0.67 (focused territory)
    const pxPerSec = this.computeNavSpeedRaw(windowStart, now);
    const navSpeed = Math.min(pxPerSec / 300, 1) * perfScale;

    // ── 8. Direction changes ──
    // Focused ≈ 0.05-0.20, Distracted ≈ 0.3-0.6
    // Focused: ~1-2 direction changes in 3s window → 1.5/3/2 = 0.25
    // Confused: ~3-5 changes → 4/3/2 = 0.67
    const recentDirChanges = this.dirChanges.filter(
      (t) => t >= windowStart,
    ).length;
    const dirChangeRate = Math.min(recentDirChanges / WINDOW_SEC / 2, 1);

    return {
      click_frequency: clamp(clickFreq),
      hesitation_time: clamp(hesitation),
      misclick_rate: clamp(misclickRate),
      scroll_depth: clamp(scrollDepth),
      movement_smoothness: clamp(smoothness),
      dwell_time: clamp(dwellTime),
      navigation_speed: clamp(navSpeed),
      direction_changes: clamp(dirChangeRate),
    };
  }

  private computeSmoothness(): number {
    // Use last N samples. Lower angular variance → higher smoothness.
    const recent = this.samples.slice(-60);
    if (recent.length < 5) return 0.3; // insufficient data = not smooth

    let totalAngle = 0;
    let count = 0;
    for (let i = 2; i < recent.length; i++) {
      const a = recent[i - 2];
      const b = recent[i - 1];
      const c = recent[i];
      const dx1 = b.x - a.x;
      const dy1 = b.y - a.y;
      const dx2 = c.x - b.x;
      const dy2 = c.y - b.y;
      const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (mag1 > 1 && mag2 > 1) {
        const cos = (dx1 * dx2 + dy1 * dy2) / (mag1 * mag2);
        totalAngle += Math.acos(Math.min(1, Math.max(-1, cos)));
        count++;
      }
    }
    if (count === 0) return 0.4;
    const avgAngle = totalAngle / count; // 0 = perfectly smooth, π = max chaos
    // Map: avgAngle ≈ 0.3 rad (smooth) → 0.85, avgAngle ≈ 1.5 rad (chaotic) → 0.20
    // Using a slightly compressed range to avoid saturation at 1.0
    return Math.max(0.1, 1 - avgAngle / (Math.PI * 0.8));
  }

  /**
   * Compute raw cursor speed in pixels per second within the time window.
   */
  private computeNavSpeedRaw(windowStart: number, now: number): number {
    const recent = this.samples.filter((s) => s.t >= windowStart);
    if (recent.length < 2) return 30; // minimal movement default
    let totalDist = 0;
    for (let i = 1; i < recent.length; i++) {
      const dx = recent[i].x - recent[i - 1].x;
      const dy = recent[i].y - recent[i - 1].y;
      totalDist += Math.sqrt(dx * dx + dy * dy);
    }
    const duration = (now - windowStart) / 1000;
    return duration > 0 ? totalDist / duration : 0;
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}
