import { useInferenceStore } from "../store/useInferenceStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BarChart3, Layers } from "lucide-react";

const FEATURE_SHORT: Record<string, string> = {
  click_frequency: "Click",
  hesitation_time: "Hesit.",
  misclick_rate: "Misclk",
  scroll_depth: "Scroll",
  movement_smoothness: "Smooth",
  dwell_time: "Dwell",
  navigation_speed: "Speed",
  direction_changes: "DirChg",
};

function colorFromValue(v: number): string {
  if (v >= 0.6) return "#818cf8"; // accent/indigo
  if (v >= 0.3) return "#a78bfa"; // lighter purple
  return "#6b7280"; // gray
}

export function Explanations() {
  const prediction = useInferenceStore((s) => s.currentPrediction);
  const activeModel = useInferenceStore((s) => s.activeModel);

  if (!prediction) {
    return (
      <div className="rounded-2xl bg-surface-light/60 backdrop-blur-sm border border-white/5 p-6 min-h-[260px] flex items-center justify-center">
        <p className="text-sm text-gray-500">No explanation data yet</p>
      </div>
    );
  }

  // Feature importance bar chart data
  const importanceData = Object.entries(prediction.feature_importance).map(
    ([key, value]) => ({
      name: FEATURE_SHORT[key] || key,
      value: Math.round(value * 100) / 100,
    }),
  );

  return (
    <div className="space-y-4">
      {/* Feature Importance Chart */}
      <div className="rounded-2xl bg-surface-light/60 backdrop-blur-sm border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-accent" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Feature Importance
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={importanceData}
            margin={{ top: 5, right: 5, bottom: 5, left: -10 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              axisLine={{ stroke: "#374151" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 1]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e5e7eb",
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {importanceData.map((entry, i) => (
                <Cell key={i} fill={colorFromValue(entry.value)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AMNP Diagnostics (conditional) */}
      {activeModel === "AMNP" && prediction.extras && (
        <div className="rounded-2xl bg-surface-light/60 backdrop-blur-sm border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={16} className="text-accent" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              AMNP Internals
            </h3>
          </div>

          {/* Component weights */}
          {prediction.extras.component_weights && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Nonlinear Path</span>
                  <span className="font-mono text-indigo-400">
                    {(
                      prediction.extras.component_weights.nonlinear_weight * 100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-lighter overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-200"
                    style={{
                      width: `${prediction.extras.component_weights.nonlinear_weight * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Linear Path</span>
                  <span className="font-mono text-violet-400">
                    {(
                      prediction.extras.component_weights.linear_weight * 100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-lighter overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-200"
                    style={{
                      width: `${prediction.extras.component_weights.linear_weight * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Adaptive margin */}
          {prediction.extras.mean_margin != null && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-400">Adaptive Margin</span>
                <span className="text-lg font-mono font-bold text-accent">
                  {prediction.extras.mean_margin.toFixed(4)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
