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

const BG_COLOR = "#111827";

interface Props {
  width?: number;
  height?: number;
}

export function TrainingCanvas({ width = 640, height = 520 }: Props) {
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
  const xAxisLabel = useVisualizationStore((s) => s.xAxisLabel);
  const yAxisLabel = useVisualizationStore((s) => s.yAxisLabel);

  /* ── Coordinate transforms ── */
  const toCanvasX = useCallback(
    (x: number) => ((x - xRange[0]) / (xRange[1] - xRange[0])) * width,
    [xRange, width],
  );
  const toCanvasY = useCallback(
    (y: number) =>
      height - ((y - yRange[0]) / (yRange[1] - yRange[0])) * height,
    [yRange, height],
  );

  /* ── Draw boundary heatmap ── */
  const drawBoundary = useCallback(
    (ctx: CanvasRenderingContext2D, grid: BoundaryGrid) => {
      const cellW = width / grid.grid_size;
      const cellH = height / grid.grid_size;

      for (let row = 0; row < grid.grid_size; row++) {
        for (let col = 0; col < grid.grid_size; col++) {
          const idx = row * grid.grid_size + col;
          const probs = grid.probabilities[idx];
          if (!probs) continue;

          // Confidence = max probability → controls opacity
          const confidence = Math.max(...probs);
          
          // Use the dominant class color rather than linearly blending RGB (which turns Green+Red into Yellow/Distracted)
          let dominantClass = 0;
          for (let c = 1; c < 3; c++) {
            if (probs[c] === confidence) {
               dominantClass = c;
            }
          }
          
          const [r, g, b] = CLASS_COLORS[dominantClass];
          const alpha = 0.1 + (confidence - (1/3)) * 0.8; // scale alpha based on how far above random guess (1/3) it is

          ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, alpha)})`;
          // Row is Y-inverted (row 0 = bottom of PCA space)
          const canvasY = height - (row + 1) * cellH;
          ctx.fillRect(col * cellW, canvasY, cellW + 0.5, cellH + 0.5);
        }
      }
    },
    [width, height],
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

        // Determine point color
        let r = 100, g = 116, b = 139; // Neutral Slate
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
          ctx.arc(cx, cy, 6, 0, Math.PI * 2);
          const [tr, tg, tb] = CLASS_COLORS[pt.trueLabel];
          ctx.strokeStyle = `rgb(${tr},${tg},${tb})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Draw filled point
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fill();

        // Subtle drop shadow
        ctx.shadowColor = `rgba(${r},${g},${b},0.4)`;
        ctx.shadowBlur = 3;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    },
    [toCanvasX, toCanvasY],
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

    // Draw grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    const gridLines = 10;
    for (let i = 0; i <= gridLines; i++) {
      const gx = (i / gridLines) * width;
      const gy = (i / gridLines) * height;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }

    // Draw origin axes mathematically (x=0, y=0)
    const originX = toCanvasX(0);
    const originY = toCanvasY(0);
    
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    if (originY >= 0 && originY <= height) {
       ctx.beginPath(); ctx.moveTo(0, originY); ctx.lineTo(width, originY); ctx.stroke();
    }
    if (originX >= 0 && originX <= width) {
       ctx.beginPath(); ctx.moveTo(originX, 0); ctx.lineTo(originX, height); ctx.stroke();
    }

    // Axis labels — use real feature names from the server
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "bold 13px Inter, sans-serif";
    const xLabel = xAxisLabel || "Feature X";
    const yLabel = yAxisLabel || "Feature Y";
    ctx.fillText(xLabel, width / 2 - ctx.measureText(xLabel).width / 2, height - 12);
    
    ctx.save();
    ctx.translate(18, height / 2 + ctx.measureText(yLabel).width / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    // Draw tick values along X axis
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "10px Inter, sans-serif";
    const tickCountX = 5;
    for (let i = 0; i <= tickCountX; i++) {
      const frac = i / tickCountX;
      const val = xRange[0] + frac * (xRange[1] - xRange[0]);
      const tx = frac * width;
      ctx.fillText(val.toFixed(2), tx - 12, height - 28);
    }
    // Draw tick values along Y axis
    for (let i = 0; i <= tickCountX; i++) {
      const frac = i / tickCountX;
      const val = yRange[0] + frac * (yRange[1] - yRange[0]);
      const ty = height - frac * height;
      ctx.fillText(val.toFixed(2), 36, ty + 3);
    }

    // Draw boundary heatmap
    if (showBoundary && boundary) {
      drawBoundary(ctx, boundary);
    }

    // Draw scatter points
    if (points.length > 0) {
      drawPoints(ctx, points, predictions, showTrueLabels, showPredictions);
    }

    // Epoch label
    if (epoch > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.fillText(`Epoch ${epoch}`, 12, 20);
    }
  }, [
    points,
    predictions,
    boundary,
    showTrueLabels,
    showPredictions,
    showBoundary,
    epoch,
    xAxisLabel,
    yAxisLabel,
    xRange,
    yRange,
    width,
    height,
    drawBoundary,
    drawPoints,
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
      className="rounded-xl border border-white/5"
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: `${width} / ${height}`,
      }}
    />
  );
}
