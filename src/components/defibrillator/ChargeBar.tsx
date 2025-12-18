// ChargeBar - Animated charging progress bar
// Shows charge level during charging, glows when ready

import { DeviceState } from '../../kernel/defibrillator/types';

interface ChargeBarProps {
  chargeLevel: number;
  deviceState: DeviceState;
  selectedEnergy: number;
}

export default function ChargeBar({
  chargeLevel,
  deviceState,
  selectedEnergy
}: ChargeBarProps) {
  const isCharging = deviceState === 'CHARGING';
  const isReady = deviceState === 'READY';

  // Get bar color based on state
  const getBarColor = () => {
    if (isReady) return 'bg-green-500';
    if (isCharging) return 'bg-yellow-500';
    return 'bg-slate-600';
  };

  // Get glow effect
  const getGlowClass = () => {
    if (isReady) return 'shadow-lg shadow-green-500/50';
    if (isCharging && chargeLevel > 80) return 'shadow-lg shadow-yellow-500/50';
    return '';
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
      {/* Progress bar container */}
      <div className={`relative h-8 bg-slate-900 rounded-full overflow-hidden border-2 border-slate-700 ${getGlowClass()}`}>
        {/* Progress fill */}
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-100 ${getBarColor()}`}
          style={{ width: `${chargeLevel}%` }}
        >
          {/* Animated stripes when charging */}
          {isCharging && (
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.3) 20px)',
                animation: 'moveStripes 0.5s linear infinite'
              }}
            />
          )}
        </div>

        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-mono font-bold text-lg ${
            isReady ? 'text-white' :
            isCharging ? 'text-white' :
            'text-slate-500'
          }`}>
            {isReady ? '100% READY' :
             isCharging ? `${Math.round(chargeLevel)}%` :
             '---'}
          </span>
        </div>
      </div>

      {/* Status text */}
      <div className="mt-2 text-center">
        {isReady && (
          <span className="text-green-400 font-bold animate-pulse">
            CHARGED - {selectedEnergy}J - STAND CLEAR
          </span>
        )}
        {isCharging && (
          <span className="text-yellow-400 font-bold">
            CHARGING... {selectedEnergy}J
          </span>
        )}
        {!isReady && !isCharging && (
          <span className="text-slate-500">
            Press CHARGE when ready
          </span>
        )}
      </div>

      {/* Add animation keyframes */}
      <style>{`
        @keyframes moveStripes {
          0% { background-position: 0 0; }
          100% { background-position: 40px 0; }
        }
      `}</style>
    </div>
  );
}
