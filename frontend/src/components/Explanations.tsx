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
import { Loader } from "lucide-react";

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
  if (v >= 0.6) return "var(--color-primary)"; // emerald
  if (v >= 0.3) return "var(--color-tertiary)"; // purple
  return "var(--color-on-surface-variant)"; // gray
}

export function Explanations() {
  const prediction = useInferenceStore((s) => s.currentPrediction);
  const activeModel = useInferenceStore((s) => s.activeModel);

  if (!prediction) {
    return (
      <div className="bg-surface-container-low rounded-[2rem] p-8 min-h-[260px] flex items-center justify-center">
        <Loader size={24} className="text-on-surface-variant animate-spin" />
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
      <div className="bg-surface-container-low rounded-[2rem] p-8 border border-white/5 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface pt-1">Feature Weighting (Importance)</h3>
          <span className="material-symbols-outlined text-on-surface-variant text-sm">info</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={importanceData}
            margin={{ top: 5, right: 5, bottom: 5, left: -20 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--color-on-surface-variant)", fontSize: 10, fontWeight: "bold" }}
              axisLine={{ stroke: "var(--color-surface-container-highest)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--color-on-surface-variant)", fontSize: 10, fontWeight: "bold" }}
              axisLine={false}
              tickLine={false}
              domain={[0, 1]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface-container-high)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold",
                color: "var(--color-on-surface)",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)"
              }}
              cursor={{fill: 'var(--color-surface-container-highest)'}}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {importanceData.map((entry, i) => (
                <Cell key={i} fill={colorFromValue(entry.value)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AMNP Diagnostics / Telemetry Placeholder */}
      <div className="bg-surface-container-low rounded-[2rem] p-8 border border-white/5 shadow-2xl">
         <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface mb-8 pt-1">Model Diagnostics</h3>
         
          {/* AMNP Internals */}
          {activeModel === "AMNP" && prediction.extras ? (
            <div className="space-y-6">
              {prediction.extras.component_weights && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                      <span>Nonlinear Path (Deep)</span>
                      <span className="tabular-numbers text-tertiary">
                        {(prediction.extras.component_weights.nonlinear_weight * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface-container-lowest rounded-full overflow-hidden">
                      <div className="h-full bg-tertiary transition-all duration-300" 
                           style={{width: `${prediction.extras.component_weights.nonlinear_weight * 100}%`}}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                      <span>Linear Path (Perceptron)</span>
                      <span className="tabular-numbers text-secondary">
                        {(prediction.extras.component_weights.linear_weight * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface-container-lowest rounded-full overflow-hidden">
                      <div className="h-full bg-secondary transition-all duration-300" 
                           style={{width: `${prediction.extras.component_weights.linear_weight * 100}%`}}></div>
                    </div>
                  </div>
                </>
              )}
               {prediction.extras.mean_margin != null && (
                 <div className="p-4 bg-surface-container-highest rounded-2xl mt-4 flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Adaptive Margin</span>
                    <span className="text-xl font-bold tabular-nums text-primary">{prediction.extras.mean_margin.toFixed(4)}</span>
                 </div>
               )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 opacity-50">
               <span className="material-symbols-outlined text-4xl mb-4">analytics</span>
               <p className="text-xs font-bold uppercase tracking-widest text-center">Diagnostics only available for AMNP architectures</p>
            </div>
          )}
      </div>
    </div>
  );
}
