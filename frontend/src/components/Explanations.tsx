/**
 * Explanations — AMNP-focused XAI dashboard.
 *
 * For AMNP: Shows a full explainability breakdown including:
 *   - "Why this classification?" in plain English
 *   - Dual-path feature importance (which path cares about what)
 *   - Margin confidence gauge (how sure is the model, really?)
 *   - Path routing indicator (did this sample use the deep or linear path?)
 *
 * For other models: Shows basic feature importance with context.
 */
import { useInferenceStore } from "../store/useInferenceStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

/* ── Feature display config ── */

const FEATURE_INFO: Record<string, { short: string; full: string; description: string }> = {
  click_frequency: {
    short: "Click",
    full: "Click Frequency",
    description: "How often the user clicks during the session",
  },
  hesitation_time: {
    short: "Hesit.",
    full: "Hesitation Time",
    description: "Duration of pauses before taking an action",
  },
  misclick_rate: {
    short: "Misclk",
    full: "Misclick Rate",
    description: "Proportion of clicks on wrong targets",
  },
  scroll_depth: {
    short: "Scroll",
    full: "Scroll Activity",
    description: "Amount of scrolling during the session",
  },
  movement_smoothness: {
    short: "Smooth",
    full: "Movement Smoothness",
    description: "How fluid the cursor path is (vs. jerky)",
  },
  dwell_time: {
    short: "Dwell",
    full: "Hover Dwell Time",
    description: "Time spent hovering over elements before clicking",
  },
  navigation_speed: {
    short: "Speed",
    full: "Navigation Speed",
    description: "Average cursor movement velocity",
  },
  direction_changes: {
    short: "DirChg",
    full: "Direction Changes",
    description: "How often the cursor reverses direction",
  },
};

const BEHAVIOR_EXPLAIN: Record<string, { emoji: string; color: string; description: string }> = {
  focused: {
    emoji: "🎯",
    color: "#163429",
    description: "Fast reactions, smooth movement, high accuracy",
  },
  distracted: {
    emoji: "😶‍🌫️",
    color: "#5e5e5e",
    description: "Sporadic engagement, long idle periods, aimless scrolling",
  },
  confused: {
    emoji: "😕",
    color: "#ba1a1a",
    description: "Hesitant, erratic movement, frequent misclicks",
  },
};

function getMarginLabel(satisfaction: number): { label: string; color: string; description: string } {
  if (satisfaction >= 2.0) return { label: "Very High", color: "text-primary-container", description: "The model is extremely confident — score gap far exceeds the learned margin" };
  if (satisfaction >= 1.0) return { label: "Confident", color: "text-primary-container", description: "Score separation exceeds the required margin — reliable classification" };
  if (satisfaction >= 0.5) return { label: "Uncertain", color: "text-secondary", description: "Score gap is below the required margin — this sample is near the decision boundary" };
  return { label: "Reject Zone", color: "text-error", description: "The model can't reliably classify this input — consider it ambiguous" };
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

  const isAMNP = activeModel === "AMNP" && prediction.extras;
  const behaviorInfo = BEHAVIOR_EXPLAIN[prediction.predicted_class];

  // Find the top 3 most important features for "why" explanation
  // Normalize so importance values sum to 100%
  const importanceEntries = Object.entries(prediction.feature_importance);
  const totalImportance = importanceEntries.reduce((sum, [, v]) => sum + Math.abs(v), 0) || 1;
  const sortedFeatures = importanceEntries
    .map(([key, value]) => [key, Math.abs(value) / totalImportance] as [string, number])
    .sort(([, a], [, b]) => b - a);
  const topFeatures = sortedFeatures.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between">
        <h4 className="font-headline text-3xl italic text-primary">
          {isAMNP ? "AMNP Explainability" : "Model Explanation"}
        </h4>
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-secondary">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {isAMNP ? "psychology" : "analytics"}
          </span>
          {activeModel}
        </span>
      </div>

      {/* ── Row 1: Why This Classification ── */}
      <div className="bg-white rounded-lg p-8 border border-outline-variant/10 shadow-sm">
        <div className="flex items-start gap-6">
          <div className="text-4xl">{behaviorInfo.emoji}</div>
          <div className="flex-1">
            <div className="flex items-baseline gap-3 mb-2">
              <h3 className="font-headline text-2xl italic" style={{ color: behaviorInfo.color }}>
                "{prediction.predicted_class}"
              </h3>
              <span className="text-sm text-secondary">
                — {(prediction.confidence * 100).toFixed(1)}% confidence
              </span>
            </div>
            <p className="text-sm text-secondary mb-4">{behaviorInfo.description}</p>

            {/* Top feature drivers */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-widest text-secondary mb-2">
                Most influential features for this decision:
              </p>
              {topFeatures.map(([key, normalizedValue], i) => {
                const info = FEATURE_INFO[key];
                return (
                  <div key={key} className="flex items-center gap-3 text-sm">
                    <span className="text-xs font-black text-secondary w-4">{i + 1}.</span>
                    <span className="font-bold text-on-surface min-w-[140px]">{info?.full || key}</span>
                    <span className="text-secondary italic text-xs flex-1">
                      {info?.description}
                    </span>
                    <div className="flex items-center gap-2 min-w-[80px] justify-end">
                      <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-container rounded-full transition-all"
                          style={{ width: `${normalizedValue * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-primary-container tabular-nums font-bold w-8 text-right">
                        {(normalizedValue * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {isAMNP ? (
        /* ── AMNP Full Explainability ── */
        <>
          {/* Row 2: Dual Path Comparison + Margin Confidence */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dual Path Radar Chart */}
            <div className="lg:col-span-2 bg-white rounded-lg p-8 border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-headline text-xl italic text-primary">
                    Dual-Path Attribution
                  </h3>
                  <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mt-1">
                    How each path interprets your behavior
                  </p>
                </div>
              </div>
              <p className="text-xs text-secondary mb-4 leading-relaxed">
                AMNP uses two processing paths: a <strong>deep nonlinear path</strong> that
                captures complex behavioral patterns, and a <strong>linear path</strong> that
                provides simple, interpretable classification. The radar chart shows which features
                each path considers most important for THIS specific input.
              </p>
              <DualPathRadar
                nonlinearImportance={prediction.extras?.nonlinear_importance}
                linearImportance={prediction.extras?.linear_importance}
              />
            </div>

            {/* Margin Confidence + Path Routing */}
            <div className="flex flex-col gap-6">
              {/* Margin Confidence Gauge */}
              <MarginConfidenceCard
                marginSatisfaction={prediction.extras?.margin_satisfaction}
                meanMargin={prediction.extras?.mean_margin}
              />

              {/* Path Routing */}
              <PathRoutingCard
                componentWeights={prediction.extras?.component_weights}
              />
            </div>
          </div>

          {/* Row 3: Feature-by-feature comparison */}
          <FeatureComparisonTable
            featureImportance={prediction.feature_importance}
            nonlinearImportance={prediction.extras?.nonlinear_importance}
            linearImportance={prediction.extras?.linear_importance}
          />
        </>
      ) : (
        /* ── Non-AMNP: Simple Feature Importance ── */
        <div className="bg-white rounded-lg p-8 border border-outline-variant/10 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-headline text-xl italic text-primary">Feature Importance</h3>
              <p className="text-xs text-secondary mt-1">
                How much each telemetry signal influenced {activeModel}'s decision
              </p>
            </div>
          </div>
          <SimpleImportanceChart featureImportance={prediction.feature_importance} />
          <p className="text-[10px] text-secondary mt-4 italic">
            Values show gradient-based attribution: how much changing each feature would shift the prediction.
            Different models produce different values because they learn different internal representations.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function DualPathRadar({
  nonlinearImportance,
  linearImportance,
}: {
  nonlinearImportance?: Record<string, number>;
  linearImportance?: Record<string, number>;
}) {
  if (!nonlinearImportance || !linearImportance) return null;

  // Normalize both to [0, 1] relative to their max
  const allVals = [
    ...Object.values(nonlinearImportance),
    ...Object.values(linearImportance),
  ];
  const maxVal = Math.max(...allVals, 0.01);

  const data = Object.keys(nonlinearImportance).map((key) => ({
    feature: FEATURE_INFO[key]?.short || key,
    fullName: FEATURE_INFO[key]?.full || key,
    "Deep Path": ((nonlinearImportance[key] || 0) / maxVal) * 100,
    "Linear Path": ((linearImportance[key] || 0) / maxVal) * 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="#e4e2dd" />
        <PolarAngleAxis
          dataKey="feature"
          tick={{ fill: "#5e5e5e", fontSize: 10, fontWeight: "bold" }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: "#727974", fontSize: 8 }}
          tickCount={4}
        />
        <Radar
          name="Deep Path"
          dataKey="Deep Path"
          stroke="#163429"
          fill="#163429"
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Radar
          name="Linear Path"
          dataKey="Linear Path"
          stroke="#5e5e5e"
          fill="#5e5e5e"
          fillOpacity={0.15}
          strokeWidth={2}
          strokeDasharray="4 4"
        />
        <Legend
          wrapperStyle={{ fontSize: 10, fontWeight: "bold" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #c1c8c3",
            borderRadius: "10px",
            fontSize: "11px",
            fontWeight: "bold",
          }}
          formatter={(value: number) => `${value.toFixed(0)}%`}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function MarginConfidenceCard({
  marginSatisfaction,
  meanMargin,
}: {
  marginSatisfaction?: number;
  meanMargin?: number;
}) {
  const sat = marginSatisfaction ?? 0;
  const info = getMarginLabel(sat);
  // Clamp gauge to [0, 3] for visual
  const gaugePercent = Math.min(sat / 3, 1) * 100;

  return (
    <div className="bg-white rounded-lg p-6 border border-outline-variant/10 shadow-sm flex-1">
      <h4 className="text-[10px] uppercase font-bold tracking-widest text-secondary mb-4">
        Margin Confidence
      </h4>

      {/* Gauge */}
      <div className="relative w-full h-3 bg-surface-container-highest rounded-full overflow-hidden mb-3">
        {/* Zone markers */}
        <div className="absolute inset-0 flex">
          <div className="flex-1 border-r border-white/50" /> {/* 0-1: uncertain */}
          <div className="flex-1 border-r border-white/50" /> {/* 1-2: confident */}
          <div className="flex-1" /> {/* 2-3: very high */}
        </div>
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            sat >= 1 ? "bg-primary-container" : sat >= 0.5 ? "bg-secondary" : "bg-error"
          }`}
          style={{ width: `${gaugePercent}%` }}
        />
      </div>

      {/* Labels under gauge */}
      <div className="flex justify-between text-[8px] uppercase font-bold tracking-wider text-secondary/50 mb-4">
        <span>Reject</span>
        <span>Uncertain</span>
        <span>Confident</span>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-3xl font-headline italic tabular-nums ${info.color}`}>
          {sat.toFixed(2)}×
        </span>
        <span className={`text-xs font-bold uppercase tracking-widest ${info.color}`}>
          {info.label}
        </span>
      </div>
      <p className="text-[10px] text-secondary leading-relaxed">
        {info.description}
      </p>

      {meanMargin != null && (
        <div className="mt-3 pt-3 border-t border-outline-variant/10 flex justify-between text-[10px]">
          <span className="text-secondary font-bold uppercase tracking-widest">Required Margin</span>
          <span className="font-mono font-bold text-primary tabular-nums">{meanMargin.toFixed(3)}</span>
        </div>
      )}
    </div>
  );
}

function PathRoutingCard({
  componentWeights,
}: {
  componentWeights?: { nonlinear_weight: number; linear_weight: number };
}) {
  if (!componentWeights) return null;
  const nl = componentWeights.nonlinear_weight;
  const lin = componentWeights.linear_weight;
  const primaryPath = nl >= 0.5 ? "Deep" : "Linear";

  return (
    <div className="bg-white rounded-lg p-6 border border-outline-variant/10 shadow-sm flex-1">
      <h4 className="text-[10px] uppercase font-bold tracking-widest text-secondary mb-4">
        Path Routing
      </h4>
      <p className="text-xs text-secondary mb-4">
        For this input, AMNP routed <strong>{(nl * 100).toFixed(0)}%</strong> of the
        decision through the <strong>{primaryPath}</strong> path.
        {nl > 0.85
          ? " This suggests a complex behavioral pattern that needs deep feature extraction."
          : nl > 0.6
            ? " A moderate blend — the model uses deep features but the linear path provides regularization."
            : " Unusual: this input was straightforward enough for the linear path to dominate."
        }
      </p>

      {/* Stacked bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-6 bg-surface-container-highest rounded-full overflow-hidden flex">
          <div
            className="h-full bg-primary-container transition-all duration-300 flex items-center justify-center"
            style={{ width: `${nl * 100}%` }}
          >
            {nl > 0.3 && (
              <span className="text-[9px] text-white font-bold">
                Deep {(nl * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <div
            className="h-full bg-secondary transition-all duration-300 flex items-center justify-center"
            style={{ width: `${lin * 100}%` }}
          >
            {lin > 0.3 && (
              <span className="text-[9px] text-white font-bold">
                Linear {(lin * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureComparisonTable({
  featureImportance,
  nonlinearImportance,
  linearImportance,
}: {
  featureImportance: Record<string, number>;
  nonlinearImportance?: Record<string, number>;
  linearImportance?: Record<string, number>;
}) {
  if (!nonlinearImportance || !linearImportance) return null;

  const allMax = Math.max(
    ...Object.values(featureImportance),
    ...Object.values(nonlinearImportance),
    ...Object.values(linearImportance),
    0.01,
  );

  const rows = Object.keys(featureImportance).map((key) => ({
    key,
    info: FEATURE_INFO[key],
    combined: featureImportance[key] || 0,
    nonlinear: nonlinearImportance[key] || 0,
    linear: linearImportance[key] || 0,
  }));

  // Sort by combined importance
  rows.sort((a, b) => b.combined - a.combined);

  return (
    <div className="bg-white rounded-lg p-8 border border-outline-variant/10 shadow-sm">
      <div className="mb-6">
        <h3 className="font-headline text-xl italic text-primary">
          Feature-by-Feature Decomposition
        </h3>
        <p className="text-xs text-secondary mt-1">
          Sorted by overall importance. Bars show how much each path relies on each feature (relative scale).
        </p>
      </div>

      <div className="space-y-3">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 text-[9px] uppercase font-bold tracking-widest text-secondary pb-2 border-b border-outline-variant/10">
          <div className="col-span-3">Feature</div>
          <div className="col-span-3 text-center">Combined</div>
          <div className="col-span-3 text-center">Deep Path</div>
          <div className="col-span-3 text-center">Linear Path</div>
        </div>

        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-12 gap-2 items-center py-1">
            <div className="col-span-3">
              <span className="text-xs font-bold text-on-surface">{row.info?.full || row.key}</span>
            </div>

            {/* Combined bar */}
            <div className="col-span-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-container/70 rounded-full transition-all duration-300"
                    style={{ width: `${(row.combined / allMax) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] tabular-nums font-bold text-primary-container w-8 text-right">
                  {(row.combined * 100).toFixed(0)}
                </span>
              </div>
            </div>

            {/* Nonlinear bar */}
            <div className="col-span-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-container rounded-full transition-all duration-300"
                    style={{ width: `${(row.nonlinear / allMax) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] tabular-nums font-bold text-secondary w-8 text-right">
                  {(row.nonlinear * 100).toFixed(0)}
                </span>
              </div>
            </div>

            {/* Linear bar */}
            <div className="col-span-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-300"
                    style={{ width: `${(row.linear / allMax) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] tabular-nums font-bold text-secondary w-8 text-right">
                  {(row.linear * 100).toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleImportanceChart({
  featureImportance,
}: {
  featureImportance: Record<string, number>;
}) {
  const maxVal = Math.max(...Object.values(featureImportance), 0.01);
  const data = Object.entries(featureImportance).map(([key, value]) => ({
    name: FEATURE_INFO[key]?.short || key,
    fullName: FEATURE_INFO[key]?.full || key,
    value: Math.round((value / maxVal) * 100),
    raw: value,
  }));
  // Sort by value descending
  data.sort((a, b) => b.value - a.value);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }} layout="vertical">
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fill: "#727974", fontSize: 10, fontWeight: "bold" }}
          axisLine={{ stroke: "#e4e2dd" }}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#5e5e5e", fontSize: 10, fontWeight: "bold" }}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #c1c8c3",
            borderRadius: "10px",
            fontSize: "11px",
            fontWeight: "bold",
          }}
          formatter={(value: number) => `${value}% (relative)`}
          cursor={{ fill: "#f0eee9" }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((_entry, i) => (
            <Cell key={i} fill={i < 3 ? "#163429" : i < 5 ? "#466558" : "#727974"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
