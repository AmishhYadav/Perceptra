import { useState, useEffect, useRef } from 'react';
import { useInferenceStore, FEATURE_KEYS, type TelemetryInput } from '../store/useInferenceStore';
import { SlidersHorizontal } from 'lucide-react';

const FEATURE_LABELS: Record<string, string> = {
  click_frequency: 'Click Freq',
  hesitation_time: 'Hesitation',
  misclick_rate: 'Misclicks',
  scroll_depth: 'Scroll Depth',
  movement_smoothness: 'Smoothness',
  dwell_time: 'Dwell Time',
  navigation_speed: 'Nav Speed',
  direction_changes: 'Dir Changes',
};

const PRESETS: Record<string, TelemetryInput> = {
  Focused: {
    click_frequency: 0.7,
    hesitation_time: 0.1,
    misclick_rate: 0.05,
    scroll_depth: 0.8,
    movement_smoothness: 0.9,
    dwell_time: 0.3,
    navigation_speed: 0.7,
    direction_changes: 0.1,
  },
  Distracted: {
    click_frequency: 0.4,
    hesitation_time: 0.5,
    misclick_rate: 0.3,
    scroll_depth: 0.3,
    movement_smoothness: 0.4,
    dwell_time: 0.6,
    navigation_speed: 0.4,
    direction_changes: 0.5,
  },
  Confused: {
    click_frequency: 0.2,
    hesitation_time: 0.9,
    misclick_rate: 0.7,
    scroll_depth: 0.1,
    movement_smoothness: 0.15,
    dwell_time: 0.8,
    navigation_speed: 0.2,
    direction_changes: 0.85,
  },
};

export function TelemetrySliders() {
  const sendTelemetry = useInferenceStore((s) => s.sendTelemetry);
  const connectionStatus = useInferenceStore((s) => s.connectionStatus);

  const [sliders, setSliders] = useState<TelemetryInput>({
    click_frequency: 0.5,
    hesitation_time: 0.5,
    misclick_rate: 0.5,
    scroll_depth: 0.5,
    movement_smoothness: 0.5,
    dwell_time: 0.5,
    navigation_speed: 0.5,
    direction_changes: 0.5,
  });

  // Use a ref so the interval always reads the latest slider values
  const slidersRef = useRef(sliders);
  slidersRef.current = sliders;

  // Emit telemetry 10× per second
  useEffect(() => {
    if (connectionStatus !== 'connected') return;

    const id = setInterval(() => {
      sendTelemetry(slidersRef.current);
    }, 100);

    return () => clearInterval(id);
  }, [connectionStatus, sendTelemetry]);

  const updateSlider = (key: keyof TelemetryInput, value: number) => {
    setSliders((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: TelemetryInput) => {
    setSliders(preset);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SlidersHorizontal size={16} className="text-accent" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Telemetry Simulation
        </h3>
      </div>

      {/* Presets */}
      <div className="flex gap-2">
        {Object.entries(PRESETS).map(([name, preset]) => (
          <button
            key={name}
            onClick={() => applyPreset(preset)}
            className={`
              rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer
              ${
                name === 'Focused'
                  ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                  : name === 'Distracted'
                  ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                  : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
              }
            `}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        {FEATURE_KEYS.map((key) => (
          <div key={key} className="group">
            <div className="flex justify-between mb-1">
              <label className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                {FEATURE_LABELS[key]}
              </label>
              <span className="text-xs font-mono text-accent">
                {sliders[key].toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sliders[key]}
              onChange={(e) => updateSlider(key, parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                         bg-surface-lighter accent-accent
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:h-3.5
                         [&::-webkit-slider-thumb]:w-3.5
                         [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:bg-accent
                         [&::-webkit-slider-thumb]:shadow-lg
                         [&::-webkit-slider-thumb]:shadow-accent/30
                         [&::-webkit-slider-thumb]:transition-transform
                         [&::-webkit-slider-thumb]:hover:scale-125"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
