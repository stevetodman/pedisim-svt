/**
 * Controls - ECG viewer toolbar with gain, speed, and caliper controls
 * Made highly visible with clear button-style controls
 */

interface ControlsProps {
  gain: 5 | 10 | 20;
  speed: 25 | 50;
  caliperActive: boolean;
  marchingActive: boolean;
  hasMeasurements: boolean;
  onGainChange: (gain: 5 | 10 | 20) => void;
  onSpeedChange: (speed: 25 | 50) => void;
  onToggleCalipers: () => void;
  onToggleMarching: () => void;
  onClearMeasurements: () => void;
  onClose: () => void;
}

export function Controls({
  gain,
  speed,
  caliperActive,
  marchingActive,
  hasMeasurements,
  onGainChange,
  onSpeedChange,
  onToggleCalipers,
  onToggleMarching,
  onClearMeasurements,
  onClose,
}: ControlsProps) {
  return (
    <div className="bg-slate-800 border-t-2 border-slate-600 px-4 py-3 flex items-center justify-between gap-4">
      {/* Left side - Caliper controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleCalipers}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all
            ${caliperActive
              ? 'bg-red-600 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-slate-800'
              : 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-500'
            }`}
        >
          📏 Calipers
        </button>

        <button
          onClick={onToggleMarching}
          disabled={!hasMeasurements}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all
            ${marchingActive
              ? 'bg-orange-500 text-white ring-2 ring-orange-400 ring-offset-2 ring-offset-slate-800'
              : hasMeasurements
                ? 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-500'
                : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-700'
            }`}
        >
          🔄 March
        </button>

        {hasMeasurements && (
          <button
            onClick={onClearMeasurements}
            className="px-3 py-2 rounded-lg text-sm font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-500"
          >
            Clear
          </button>
        )}
      </div>

      {/* Center - Standardization controls - HIGHLY VISIBLE */}
      <div className="flex items-center gap-6 bg-slate-900 px-6 py-2 rounded-lg border-2 border-amber-500/50">
        {/* Gain buttons */}
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold text-sm">GAIN:</span>
          <div className="flex gap-1">
            {([5, 10, 20] as const).map((g) => (
              <button
                key={g}
                onClick={() => onGainChange(g)}
                className={`px-3 py-1 rounded font-mono text-sm font-bold transition-all
                  ${gain === g
                    ? 'bg-amber-500 text-black'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                {g}
              </button>
            ))}
          </div>
          <span className="text-slate-400 text-xs">mm/mV</span>
        </div>

        <div className="w-px h-8 bg-slate-600" />

        {/* Speed buttons */}
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold text-sm">SPEED:</span>
          <div className="flex gap-1">
            {([25, 50] as const).map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-3 py-1 rounded font-mono text-sm font-bold transition-all
                  ${speed === s
                    ? 'bg-cyan-500 text-black'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="text-slate-400 text-xs">mm/s</span>
        </div>
      </div>

      {/* Right side - Close */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-slate-500">
          <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">C</kbd>
          <span className="mx-1">calipers</span>
          <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 font-mono ml-2">Esc</kbd>
          <span className="mx-1">close</span>
        </div>

        <button
          onClick={onClose}
          className="px-5 py-2 rounded-lg text-sm font-bold bg-slate-600 text-white hover:bg-slate-500 border border-slate-400"
        >
          Close
        </button>
      </div>
    </div>
  );
}
