/**
 * ECGViewer - Main MUSE-style 15-lead ECG viewer modal
 * Implements "Measure to Learn" mode - user must measure intervals
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Rhythm,
  ECGConfig,
  DEFAULT_ECG_CONFIG,
  CaliperState,
  INITIAL_CALIPER_STATE,
  Measurement,
} from '../../kernel/ecg/types';
import {
  calculateMeasurements,
  generateInterpretation,
  rrToHeartRate,
} from '../../kernel/ecg/measurements';
import { generateAllLeadsWaveform, pixelsToMs } from '../../kernel/ecg/waveform';
import { LeadGrid } from './LeadGrid';
import { Controls } from './Controls';
import { Calipers } from './Calipers';

interface ECGViewerProps {
  patient: {
    name: string;
    age: number;
    weight: number;
  };
  rhythm: Rhythm;
  heartRate: number;
  onClose: () => void;
}

// Track which measurements have been revealed
interface RevealedMeasurements {
  hr: boolean;
  pr: boolean;
  qrs: boolean;
  qt: boolean;
}

export function ECGViewer({ patient, rhythm, heartRate, onClose }: ECGViewerProps) {
  // ECG configuration state
  const [gain, setGain] = useState<5 | 10 | 20>(10);
  const [speed, setSpeed] = useState<25 | 50>(25);

  // Caliper state
  const [caliperState, setCaliperState] = useState<CaliperState>(INITIAL_CALIPER_STATE);

  // Measure to Learn state - track what user has measured
  const [revealed, setRevealed] = useState<RevealedMeasurements>({
    hr: false,
    pr: false,
    qrs: false,
    qt: false,
  });

  // User's measured values
  const [userMeasuredHR, setUserMeasuredHR] = useState<number | null>(null);
  const [measurementFeedback, setMeasurementFeedback] = useState<string | null>(null);

  // Generate waveform data (memoized to avoid regeneration)
  const config: ECGConfig = useMemo(() => ({
    ...DEFAULT_ECG_CONFIG,
    gain,
    speed,
  }), [gain, speed]);

  const waveformData = useMemo(() => {
    return generateAllLeadsWaveform(rhythm, heartRate, config);
  }, [rhythm, heartRate, config]);

  // Calculate actual measurements (hidden until revealed)
  const measurements = useMemo(() => {
    return calculateMeasurements(rhythm, heartRate);
  }, [rhythm, heartRate]);

  // Generate interpretation
  const interpretation = useMemo(() => {
    return generateInterpretation(rhythm, heartRate, measurements);
  }, [rhythm, heartRate, measurements]);

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'escape':
          if (caliperState.mode !== 'inactive') {
            setCaliperState(INITIAL_CALIPER_STATE);
          } else {
            onClose();
          }
          break;
        case 'c':
          setCaliperState(prev => ({
            ...prev,
            mode: prev.mode === 'inactive' ? 'placing' : 'inactive',
            startX: null,
            endX: null,
          }));
          break;
        case 'm':
          if (caliperState.measurements.length > 0) {
            const lastMeasurement = caliperState.measurements[caliperState.measurements.length - 1];
            setCaliperState(prev => ({
              ...prev,
              mode: prev.mode === 'marching' ? 'inactive' : 'marching',
              marchInterval: lastMeasurement.intervalMs,
            }));
          }
          break;
        case 'g':
          setGain(prev => prev === 5 ? 10 : prev === 10 ? 20 : 5);
          break;
        case 's':
          setSpeed(prev => prev === 25 ? 50 : 25);
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [caliperState, onClose]);

  // Check if a measurement corresponds to R-R interval
  const checkMeasurement = useCallback((intervalMs: number) => {
    const actualRR = measurements.rrInterval;
    const tolerance = 30; // ms tolerance

    // Check if this is an R-R interval measurement
    if (Math.abs(intervalMs - actualRR) <= tolerance) {
      const userHR = rrToHeartRate(intervalMs);
      setUserMeasuredHR(userHR);
      setRevealed(prev => ({ ...prev, hr: true }));

      const diff = Math.abs(userHR - heartRate);
      if (diff <= 5) {
        setMeasurementFeedback(`✓ Correct! Rate: ${userHR} bpm`);
      } else {
        setMeasurementFeedback(`Rate from your R-R: ${userHR} bpm (actual: ${heartRate} bpm)`);
      }
      return;
    }

    // Check if this could be QRS duration (typically 60-120ms)
    if (intervalMs >= 40 && intervalMs <= 150) {
      setRevealed(prev => ({ ...prev, qrs: true }));
      const actualQRS = measurements.qrsDuration;
      const diff = Math.abs(intervalMs - actualQRS);
      if (diff <= 10) {
        setMeasurementFeedback(`✓ QRS: ${intervalMs}ms (actual: ${actualQRS}ms)`);
      } else {
        setMeasurementFeedback(`QRS measurement: ${intervalMs}ms (actual: ${actualQRS}ms)`);
      }
      return;
    }

    // Check if this could be QT interval (typically 300-500ms)
    if (intervalMs >= 200 && intervalMs <= 600) {
      setRevealed(prev => ({ ...prev, qt: true }));
      const actualQT = measurements.qtInterval;
      const diff = Math.abs(intervalMs - actualQT);
      if (diff <= 20) {
        setMeasurementFeedback(`✓ QT: ${intervalMs}ms (actual: ${actualQT}ms)`);
      } else {
        setMeasurementFeedback(`QT measurement: ${intervalMs}ms (actual: ${actualQT}ms)`);
      }
      return;
    }

    // Generic measurement
    setMeasurementFeedback(`Measured: ${intervalMs}ms`);
  }, [measurements, heartRate]);

  // Handle caliper click
  const handleCaliperClick = useCallback((x: number, _containerWidth: number) => {
    if (caliperState.mode === 'inactive') return;

    if (caliperState.mode === 'placing' && caliperState.startX === null) {
      setCaliperState(prev => ({ ...prev, startX: x }));
    } else if (caliperState.mode === 'placing' && caliperState.startX !== null) {
      const startX = caliperState.startX;
      const endX = x;
      const pixelDiff = Math.abs(endX - startX);
      const intervalMs = Math.round(pixelsToMs(pixelDiff, speed));
      const calculatedHR = intervalMs > 0 ? Math.round(60000 / intervalMs) : 0;

      const newMeasurement: Measurement = {
        id: `m-${Date.now()}`,
        startX: Math.min(startX, endX),
        endX: Math.max(startX, endX),
        intervalMs,
        calculatedHR,
      };

      // Check measurement and provide feedback
      checkMeasurement(intervalMs);

      setCaliperState(prev => ({
        ...prev,
        mode: 'inactive',
        startX: null,
        endX: null,
        measurements: [...prev.measurements, newMeasurement],
      }));
    }
  }, [caliperState, speed, checkMeasurement]);

  // Handle caliper drag
  const handleCaliperDrag = useCallback((x: number) => {
    if (caliperState.mode === 'placing' && caliperState.startX !== null) {
      setCaliperState(prev => ({ ...prev, endX: x }));
    }
  }, [caliperState]);

  // Delete a measurement
  const handleDeleteMeasurement = useCallback((id: string) => {
    setCaliperState(prev => ({
      ...prev,
      measurements: prev.measurements.filter(m => m.id !== id),
    }));
  }, []);

  // Clear all measurements
  const handleClearMeasurements = useCallback(() => {
    setCaliperState(INITIAL_CALIPER_STATE);
    setRevealed({ hr: false, pr: false, qrs: false, qt: false });
    setUserMeasuredHR(null);
    setMeasurementFeedback(null);
  }, []);

  // Format date/time
  const timestamp = new Date().toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Determine what to show in header
  const displayHR = revealed.hr ? (userMeasuredHR || heartRate) : null;
  const displayQRS = revealed.qrs ? measurements.qrsDuration : null;
  const displayQT = revealed.qt ? measurements.qtInterval : null;
  const displayQTc = revealed.qt ? measurements.qtcBazett : null;

  // Show interpretation only after HR is measured
  const showInterpretation = revealed.hr;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header - Patient Info */}
        <div className="bg-slate-900 text-white px-4 py-3 text-sm font-mono">
          <div className="flex justify-between items-center">
            <div className="flex gap-6">
              <span className="font-bold text-lg">{patient.name}</span>
              <span className="text-slate-400">{patient.age} yo F</span>
              <span className="text-slate-400">{patient.weight} kg</span>
              <span className="text-slate-500">{timestamp}</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-2xl font-bold px-2"
              title="Close (Esc)"
            >
              ×
            </button>
          </div>

          {/* Measurements Row - Measure to Learn */}
          <div className="flex gap-8 mt-2 py-2 px-3 bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">HR:</span>
              {displayHR !== null ? (
                <span className="text-2xl font-bold text-green-400">{displayHR}</span>
              ) : (
                <span className="text-2xl font-bold text-amber-400 animate-pulse">---</span>
              )}
              <span className="text-slate-500 text-xs">bpm</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">R-R:</span>
              {revealed.hr ? (
                <span className="text-lg font-bold text-slate-300">{measurements.rrInterval}</span>
              ) : (
                <span className="text-lg font-bold text-amber-400">---</span>
              )}
              <span className="text-slate-500 text-xs">ms</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">QRS:</span>
              {displayQRS !== null ? (
                <span className="text-lg font-bold text-slate-300">{displayQRS}</span>
              ) : (
                <span className="text-lg font-bold text-amber-400">---</span>
              )}
              <span className="text-slate-500 text-xs">ms</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">QT/QTc:</span>
              {displayQT !== null ? (
                <span className="text-lg font-bold text-slate-300">{displayQT}/{displayQTc}</span>
              ) : (
                <span className="text-lg font-bold text-amber-400">---/---</span>
              )}
              <span className="text-slate-500 text-xs">ms</span>
            </div>

            {/* Measurement feedback */}
            {measurementFeedback && (
              <div className="ml-auto px-3 py-1 bg-blue-600 rounded text-white text-sm font-bold">
                {measurementFeedback}
              </div>
            )}
          </div>
        </div>

        {/* Interpretation Banner */}
        <div className={`px-4 py-2 text-sm font-bold ${
          !showInterpretation ? 'bg-amber-600 text-white' :
          rhythm === 'SVT' ? 'bg-red-600 text-white' :
          rhythm === 'ASYSTOLE' ? 'bg-red-900 text-white' :
          'bg-green-600 text-white'
        }`}>
          {!showInterpretation ? (
            <span>📏 MEASURE R-R INTERVAL TO DETERMINE RATE → Use calipers (press C) to measure between two R waves</span>
          ) : (
            interpretation.summary
          )}
        </div>

        {/* ECG Grid */}
        <div className="flex-1 overflow-auto bg-[#fff8f0] relative">
          <LeadGrid
            waveformData={waveformData}
            gain={gain}
            speed={speed}
            rhythm={rhythm}
            caliperMode={caliperState.mode !== 'inactive'}
            onCaliperClick={handleCaliperClick}
            onCaliperDrag={handleCaliperDrag}
          />

          {/* Caliper Overlay */}
          <Calipers
            state={caliperState}
            speed={speed}
            onDeleteMeasurement={handleDeleteMeasurement}
          />
        </div>

        {/* Controls */}
        <Controls
          gain={gain}
          speed={speed}
          caliperActive={caliperState.mode !== 'inactive'}
          marchingActive={caliperState.mode === 'marching'}
          hasMeasurements={caliperState.measurements.length > 0}
          onGainChange={setGain}
          onSpeedChange={setSpeed}
          onToggleCalipers={() => {
            setCaliperState(prev => ({
              ...prev,
              mode: prev.mode === 'inactive' ? 'placing' : 'inactive',
              startX: null,
              endX: null,
            }));
          }}
          onToggleMarching={() => {
            if (caliperState.measurements.length > 0) {
              const lastMeasurement = caliperState.measurements[caliperState.measurements.length - 1];
              setCaliperState(prev => ({
                ...prev,
                mode: prev.mode === 'marching' ? 'inactive' : 'marching',
                marchInterval: lastMeasurement.intervalMs,
              }));
            }
          }}
          onClearMeasurements={handleClearMeasurements}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

export default ECGViewer;
