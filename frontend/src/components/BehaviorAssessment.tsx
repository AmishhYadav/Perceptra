/**
 * BehaviorAssessment — Interactive "Focus Zone" mini-game with recording mode.
 *
 * Recording mode allows users to generate labeled training data by declaring
 * their behavioral state before playing. Snapshots are buffered and POSTed
 * to /api/recording/record on completion.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useInferenceStore,
  type TelemetryInput,
} from "../store/useInferenceStore";
import { TelemetryEngine, type TelemetrySnapshot } from "./TelemetryEngine";
import { Play, RotateCcw, Target, Zap, Circle, Database, Trash2 } from "lucide-react";

/* ── Game constants ── */
const GAME_DURATION_SEC = 20;
const SPAWN_INTERVAL_MS = 1200;
const TARGET_LIFETIME_MS = 2800;
const MAX_TARGETS = 5;
const TARGET_RADIUS = 32;
const DECOY_CHANCE = 0.2;

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const BEHAVIOR_LABELS = ["focused", "distracted", "confused"] as const;
type BehaviorLabel = (typeof BEHAVIOR_LABELS)[number];

const LABEL_CONFIG: Record<BehaviorLabel, { color: string; textColor: string; icon: string; instruction: string }> = {
  focused: {
    color: "bg-primary-container",
    textColor: "text-primary-container",
    icon: "🎯",
    instruction: "Play as fast and accurately as you can",
  },
  distracted: {
    color: "bg-secondary",
    textColor: "text-secondary",
    icon: "😶‍🌫️",
    instruction: "Look away, check your phone, play absentmindedly",
  },
  confused: {
    color: "bg-error",
    textColor: "text-error",
    icon: "😕",
    instruction: "Hesitate before clicking, second-guess yourself",
  },
};

interface GameTarget {
  id: number;
  x: number;
  y: number;
  spawnTime: number;
  isDecoy: boolean;
  opacity: number;
}

interface RecordingStats {
  total_sessions: number;
  total_samples: number;
  per_class: Record<string, { sessions: number; samples: number }>;
}

type GamePhase = "idle" | "playing" | "finished";

export function BehaviorAssessment() {
  const sendTelemetry = useInferenceStore((s) => s.sendTelemetry);
  const connectionStatus = useInferenceStore((s) => s.connectionStatus);

  const [phase, setPhase] = useState<GamePhase>("idle");
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC);
  const [targetsState, _setTargets] = useState<GameTarget[]>([]);
  const targetsRef = useRef<GameTarget[]>([]);

  const setTargets = useCallback((newTargets: GameTarget[] | ((prev: GameTarget[]) => GameTarget[])) => {
    if (typeof newTargets === "function") {
      const next = newTargets(targetsRef.current);
      targetsRef.current = next;
      _setTargets(next);
    } else {
      targetsRef.current = newTargets;
      _setTargets(newTargets);
    }
  }, []);
  const targets = targetsState;
  
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [_misses, setMisses] = useState(0);
  const [lastSnapshot, setLastSnapshot] = useState<TelemetrySnapshot | null>(null);

  // ── Detailed game stats ──
  const [totalSpawned, setTotalSpawned] = useState(0);
  const [greenSpawned, setGreenSpawned] = useState(0);
  const [greenExpired, setGreenExpired] = useState(0);
  const [decoyClicks, setDecoyClicks] = useState(0);

  // ── Recording mode state ──
  const [recordingMode, setRecordingMode] = useState(false);
  const [recordingLabel, setRecordingLabel] = useState<BehaviorLabel | null>(null);
  const [recordingStats, setRecordingStats] = useState<RecordingStats | null>(null);
  const [recordingSaving, setRecordingSaving] = useState(false);
  const [lastRecordResult, setLastRecordResult] = useState<string | null>(null);
  const recordedSnapshotsRef = useRef<number[][]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(new TelemetryEngine());
  const nextIdRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const telemetryTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const animFrameRef = useRef<number | undefined>(undefined);
  const telemetryFrameCountRef = useRef(0);

  /* ── Fetch recording stats on mount ── */
  useEffect(() => {
    fetchRecordingStats();
  }, []);

  const fetchRecordingStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/recording/stats`);
      if (res.ok) setRecordingStats(await res.json());
    } catch {
      /* backend not running — ignore */
    }
  }, []);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      clearInterval(spawnTimerRef.current);
      clearInterval(gameTimerRef.current);
      clearInterval(telemetryTimerRef.current);
      clearInterval(animFrameRef.current);
    };
  }, []);

  // ── Refs to avoid stale closures in setInterval callbacks ──
  const recordingModeRef = useRef(recordingMode);
  const recordingLabelRef = useRef(recordingLabel);
  recordingModeRef.current = recordingMode;
  recordingLabelRef.current = recordingLabel;
  const endGameRef = useRef<() => void>(() => {});

  /* ── Start game ── */
  const startGame = useCallback(() => {
    // Safety: clear any lingering timers from a previous game
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (telemetryTimerRef.current) clearInterval(telemetryTimerRef.current);
    clearInterval(animFrameRef.current);

    const engine = engineRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    engine.start(rect?.height || 500);
    nextIdRef.current = 0;
    recordedSnapshotsRef.current = [];

    // Clear stale predictions and ensure fresh WebSocket connection
    const { clearPredictions, connectionStatus, connectAll } = useInferenceStore.getState();
    clearPredictions(); 
    // Only attempt to connect if the socket actually died
    if (connectionStatus === "disconnected" || connectionStatus === "error") {
      connectAll(); 
    }

    setPhase("playing");
    setTimeLeft(GAME_DURATION_SEC);
    setTargets([]);
    setScore(0);
    setHits(0);
    setMisses(0);
    setTotalSpawned(0);
    setGreenSpawned(0);
    setGreenExpired(0);
    setDecoyClicks(0);
    setLastSnapshot(null);
    setLastRecordResult(null);

    // Spawn timer — also count total spawned
    spawnTimerRef.current = setInterval(() => {
      const prev = targetsRef.current;
      if (prev.length >= MAX_TARGETS) return;
      
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const pad = TARGET_RADIUS + 20;
      const x = pad + Math.random() * (rect.width - 2 * pad);
      const y = pad + Math.random() * (rect.height - 2 * pad);
      const isDecoy = Math.random() < DECOY_CHANCE;
      
      setTotalSpawned((p) => p + 1);
      if (!isDecoy) setGreenSpawned((p) => p + 1);
      
      setTargets([
        ...prev,
        { id: nextIdRef.current++, x, y, spawnTime: performance.now(), isDecoy, opacity: 1 },
      ]);
    }, SPAWN_INTERVAL_MS);

    // Countdown timer — uses ref to avoid stale endGame closure
    gameTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGameRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Telemetry emission — UI updates at 10Hz, model inference at 2Hz.
    // This prevents confidence scores from flickering on every micro-change.
    telemetryFrameCountRef.current = 0;
    telemetryTimerRef.current = setInterval(() => {
      const snap = engine.getSnapshot();
      setLastSnapshot(snap); // always update local UI (smooth telemetry bars)

      // Buffer snapshot for recording mode (read from ref, not closure)
      if (recordingModeRef.current && recordingLabelRef.current) {
        const features = [
          snap.click_frequency,
          snap.hesitation_time,
          snap.misclick_rate,
          snap.scroll_depth,
          snap.movement_smoothness,
          snap.dwell_time,
          snap.navigation_speed,
          snap.direction_changes,
        ];
        recordedSnapshotsRef.current.push(features);
      }

      // Only send to WebSocket every 5th frame (2Hz) to reduce inference churn
      telemetryFrameCountRef.current++;
      if (telemetryFrameCountRef.current >= 5) {
        telemetryFrameCountRef.current = 0;
        sendTelemetry(snap as TelemetryInput);
      }
    }, 100);

    // Logic loop to cull expired targets every 200ms
    animFrameRef.current = setInterval(() => {
      const now = performance.now();
      const prev = targetsRef.current;
      let hasChanges = false;
      const surviving: GameTarget[] = [];
      let newExpired = 0;

      for (const t of prev) {
        const age = now - t.spawnTime;
        if (age >= TARGET_LIFETIME_MS) {
          hasChanges = true;
          if (!t.isDecoy) {
            engine.recordTargetExpired(TARGET_LIFETIME_MS);
            newExpired++;
          }
        } else {
          surviving.push(t);
        }
      }

      if (newExpired > 0) setGreenExpired((p) => p + newExpired);
      if (hasChanges) setTargets(surviving);

    }, 200) as unknown as number;
  }, [sendTelemetry, setTargets]);

  /* ── End game ── */
  const endGame = useCallback(() => {
    // 1. Immediately stop all timers to prevent any more telemetry frames
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (telemetryTimerRef.current) clearInterval(telemetryTimerRef.current);
    clearInterval(animFrameRef.current);

    // 2. Count any remaining alive targets as missed/expired
    const prev = targetsRef.current;
    let remainingGreen = 0;
    for (const t of prev) {
      if (!t.isDecoy) {
        remainingGreen++;
        engineRef.current.recordTargetExpired(TARGET_LIFETIME_MS);
      }
    }
    if (remainingGreen > 0) {
      setGreenExpired((p) => p + remainingGreen);
    }
    setTargets([]);
    
    // 3. Capture and send the FINAL high-fidelity snapshot
    const finalSnap = engineRef.current.getSnapshot();
    setLastSnapshot(finalSnap);
    sendTelemetry(finalSnap as TelemetryInput);

    // 4. If recording, buffer the final snapshot too (read from refs)
    if (recordingModeRef.current && recordingLabelRef.current) {
      recordedSnapshotsRef.current.push([
        finalSnap.click_frequency,
        finalSnap.hesitation_time,
        finalSnap.misclick_rate,
        finalSnap.scroll_depth,
        finalSnap.movement_smoothness,
        finalSnap.dwell_time,
        finalSnap.navigation_speed,
        finalSnap.direction_changes,
      ]);
    }

    setPhase("finished");

    // 4. Auto-save recording if in recording mode
    if (recordingModeRef.current && recordingLabelRef.current && recordedSnapshotsRef.current.length > 0) {
      saveRecording();
    }
  }, [sendTelemetry]);
  endGameRef.current = endGame;

  /* ── Save recorded session to backend ── */
  const saveRecording = useCallback(async () => {
    if (!recordingLabel || recordedSnapshotsRef.current.length === 0) return;

    setRecordingSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/recording/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: recordingLabel,
          samples: recordedSnapshotsRef.current,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastRecordResult(
          `✓ Saved ${data.n_samples} "${recordingLabel}" samples`
        );
        fetchRecordingStats();
      } else {
        const err = await res.json();
        setLastRecordResult(`✗ Failed: ${err.detail}`);
      }
    } catch (e) {
      setLastRecordResult(`✗ Network error: ${e}`);
    }
    setRecordingSaving(false);
  }, [recordingLabel, fetchRecordingStats]);

  /* ── Clear all recordings ── */
  const clearRecordings = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/recording/clear`, { method: "DELETE" });
      fetchRecordingStats();
      setLastRecordResult(null);
    } catch { /* ignore */ }
  }, [fetchRecordingStats]);

  /* ── Input Handlers ── */
  const handleTargetClick = useCallback((target: GameTarget) => {
    const reactionTime = performance.now() - target.spawnTime;
    const engine = engineRef.current;
    if (target.isDecoy) {
      engine.recordClick(false);
      setMisses((p) => p + 1);
      setDecoyClicks((p) => p + 1);
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
      {/* ── Recording Mode Panel ── */}
      <section className="w-full bg-surface-container-high rounded-xl border border-outline-variant/10 overflow-hidden">
        <button
          onClick={() => {
            setRecordingMode((m) => !m);
            if (recordingMode) setRecordingLabel(null);
          }}
          className="w-full flex items-center justify-between px-6 py-3 hover:bg-surface-container transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Database size={16} className={recordingMode ? "text-error" : "text-secondary"} />
            <span className="text-[10px] uppercase font-bold tracking-widest text-secondary">
              Training Data Recorder
            </span>
          </div>
          <div className={`w-8 h-4 rounded-full transition-colors relative ${recordingMode ? 'bg-error' : 'bg-outline-variant/30'}`}>
            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${recordingMode ? 'left-4' : 'left-0.5'}`} />
          </div>
        </button>

        {recordingMode && (
          <div className="px-6 pb-5 pt-2 border-t border-outline-variant/10 space-y-4">
            {/* Label Selector */}
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-secondary mb-3">
                Select your behavior for this session:
              </p>
              <div className="grid grid-cols-3 gap-3">
                {BEHAVIOR_LABELS.map((label) => {
                  const cfg = LABEL_CONFIG[label];
                  const isSelected = recordingLabel === label;
                  return (
                    <button
                      key={label}
                      onClick={() => setRecordingLabel(label)}
                      disabled={phase === "playing"}
                      className={`
                        relative rounded-lg p-4 text-center transition-all cursor-pointer
                        border overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed
                        ${isSelected
                          ? `${cfg.color}/10 border-current ${cfg.textColor} shadow-sm`
                          : "bg-white border-outline-variant/10 hover:border-outline-variant/30 text-on-surface"
                        }
                      `}
                    >
                      <div className="text-2xl mb-1">{cfg.icon}</div>
                      <div className="text-[10px] uppercase font-bold tracking-widest">{label}</div>
                      {isSelected && (
                        <p className="text-[9px] text-secondary mt-2 leading-relaxed italic">
                          {cfg.instruction}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recording indicator during play */}
            {phase === "playing" && recordingLabel && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-error/5 border border-error/10">
                <Circle size={8} className="text-error fill-error animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-error">
                  Recording "{recordingLabel}" — {recordedSnapshotsRef.current.length} samples captured
                </span>
              </div>
            )}

            {/* Last record result */}
            {lastRecordResult && (
              <div className={`text-xs font-bold px-3 py-2 rounded-lg ${lastRecordResult.startsWith("✓") ? "bg-primary-container/5 text-primary-container" : "bg-error/5 text-error"}`}>
                {lastRecordResult}
              </div>
            )}

            {/* Stats */}
            {recordingStats && recordingStats.total_sessions > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-secondary">
                    Recorded Data ({recordingStats.total_samples} total samples)
                  </span>
                  <button
                    onClick={clearRecordings}
                    className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest text-error/60 hover:text-error transition-colors cursor-pointer"
                  >
                    <Trash2 size={10} />
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {BEHAVIOR_LABELS.map((label) => {
                    const cls = recordingStats.per_class[label];
                    const cfg = LABEL_CONFIG[label];
                    return (
                      <div key={label} className="flex flex-col items-center p-2 rounded-lg bg-white border border-outline-variant/10">
                        <span className={`text-lg font-black tabular-nums ${cfg.textColor}`}>
                          {cls?.samples || 0}
                        </span>
                        <span className="text-[8px] uppercase font-bold tracking-widest text-secondary">
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Warning if no label selected */}
            {!recordingLabel && phase === "idle" && (
              <p className="text-[10px] text-secondary italic text-center">
                Select a behavior label above, then start the assessment to begin recording
              </p>
            )}
          </div>
        )}
      </section>

      {/* Top Scoreboard (Stitch styled) */}
      <section className="w-full flex justify-between items-center gap-6">
        <div className="flex flex-col items-center flex-1 py-4 bg-surface-container-high rounded-xl border border-outline-variant/10">
          <span className="text-secondary text-[10px] uppercase font-bold tracking-[0.2em] mb-1">
            Session Timer
          </span>
          <div className="text-5xl md:text-6xl font-headline italic text-primary tabular-nums tracking-tighter">
            {timeLeft}s
          </div>
        </div>
        <div className="flex flex-col items-center flex-1 py-4 bg-surface-container-high rounded-xl border border-outline-variant/10">
          <span className="text-secondary text-[10px] uppercase font-bold tracking-[0.2em] mb-1">
            Accumulated Score
          </span>
          <div className="text-5xl md:text-6xl font-headline italic text-on-surface tabular-nums tracking-tighter">
            {score}
          </div>
        </div>
      </section>

      {/* Central Game Arena */}
      <section
        ref={containerRef}
        className="flex-1 w-full relative bg-surface-container-low rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10 min-h-[420px]"
        style={{
          cursor: phase === "playing" ? "crosshair" : "default",
          backgroundSize: "40px 40px",
          backgroundImage: "linear-gradient(to right, rgba(114, 121, 116, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(114, 121, 116, 0.1) 1px, transparent 1px)"
        }}
        onClick={handleBackgroundClick}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
      >
        {/* Idle UI */}
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-surface-container-low/90 backdrop-blur-sm z-10">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-primary-container/10 flex items-center justify-center animate-pulse">
                <Target size={48} className="text-primary" />
              </div>
              <div className="absolute -inset-4 rounded-full border border-primary-container/20 animate-ping duration-1000" />
            </div>
            <div className="text-center max-w-md px-6">
              <h2 className="text-2xl font-headline italic text-primary mb-3 tracking-tight">
                Focus Zone Assessment
              </h2>
              <p className="text-sm text-secondary leading-relaxed">
                Click the <span className="text-primary-container font-bold">green targets</span> as they appear. 
                Avoid the <span className="text-error font-bold">red decoys</span>. 
                {recordingMode && recordingLabel
                  ? <> Your telemetry will be recorded as <span className={`font-bold ${LABEL_CONFIG[recordingLabel].textColor}`}>"{recordingLabel}"</span> training data.</>
                  : " We'll analyze your interaction patterns to determine your cognitive state."
                }
              </p>
            </div>
            <button
              onClick={startGame}
              disabled={connectionStatus !== "connected" || (recordingMode && !recordingLabel)}
              className="flex items-center gap-2 px-8 py-3 rounded-lg bg-primary-container text-white font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:grayscale"
            >
              {recordingMode && recordingLabel ? (
                <>
                  <Circle size={14} className="text-red-300 fill-red-300 animate-pulse" />
                  Record {recordingLabel}
                </>
              ) : (
                <>
                  <Play size={18} />
                  Start Protocol
                </>
              )}
            </button>
            {connectionStatus !== "connected" && (
              <p className="text-xs text-on-surface-variant tracking-wider uppercase font-bold mt-2">
                Awaiting connection...
              </p>
            )}
          </div>
        )}

        {/* Finished UI */}
        {phase === "finished" && (() => {
          const hitRate = greenSpawned > 0 ? Math.round((hits / greenSpawned) * 100) : 0;
          const redSpawned = totalSpawned - greenSpawned;
          return (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-surface-container-low/95 backdrop-blur-md z-10">
              <Zap size={48} className="text-primary-container animate-bounce" />
              <h2 className="text-3xl font-headline italic text-primary tracking-tighter">
                {recordingMode ? "Recording Saved" : "Assessment Complete"}
              </h2>
              {recordingSaving && (
                <p className="text-xs text-secondary animate-pulse uppercase tracking-widest font-bold">
                  Saving recording...
                </p>
              )}

              {/* Primary Stats */}
              <div className="grid grid-cols-3 gap-4 mt-2 bg-white p-6 rounded-lg border border-outline-variant/10 shadow-sm min-w-[420px]">
                <div className="text-center col-span-3">
                  <div className="text-5xl font-black tabular-nums text-on-surface">{score}</div>
                  <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mt-1">Total Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black tabular-nums text-primary">{hits}</div>
                  <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mt-1">🟢 Hit</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black tabular-nums text-error">{greenExpired}</div>
                  <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mt-1">🟢 Missed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black tabular-nums text-error">{decoyClicks}</div>
                  <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mt-1">🔴 Traps</div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="flex items-center gap-4 text-xs flex-wrap justify-center">
                <div className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full">
                  <span className="font-bold text-primary">{greenSpawned}</span>
                  <span className="text-secondary uppercase tracking-widest font-bold text-[9px]">🟢 Green</span>
                </div>
                <div className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full">
                  <span className="font-bold text-error">{redSpawned}</span>
                  <span className="text-secondary uppercase tracking-widest font-bold text-[9px]">🔴 Red</span>
                </div>
                <div className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full">
                  <span className="font-bold text-on-surface">{totalSpawned}</span>
                  <span className="text-secondary uppercase tracking-widest font-bold text-[9px]">Total</span>
                </div>
                <div className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full">
                  <span className={`font-bold ${hitRate >= 70 ? 'text-primary-container' : hitRate >= 40 ? 'text-secondary' : 'text-error'}`}>{hitRate}%</span>
                  <span className="text-secondary uppercase tracking-widest font-bold text-[9px]">Hit Rate</span>
                </div>
              </div>

              <button
                onClick={startGame}
                className="mt-4 flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-container text-white font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw size={18} />
                {recordingMode ? "Record Another" : "Recalibrate"}
              </button>
            </div>
          );
        })()}

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
              animation: `targetFade ${TARGET_LIFETIME_MS}ms ease-in-out forwards`,
            }}
          >
            {/* Soft Glow Underlay */}
            <div className={`absolute inset-0 rounded-full blur-xl transition-all ${target.isDecoy ? 'bg-error/20' : 'bg-primary-container/20 group-hover:bg-primary-container/30'}`} />
            
            {/* Pulsing ring */}
            <div className={`w-full h-full rounded-full border-2 ${target.isDecoy ? 'border-error/40' : 'border-primary-container/40 animate-[pulse_1s_ease-in-out_infinite]'}`} />
            
            {/* Inner bounding ring */}
            <div className={`absolute rounded-full border ${target.isDecoy ? 'border-error/60' : 'border-primary-container/60'}`} style={{width: TARGET_RADIUS * 1.5, height: TARGET_RADIUS * 1.5}} />
            
            {/* Core dot */}
            <div className={`absolute rounded-full shadow-[0_0_15px] ${target.isDecoy ? 'bg-error shadow-error' : 'bg-primary-container shadow-primary-container'}`} style={{width: target.isDecoy ? 12 : 8, height: target.isDecoy ? 12 : 8}} />
          </button>
        ))}

        {/* Live Indicator Overlay */}
        <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-outline-variant/20 z-10 transition-opacity" style={{opacity: phase === 'playing' ? 1 : 0}}>
          {recordingMode ? (
            <>
              <Circle size={8} className="text-error fill-error animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-error">
                Recording {recordingLabel}
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-primary-container rounded-full animate-[pulse_1s_ease-in-out_infinite]"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Live Analytics Feed</span>
            </>
          )}
        </div>
      </section>

      {/* Bottom Telemetry Strip (Stitch styled 8-grid) */}
      <section className="w-full bg-surface-container-high rounded-xl p-6 transition-all duration-300 min-h-[96px] border border-outline-variant/10">
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
  
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter truncate">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${isAlert ? 'text-error' : 'text-primary-container'}`}>
          {isPercent ? `${(value * 100).toFixed(0)}%` : `${value.toFixed(2)}${suffix}`}
        </span>
      </div>
      <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
        <div className={`h-full ${isAlert ? 'bg-error' : 'bg-primary-container'} transition-all duration-300`} style={{ width: `${value * 100}%` }}></div>
      </div>
    </div>
  );
}
