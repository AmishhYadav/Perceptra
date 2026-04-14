import { useEffect, useMemo } from "react";
import { TrainingCanvas } from "./TrainingCanvas";
import { VisualControls } from "./VisualControls";
import { useVisualizationStore } from "../store/useVisualizationStore";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Brain,
  Zap,
  Target,
  Layers,
  TrendingUp,
  BarChart3,
  Info,
} from "lucide-react";

/* ── Model explanation database ── */
const MODEL_EXPLANATIONS: Record<
  string,
  {
    fullName: string;
    icon: typeof Brain;
    tagline: string;
    description: string;
    strengths: string[];
    weaknesses: string[];
    howItWorks: string;
    bestFor: string;
  }
> = {
  AMNP: {
    fullName: "Adaptive Margin Neural Perceptron",
    icon: Brain,
    tagline: "Dual-path architecture with learnable margin boundaries",
    description:
      "AMNP combines a deep nonlinear transformation pathway with a lightweight linear pathway, blending both for robust classification. It learns per-class margin thresholds, enabling it to reject ambiguous inputs rather than force a wrong answer.",
    strengths: [
      "Self-calibrating confidence via adaptive margins",
      "Dual-path captures both simple & complex patterns",
      "Built-in rejection zone for ambiguous samples",
    ],
    weaknesses: [
      "Higher computational cost per epoch",
      "Requires more data to train the margin layer",
      "More hyperparameters to tune",
    ],
    howItWorks:
      "Input → [Deep Path (ReLU layers)] + [Linear Path] → Weighted Merge → Margin-Based Softmax → Classification",
    bestFor: "Production behavioral intelligence — when both accuracy AND interpretability matter.",
  },
  Perceptron: {
    fullName: "Single-Layer Perceptron",
    icon: Zap,
    tagline: "The simplest linear classifier — one layer, one decision",
    description:
      "A single-layer perceptron draws a linear hyperplane through the feature space. It can only learn linearly separable patterns, making it the simplest possible classifier. Think of it as a straight-line decision boundary.",
    strengths: [
      "Extremely fast training (milliseconds)",
      "Fully interpretable — weights map directly to features",
      "Zero risk of overfitting on simple tasks",
    ],
    weaknesses: [
      "Cannot learn nonlinear boundaries (XOR problem)",
      "Accuracy ceiling on complex behavioral patterns",
      "No confidence calibration",
    ],
    howItWorks:
      "Input × Weights + Bias → argmax → Classification (straight-line boundary)",
    bestFor: "Quick baselines and sanity checks — does a linear separator even work here?",
  },
  NeuralNetwork: {
    fullName: "Multi-Layer Neural Network",
    icon: Layers,
    tagline: "Deep nonlinear function approximator",
    description:
      "A fully-connected neural network with hidden layers and nonlinear activations (ReLU). It can learn arbitrarily complex decision boundaries by composing multiple nonlinear transformations.",
    strengths: [
      "Universal function approximation capability",
      "Learns complex nonlinear patterns automatically",
      "Scales well with more data and larger architectures",
    ],
    weaknesses: [
      "Prone to overfitting on small datasets",
      "Black-box — hard to interpret why it chose a class",
      "Can be unstable without careful learning rate tuning",
    ],
    howItWorks:
      "Input → Hidden₁(ReLU) → Hidden₂(ReLU) → Softmax → Classification (curved boundaries)",
    bestFor: "Complex tasks where accuracy matters more than interpretability.",
  },
  SVM: {
    fullName: "Support Vector Machine (RBF Kernel)",
    icon: Target,
    tagline: "Maximum-margin classifier with kernel trick",
    description:
      "SVM finds the hyperplane that maximizes the margin between classes. With an RBF kernel, it projects data into a higher-dimensional space where nonlinear patterns become linearly separable.",
    strengths: [
      "Excellent generalization with proper regularization",
      "Effective on small-to-medium datasets",
      "Mathematically principled margin maximization",
    ],
    weaknesses: [
      "Doesn't provide native probability estimates (calibrated post-hoc)",
      "Slow training on very large datasets (O(n²) memory)",
      "Kernel choice and C parameter are critical",
    ],
    howItWorks:
      "Input → RBF Kernel Map → Maximum-Margin Hyperplane → Platt Scaling → Classification",
    bestFor: "Small datasets where you need strong generalization without deep learning compute.",
  },
};

const CLASS_NAMES = ["Focused", "Distracted", "Confused"];
const CLASS_EMOJIS = ["🎯", "😶‍🌫️", "😕"];
const CLASS_COLORS_HEX = ["#10b981", "#f59e0b", "#ef4444"];
const CLASS_BG = [
  "bg-emerald-500/10",
  "bg-amber-500/10",
  "bg-red-500/10",
];
const CLASS_TEXT = [
  "text-emerald-500",
  "text-amber-500",
  "text-red-500",
];

export function VisualPlayground() {
  const connect = useVisualizationStore((s) => s.connect);
  const disconnect = useVisualizationStore((s) => s.disconnect);
  const currentModel = useVisualizationStore((s) => s.currentModel);
  const playbackState = useVisualizationStore((s) => s.playbackState);
  const epoch = useVisualizationStore((s) => s.epoch);
  const totalEpochs = useVisualizationStore((s) => s.totalEpochs);
  const accuracy = useVisualizationStore((s) => s.accuracy);
  const loss = useVisualizationStore((s) => s.loss);
  const classAccuracies = useVisualizationStore((s) => s.classAccuracies);
  const classDistribution = useVisualizationStore((s) => s.classDistribution);
  const confusionCounts = useVisualizationStore((s) => s.confusionCounts);
  const accuracyHistory = useVisualizationStore((s) => s.accuracyHistory);

  // Auto-connect on mount
  useEffect(() => {
    connect(currentModel);
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modelInfo = MODEL_EXPLANATIONS[currentModel] || MODEL_EXPLANATIONS["AMNP"];
  const IconComponent = modelInfo.icon;

  // Determine overall verdict
  const verdict = useMemo(() => {
    if (accuracy >= 0.95) return { label: "Excellent", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle, description: "The model has achieved near-perfect classification across all behavioral states." };
    if (accuracy >= 0.85) return { label: "Good", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle, description: "The model reliably distinguishes most behavioral patterns with minor edge-case errors." };
    if (accuracy >= 0.70) return { label: "Moderate", color: "text-amber-600", bg: "bg-amber-50", icon: AlertTriangle, description: "The model captures broad patterns but struggles with nuanced behavioral boundaries." };
    return { label: "Poor", color: "text-red-600", bg: "bg-red-50", icon: XCircle, description: "The model fails to separate behavioral states — consider more training or a different architecture." };
  }, [accuracy]);

  const showResults = playbackState === "complete" || (epoch > 0 && epoch === totalEpochs);

  // Find weakest class
  const weakestClass = useMemo(() => {
    if (!classAccuracies || classAccuracies.every((a) => a === 0)) return -1;
    let minAcc = 1;
    let minIdx = 0;
    for (let i = 0; i < classAccuracies.length; i++) {
      if (classAccuracies[i] < minAcc && classDistribution[i] > 0) {
        minAcc = classAccuracies[i];
        minIdx = i;
      }
    }
    return minIdx;
  }, [classAccuracies, classDistribution]);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <span className="text-secondary font-label text-xs tracking-widest uppercase">
            Training Live View
          </span>
          <h1 className="text-5xl font-headline italic text-primary mt-2">
            Latent Space Synthesis
          </h1>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-secondary text-[10px] uppercase tracking-widest">
              Status
            </p>
            <p className="text-2xl font-headline text-on-tertiary-container flex items-center gap-2">
              {playbackState === "playing" && (
                <span className="w-2 h-2 rounded-full bg-on-tertiary-container animate-pulse" />
              )}
              <span className="capitalize">{playbackState}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Data Visualization Area */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Scatter Plot Container */}
          <div
            className="relative bg-surface-container-low rounded-lg p-4 overflow-hidden"
            style={{ aspectRatio: "16/9" }}
          >
            <div className="w-full h-full">
              <TrainingCanvas width={800} height={450} />
            </div>
          </div>

          {/* Training Metrics Grid */}
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-outline-variant/5">
              <h4 className="text-secondary text-[10px] uppercase tracking-widest mb-1">
                Epochs
              </h4>
              <p className="text-4xl font-headline italic text-primary">
                {epoch}
                <span className="text-lg font-body italic text-secondary ml-1">
                  / {totalEpochs}
                </span>
              </p>
              <div className="mt-4 w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="bg-primary-container h-full transition-all"
                  style={{
                    width: `${totalEpochs > 0 ? (epoch / totalEpochs) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-outline-variant/5">
              <h4 className="text-secondary text-[10px] uppercase tracking-widest mb-1">
                Accuracy
              </h4>
              <p className="text-4xl font-headline italic text-primary">
                {(accuracy * 100).toFixed(2)}
                <span className="text-lg font-body italic text-secondary ml-1">
                  %
                </span>
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-outline-variant/5">
              <h4 className="text-secondary text-[10px] uppercase tracking-widest mb-1">
                Current Loss
              </h4>
              <p className="text-4xl font-headline italic text-primary">
                {loss.toFixed(4)}
              </p>
              <p className="mt-2 text-[10px] text-on-tertiary-container font-medium uppercase tracking-tighter">
                {loss < 0.1 ? "Converging" : "Training"}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-outline-variant/5">
              <h4 className="text-secondary text-[10px] uppercase tracking-widest mb-1">
                Model
              </h4>
              <p className="text-2xl font-headline italic text-primary">
                {currentModel}
              </p>
              <p className="mt-2 text-[10px] text-secondary font-medium uppercase tracking-tighter">
                Active Architecture
              </p>
            </div>
          </div>

          {/* ── Classification Interpretation Panel ── */}
          {showResults && (
            <div className="bg-white rounded-lg border border-outline-variant/10 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* Header */}
              <div className={`${verdict.bg} px-8 py-5 border-b border-outline-variant/10`}>
                <div className="flex items-center gap-4">
                  <verdict.icon className={`w-6 h-6 ${verdict.color}`} />
                  <div>
                    <h3 className="font-headline text-2xl italic text-primary">
                      Classification Result:{" "}
                      <span className={verdict.color}>{verdict.label}</span>
                    </h3>
                    <p className="text-sm text-secondary mt-1">{verdict.description}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Per-class accuracy breakdown */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-secondary mb-4 flex items-center gap-2">
                    <BarChart3 size={14} /> Per-Class Performance
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {CLASS_NAMES.map((name, i) => {
                      const acc = classAccuracies[i] || 0;
                      const count = classDistribution[i] || 0;
                      const isWeakest = i === weakestClass && acc < 0.9;
                      return (
                        <div
                          key={name}
                          className={`rounded-lg p-4 border ${
                            isWeakest
                              ? "border-amber-300/40 bg-amber-50/50"
                              : "border-outline-variant/10 bg-surface-container-lowest"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{CLASS_EMOJIS[i]}</span>
                            <span className="font-bold text-sm text-on-surface">{name}</span>
                            {isWeakest && (
                              <span className="text-[8px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                Weakest
                              </span>
                            )}
                          </div>
                          <div className="text-3xl font-headline italic tabular-nums" style={{ color: CLASS_COLORS_HEX[i] }}>
                            {(acc * 100).toFixed(1)}%
                          </div>
                          <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden mt-2">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${acc * 100}%`,
                                backgroundColor: CLASS_COLORS_HEX[i],
                              }}
                            />
                          </div>
                          <div className="text-[10px] text-secondary mt-2">
                            {count} samples in dataset
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Confusion matrix mini-view */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-secondary mb-3 flex items-center gap-2">
                    <Target size={14} /> Confusion Matrix
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="py-2 px-3 text-left text-[9px] uppercase tracking-widest text-secondary font-bold border-b border-outline-variant/10">
                            True ↓ / Pred →
                          </th>
                          {CLASS_NAMES.map((name, i) => (
                            <th
                              key={name}
                              className="py-2 px-3 text-center text-[9px] uppercase tracking-widest font-bold border-b border-outline-variant/10"
                              style={{ color: CLASS_COLORS_HEX[i] }}
                            >
                              {name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {CLASS_NAMES.map((trueName, trueIdx) => (
                          <tr key={trueName}>
                            <td
                              className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider border-b border-outline-variant/5"
                              style={{ color: CLASS_COLORS_HEX[trueIdx] }}
                            >
                              {trueName}
                            </td>
                            {CLASS_NAMES.map((_predName, predIdx) => {
                              const count = confusionCounts[trueIdx]?.[predIdx] || 0;
                              const isDiagonal = trueIdx === predIdx;
                              const total = classDistribution[trueIdx] || 1;
                              const pct = ((count / total) * 100).toFixed(0);
                              return (
                                <td
                                  key={predIdx}
                                  className={`py-2 px-3 text-center font-mono tabular-nums border-b border-outline-variant/5 ${
                                    isDiagonal
                                      ? "font-bold"
                                      : count > 0
                                        ? "text-error/70"
                                        : "text-secondary/40"
                                  }`}
                                  style={
                                    isDiagonal
                                      ? {
                                          backgroundColor: `${CLASS_COLORS_HEX[trueIdx]}10`,
                                          color: CLASS_COLORS_HEX[trueIdx],
                                        }
                                      : undefined
                                  }
                                >
                                  {count}{" "}
                                  <span className="text-[9px] text-secondary">({pct}%)</span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Training curve summary */}
                {accuracyHistory.length > 1 && (
                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-secondary mb-3 flex items-center gap-2">
                      <TrendingUp size={14} /> Learning Trajectory
                    </h4>
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-secondary">Start accuracy: </span>
                        <span className="font-bold text-on-surface">
                          {(accuracyHistory[0] * 100).toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-secondary">→</span>
                      <div>
                        <span className="text-secondary">Final accuracy: </span>
                        <span className="font-bold text-primary-container">
                          {(accuracyHistory[accuracyHistory.length - 1] * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="ml-auto">
                        <span className="text-secondary">Improvement: </span>
                        <span className="font-bold text-emerald-600">
                          +
                          {(
                            (accuracyHistory[accuracyHistory.length - 1] -
                              accuracyHistory[0]) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>

                    {/* Mini accuracy sparkline */}
                    <div className="mt-3 h-12 bg-surface-container-lowest rounded-lg border border-outline-variant/10 overflow-hidden relative">
                      <svg
                        viewBox={`0 0 ${accuracyHistory.length} 100`}
                        preserveAspectRatio="none"
                        className="w-full h-full"
                      >
                        <defs>
                          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#163429" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#163429" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Fill area */}
                        <path
                          d={`M0 100 ${accuracyHistory
                            .map(
                              (a, i) =>
                                `L${i} ${100 - a * 100}`,
                            )
                            .join(" ")} L${accuracyHistory.length - 1} 100 Z`}
                          fill="url(#sparkGrad)"
                        />
                        {/* Line */}
                        <path
                          d={`M${accuracyHistory
                            .map(
                              (a, i) =>
                                `${i} ${100 - a * 100}`,
                            )
                            .join(" L")}`}
                          fill="none"
                          stroke="#163429"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Interpretation text */}
                <div className="bg-surface-container-lowest rounded-lg p-6 border border-outline-variant/10">
                  <div className="flex items-start gap-3">
                    <Info size={16} className="text-primary-container flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-secondary leading-relaxed space-y-2">
                      <p>
                        <strong className="text-on-surface">{currentModel}</strong> achieved{" "}
                        <strong className="text-primary-container">
                          {(accuracy * 100).toFixed(1)}%
                        </strong>{" "}
                        overall accuracy on {classDistribution.reduce((a, b) => a + b, 0)} behavioral samples after{" "}
                        {totalEpochs} epochs of training.
                      </p>
                      {weakestClass >= 0 && classAccuracies[weakestClass] < 0.9 && (
                        <p>
                          ⚠️ The model struggles most with <strong style={{ color: CLASS_COLORS_HEX[weakestClass] }}>{CLASS_NAMES[weakestClass]}</strong> patterns (
                          {(classAccuracies[weakestClass] * 100).toFixed(1)}% accuracy).
                          {weakestClass === 2 && " Confused behavior often exists at the boundary between Focused and Distracted, making it inherently harder to classify."}
                          {weakestClass === 1 && " Distracted patterns overlap significantly with other states, suggesting subtle behavioral cues that the model hasn't fully captured."}
                          {weakestClass === 0 && " Focused behavior misclassification may indicate the model hasn't found the right decision boundary for high-performance interaction patterns."}
                        </p>
                      )}
                      {accuracy >= 0.95 && (
                        <p>
                          ✅ This model has converged to an excellent classification threshold. The decision boundaries cleanly separate all three behavioral clusters.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Model Explanation Card ── */}
          <div className="bg-white rounded-lg border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-outline-variant/10 bg-surface-container-lowest">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-container/10 rounded-lg flex items-center justify-center">
                  <IconComponent size={20} className="text-primary-container" />
                </div>
                <div>
                  <h3 className="font-headline text-xl italic text-primary">
                    {modelInfo.fullName}
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">{modelInfo.tagline}</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <p className="text-sm text-secondary leading-relaxed">{modelInfo.description}</p>

              {/* How it works */}
              <div>
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-secondary mb-2">
                  How It Works
                </h4>
                <div className="bg-surface-container-lowest rounded-lg px-4 py-3 font-mono text-xs text-primary-container border border-outline-variant/10 overflow-x-auto whitespace-nowrap">
                  {modelInfo.howItWorks}
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 mb-3 flex items-center gap-1.5">
                    <CheckCircle size={12} /> Strengths
                  </h4>
                  <ul className="space-y-2">
                    {modelInfo.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-secondary">
                        <span className="w-1 h-1 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-amber-600 mb-3 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Weaknesses
                  </h4>
                  <ul className="space-y-2">
                    {modelInfo.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-secondary">
                        <span className="w-1 h-1 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Best For */}
              <div className="bg-primary-container/5 rounded-lg px-5 py-3 border border-primary-container/10">
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary-container">
                  Best For:
                </span>
                <span className="text-xs text-secondary ml-2">{modelInfo.bestFor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Controls */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          {/* Controls Panel */}
          <div className="bg-white rounded-lg p-8 shadow-sm border border-outline-variant/5">
            <h3 className="text-secondary text-[10px] uppercase tracking-widest mb-6">
              Training Controls
            </h3>
            <VisualControls />
          </div>

          {/* Architecture Overview */}
          <div className="bg-surface-container-high rounded-lg p-8">
            <h3 className="text-secondary text-[10px] uppercase tracking-widest mb-6">
              Model Architecture
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-container flex items-center justify-center rounded text-white">
                  <span className="material-symbols-outlined text-sm">input</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary">Input Layer</p>
                  <p className="text-[10px] text-secondary">8 Behavioral Features</p>
                </div>
              </div>
              <div className="ml-5 h-8 w-px bg-outline-variant" />
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-on-tertiary-container/10 border border-on-tertiary-container/20 flex items-center justify-center rounded text-on-tertiary-container">
                  <span className="material-symbols-outlined text-sm">layers</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary">Hidden Layers</p>
                  <p className="text-[10px] text-secondary">Neural Transformation</p>
                </div>
              </div>
              <div className="ml-5 h-8 w-px bg-outline-variant" />
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-container flex items-center justify-center rounded text-white shadow-lg shadow-primary-container/20">
                  <span className="material-symbols-outlined text-sm">output</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary">Classification Head</p>
                  <p className="text-[10px] text-secondary">
                    3 Classes: Focused / Distracted / Confused
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
