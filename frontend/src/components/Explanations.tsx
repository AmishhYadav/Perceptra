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
  if (v >= 0.6) return "#163429"; // primary-container
  if (v >= 0.3) return "#466558"; // surface-tint
  return "#727974"; // outline
}

export function Explanations() {
  const allPredictions = useInferenceStore((s) => s.allPredictions);
  const activeModel = useInferenceStore((s) => s.activeModel);
  const prediction = allPredictions ? allPredictions[activeModel] || null : null;

  if (!prediction) {
    return (
      <div className="bg-surface-container-high rounded-lg p-8 min-h-[260px] flex items-center justify-center">
        <span className="material-symbols-outlined text-secondary text-4xl animate-spin">
          progress_activity
        </span>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Feature Importance Chart */}
      <div className="bg-white rounded-lg p-8 border border-outline-variant/10 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-headline text-2xl italic text-primary">
            Feature Weighting
          </h3>
          <span className="text-xs font-label text-secondary uppercase tracking-widest">
            Importance
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={importanceData}
            margin={{ top: 5, right: 5, bottom: 5, left: -20 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fill: "#727974", fontSize: 10, fontWeight: "bold" }}
              axisLine={{ stroke: "#e4e2dd" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#727974", fontSize: 10, fontWeight: "bold" }}
              axisLine={false}
              tickLine={false}
              domain={[0, 1]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #c1c8c3",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold",
                color: "#1b1c19",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
              }}
              cursor={{ fill: "#f0eee9" }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {importanceData.map((entry, i) => (
                <Cell key={i} fill={colorFromValue(entry.value)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AMNP Diagnostics */}
      <div className="bg-white rounded-lg p-8 border border-outline-variant/10 shadow-sm">
        <h3 className="font-headline text-2xl italic text-primary mb-8">
          Model Diagnostics
        </h3>

        {/* AMNP Internals */}
        {activeModel === "AMNP" && prediction.extras ? (
          <div className="space-y-6">
            {prediction.extras.component_weights && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-secondary">
                    <span>Nonlinear Path (Deep)</span>
                    <span className="tabular-nums text-primary-container">
                      {(
                        prediction.extras.component_weights.nonlinear_weight *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-container transition-all duration-300"
                      style={{
                        width: `${prediction.extras.component_weights.nonlinear_weight * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-secondary">
                    <span>Linear Path (Perceptron)</span>
                    <span className="tabular-nums text-secondary">
                      {(
                        prediction.extras.component_weights.linear_weight * 100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary transition-all duration-300"
                      style={{
                        width: `${prediction.extras.component_weights.linear_weight * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </>
            )}
            {prediction.extras.mean_margin != null && (
              <div className="p-4 bg-surface-container-high rounded-lg mt-4 flex justify-between items-center">
                <span className="text-[11px] font-black uppercase tracking-widest text-secondary">
                  Adaptive Margin
                </span>
                <span className="text-xl font-headline italic tabular-nums text-primary">
                  {prediction.extras.mean_margin.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 opacity-50">
            <span className="material-symbols-outlined text-4xl mb-4">
              analytics
            </span>
            <p className="text-xs font-bold uppercase tracking-widest text-center text-secondary">
              Diagnostics only available for AMNP architectures
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
