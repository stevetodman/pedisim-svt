// DefibControls - Control buttons for the defibrillator
// Sync toggle, Charge button, Shock button

import { DeviceState } from '../../kernel/defibrillator/types';

interface DefibControlsProps {
  syncMode: boolean;
  deviceState: DeviceState;
  canCharge: boolean;
  canShock: boolean;
  onToggleSync: () => void;
  onCharge: () => void;
  onCancelCharge: () => void;
  onShock: () => void;
}

export default function DefibControls({
  syncMode,
  deviceState,
  canCharge,
  canShock,
  onToggleSync,
  onCharge,
  onCancelCharge,
  onShock
}: DefibControlsProps) {
  const isCharging = deviceState === 'CHARGING';
  const isReady = deviceState === 'READY';

  return (
    <div className="flex justify-center gap-4">
      {/* Sync Toggle */}
      <button
        onClick={onToggleSync}
        disabled={isCharging || deviceState === 'DISCHARGING'}
        className={`
          px-6 py-4 rounded-lg font-bold text-lg transition-all
          border-4 min-w-[120px]
          ${syncMode
            ? 'bg-green-700 border-green-500 text-white shadow-lg shadow-green-500/30'
            : 'bg-slate-700 border-slate-500 text-slate-300 hover:bg-slate-600'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <div className="text-xs mb-1">SYNC</div>
        <div>{syncMode ? 'ON' : 'OFF'}</div>
        <div className="text-xs mt-1 text-slate-400">
          <kbd className="bg-slate-800 px-1 rounded">S</kbd>
        </div>
      </button>

      {/* Charge / Cancel Button */}
      {isCharging || isReady ? (
        <button
          onClick={onCancelCharge}
          className="px-6 py-4 rounded-lg font-bold text-lg
            bg-slate-600 border-4 border-slate-400 text-white
            hover:bg-slate-500 transition-all min-w-[120px]"
        >
          <div className="text-xs mb-1">DISARM</div>
          <div>CANCEL</div>
          <div className="text-xs mt-1 text-slate-400">
            <kbd className="bg-slate-800 px-1 rounded">Esc</kbd>
          </div>
        </button>
      ) : (
        <button
          onClick={onCharge}
          disabled={!canCharge}
          className={`
            px-6 py-4 rounded-lg font-bold text-lg transition-all
            border-4 min-w-[120px]
            ${canCharge
              ? 'bg-yellow-600 border-yellow-400 text-white hover:bg-yellow-500 shadow-lg shadow-yellow-500/30'
              : 'bg-slate-700 border-slate-500 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          <div className="text-xs mb-1">CHARGE</div>
          <div className="text-2xl">▲</div>
        </button>
      )}

      {/* Shock Button */}
      <button
        onClick={onShock}
        disabled={!canShock}
        className={`
          px-8 py-4 rounded-lg font-bold text-lg transition-all
          border-4 min-w-[180px]
          ${canShock
            ? 'bg-red-600 border-red-400 text-white animate-pulse hover:bg-red-500 shadow-lg shadow-red-500/50'
            : 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed'
          }
        `}
      >
        <div className="text-xl mb-1">⚡ SHOCK ⚡</div>
        <div className="text-sm">
          {canShock ? 'STAND CLEAR' : 'NOT READY'}
        </div>
      </button>
    </div>
  );
}
