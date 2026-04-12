/**
 * VisualPlayground — main container for the Visual tab.
 *
 * Layout:
 * ┌──────────┬──────────────────────────────┐
 * │ Controls │      Training Canvas         │
 * │ (left)   │      (center)                │
 * │          │                              │
 * │          ├──────────────────────────────┤
 * │          │    Accuracy Sparkline        │
 * └──────────┴──────────────────────────────┘
 */
import { useEffect } from "react";
import { TrainingCanvas } from "./TrainingCanvas";
import { VisualControls } from "./VisualControls";
import { useVisualizationStore } from "../store/useVisualizationStore";

export function VisualPlayground() {
  const connect = useVisualizationStore((s) => s.connect);
  const disconnect = useVisualizationStore((s) => s.disconnect);
  const currentModel = useVisualizationStore((s) => s.currentModel);
  const accuracyHistory = useVisualizationStore((s) => s.accuracyHistory);
  const lossHistory = useVisualizationStore((s) => s.lossHistory);
  const playbackState = useVisualizationStore((s) => s.playbackState);

  // Auto-connect on mount
  useEffect(() => {
    connect(currentModel);
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left: Controls */}
      <div className="lg:col-span-3">
        <VisualControls />
      </div>

      {/* Center: Canvas + Sparklines */}
      <div className="lg:col-span-9 space-y-4">
        {/* Canvas */}
        <div className="bg-surface-light/60 backdrop-blur-md rounded-2xl border border-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-200">
              PCA Decision Space
            </h2>
            <div className="flex items-center gap-2">
              {playbackState === "playing" && (
                <span className="flex items-center gap-1.5 text-[10px] text-focused">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-focused animate-pulse" />
                  Training...
                </span>
              )}
              {playbackState === "complete" && (
                <span className="text-[10px] text-accent">✓ Complete</span>
              )}
              {playbackState === "paused" && (
                <span className="text-[10px] text-distracted">⏸ Paused</span>
              )}
            </div>
          </div>
          <TrainingCanvas width={800} height={560} />
        </div>

        {/* Accuracy & Loss sparklines */}
        {accuracyHistory.length > 1 && (
          <div className="grid grid-cols-2 gap-4">
            <SparklineCard
              title="Accuracy"
              data={accuracyHistory}
              color="#10b981"
              format={(v) => `${(v * 100).toFixed(1)}%`}
            />
            <SparklineCard
              title="Loss"
              data={lossHistory}
              color="#f59e0b"
              format={(v) => v.toFixed(4)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Tiny sparkline using canvas ── */
function SparklineCard({
  title,
  data,
  color,
  format,
}: {
  title: string;
  data: number[];
  color: string;
  format: (v: number) => string;
}) {

  return (
    <div className="bg-surface-light/60 backdrop-blur-md rounded-xl border border-white/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
          {title}
        </span>
        <span className="text-sm font-bold" style={{ color }}>
          {format(data[data.length - 1])}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${data.length} 100`}
        className="w-full h-8"
        preserveAspectRatio="none"
      >
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={data
            .map((v, i) => {
              const min = Math.min(...data);
              const max = Math.max(...data);
              const range = max - min || 1;
              const y = 95 - ((v - min) / range) * 90;
              return `${i},${y}`;
            })
            .join(" ")}
        />
      </svg>
    </div>
  );
}
