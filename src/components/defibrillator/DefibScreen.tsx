// DefibScreen - LCD display with ECG trace and vitals
// Displays rhythm, sync markers, and status messages

import { useRef, useEffect } from 'react';
import { DeviceState } from '../../kernel/defibrillator/types';

interface DefibScreenProps {
  rhythm: 'SVT' | 'SINUS' | 'ASYSTOLE';
  vitals: {
    hr: number;
    spo2: number;
    systolic: number;
    diastolic: number;
  };
  syncMode: boolean;
  deviceState: DeviceState;
  displayText: string;
}

export default function DefibScreen({
  rhythm,
  vitals,
  syncMode,
  deviceState,
  displayText
}: DefibScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const offsetRef = useRef(0);

  // Draw ECG trace
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Get heart rate and calculate cycle
    const hr = vitals.hr;
    const cycleMs = hr > 0 ? 60000 / hr : 1000;
    const pixelsPerMs = 0.15; // Screen scrolls at ~150 pixels/second

    const draw = () => {
      // Clear with dark background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      // Draw grid
      ctx.strokeStyle = '#1a3a1a';
      ctx.lineWidth = 0.5;

      // Small grid (5px)
      for (let x = 0; x < width; x += 5) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 5) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Large grid (25px)
      ctx.strokeStyle = '#2a5a2a';
      for (let x = 0; x < width; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw ECG trace
      const baseline = height / 2;
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const syncMarkerPositions: number[] = [];

      for (let x = 0; x < width; x++) {
        const timeMs = (x + offsetRef.current) / pixelsPerMs;
        const cyclePhase = timeMs % cycleMs;
        const cycleProgress = cyclePhase / cycleMs;

        let y = baseline;

        if (rhythm === 'ASYSTOLE') {
          // Flat line with slight wander
          y = baseline + Math.sin(timeMs * 0.001) * 2;
        } else {
          // SVT or SINUS waveform
          const qrsStart = 0.1;
          const qrsEnd = 0.2;
          const tStart = 0.25;
          const tEnd = 0.45;

          if (cycleProgress >= qrsStart && cycleProgress < qrsEnd) {
            // QRS complex
            const qrsProgress = (cycleProgress - qrsStart) / (qrsEnd - qrsStart);

            if (qrsProgress < 0.2) {
              // Q wave (small dip)
              y = baseline + 5;
            } else if (qrsProgress < 0.5) {
              // R wave (tall spike up)
              const rProgress = (qrsProgress - 0.2) / 0.3;
              y = baseline - 40 * Math.sin(rProgress * Math.PI);
            } else if (qrsProgress < 0.8) {
              // S wave (dip down)
              const sProgress = (qrsProgress - 0.5) / 0.3;
              y = baseline + 15 * Math.sin(sProgress * Math.PI);
            } else {
              y = baseline;
            }

            // Track R-wave peak for sync marker
            if (qrsProgress > 0.3 && qrsProgress < 0.5) {
              const rX = x;
              if (syncMarkerPositions.length === 0 || x - syncMarkerPositions[syncMarkerPositions.length - 1] > 20) {
                syncMarkerPositions.push(rX);
              }
            }
          } else if (cycleProgress >= tStart && cycleProgress < tEnd) {
            // T wave
            const tProgress = (cycleProgress - tStart) / (tEnd - tStart);
            y = baseline - 12 * Math.sin(tProgress * Math.PI);
          } else if (rhythm === 'SINUS' && cycleProgress < qrsStart * 0.8) {
            // P wave (only in sinus)
            const pProgress = cycleProgress / (qrsStart * 0.8);
            y = baseline - 5 * Math.sin(pProgress * Math.PI);
          }
        }

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw sync markers if enabled
      if (syncMode && rhythm !== 'ASYSTOLE') {
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 12px sans-serif';

        for (const markerX of syncMarkerPositions) {
          // Draw triangle marker
          ctx.beginPath();
          ctx.moveTo(markerX, height - 5);
          ctx.lineTo(markerX - 5, height - 15);
          ctx.lineTo(markerX + 5, height - 15);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Animate
      offsetRef.current += 2;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [rhythm, vitals.hr, syncMode]);

  // Get status bar color
  const getStatusColor = () => {
    switch (deviceState) {
      case 'READY':
        return 'bg-red-600 animate-pulse';
      case 'CHARGING':
        return 'bg-yellow-600';
      case 'SHOCK_ADVISED':
        return 'bg-green-600';
      case 'ANALYZING':
        return 'bg-blue-600';
      default:
        return 'bg-slate-700';
    }
  };

  return (
    <div className="bg-black rounded-lg overflow-hidden border-2 border-slate-600">
      {/* ECG Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={700}
          height={120}
          className="w-full"
        />

        {/* Lead label */}
        <div className="absolute top-2 left-2 text-green-500 text-sm font-mono">
          Lead II
        </div>

        {/* Sync indicator */}
        {syncMode && (
          <div className="absolute top-2 right-2 bg-orange-600 px-2 py-0.5 rounded text-white text-xs font-bold">
            SYNC
          </div>
        )}
      </div>

      {/* Vitals Row */}
      <div className="bg-slate-900 px-4 py-2 flex justify-between items-center border-t border-slate-700">
        <div className="flex gap-6">
          <div className="text-green-400">
            <span className="text-xs text-slate-500">HR</span>
            <span className="text-2xl font-mono font-bold ml-2">{vitals.hr}</span>
            <span className="text-sm ml-1">bpm</span>
          </div>
          <div className="text-cyan-400">
            <span className="text-xs text-slate-500">SpO2</span>
            <span className="text-2xl font-mono font-bold ml-2">{vitals.spo2}</span>
            <span className="text-sm ml-1">%</span>
          </div>
          <div className="text-white">
            <span className="text-xs text-slate-500">BP</span>
            <span className="text-lg font-mono ml-2">{vitals.systolic}/{vitals.diastolic}</span>
          </div>
        </div>

        {/* Rhythm label */}
        <div className={`px-3 py-1 rounded font-bold text-sm ${
          rhythm === 'SVT' ? 'bg-red-600 text-white' :
          rhythm === 'SINUS' ? 'bg-green-600 text-white' :
          'bg-slate-600 text-white'
        }`}>
          {rhythm === 'SVT' ? 'SVT' : rhythm === 'SINUS' ? 'SINUS' : 'ASYSTOLE'}
        </div>
      </div>

      {/* Status Bar */}
      <div className={`${getStatusColor()} px-4 py-2 text-center text-white font-bold text-lg transition-colors`}>
        {displayText}
      </div>
    </div>
  );
}
