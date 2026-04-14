/**
 * TrainingCanvas — HTML5 Canvas rendering for PCA scatter plot + decision boundary heatmap.
 *
 * Renders three layers:
 * 1. Decision boundary probability heatmap (background)
 * 2. Data points colored by true label or prediction
 * 3. Optional contour lines at class boundaries
 */
import { useRef, useEffect, useCallback } from "react";
import { useVisualizationStore } from "../store/useVisualizationStore";
import type { DataPoint, BoundaryGrid } from "../store/useVisualizationStore";

/* ── Color palette matching the Perceptra theme ── */
const CLASS_COLORS = [
  [16, 185, 129], // focused  — emerald
  [245, 158, 11], // distracted — amber
  [239, 68, 68], // confused  — red
];

const CLASS_NAMES = ["Focused", "Distracted", "Confused"];

const BG_COLOR = "#0d1117";

/* ── Canvas padding constants ── */
const PAD_LEFT = 60;
const PAD_RIGHT = 24;
const PAD_TOP = 32;
const PAD_BOTTOM = 48;

interface Props {
  width?: number;
  height?: number;
}

export function TrainingCanvas({ width = 800, height = 520 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const points = useVisualizationStore((s) => s.points);
  const predictions = useVisualizationStore((s) => s.predictions);
  const boundary = useVisualizationStore((s) => s.boundary);
  const xRange = useVisualizationStore((s) => s.xRange);
  const yRange = useVisualizationStore((s) => s.yRange);
  const showTrueLabels = useVisualizationStore((s) => s.showTrueLabels);
  const showPredictions = useVisualizationStore((s) => s.showPredictions);
  const showBoundary = useVisualizationStore((s) => s.showBoundary);
  const epoch = useVisualizationStore((s) => s.epoch);
  const accuracy = useVisualizationStore((s) => s.accuracy);
  const playbackState = useVisualizationStore((s) => s.playbackState);
  const xAxisLabel = useVisualizationStore((s) => s.xAxisLabel);
  const yAxisLabel = useVisualizationStore((s) => s.yAxisLabel);

  /* ── Plot area dimensions ── */
  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const plotH = height - PAD_TOP - PAD_BOTTOM;

  /* ── Coordinate transforms (map data space → plot area) ── */
  const toCanvasX = useCallback(
    (x: number) => PAD_LEFT + ((x - xRange[0]) / (xRange[1] - xRange[0])) * plotW,
    [xRange, plotW],
  );
  const toCanvasY = useCallback(
    (y: number) =>
      PAD_TOP + plotH - ((y - yRange[0]) / (yRange[1] - yRange[0])) * plotH,
    [yRange, plotH],
  );

  /* ── Draw boundary heatmap ── */
  const drawBoundary = useCallback(
    (ctx: CanvasRenderingContext2D, grid: BoundaryGrid) => {
      const cellW = plotW / grid.grid_size;
      const cellH = plotH / grid.grid_size;

      for (let row = 0; row < grid.grid_size; row++) {
        for (let col = 0; col < grid.grid_size; col++) {
          const idx = row * grid.grid_size + col;
          const probs = grid.probabilities[idx];
          if (!probs) continue;

          // Confidence = max probability → controls opacity
          const confidence = Math.max(...probs);

          // Use the dominant class color
          let dominantClass = 0;
          for (let c = 1; c < 3; c++) {
            if (probs[c] === confidence) {
              dominantClass = c;
            }
          }

          const [r, g, b] = CLASS_COLORS[dominantClass];
          const alpha = 0.08 + (confidence - 1 / 3) * 0.6;

          ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, alpha)})`;
          const canvasY = PAD_TOP + plotH - (row + 1) * cellH;
          ctx.fillRect(
            PAD_LEFT + col * cellW,
            canvasY,
            cellW + 0.5,
            cellH + 0.5,
          );
        }
      }

      // Draw contour lines at decision boundaries
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      for (let row = 0; row < grid.grid_size - 1; row++) {
        for (let col = 0; col < grid.grid_size - 1; col++) {
          const idx = row * grid.grid_size + col;
          const idxR = row * grid.grid_size + (col + 1);
          const idxD = (row + 1) * grid.grid_size + col;

          const probs = grid.probabilities[idx];
          const probsR = grid.probabilities[idxR];
          const probsD = grid.probabilities[idxD];
          if (!probs || !probsR || !probsD) continue;

          const classHere = probs.indexOf(Math.max(...probs));
          const classRight = probsR.indexOf(Math.max(...probsR));
          const classDown = probsD.indexOf(Math.max(...probsD));

          if (classHere !== classRight || classHere !== classDown) {
            const cx = PAD_LEFT + (col + 0.5) * cellW;
            const cy = PAD_TOP + plotH - (row + 0.5) * cellH;
            ctx.beginPath();
            ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fill();
          }
        }
      }
      ctx.setLineDash([]);
    },
    [plotW, plotH],
  );

  /* ── Draw scatter points ── */
  const drawPoints = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      pts: DataPoint[],
      preds: number[],
      showTrue: boolean,
      showPred: boolean,
    ) => {
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        const cx = toCanvasX(pt.x);
        const cy = toCanvasY(pt.y);

        // Skip if outside plot area
        if (cx < PAD_LEFT || cx > PAD_LEFT + plotW || cy < PAD_TOP || cy > PAD_TOP + plotH) continue;

        // Determine point color
        let r = 100,
          g = 116,
          b = 139; // Neutral Slate
        const hasPrediction = preds.length > i && preds[i] !== undefined;

        if (showPred && hasPrediction) {
          [r, g, b] = CLASS_COLORS[preds[i]];
        } else if (showTrue) {
          [r, g, b] = CLASS_COLORS[pt.trueLabel];
        }

        // Draw outer ring (true label) if showing both and it has a prediction
        const drawRing = showTrue && showPred && hasPrediction;

        if (drawRing) {
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          const [tr, tg, tb] = CLASS_COLORS[pt.trueLabel];
          ctx.strokeStyle = `rgba(${tr},${tg},${tb},0.8)`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Draw filled point (larger for visibility)
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fill();

        // Glow effect
        ctx.shadowColor = `rgba(${r},${g},${b},0.5)`;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    },
    [toCanvasX, toCanvasY, plotW, plotH],
  );

  /* ── Draw class region labels on the heatmap ── */
  const drawRegionLabels = useCallback(
    (ctx: CanvasRenderingContext2D, grid: BoundaryGrid) => {
      // Find centroids of each class region
      const classCentroids: { [key: number]: { sumX: number; sumY: number; count: number } } = {};
      for (let c = 0; c < 3; c++) {
        classCentroids[c] = { sumX: 0, sumY: 0, count: 0 };
      }

      const cellW = plotW / grid.grid_size;
      const cellH = plotH / grid.grid_size;

      for (let row = 0; row < grid.grid_size; row++) {
        for (let col = 0; col < grid.grid_size; col++) {
          const idx = row * grid.grid_size + col;
          const probs = grid.probabilities[idx];
          if (!probs) continue;

          const maxProb = Math.max(...probs);
          const dominantClass = probs.indexOf(maxProb);

          if (maxProb > 0.55) {
            const cx = PAD_LEFT + (col + 0.5) * cellW;
            const cy = PAD_TOP + plotH - (row + 0.5) * cellH;
            classCentroids[dominantClass].sumX += cx;
            classCentroids[dominantClass].sumY += cy;
            classCentroids[dominantClass].count += 1;
          }
        }
      }

      // Draw labels at centroids
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let c = 0; c < 3; c++) {
        const centroid = classCentroids[c];
        if (centroid.count === 0) continue;

        const cx = centroid.sumX / centroid.count;
        const cy = centroid.sumY / centroid.count;
        const [r, g, b] = CLASS_COLORS[c];

        // Background pill
        const label = CLASS_NAMES[c].toUpperCase();
        ctx.font = "bold 10px Inter, sans-serif";
        const textWidth = ctx.measureText(label).width;
        const pillW = textWidth + 16;
        const pillH = 22;

        ctx.fillStyle = `rgba(0,0,0,0.7)`;
        ctx.beginPath();
        const rx = cx - pillW / 2;
        const ry = cy - pillH / 2;
        const radius = 6;
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + pillW - radius, ry);
        ctx.quadraticCurveTo(rx + pillW, ry, rx + pillW, ry + radius);
        ctx.lineTo(rx + pillW, ry + pillH - radius);
        ctx.quadraticCurveTo(rx + pillW, ry + pillH, rx + pillW - radius, ry + pillH);
        ctx.lineTo(rx + radius, ry + pillH);
        ctx.quadraticCurveTo(rx, ry + pillH, rx, ry + pillH - radius);
        ctx.lineTo(rx, ry + radius);
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
        ctx.closePath();
        ctx.fill();

        // Border
        ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Text
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillText(label, cx, cy + 1);
      }

      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    },
    [plotW, plotH],
  );

  /* ── Main render loop ── */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    // Draw plot area background
    ctx.fillStyle = "#161b22";
    ctx.fillRect(PAD_LEFT, PAD_TOP, plotW, plotH);

    // Draw grid lines within plot area
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    const gridLines = 8;
    for (let i = 0; i <= gridLines; i++) {
      const gx = PAD_LEFT + (i / gridLines) * plotW;
      const gy = PAD_TOP + (i / gridLines) * plotH;
      ctx.beginPath();
      ctx.moveTo(gx, PAD_TOP);
      ctx.lineTo(gx, PAD_TOP + plotH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, gy);
      ctx.lineTo(PAD_LEFT + plotW, gy);
      ctx.stroke();
    }

    // Draw origin axes mathematically (x=0, y=0)
    const originX = toCanvasX(0);
    const originY = toCanvasY(0);

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    if (originY >= PAD_TOP && originY <= PAD_TOP + plotH) {
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, originY);
      ctx.lineTo(PAD_LEFT + plotW, originY);
      ctx.stroke();
    }
    if (originX >= PAD_LEFT && originX <= PAD_LEFT + plotW) {
      ctx.beginPath();
      ctx.moveTo(originX, PAD_TOP);
      ctx.lineTo(originX, PAD_TOP + plotH);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw plot area border
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD_LEFT, PAD_TOP, plotW, plotH);

    // Axis labels — use real feature names from the server
    const xLabel = xAxisLabel || "Feature X";
    const yLabel = yAxisLabel || "Feature Y";

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(xLabel, PAD_LEFT + plotW / 2, height - 6);
    ctx.textAlign = "start";

    ctx.save();
    ctx.translate(14, PAD_TOP + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(yLabel, 0, 0);
    ctx.textAlign = "start";
    ctx.restore();

    // Draw tick values along X axis
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const frac = i / tickCount;
      const val = xRange[0] + frac * (xRange[1] - xRange[0]);
      const tx = PAD_LEFT + frac * plotW;
      ctx.fillText(val.toFixed(1), tx, PAD_TOP + plotH + 18);

      // Small tick mark
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx, PAD_TOP + plotH);
      ctx.lineTo(tx, PAD_TOP + plotH + 4);
      ctx.stroke();
    }
    ctx.textAlign = "start";

    // Draw tick values along Y axis
    for (let i = 0; i <= tickCount; i++) {
      const frac = i / tickCount;
      const val = yRange[0] + frac * (yRange[1] - yRange[0]);
      const ty = PAD_TOP + plotH - frac * plotH;
      ctx.textAlign = "right";
      ctx.fillText(val.toFixed(1), PAD_LEFT - 8, ty + 4);
      ctx.textAlign = "start";

      // Small tick mark
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT - 4, ty);
      ctx.lineTo(PAD_LEFT, ty);
      ctx.stroke();
    }

    // Save context for clipping to plot area
    ctx.save();
    ctx.beginPath();
    ctx.rect(PAD_LEFT, PAD_TOP, plotW, plotH);
    ctx.clip();

    // Draw boundary heatmap
    if (showBoundary && boundary) {
      drawBoundary(ctx, boundary);
    }

    // Draw scatter points
    if (points.length > 0) {
      drawPoints(ctx, points, predictions, showTrueLabels, showPredictions);
    }

    // Draw region labels on boundary
    if (showBoundary && boundary && epoch > 5) {
      drawRegionLabels(ctx, boundary);
    }

    ctx.restore(); // unclip

    // Epoch label (top-left of plot)
    if (epoch > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.fillText(`Epoch ${epoch}`, PAD_LEFT + 8, PAD_TOP + 18);
    }

    // Accuracy badge (top-right of plot)
    if (epoch > 0) {
      const accText = `${(accuracy * 100).toFixed(1)}%`;
      ctx.font = "bold 12px Inter, sans-serif";
      const accWidth = ctx.measureText(accText).width;
      const badgeX = PAD_LEFT + plotW - accWidth - 24;
      const badgeY = PAD_TOP + 6;

      // Badge background
      ctx.fillStyle = accuracy > 0.9
        ? "rgba(16,185,129,0.2)"
        : accuracy > 0.7
          ? "rgba(245,158,11,0.2)"
          : "rgba(239,68,68,0.2)";
      const bw = accWidth + 16;
      const bh = 22;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, bw, bh, 6);
      ctx.fill();

      ctx.fillStyle = accuracy > 0.9
        ? "rgba(16,185,129,0.9)"
        : accuracy > 0.7
          ? "rgba(245,158,11,0.9)"
          : "rgba(239,68,68,0.9)";
      ctx.fillText(accText, badgeX + 8, badgeY + 16);
    }

    // Completion flash animation
    if (playbackState === "complete") {
      ctx.strokeStyle = "rgba(16,185,129,0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(PAD_LEFT, PAD_TOP, plotW, plotH);
    }

    // Legend inside canvas (bottom-right of plot area)
    const legendX = PAD_LEFT + plotW - 200;
    const legendY = PAD_TOP + plotH - 12;
    ctx.font = "bold 9px Inter, sans-serif";
    for (let c = 0; c < 3; c++) {
      const [r, g, b] = CLASS_COLORS[c];
      const lx = legendX + c * 72;

      ctx.beginPath();
      ctx.arc(lx, legendY - 3, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText(CLASS_NAMES[c], lx + 8, legendY);
    }
  }, [
    points,
    predictions,
    boundary,
    showTrueLabels,
    showPredictions,
    showBoundary,
    epoch,
    accuracy,
    playbackState,
    xAxisLabel,
    yAxisLabel,
    xRange,
    yRange,
    width,
    height,
    plotW,
    plotH,
    toCanvasX,
    toCanvasY,
    drawBoundary,
    drawPoints,
    drawRegionLabels,
  ]);

  /* ── Trigger re-render on state changes ── */
  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-xl border border-white/10"
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: `${width} / ${height}`,
      }}
    />
  );
}
