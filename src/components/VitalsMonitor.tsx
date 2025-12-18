// ============================================================================
// VITALS MONITOR COMPONENT
// Hospital monitor display with ECG and vital signs
// ============================================================================

import React from 'react';
import ECGTrace from './ECGTrace';
import { PatientState } from '../kernel/types';

interface VitalsMonitorProps {
  patientState: PatientState | null;
  phase: string;
}

const VitalsMonitor: React.FC<VitalsMonitorProps> = ({ patientState, phase }) => {
  if (!patientState) {
    return (
      <div className="bg-black rounded-2xl p-6 border-2 border-slate-800">
        <div className="text-center text-slate-600 py-12">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-xs font-bold uppercase tracking-wider">Monitor Offline</p>
        </div>
      </div>
    );
  }

  const { rhythm, vitals } = patientState;
  const isAsystole = rhythm === 'ASYSTOLE' || phase === 'ASYSTOLE';
  const isSVT = rhythm === 'SVT';
  const isCritical = vitals.heartRate > 180 || isAsystole;

  const displayHR = isAsystole ? 0 : vitals.heartRate;
  const displayRhythm = isAsystole ? 'ASYSTOLE' : rhythm;

  // Border color based on state
  const borderColor = isAsystole 
    ? 'border-red-600 animate-pulse' 
    : isCritical 
      ? 'border-red-500' 
      : 'border-slate-800';

  // HR color
  const hrColor = isAsystole 
    ? 'text-red-500' 
    : isCritical 
      ? 'text-red-400' 
      : 'text-green-400';

  // Rhythm label color
  const rhythmColor = isAsystole 
    ? 'text-red-500' 
    : isSVT 
      ? 'text-amber-500' 
      : 'text-green-500';

  return (
    <div className={`bg-black rounded-2xl p-4 border-2 ${borderColor} transition-all duration-300 shadow-2xl`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isAsystole ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lead II</span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${rhythmColor}`}>
          {displayRhythm === 'SVT' ? 'SVT (Narrow Complex)' : displayRhythm}
        </span>
      </div>

      {/* ECG Trace */}
      <div className="mb-4">
        <ECGTrace 
          heartRate={displayHR} 
          rhythm={displayRhythm}
          width={320}
          height={100}
        />
      </div>

      {/* Heart Rate Display */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className={`text-5xl font-mono font-black ${hrColor} leading-none`}>
            {isAsystole ? '---' : displayHR}
          </div>
          <div className="text-[9px] text-slate-600 font-bold uppercase mt-1">BPM</div>
        </div>
        
        {/* SpO2 */}
        <div className="text-right">
          <div className="text-3xl font-mono font-black text-cyan-400 leading-none">
            {isAsystole ? '--' : vitals.spO2}
          </div>
          <div className="text-[9px] text-cyan-600 font-bold uppercase mt-1">SpO2 %</div>
        </div>
      </div>

      {/* Secondary Vitals */}
      <div className="grid grid-cols-3 gap-2">
        {/* Blood Pressure */}
        <div className="bg-slate-950 rounded-xl p-2 border border-slate-900">
          <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">BP</div>
          <div className="text-lg font-mono font-bold text-slate-200">
            {vitals.systolicBP}/{vitals.diastolicBP}
          </div>
        </div>

        {/* Respiratory Rate */}
        <div className="bg-slate-950 rounded-xl p-2 border border-slate-900">
          <div className="text-[9px] text-amber-600 font-bold uppercase mb-1">RR</div>
          <div className="text-lg font-mono font-bold text-amber-400">
            {vitals.respiratoryRate}
          </div>
        </div>

        {/* Temp */}
        <div className="bg-slate-950 rounded-xl p-2 border border-slate-900">
          <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Temp</div>
          <div className="text-lg font-mono font-bold text-slate-300">
            {vitals.temperature}°
          </div>
        </div>
      </div>

      {/* Alarm Indicator */}
      {(isCritical || isAsystole) && (
        <div className={`mt-3 py-2 px-3 rounded-lg text-center text-xs font-black uppercase tracking-wider ${
          isAsystole 
            ? 'bg-red-900/50 text-red-400 animate-pulse' 
            : 'bg-amber-900/50 text-amber-400'
        }`}>
          {isAsystole ? '⚠️ ASYSTOLE - CHECK PATIENT' : '⚠️ TACHYCARDIA ALARM'}
        </div>
      )}
    </div>
  );
};

export default VitalsMonitor;
