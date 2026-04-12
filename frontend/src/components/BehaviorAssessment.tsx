/**
 * BehaviorAssessment — Interactive "Focus Zone" mini-game.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useInferenceStore,
  type TelemetryInput,
} from "../store/useInferenceStore";
import { TelemetryEngine, type TelemetrySnapshot } from "./TelemetryEngine";
import { Play, RotateCcw, Target, Zap } from "lucide-react";

/* ── Game constants ── */
const GAME_DURATION_SEC = 20;
const SPAWN_INTERVAL_MS = 1200;
const TARGET_LIFETIME_MS = 2800;
const MAX_TARGETS = 5;
const TARGET_RADIUS = 32;
const GOOD_COLOR = "var(--color-primary)"; // #66dd8b
const DECOY_COLOR = "var(--color-error)"; // #ffb4ab
const DECOY_CHANCE = 0.2;

interface GameTarget {
  id: number;
  x: number;
  y: number;
  spawnTime: number;
  isDecoy: boolean;
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
  const [lastSnapshot, setLastSnapshot] = useState<TelemetrySnapshot | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(new TelemetryEngine());
  const nextIdRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const telemetryTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const animFrameRef = useRef<number | undefined>(undefined);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      clearInterval(spawnTimerRef.current);
      clearInterval(gameTimerRef.current);
      clearInterval(telemetryTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
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

    // Spawn timer
    spawnTimerRef.current = setInterval(() => {
      setTargets((prev) => {
        if (prev.length >= MAX_TARGETS) return prev;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return prev;
        const pad = TARGET_RADIUS + 20;
        const x = pad + Math.random() * (rect.width - 2 * pad);
        const y = pad + Math.random() * (rect.height - 2 * pad);
        const isDecoy = Math.random() < DECOY_CHANCE;
        return [
          ...prev,
          { id: nextIdRef.current++, x, y, spawnTime: performance.now(), isDecoy, opacity: 1 },
        ];
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

    // Fade animation loop
    const animate = () => {
      const now = performance.now();
      setTargets((prev) =>
        prev
          .map((t) => {
            const age = now - t.spawnTime;
            const life = TARGET_LIFETIME_MS;
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
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setPhase("finished");
    setTargets([]);

    const snap = engineRef.current.getSnapshot();
    setLastSnapshot(snap);
    if (connectionStatus === "connected") {
      sendTelemetry(snap as TelemetryInput);
    }
  }, [connectionStatus, sendTelemetry]);

  /* ── Input Handlers ── */
  const handleTargetClick = useCallback((target: GameTarget) => {
    const reactionTime = performance.now() - target.spawnTime;
    const engine = engineRef.current;
    if (target.isDecoy) {
      engine.recordClick(false);
      setMisses((p) => p + 1);
      setScore((p) => Math.max(0, p - 15));
    } else {
      engine.recordClick(true, reactionTime);
      setHits((p) => p + 1);
      const bonus = Math.max(5, Math.round(50 - reactionTime / 50));
      setScore((p) => p + bonus);
    }
    setTargets((prev) => prev.filter((t) => t.id !== target.id));
  }, []);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (phase !== "playing") return;
    const target = (e.target as HTMLElement).closest("[data-target]");
    if (!target) {
      engineRef.current.recordClick(false);
      setMisses((p) => p + 1);
    }
  }, [phase]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (phase !== "playing") return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    engineRef.current.recordMouseMove(e.clientX - rect.left, e.clientY - rect.top);
  }, [phase]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (phase !== "playing") return;
    engineRef.current.recordScroll(e.deltaY);
  }, [phase]);

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      {/* Top Scoreboard (Stitch styled) */}
      <section className="w-full flex justify-between items-center gap-6">
        <div className="flex flex-col items-center flex-1 py-4 bg-[rgba(45,52,73,0.6)] backdrop-blur-xl border-t border-l border-outline-variant/20 rounded-xl shadow-[0_0_40px_rgba(102,221,139,0.1)]">
          <span className="text-on-surface-variant text-[10px] uppercase font-bold tracking-[0.2em] mb-1">
            Session Timer
          </span>
          <div className="text-5xl md:text-6xl font-black text-primary tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(102,221,139,0.4)]">
            {timeLeft}s
          </div>
        </div>
        <div className="flex flex-col items-center flex-1 py-4 bg-[rgba(45,52,73,0.6)] backdrop-blur-xl border-t border-l border-outline-variant/20 rounded-xl">
          <span className="text-on-surface-variant text-[10px] uppercase font-bold tracking-[0.2em] mb-1">
            Accumulated Score
          </span>
          <div className="text-5xl md:text-6xl font-black text-on-surface tabular-nums tracking-tighter">
            {score}
          </div>
        </div>
      </section>

      {/* Central Game Arena */}
      <section
        ref={containerRef}
        className="flex-1 w-full relative bg-surface-container-lowest rounded-2xl overflow-hidden shadow-inner border border-outline-variant/10 min-h-[420px]"
        style={{
          cursor: phase === "playing" ? "crosshair" : "default",
          backgroundSize: "40px 40px",
          backgroundImage: "linear-gradient(to right, rgba(69, 70, 82, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(69, 70, 82, 0.1) 1px, transparent 1px)"
        }}
        onClick={handleBackgroundClick}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
      >
        {/* Idle UI */}
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-surface-container-lowest/80 backdrop-blur-sm z-10">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Target size={48} className="text-primary" />
              </div>
              <div className="absolute -inset-4 rounded-full border border-primary/20 animate-ping duration-1000" />
            </div>
            <div className="text-center max-w-md px-6">
              <h2 className="text-2xl font-bold text-on-surface mb-3 tracking-tight">
                Focus Zone Assessment
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Click the <span className="text-primary font-bold">green targets</span> as they appear. 
                Avoid the <span className="text-error font-bold">red decoys</span>. 
                We'll analyze your interaction patterns to determine your cognitive state.
              </p>
            </div>
            <button
              onClick={startGame}
              disabled={connectionStatus !== "connected"}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:grayscale"
            >
              <Play size={18} />
              Start Protocol
            </button>
            {connectionStatus !== "connected" && (
              <p className="text-xs text-on-surface-variant tracking-wider uppercase font-bold mt-2">
                Awaiting connection...
              </p>
            )}
          </div>
        )}

        {/* Finished UI */}
        {phase === "finished" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-[rgba(11,19,38,0.85)] backdrop-blur-md z-10">
            <Zap size={48} className="text-primary animate-bounce shadow-[0_0_30px_rgba(102,221,139,0.5)] rounded-full" />
            <h2 className="text-3xl font-black text-on-surface tracking-tighter uppercase">
              Assessment Complete
            </h2>
            <div className="grid grid-cols-3 gap-10 mt-4 bg-surface-container-high/50 p-6 rounded-2xl border border-white/5">
              <div className="text-center">
                <div className="text-4xl font-black tabular-nums text-on-surface">{score}</div>
                <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mt-2">Total Score</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black tabular-nums text-primary">{hits}</div>
                <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mt-2">Target Hits</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black tabular-nums text-error">{misses}</div>
                <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mt-2">Decoy Misses</div>
              </div>
            </div>
            <button
              onClick={startGame}
              className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container-highest text-on-surface hover:text-primary font-bold uppercase tracking-widest hover:bg-surface-bright active:scale-95 transition-all outline outline-1 outline-outline-variant/30"
            >
              <RotateCcw size={18} />
              Recalibrate
            </button>
          </div>
        )}

        {/* Game Targets (Stitch styled) */}
        {phase === "playing" && targets.map((target) => (
          <button
            key={target.id}
            data-target="true"
            onMouseEnter={() => engineRef.current.recordHoverEnter()}
            onMouseLeave={() => engineRef.current.recordHoverLeave()}
            onClick={(e) => {
              e.stopPropagation();
              handleTargetClick(target);
            }}
            className="absolute rounded-full transition-transform active:scale-90 flex items-center justify-center group"
            style={{
              left: target.x - TARGET_RADIUS,
              top: target.y - TARGET_RADIUS,
              width: TARGET_RADIUS * 2,
              height: TARGET_RADIUS * 2,
              opacity: target.opacity,
            }}
          >
            {/* Soft Glow Underlay */}
            <div className={`absolute inset-0 rounded-full blur-xl transition-all ${target.isDecoy ? 'bg-error/20' : 'bg-primary/20 group-hover:bg-primary/30'}`} />
            
            {/* Pulsing ring */}
            <div className={`w-full h-full rounded-full border-2 ${target.isDecoy ? 'border-error/40' : 'border-primary/40 animate-[pulse_1s_ease-in-out_infinite]'}`} />
            
            {/* Inner bounding ring */}
            <div className={`absolute rounded-full border ${target.isDecoy ? 'border-error/60' : 'border-primary/60'}`} style={{width: TARGET_RADIUS * 1.5, height: TARGET_RADIUS * 1.5}} />
            
            {/* Core dot */}
            <div className={`absolute rounded-full shadow-[0_0_15px] ${target.isDecoy ? 'bg-error shadow-error' : 'bg-primary shadow-primary'}`} style={{width: target.isDecoy ? 12 : 8, height: target.isDecoy ? 12 : 8}} />
          </button>
        ))}

        {/* Live Indicator Overlay */}
        <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-full border border-outline-variant/20 z-10 transition-opacity" style={{opacity: phase === 'playing' ? 1 : 0}}>
          <div className="w-2 h-2 bg-primary rounded-full animate-[pulse_1s_ease-in-out_infinite]"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Live Analytics Feed</span>
        </div>
      </section>

      {/* Bottom Telemetry Strip (Stitch styled 8-grid) */}
      <section className="w-full bg-[rgba(45,52,73,0.6)] backdrop-blur-xl border-t border-l border-outline-variant/20 rounded-xl p-6 transition-all duration-300 min-h-[96px]">
        {lastSnapshot ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
            <TelemetryMetric label="Click Freq" value={lastSnapshot.click_frequency} suffix="/s" />
            <TelemetryMetric label="Hesitation" value={lastSnapshot.hesitation_time} alertThreshold={0.7} />
            <TelemetryMetric label="Smoothness" value={lastSnapshot.movement_smoothness} isPercent />
            <TelemetryMetric label="Misclicks" value={lastSnapshot.misclick_rate} isPercent alertThreshold={0.5} />
            <TelemetryMetric label="Dwell Time" value={lastSnapshot.dwell_time} />
            <TelemetryMetric label="Scroll Depth" value={lastSnapshot.scroll_depth} isPercent />
            <TelemetryMetric label="Nav Speed" value={lastSnapshot.navigation_speed} />
            <TelemetryMetric label="Dir Changes" value={lastSnapshot.direction_changes} alertThreshold={0.7} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center opacity-40 gap-3">
             <Target size={16} className="text-on-surface-variant"/>
             <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Telemetry Standing By</span>
          </div>
        )}
      </section>
    </div>
  );
}

// Helper component for the Stitch Telemetry metrics
function TelemetryMetric({ label, value, isPercent = false, suffix = "", alertThreshold = 1.0 }: { label: string, value: number, isPercent?: boolean, suffix?: string, alertThreshold?: number }) {
  const isAlert = value >= alertThreshold;
  const colorClass = isAlert ? "bg-error text-error shadow-error/40" : "bg-primary text-primary shadow-primary/40";
  
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter truncate">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${isAlert ? 'text-error' : 'text-primary'}`}>
          {isPercent ? `${(value * 100).toFixed(0)}%` : `${value.toFixed(2)}${suffix}`}
        </span>
      </div>
      <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
        <div className={`h-full ${isAlert ? 'bg-error' : 'bg-primary'} transition-all duration-300`} style={{ width: `${value * 100}%` }}></div>
      </div>
    </div>
  );
}
