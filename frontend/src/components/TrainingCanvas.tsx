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

          // Blend RGB from class probabilities
          let r = 0,
            g = 0,
            b = 0;
          for (let c = 0; c < 3; c++) {
            r += probs[c] * CLASS_COLORS[c][0];
            g += probs[c] * CLASS_COLORS[c][1];
            b += probs[c] * CLASS_COLORS[c][2];
          }

          // Confidence = max probability → controls opacity
          const confidence = Math.max(...probs);
          const alpha = 0.15 + confidence * 0.45;

          ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`;
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
        let colorIdx = pt.trueLabel;
        if (showPred && preds.length > 0) {
          colorIdx = preds[i] ?? pt.trueLabel;
        } else if (showTrue) {
          colorIdx = pt.trueLabel;
        }

        const [r, g, b] = CLASS_COLORS[colorIdx] || [128, 128, 128];

        // Draw outer ring (true label) if showing both
        if (showTrue && showPred && preds.length > 0) {
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

    // Axis labels
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText("PC1 →", width - 40, height - 8);
    ctx.save();
    ctx.translate(12, 40);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("PC2 →", 0, 0);
    ctx.restore();

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
