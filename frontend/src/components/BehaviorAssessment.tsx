/**
 * BehaviorAssessment — Interactive "Focus Zone" mini-game.
 *
 * A full-width interactive canvas area where colored targets spawn
 * at random positions. The user clicks targets while we passively
 * measure all 8 telemetry features via TelemetryEngine.
 *
 * The computed features stream to the model at 10Hz during gameplay,
 * giving real-time predictions without any manual slider input.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useInferenceStore,
  type TelemetryInput,
} from "../store/useInferenceStore";
import { TelemetryEngine, type TelemetrySnapshot } from "./TelemetryEngine";
import {
  Play,
  RotateCcw,
  Target,
  Timer,
  Crosshair,
  Zap,
  MousePointerClick,
  TrendingUp,
} from "lucide-react";

/* ── Game constants ── */
const GAME_DURATION_SEC = 20;
const SPAWN_INTERVAL_MS = 1200; // new target every 1.2s
const TARGET_LIFETIME_MS = 2800; // target disappears after 2.8s
const MAX_TARGETS = 5; // max simultaneous targets
const TARGET_RADIUS = 28;
const GOOD_COLOR = "#10b981"; // emerald - click these
const DECOY_COLOR = "#ef4444"; // red - avoid these
const DECOY_CHANCE = 0.2; // 20% chance of decoy

interface GameTarget {
  id: number;
  x: number;
  y: number;
  spawnTime: number;
  isDecoy: boolean;
  radius: number;
  opacity: number;
}

type GamePhase = "idle" | "playing" | "finished";

export function BehaviorAssessment() {
  const sendTelemetry = useInferenceStore((s) => s.sendTelemetry);
  const connectionStatus = useInferenceStore((s) => s.connectionStatus);

  const [phase, setPhase] = useState<GamePhase>("idle");
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC);
  const [targets, setTargets] = useState<GameTarget[]>([]);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [lastSnapshot, setLastSnapshot] = useState<TelemetrySnapshot | null>(
    null,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(new TelemetryEngine());
  const nextIdRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setInterval>>();
  const gameTimerRef = useRef<ReturnType<typeof setInterval>>();
  const telemetryTimerRef = useRef<ReturnType<typeof setInterval>>();
  const animFrameRef = useRef<number>();
  const gameStartRef = useRef(0);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      clearInterval(spawnTimerRef.current);
      clearInterval(gameTimerRef.current);
      clearInterval(telemetryTimerRef.current);
      cancelAnimationFrame(animFrameRef.current!);
    };
  }, []);

  /* ── Start game ── */
  const startGame = useCallback(() => {
    const engine = engineRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    engine.start(rect?.height || 500);
    nextIdRef.current = 0;

    setPhase("playing");
    setTimeLeft(GAME_DURATION_SEC);
    setTargets([]);
    setScore(0);
    setHits(0);
    setMisses(0);
    setLastSnapshot(null);
    gameStartRef.current = performance.now();

    // Spawn timer
    spawnTimerRef.current = setInterval(() => {
      setTargets((prev) => {
        if (prev.length >= MAX_TARGETS) return prev;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return prev;
        const pad = TARGET_RADIUS + 10;
        const x = pad + Math.random() * (rect.width - 2 * pad);
        const y = pad + Math.random() * (rect.height - 2 * pad);
        const isDecoy = Math.random() < DECOY_CHANCE;
        const newTarget: GameTarget = {
          id: nextIdRef.current++,
          x,
          y,
          spawnTime: performance.now(),
          isDecoy,
          radius: TARGET_RADIUS + (isDecoy ? -4 : 0),
          opacity: 1,
        };
        return [...prev, newTarget];
      });
    }, SPAWN_INTERVAL_MS);

    // Countdown timer
    gameTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Telemetry emission (10Hz)
    telemetryTimerRef.current = setInterval(() => {
      const snap = engine.getSnapshot();
      setLastSnapshot(snap);
      if (connectionStatus === "connected") {
        sendTelemetry(snap as TelemetryInput);
      }
    }, 100);

    // Animation loop for target lifetime / opacity fade
    const animate = () => {
      const now = performance.now();
      setTargets((prev) =>
        prev
          .map((t) => {
            const age = now - t.spawnTime;
            const life = TARGET_LIFETIME_MS;
            // Fade in first 200ms, fade out last 400ms
            let opacity = 1;
            if (age < 200) opacity = age / 200;
            else if (age > life - 400) opacity = Math.max(0, (life - age) / 400);
            return { ...t, opacity };
          })
          .filter((t) => now - t.spawnTime < TARGET_LIFETIME_MS),
      );
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }, [connectionStatus, sendTelemetry]);

  /* ── End game ── */
  const endGame = useCallback(() => {
    clearInterval(spawnTimerRef.current);
    clearInterval(gameTimerRef.current);
    clearInterval(telemetryTimerRef.current);
    cancelAnimationFrame(animFrameRef.current!);
    setPhase("finished");
    setTargets([]);

    // Send final telemetry burst
    const snap = engineRef.current.getSnapshot();
    setLastSnapshot(snap);
    if (connectionStatus === "connected") {
      sendTelemetry(snap as TelemetryInput);
    }
  }, [connectionStatus, sendTelemetry]);

  /* ── Handle clicks on targets ── */
  const handleTargetClick = useCallback(
    (target: GameTarget) => {
      const reactionTime = performance.now() - target.spawnTime;
      const engine = engineRef.current;

      if (target.isDecoy) {
        // Clicked a decoy = miss
        engine.recordClick(false);
        setMisses((p) => p + 1);
        setScore((p) => Math.max(0, p - 15));
      } else {
        // Hit!
        engine.recordClick(true, reactionTime);
        setHits((p) => p + 1);
        // Score scales inversely with reaction time
        const bonus = Math.max(5, Math.round(50 - reactionTime / 50));
        setScore((p) => p + bonus);
      }

      // Remove the target
      setTargets((prev) => prev.filter((t) => t.id !== target.id));
    },
    [],
  );

  /* ── Handle background click (miss) ── */
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (phase !== "playing") return;
      // Only count as miss if no target was hit (check target clicks handle themselves)
      const target = (e.target as HTMLElement).closest("[data-target]");
      if (!target) {
        engineRef.current.recordClick(false);
        setMisses((p) => p + 1);
      }
    },
    [phase],
  );

  /* ── Mouse tracking ── */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (phase !== "playing") return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      engineRef.current.recordMouseMove(
        e.clientX - rect.left,
        e.clientY - rect.top,
      );
    },
    [phase],
  );

  /* ── Scroll tracking ── */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (phase !== "playing") return;
      engineRef.current.recordScroll(e.deltaY);
    },
    [phase],
  );

  /* ── Render ── */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair size={16} className="text-accent" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Focus Zone — Behavioral Assessment
          </h3>
        </div>
        {phase === "playing" && (
          <div className="flex items-center gap-2">
            <Timer size={14} className="text-amber-400" />
            <span className="text-sm font-mono font-bold text-amber-400">
              {timeLeft}s
            </span>
          </div>
        )}
      </div>

      {/* Game arena */}
      <div
        ref={containerRef}
        className="relative rounded-2xl border border-white/5 overflow-hidden select-none"
        style={{
          height: 420,
          background:
            "radial-gradient(ellipse at center, rgba(129,140,248,0.03) 0%, rgba(17,24,39,0.95) 70%)",
          cursor: phase === "playing" ? "crosshair" : "default",
        }}
        onClick={handleBackgroundClick}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
      >
        {/* Grid lines overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Idle state */}
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center animate-pulse">
                <Target size={40} className="text-accent" />
              </div>
              <div className="absolute -inset-3 rounded-full border border-accent/20 animate-ping" />
            </div>
            <div className="text-center max-w-md">
              <h2 className="text-xl font-bold text-gray-100 mb-2">
                Focus Zone Assessment
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Click the{" "}
                <span className="text-emerald-400 font-semibold">
                  green targets
                </span>{" "}
                as they appear. Avoid the{" "}
                <span className="text-red-400 font-semibold">red decoys</span>.
                We'll analyse your interaction patterns to determine your
                cognitive state.
              </p>
            </div>
            <button
              onClick={startGame}
              disabled={connectionStatus !== "connected"}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent/20 text-accent
                         font-semibold text-sm hover:bg-accent/30 transition-all cursor-pointer
                         disabled:opacity-40 disabled:cursor-not-allowed border border-accent/20"
            >
              <Play size={18} />
              Start Assessment
            </button>
            {connectionStatus !== "connected" && (
              <p className="text-xs text-gray-500">
                Connect to a model first…
              </p>
            )}
          </div>
        )}

        {/* Playing — render targets */}
        {phase === "playing" &&
          targets.map((target) => (
            <button
              key={target.id}
              data-target="true"
              onMouseEnter={() => engineRef.current.recordHoverEnter()}
              onMouseLeave={() => engineRef.current.recordHoverLeave()}
              onClick={(e) => {
                e.stopPropagation();
                handleTargetClick(target);
              }}
              className="absolute rounded-full transition-transform active:scale-90 cursor-pointer"
              style={{
                left: target.x - target.radius,
                top: target.y - target.radius,
                width: target.radius * 2,
                height: target.radius * 2,
                opacity: target.opacity,
                background: target.isDecoy
                  ? `radial-gradient(circle, ${DECOY_COLOR}aa, ${DECOY_COLOR}44)`
                  : `radial-gradient(circle, ${GOOD_COLOR}aa, ${GOOD_COLOR}44)`,
                boxShadow: target.isDecoy
                  ? `0 0 20px ${DECOY_COLOR}30, inset 0 0 10px ${DECOY_COLOR}20`
                  : `0 0 20px ${GOOD_COLOR}30, inset 0 0 10px ${GOOD_COLOR}20`,
                border: `2px solid ${target.isDecoy ? DECOY_COLOR : GOOD_COLOR}60`,
                transform: `scale(${target.opacity > 0.5 ? 1 : 0.8})`,
              }}
            >
              {/* Inner dot */}
              <div
                className="absolute rounded-full"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 8,
                  height: 8,
                  background: target.isDecoy ? DECOY_COLOR : GOOD_COLOR,
                }}
              />
            </button>
          ))}

        {/* Playing — live score */}
        {phase === "playing" && (
          <div className="absolute top-4 right-4 flex items-center gap-4">
            <div className="bg-surface/80 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/5">
              <span className="text-xs text-gray-400">Score </span>
              <span className="text-sm font-mono font-bold text-accent">
                {score}
              </span>
            </div>
            <div className="bg-surface/80 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/5">
              <span className="text-xs text-emerald-400">{hits}</span>
              <span className="text-xs text-gray-500"> / </span>
              <span className="text-xs text-red-400">{misses}</span>
            </div>
          </div>
        )}

        {/* Playing — progress bar */}
        {phase === "playing" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-lighter/30">
            <div
              className="h-full bg-accent/60 transition-all duration-1000 ease-linear"
              style={{
                width: `${((GAME_DURATION_SEC - timeLeft) / GAME_DURATION_SEC) * 100}%`,
              }}
            />
          </div>
        )}

        {/* Finished state */}
        {phase === "finished" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-surface/60 backdrop-blur-sm">
            <Zap size={36} className="text-accent" />
            <h2 className="text-2xl font-bold text-gray-100">
              Assessment Complete
            </h2>
            <div className="grid grid-cols-3 gap-6 mt-2">
              <div className="text-center">
                <div className="text-2xl font-bold font-mono text-accent">
                  {score}
                </div>
                <div className="text-[10px] text-gray-500 uppercase mt-1">
                  Score
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {hits}
                </div>
                <div className="text-[10px] text-gray-500 uppercase mt-1">
                  Hits
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold font-mono text-red-400">
                  {misses}
                </div>
                <div className="text-[10px] text-gray-500 uppercase mt-1">
                  Misses
                </div>
              </div>
            </div>
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent/20 text-accent
                         font-semibold text-sm hover:bg-accent/30 transition-all cursor-pointer
                         border border-accent/20 mt-2"
            >
              <RotateCcw size={16} />
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Live telemetry readout (compact) */}
      {(phase === "playing" || phase === "finished") && lastSnapshot && (
        <TelemetryReadout snapshot={lastSnapshot} />
      )}
    </div>
  );
}

/* ── Compact telemetry meter strip ── */
function TelemetryReadout({ snapshot }: { snapshot: TelemetrySnapshot }) {
  const features: { key: keyof TelemetrySnapshot; label: string; icon: React.ReactNode }[] = [
    { key: "click_frequency", label: "Click Freq", icon: <MousePointerClick size={12} /> },
    { key: "hesitation_time", label: "Hesitation", icon: <Timer size={12} /> },
    { key: "misclick_rate", label: "Misclicks", icon: <Target size={12} /> },
    { key: "scroll_depth", label: "Scroll", icon: <TrendingUp size={12} /> },
    { key: "movement_smoothness", label: "Smoothness", icon: <Zap size={12} /> },
    { key: "dwell_time", label: "Dwell", icon: <Crosshair size={12} /> },
    { key: "navigation_speed", label: "Speed", icon: <Play size={12} /> },
    { key: "direction_changes", label: "Dir Chg", icon: <RotateCcw size={12} /> },
  ];

  return (
    <div className="rounded-2xl bg-surface-light/60 backdrop-blur-sm border border-white/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-accent" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Live Telemetry
        </span>
      </div>
      <div className="grid grid-cols-4 gap-x-4 gap-y-3">
        {features.map(({ key, label, icon }) => {
          const val = snapshot[key];
          return (
            <div key={key} className="group">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-gray-500">{icon}</span>
                <span className="text-[10px] text-gray-400">{label}</span>
                <span className="ml-auto text-[10px] font-mono text-accent">
                  {val.toFixed(2)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-lighter overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${val * 100}%`,
                    background:
                      val > 0.7
                        ? "#10b981"
                        : val > 0.3
                          ? "#818cf8"
                          : "#6b7280",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
