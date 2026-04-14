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
    // Treat an expired target as a "click" that took the full lifetime
    // This drags the average hesitation toward confused/distracted territory
    this.hitTimes.push(targetLifetimeMs);
  }

  // --- Compute normalized telemetry snapshot [0..1] ---

  getSnapshot(): TelemetrySnapshot {
    const now = performance.now();
    const windowStart = now - WINDOW_SEC * 1000;

    // ── Task engagement ratio ──
    // Cursor quality (smoothness, nav_speed) only means "focused" if the user
    // is actually engaging with the task.
    const validHits = Math.max(0, this.totalClicks - this.missClicks);
    const totalTargetOpportunities = validHits + this.expiredTargets;
    const taskEngagement = totalTargetOpportunities > 2
      ? validHits / totalTargetOpportunities
      : 1; // not enough data yet, don't penalize
    // Scale cursor-quality features: disengaged → low values
    const engagementScale = 0.15 + 0.85 * taskEngagement;

    // ── 1. Click frequency ──
    // Training centroid: focused≈0.80, distracted≈0.50
    // In a 3s window, ~2 target clicks = 0.67 cps → should map to ~0.80
    const recentClicks = this.clickTimes.filter((t) => t >= windowStart).length;
    const clicksPerSec = recentClicks / WINDOW_SEC;
    const clickFreq = Math.min(clicksPerSec / 0.85, 1);

    // ── 2. Hesitation time ──
    // Training centroid: focused≈0.10, distracted≈0.51
    // Focused reaction ≈600ms → 600/6000=0.10 ✓
    // Expired targets inject full lifetime ~2800ms → 2800/6000=0.47
    const avgReaction =
      this.hitTimes.length > 0
        ? this.hitTimes.reduce((a, b) => a + b, 0) / this.hitTimes.length
        : 1500;
    const hesitation = Math.min(avgReaction / 6000, 1);

    // ── 3. Misclick rate ──
    // Training centroid: focused≈0.07, distracted≈0.30
    let misclickRate: number;
    if (this.totalClicks === 0 && this.expiredTargets > 0) {
      misclickRate = 0.8; // complete inattention
    } else if (this.totalClicks === 0 && this.expiredTargets === 0) {
      misclickRate = 0.3; // game just started, neutral
    } else {
      const totalOpportunities = this.totalClicks + this.expiredTargets;
      misclickRate = totalOpportunities > 0
        ? (this.missClicks + this.expiredTargets * 0.5) / totalOpportunities
        : 0.0;
    }

    // ── 4. Scroll depth (proxied as hit progress) ──
    // Training centroid: focused≈0.70, distracted≈0.40
    // ~10 valid green hits in 15s game → 0.71
    const scrollDepth = Math.min(validHits / 14, 1);

    // ── 5. Movement smoothness ──
    // Training centroid: focused≈0.89, distracted≈0.51
    // computeSmoothness returns 0..1; raw focused gameplay ≈0.6-0.8
    // Scale: 0.75 raw → 0.90 output
    const rawSmoothness = this.computeSmoothness();
    const boostedSmoothness = Math.min(rawSmoothness * 1.2, 1);
    const smoothness = boostedSmoothness * engagementScale;

    // ── 6. Dwell time ──
    // Training centroid: focused≈0.30, distracted≈0.60
    // Quick target clicks ≈300-500ms hover → 400/1500=0.27
    const avgDwell =
      this.hoverDurations.length > 0
        ? this.hoverDurations.reduce((a, b) => a + b, 0) /
          this.hoverDurations.length
        : 300;
    const dwellTime = Math.min(avgDwell / 1500, 1);

    // ── 7. Navigation speed ──
    // Training centroid: focused≈0.70, distracted≈0.40
    // In-game cursor ~200px/sec → 200/280=0.71 ✓
    const rawNavSpeed = this.computeNavSpeed(windowStart, now);
    const finalNavSpeed = Math.min(rawNavSpeed / 280, 1) * engagementScale;

    // ── 8. Direction changes ──
    // Training centroid: focused≈0.11, distracted≈0.40
    // Focused: ~0.3 changes/sec → 0.3/3=0.10
    const recentDirChanges = this.dirChanges.filter(
      (t) => t >= windowStart,
    ).length;
    const dirChangeRate = Math.min(recentDirChanges / WINDOW_SEC / 3, 1);

    return {
      click_frequency: clamp(clickFreq),
      hesitation_time: clamp(hesitation),
      misclick_rate: clamp(misclickRate),
      scroll_depth: clamp(scrollDepth),
      movement_smoothness: clamp(smoothness),
      dwell_time: clamp(dwellTime),
      navigation_speed: clamp(finalNavSpeed),
      direction_changes: clamp(dirChangeRate),
    };
  }

  private computeSmoothness(): number {
    // Use last N samples. Lower angular variance → higher smoothness.
    const recent = this.samples.slice(-60);
    if (recent.length < 5) return 0.2; // insufficient data = not smooth

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
