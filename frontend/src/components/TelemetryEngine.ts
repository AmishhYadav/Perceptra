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
  private scrollAccum = 0;
  private containerHeight = 1;

  // --- Cursor tracking ---
  private samples: CursorSample[] = [];
  private dirChanges: number[] = []; // timestamps of direction changes

  // --- Dwell tracking ---
  private hoverStartTime = 0;
  private hoverDurations: number[] = [];
  private isOverTarget = false;

  // --- Timing ---
  private startTime = 0;

  reset() {
    this.clickTimes = [];
    this.hitTimes = [];
    this.totalClicks = 0;
    this.missClicks = 0;
    this.scrollAccum = 0;
    this.samples = [];
    this.dirChanges = [];
    this.hoverStartTime = 0;
    this.hoverDurations = [];
    this.isOverTarget = false;
    this.startTime = performance.now();
  }

  start(containerHeight: number) {
    this.reset();
    this.containerHeight = Math.max(containerHeight, 1);
  }

  // --- Event handlers (call from React) ---

  recordClick(hitTarget: boolean, reactionTimeMs?: number) {
    const now = performance.now();
    this.clickTimes.push(now);
    this.totalClicks++;
    if (!hitTarget) {
      this.missClicks++;
    }
    if (reactionTimeMs !== undefined) {
      this.hitTimes.push(reactionTimeMs);
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

  // --- Compute normalized telemetry snapshot [0..1] ---

  getSnapshot(): TelemetrySnapshot {
    const now = performance.now();
    const elapsed = Math.max((now - this.startTime) / 1000, 0.1);
    const windowStart = now - WINDOW_SEC * 1000;

    // 1. Click frequency (clicks/sec in window, normalised: 1.2 cps = 1.0)
    const recentClicks = this.clickTimes.filter((t) => t >= windowStart).length;
    const clickFreq = Math.min(recentClicks / WINDOW_SEC / 1.2, 1);

    // 2. Hesitation time (avg reaction time, normalised: 3s → 1.0)
    const avgReaction =
      this.hitTimes.length > 0
        ? this.hitTimes.reduce((a, b) => a + b, 0) / this.hitTimes.length
        : 1500;
    const hesitation = Math.min(avgReaction / 3000, 1);

    // 3. Misclick rate
    const misclickRate =
      this.totalClicks > 0 ? this.missClicks / this.totalClicks : 0.5;

    // 4. Scroll depth (total scroll / 5× container height)
    const scrollDepth = Math.min(
      this.scrollAccum / (this.containerHeight * 5),
      1,
    );

    // 5. Movement smoothness (inverse of avg angular deviation)
    const smoothness = this.computeSmoothness();

    // 6. Dwell time (avg hover duration normalised: 3s → 1.0)
    const avgDwell =
      this.hoverDurations.length > 0
        ? this.hoverDurations.reduce((a, b) => a + b, 0) /
          this.hoverDurations.length
        : 500;
    const dwellTime = Math.min(avgDwell / 3000, 1);

    // 7. Navigation speed (px/sec normalised: 1000px/s → 1.0)
    const navSpeed = this.computeNavSpeed(windowStart, now);

    // 8. Direction changes per second (normalised: 5/sec → 1.0)
    const recentDirChanges = this.dirChanges.filter(
      (t) => t >= windowStart,
    ).length;
    const dirChangeRate = Math.min(recentDirChanges / WINDOW_SEC / 5, 1);

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
    if (recent.length < 5) return 0.5;

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
    if (count === 0) return 0.5;
    const avgAngle = totalAngle / count; // 0 = perfectly smooth, π = max chaos
    return 1 - Math.min(avgAngle / Math.PI, 1); // invert: high = smooth
  }

  private computeNavSpeed(windowStart: number, now: number): number {
    const recent = this.samples.filter((s) => s.t >= windowStart);
    if (recent.length < 2) return 0.3;
    let totalDist = 0;
    for (let i = 1; i < recent.length; i++) {
      const dx = recent[i].x - recent[i - 1].x;
      const dy = recent[i].y - recent[i - 1].y;
      totalDist += Math.sqrt(dx * dx + dy * dy);
    }
    const duration = (now - windowStart) / 1000;
    const pxPerSec = duration > 0 ? totalDist / duration : 0;
    return Math.min(pxPerSec / 800, 1);
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}
