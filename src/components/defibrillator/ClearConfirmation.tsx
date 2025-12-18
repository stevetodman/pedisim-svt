// ClearConfirmation - "Everyone Clear" safety dialog with hold-to-shock
// Critical safety step before delivering shock

import { useState, useRef, useEffect } from 'react';

interface ClearConfirmationProps {
  energy: number;
  syncMode: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ClearConfirmation({
  energy,
  syncMode,
  onConfirm,
  onCancel
}: ClearConfirmationProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdIntervalRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);

  const HOLD_DURATION = 500; // ms to hold for shock

  const startHold = () => {
    setIsHolding(true);
    holdStartRef.current = Date.now();

    holdIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(100, (elapsed / HOLD_DURATION) * 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        if (holdIntervalRef.current) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = null;
        }
        onConfirm();
      }
    }, 16);
  };

  const endHold = () => {
    setIsHolding(false);
    setHoldProgress(0);
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-black/95 flex items-center justify-center p-4 z-20">
      <div className="bg-slate-900 rounded-lg border-4 border-red-600 max-w-lg w-full p-8 text-center animate-pulse-slow">
        {/* Warning header */}
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          SHOCK READY - CLEAR THE PATIENT
        </h2>

        {/* Energy info */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <div className="text-4xl font-mono font-bold text-red-500 mb-2">
            {energy} Joules
          </div>
          <div className={`text-lg ${syncMode ? 'text-green-400' : 'text-amber-400'}`}>
            {syncMode ? 'Synchronized Cardioversion' : 'Defibrillation (UNSYNC)'}
          </div>
        </div>

        {/* Clear announcement instruction */}
        <div className="mb-6">
          <p className="text-white text-lg mb-2">
            You must announce:
          </p>
          <p className="text-xl font-bold text-amber-400 italic">
            "I'm clear, you're clear, everybody's clear!"
          </p>
        </div>

        {/* Hold to shock button */}
        <div className="relative mb-4">
          <button
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
            className={`
              relative w-full py-6 rounded-lg font-bold text-xl
              transition-all duration-100 overflow-hidden
              ${isHolding
                ? 'bg-red-700 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white'
              }
              border-4 border-red-400
              shadow-lg shadow-red-600/50
            `}
          >
            {/* Progress fill */}
            <div
              className="absolute inset-0 bg-red-400 transition-all duration-75"
              style={{
                width: `${holdProgress}%`,
                opacity: 0.5
              }}
            />

            {/* Button text */}
            <div className="relative z-10">
              <div className="text-2xl mb-1">⚡ CONFIRM CLEAR & DELIVER SHOCK ⚡</div>
              <div className="text-sm opacity-80">
                {isHolding ? 'Keep holding...' : 'Press and hold to shock'}
              </div>
            </div>
          </button>
        </div>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors"
        >
          DISARM - Cancel Shock
        </button>

        {/* Keyboard hint */}
        <div className="mt-4 text-slate-500 text-sm">
          Press <kbd className="bg-slate-800 px-2 py-1 rounded">Esc</kbd> to cancel
        </div>

        {/* Add slower pulse animation */}
        <style>{`
          @keyframes pulse-slow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.95; }
          }
          .animate-pulse-slow {
            animation: pulse-slow 1s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
