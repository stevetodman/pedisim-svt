// ============================================================================
// PEDISIM SVT - Main Application
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useSimulation, type VagalTechnique } from './hooks/useSimulation';
import { useDebrief } from './hooks/useDebrief';
import { formatDoseAccuracy, getNurseCatchDescription } from './kernel/nurse';
import { DebriefView, LoadingState, QuickSummary } from './components/debrief';
import { ECGViewer } from './components/ecg-viewer';
import { DefibrillatorPanel } from './components/defibrillator';
import { checkAIMode } from './api/aiConfig';

// ============================================================================
// ECG TRACE COMPONENT
// ============================================================================

interface ECGTraceProps {
  heartRate: number;
  rhythm: string;
  width?: number;
  height?: number;
}

const ECGTrace: React.FC<ECGTraceProps> = ({ heartRate, rhythm, width = 280, height = 80 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const baseline = height / 2;
      const isAsystole = rhythm === 'ASYSTOLE';
      const isSVT = rhythm === 'SVT';

      frameRef.current += isAsystole ? 0 : (heartRate / 60) * 1.5;

      ctx.beginPath();
      ctx.strokeStyle = isAsystole ? '#ef4444' : isSVT ? '#f59e0b' : '#22c55e';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';

      const cycleLength = isSVT ? 30 : 50;

      for (let x = 0; x < width; x++) {
        const phase = (x + frameRef.current) % cycleLength;
        let y = baseline + (Math.random() - 0.5) * 1;

        if (isAsystole) {
          y = baseline + (Math.random() - 0.5) * 1.5;
        } else if (isSVT) {
          if (phase >= 12 && phase < 12.3) y += 3;
          if (phase >= 12.3 && phase < 13) y -= 35;
          if (phase >= 13 && phase < 13.7) y += 20;
          if (phase >= 13.7 && phase < 14.5) y += 6 * Math.sin((phase - 13.7) / 0.8 * Math.PI);
          if (phase > 16 && phase < 22) y -= 8 * Math.sin((phase - 16) / 6 * Math.PI);
        } else {
          if (phase > 5 && phase < 12) y -= 6 * Math.sin((phase - 5) / 7 * Math.PI);
          if (phase >= 18 && phase < 19) y += 5;
          if (phase >= 19 && phase < 21) y -= 40;
          if (phase >= 21 && phase < 23) y += 25;
          if (phase > 28 && phase < 38) y -= 10 * Math.sin((phase - 28) / 10 * Math.PI);
        }

        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [heartRate, rhythm, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="rounded-lg" />;
};

// ============================================================================
// VITALS MONITOR COMPONENT
// ============================================================================

interface VitalsMonitorProps {
  vitals: { hr: number; spo2: number; bp: string; rr: number };
  rhythm: string;
  phase: string;
}

const VitalsMonitor: React.FC<VitalsMonitorProps> = ({ vitals, rhythm, phase }) => {
  const isAsystole = rhythm === 'ASYSTOLE' || phase === 'ASYSTOLE';
  const isCritical = vitals.hr > 180 || isAsystole;
  const displayHR = isAsystole ? 0 : vitals.hr;

  // Determine vital sign status colors
  const getSpo2Color = () => {
    if (isAsystole) return 'text-red-500';
    if (vitals.spo2 >= 95) return 'text-cyan-400';
    if (vitals.spo2 >= 90) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBPColor = () => {
    if (isAsystole) return 'text-red-500';
    const systolic = parseInt(vitals.bp.split('/')[0]) || 0;
    if (systolic >= 90) return 'text-green-400';
    if (systolic >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRRColor = () => {
    if (isAsystole) return 'text-red-500';
    if (vitals.rr <= 30) return 'text-blue-400';
    if (vitals.rr <= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`bg-black rounded-xl p-3 border-2 ${isAsystole ? 'border-red-600 animate-pulse' : isCritical ? 'border-red-500' : 'border-slate-800'}`}>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] font-bold text-slate-500">II</span>
        <span className={`text-[10px] font-bold ${isAsystole ? 'text-red-500' : rhythm === 'SVT' ? 'text-amber-500' : 'text-green-500'}`}>
          {isAsystole ? 'ASYSTOLE' : rhythm}
        </span>
      </div>
      <ECGTrace heartRate={displayHR} rhythm={isAsystole ? 'ASYSTOLE' : rhythm} />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <div className={`text-2xl font-mono font-black ${isAsystole ? 'text-red-500' : isCritical ? 'text-red-400' : 'text-green-400'}`}>
            {isAsystole ? '---' : displayHR}
          </div>
          <div className="text-[10px] text-slate-600">HR</div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-mono font-black ${getSpo2Color()}`}>
            {isAsystole ? '--' : vitals.spo2}
          </div>
          <div className="text-[10px] text-cyan-600">SpO2</div>
        </div>
        <div>
          <div className={`text-lg font-mono font-bold ${getBPColor()}`}>
            {vitals.bp}
          </div>
          <div className="text-[10px] text-slate-600">BP</div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-mono font-bold ${getRRColor()}`}>
            {isAsystole ? '--' : vitals.rr}
          </div>
          <div className="text-[10px] text-blue-600">RR</div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DEBRIEF PANEL
// ============================================================================

interface DebriefPanelProps {
  data: {
    outcome: string;
    timeToConversion: number | null;
    totalTime: number;
    actions: any[];
    nurseCatches: any[];
    communications: { toFamily: number; duringCrisis: number; explanations: number };
    protocolScore: number;
  };
  onClose: () => void;
  onRestart: () => void;
}

const DebriefPanel: React.FC<DebriefPanelProps> = ({ data, onClose, onRestart }) => {
  const { outcome, timeToConversion, totalTime, actions, nurseCatches, communications, protocolScore } = data;

  const formatTime = (ms: number | null) => {
    if (!ms) return '--:--';
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const getGrade = (score: number) => {
    if (score >= 90) return { letter: 'A', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (score >= 80) return { letter: 'B', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (score >= 70) return { letter: 'C', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (score >= 60) return { letter: 'D', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    return { letter: 'F', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  const grade = getGrade(protocolScore);
  const executedActions = actions.filter(a => a.executed);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-start justify-center z-50 p-2 overflow-y-auto">
      <div className="bg-slate-900 rounded-xl border border-white/10 w-full max-w-md my-4">
        {/* Header */}
        <div className={`p-4 border-b border-white/10 ${outcome === 'success' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">
                {outcome === 'success' ? '✓ Converted' : '✗ Incomplete'}
              </h2>
              <p className="text-slate-400 text-xs">
                {outcome === 'success' ? `Time: ${formatTime(timeToConversion)}` : 'Review below'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg ${grade.bg} flex items-center justify-center`}>
              <span className={`text-2xl font-black ${grade.color}`}>{grade.letter}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Timing */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase mb-2">Timing</h3>
            <div className="flex gap-4">
              <div>
                <div className="text-xl font-mono font-black text-amber-400">{formatTime(totalTime)}</div>
                <div className="text-[10px] text-slate-500">Total</div>
              </div>
              {timeToConversion && (
                <div>
                  <div className={`text-xl font-mono font-black ${timeToConversion < 180000 ? 'text-green-400' : timeToConversion < 300000 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {formatTime(timeToConversion)}
                  </div>
                  <div className="text-[10px] text-slate-500">To convert</div>
                </div>
              )}
            </div>
          </div>

          {/* Nurse Catches */}
          {nurseCatches.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <h3 className="text-[10px] font-black text-red-400 uppercase mb-2">
                ⚠️ Errors Caught ({nurseCatches.length})
              </h3>
              <div className="space-y-2">
                {nurseCatches.map((c: any, i: number) => (
                  <div key={i} className="text-xs">
                    <div className="text-red-300 font-bold">{c.drug}: {c.attempted}{c.unit}</div>
                    <div className="text-red-400/70">{getNurseCatchDescription(c.reason)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interventions */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase mb-2">Interventions</h3>
            {executedActions.length === 0 ? (
              <div className="text-xs text-slate-600">No interventions</div>
            ) : (
              <div className="space-y-1">
                {executedActions.map((action: any, i: number) => {
                  const accuracy = action.given !== undefined && action.correct !== undefined
                    ? formatDoseAccuracy(action.given, action.correct)
                    : null;
                  return (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-600 font-mono w-10">{formatTime(action.time)}</span>
                        <span className={`text-xs font-bold ${
                          action.type === 'vagal' ? 'text-cyan-400' :
                          action.type === 'adenosine' ? 'text-amber-400' :
                          action.type === 'cardioversion' ? 'text-red-400' : 'text-purple-400'
                        }`}>
                          {action.type}
                          {action.given !== undefined && ` ${action.given}${action.unit}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {accuracy && <span className={`text-[10px] ${accuracy.color}`}>{accuracy.text}</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          action.result === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>{action.result}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Communication */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase mb-2">Communication</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-black text-green-400">{communications.toFamily}</div>
                <div className="text-[10px] text-slate-500">To Family</div>
              </div>
              <div>
                <div className="text-lg font-black text-blue-400">{communications.duringCrisis}</div>
                <div className="text-[10px] text-slate-500">In Crisis</div>
              </div>
              <div>
                <div className="text-lg font-black text-purple-400">{communications.explanations}</div>
                <div className="text-[10px] text-slate-500">Explained</div>
              </div>
            </div>
          </div>

          {/* Protocol */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase mb-2">PALS Protocol</h3>
            <div className="space-y-1">
              {[
                { step: 'Vagal attempted', done: executedActions.some(a => a.type === 'vagal') },
                { step: 'Adenosine 1st dose', done: executedActions.some(a => a.type === 'adenosine' && a.attemptNum === 1) },
                { step: 'Sedation before cardiovert', done: !executedActions.some(a => a.type === 'cardioversion') || executedActions.some(a => a.type === 'sedation') },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                    item.done ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>{item.done ? '✓' : '✗'}</span>
                  <span className={item.done ? 'text-slate-300' : 'text-slate-500'}>{item.step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Takeaways */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <h3 className="text-[10px] font-black text-blue-400 uppercase mb-1">Key Takeaways</h3>
            <ul className="text-xs text-blue-200/80 space-y-0.5">
              {outcome === 'success' && timeToConversion && timeToConversion < 180000 && <li>✓ Fast response</li>}
              {nurseCatches.length > 0 && <li>→ Review: nurse caught {nurseCatches.length} error{nurseCatches.length > 1 ? 's' : ''}</li>}
              {communications.toFamily === 0 && <li>→ Communicate with anxious families</li>}
              {communications.duringCrisis === 0 && outcome === 'success' && <li>→ Reassure during scary moments</li>}
              {!executedActions.some(a => a.type === 'vagal') && <li>→ Consider vagal first for stable SVT</li>}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex gap-2">
          <button onClick={onRestart} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded-lg font-bold text-sm">Again</button>
          <button onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg font-bold text-sm">Close</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  const sim = useSimulation();
  const debrief = useDebrief();
  const [showDebrief, setShowDebrief] = useState(false);
  const [showFullDebrief, setShowFullDebrief] = useState(false);
  const [useEnhancedDebrief] = useState(true);
  const [adenosineDose, setAdenosineDose] = useState('1.85');
  const [showAdenosineInput, setShowAdenosineInput] = useState(false);
  const [showVagalOptions, setShowVagalOptions] = useState(false);
  const [doctorInput, setDoctorInput] = useState('');
  const [aiModeEnabled, setAiModeEnabled] = useState<boolean | null>(null);
  const [showECG, setShowECG] = useState(false);
  const [showDefib, setShowDefib] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Check AI mode on mount
  useEffect(() => {
    checkAIMode().then(setAiModeEnabled);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sim.messages]);

  // Auto-generate debrief when converted
  useEffect(() => {
    if (sim.phase === 'CONVERTED' && !showDebrief && !debrief.isReady) {
      // Generate debrief after a short delay
      const timer = setTimeout(() => {
        if (useEnhancedDebrief) {
          const input = sim.getEvaluationInput();
          debrief.generateDebrief(input);
        }
        setShowDebrief(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [sim.phase, showDebrief, debrief.isReady, useEnhancedDebrief, sim, debrief]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !sim.isGenerating) {
      sim.speak(doctorInput);
      setDoctorInput('');
    }
  };

  const handleSay = () => {
    sim.speak(doctorInput);
    setDoctorInput('');
  };

  const handleAdenosine = () => {
    sim.giveAdenosine(parseFloat(adenosineDose));
    setShowAdenosineInput(false);
  };

  const isRunning = sim.phase === 'RUNNING';
  const canSpeak = sim.phase === 'RUNNING' || sim.phase === 'CONVERTED';

  const colors: Record<string, { bg: string; border: string; label: string }> = {
    lily: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', label: 'text-pink-400' },
    mark: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'text-amber-400' },
    nurse: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'text-blue-400' },
    doctor: { bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'text-green-400' },
    system: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', label: 'text-slate-400' },
  };
  const labels: Record<string, string> = { lily: '👧 Lily', mark: '👨 Dad', nurse: '👩‍⚕️ Nurse', doctor: '🩺 You', system: '📢' };

  const getDebriefData = () => ({
    outcome: sim.phase === 'CONVERTED' ? 'success' : 'incomplete',
    timeToConversion: sim.timeToConversion,
    totalTime: sim.elapsed,
    actions: sim.actionLog,
    nurseCatches: sim.nurseCatches,
    communications: sim.commLog,
    protocolScore: sim.protocolScore,
  });

  const handleCloseDebrief = () => {
    setShowDebrief(false);
    setShowFullDebrief(false);
    debrief.clearDebrief();
  };

  const handleRestart = () => {
    setShowDebrief(false);
    setShowFullDebrief(false);
    debrief.clearDebrief();
    sim.start();
  };

  const handleViewFullDebrief = () => {
    setShowFullDebrief(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-2">
      {/* Loading State */}
      {showDebrief && useEnhancedDebrief && debrief.isLoading && (
        <LoadingState message="Analyzing your performance..." />
      )}

      {/* Quick Summary (shown first, before full debrief) */}
      {showDebrief && useEnhancedDebrief && debrief.isReady && !showFullDebrief && debrief.evaluation && (
        <QuickSummary
          evaluation={debrief.evaluation}
          onViewFull={handleViewFullDebrief}
          onReplay={handleRestart}
        />
      )}

      {/* Full Enhanced Debrief View */}
      {showDebrief && useEnhancedDebrief && showFullDebrief && debrief.evaluation && debrief.narratives && (
        <DebriefView
          evaluation={debrief.evaluation}
          narratives={debrief.narratives}
          dialogueHooks={debrief.dialogueHooks}
          onClose={handleCloseDebrief}
          onReplay={handleRestart}
        />
      )}

      {/* Fallback to simple debrief if enhanced disabled */}
      {showDebrief && !useEnhancedDebrief && (
        <DebriefPanel
          data={getDebriefData()}
          onClose={handleCloseDebrief}
          onRestart={handleRestart}
        />
      )}

      {/* ECG Viewer Modal */}
      {showECG && (
        <ECGViewer
          patient={{
            name: sim.patient.name,
            age: sim.patient.age,
            weight: sim.patient.weight,
          }}
          rhythm={sim.wpwRevealed && sim.rhythm === 'SINUS' ? 'WPW_SINUS' : sim.rhythm}
          heartRate={sim.rhythm === 'SVT' ? 220 : sim.rhythm === 'ASYSTOLE' ? 0 : 90}
          onClose={() => setShowECG(false)}
        />
      )}

      {/* Defibrillator Panel */}
      {showDefib && (() => {
        // Parse BP string to get systolic/diastolic
        const bpParts = sim.vitals.bp.split('/');
        const systolic = parseInt(bpParts[0]) || 92;
        const diastolic = parseInt(bpParts[1]) || 64;

        return (
          <DefibrillatorPanel
            patient={{
              name: sim.patient.name,
              age: `${sim.patient.age}yo`,
              weight: sim.patient.weight,
            }}
            rhythm={sim.rhythm}
            vitals={{
              hr: sim.vitals.hr,
              spo2: sim.vitals.spo2,
              systolic,
              diastolic,
            }}
            sedated={sim.sedated}
            getSimulationTime={() => sim.elapsed}
            onShockDelivered={(energy, _syncMode) => {
              // Use the existing cardiovert function with fromDefibPanel=true
              // This skips duplicate audio/timing since defib panel handled it
              sim.cardiovert(energy, true);
              // Close defibrillator panel after outcome displays
              setTimeout(() => {
                setShowDefib(false);
              }, 1500);
            }}
            onClose={() => setShowDefib(false)}
            onNurseMessage={(_message) => {
              // Nurse messages are handled by useSimulation internally
              // This is just for additional feedback if needed
            }}
          />
        );
      })()}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">❤️</span>
          <span className="font-black">PediSim <span className="text-red-500">SVT</span></span>
          {aiModeEnabled !== null && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
              aiModeEnabled ? 'bg-purple-900/50 text-purple-400' : 'bg-slate-800 text-slate-500'
            }`}>
              {aiModeEnabled ? 'AI' : 'SCRIPTED'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {sim.phase !== 'IDLE' && (
            <span className="text-sm font-mono font-black text-amber-400 bg-black/50 px-2 py-1 rounded">
              {formatTime(sim.elapsed)}
            </span>
          )}
          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
            sim.phase === 'RUNNING' ? 'bg-green-900 text-green-400' :
            sim.phase === 'ASYSTOLE' ? 'bg-red-900 text-red-400 animate-pulse' :
            sim.phase === 'CONVERTED' ? 'bg-blue-900 text-blue-400' : 'bg-slate-800 text-slate-400'
          }`}>{sim.phase}</span>
          {sim.phase === 'IDLE' ? (
            <button onClick={sim.start} className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded font-bold text-sm">
              Start
            </button>
          ) : (
            <>
              {sim.phase === 'CONVERTED' && (
                <button
                  onClick={() => {
                    if (useEnhancedDebrief && !debrief.isReady) {
                      const input = sim.getEvaluationInput();
                      debrief.generateDebrief(input);
                    }
                    setShowDebrief(true);
                  }}
                  className="bg-green-600 px-2 py-1 rounded font-bold text-xs"
                >
                  {debrief.isLoading ? '...' : 'Debrief'}
                </button>
              )}
              <button onClick={sim.reset} className="bg-slate-700 px-2 py-1 rounded font-bold text-xs">
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pending confirmation */}
      {sim.pendingAction && (
        <div className="mb-2 p-2 bg-amber-900/30 border border-amber-500/50 rounded text-center text-amber-400 text-xs">
          ⚠️ "yes" to confirm, "no" to cancel
        </div>
      )}

      <div className="grid grid-cols-12 gap-2">
        {/* Left - Patient & Actions */}
        <div className="col-span-3 space-y-2">
          <div className="bg-slate-900 rounded-lg p-2 border border-white/5 text-center">
            <span className="text-xl">👧</span>
            <div className="font-bold text-sm">{sim.patient.name}</div>
            <div className="text-[10px] text-slate-500">{sim.patient.age}yo • {sim.patient.weight}kg</div>
            {sim.phase === 'RUNNING' && sim.rhythm === 'SVT' && (
              <div className={`text-[9px] mt-1 px-1.5 py-0.5 rounded font-bold ${
                sim.deteriorationStage === 'compensated' ? 'bg-green-900/50 text-green-400' :
                sim.deteriorationStage === 'early_stress' ? 'bg-yellow-900/50 text-yellow-400' :
                sim.deteriorationStage === 'moderate_stress' ? 'bg-orange-900/50 text-orange-400' :
                sim.deteriorationStage === 'decompensating' ? 'bg-red-900/50 text-red-400' :
                'bg-red-900 text-red-300 animate-pulse'
              }`}>
                {sim.deteriorationStage === 'compensated' ? 'COMPENSATED' :
                 sim.deteriorationStage === 'early_stress' ? 'EARLY STRESS' :
                 sim.deteriorationStage === 'moderate_stress' ? 'MODERATE STRESS' :
                 sim.deteriorationStage === 'decompensating' ? 'DECOMPENSATING' :
                 'CRITICAL'}
              </div>
            )}
          </div>

          <div className="bg-slate-900 rounded-lg p-2 border border-white/5 space-y-1">
            <button
              onClick={sim.establishIV}
              disabled={!isRunning || sim.ivAccess}
              className="w-full p-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 disabled:opacity-30 text-[10px] font-bold text-emerald-400"
            >
              Establish IV {sim.ivAccess && '✓'}
            </button>

            <button
              onClick={() => setShowVagalOptions(!showVagalOptions)}
              disabled={!isRunning}
              className="w-full p-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 disabled:opacity-30 text-[10px] font-bold text-cyan-400"
            >
              Vagal {showVagalOptions ? '▲' : '▼'}
            </button>
            {showVagalOptions && (
              <div className="space-y-1 p-2 bg-slate-800/80 rounded border border-cyan-500/30">
                <p className="text-[8px] text-cyan-300/70 mb-1">Select technique for 5yo:</p>
                {([
                  { id: 'valsalva', label: 'Modified Valsalva', desc: 'Blow through straw', rec: true, warn: false },
                  { id: 'blow_thumb', label: 'Blow on Thumb', desc: 'Like inflating balloon', rec: false, warn: false },
                  { id: 'bearing_down', label: 'Bearing Down', desc: '"Push like potty"', rec: false, warn: false },
                  { id: 'gag', label: 'Gag Reflex', desc: '⚠️ Not recommended', rec: false, warn: true },
                ] as const).map(({ id, label, desc, rec, warn }) => (
                  <button
                    key={id}
                    onClick={() => {
                      sim.doVagal(id as VagalTechnique);
                      setShowVagalOptions(false);
                    }}
                    className={`w-full p-1.5 rounded text-left text-[9px] ${
                      warn
                        ? 'bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300'
                        : rec
                          ? 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300'
                          : 'bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 text-slate-300'
                    }`}
                  >
                    <span className="font-bold">{label}</span>
                    {rec && <span className="ml-1 text-[7px] text-cyan-400">★ RECOMMENDED</span>}
                    <br />
                    <span className="text-[8px] opacity-70">{desc}</span>
                  </button>
                ))}
                <div className="mt-2 p-1.5 bg-red-900/30 rounded border border-red-500/30">
                  <p className="text-[8px] text-red-300">
                    <span className="font-bold">⛔ Carotid Massage:</span> Contraindicated in pediatrics
                  </p>
                </div>
                <div className="p-1.5 bg-amber-900/20 rounded border border-amber-500/20">
                  <p className="text-[8px] text-amber-300/80">
                    <span className="font-bold">Note:</span> Ice to face not recommended &gt;2 years old
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowAdenosineInput(!showAdenosineInput)}
              disabled={!isRunning}
              className="w-full p-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 disabled:opacity-30 text-[10px] font-bold text-amber-400"
            >
              Adenosine {sim.adenosineCount > 0 && `(${sim.adenosineCount})`}
            </button>
            {showAdenosineInput && (
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.1"
                  value={adenosineDose}
                  onChange={(e) => setAdenosineDose(e.target.value)}
                  className="flex-1 bg-black border border-amber-500/50 rounded px-2 py-1 text-amber-300 font-mono text-[10px] w-full"
                />
                <button onClick={handleAdenosine} className="bg-amber-600 px-2 py-1 rounded text-[10px] font-bold">GO</button>
              </div>
            )}

            <button
              onClick={sim.sedate}
              disabled={!isRunning || sim.sedated || sim.sedationState !== 'NONE'}
              className="w-full p-1.5 rounded bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 disabled:opacity-30 text-[10px] font-bold text-purple-400"
            >
              {sim.sedated ? 'Sedated ✓' :
               sim.sedationState === 'DRAWING' ? 'Drawing...' :
               sim.sedationState === 'ADMINISTERING' ? 'Pushing...' :
               sim.sedationState === 'ONSET' ? 'Onset (~45s)...' :
               sim.sedationState === 'ORDERED' ? 'Ordered...' :
               'Sedate'}
            </button>

            <button
              onClick={() => setShowDefib(true)}
              disabled={!isRunning}
              className="w-full p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 disabled:opacity-30 text-[10px] font-bold text-red-400"
            >
              ⚡ Cardiovert
            </button>

            <div className="border-t border-white/10 my-1" />

            <button
              onClick={() => setShowECG(true)}
              disabled={sim.phase === 'IDLE'}
              className="w-full p-1.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 disabled:opacity-30 text-[10px] font-bold text-indigo-400"
            >
              📊 Get 15-Lead ECG
            </button>

            {/* Follow-up ECG button - only after conversion */}
            {sim.phase === 'CONVERTED' && !sim.wpwRevealed && (
              <button
                onClick={() => {
                  sim.orderFollowUpECG();
                  setShowECG(true);
                }}
                className="w-full p-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold text-amber-400 mt-1 animate-pulse"
              >
                📋 Get Follow-up ECG
              </button>
            )}
          </div>

          <div className="bg-slate-800/50 rounded-lg p-2 text-xs text-slate-600">
            <div className="font-bold text-slate-500 mb-1">Reference</div>
            <div>Aden 1st: <span className="text-amber-400">1.85mg</span></div>
            <div>Aden 2nd: <span className="text-amber-400">3.7mg</span></div>
            <div>Cardio: <span className="text-red-400">9-37J</span></div>
          </div>
        </div>

        {/* Center - Dialogue */}
        <div className="col-span-6">
          <div className="bg-slate-900 rounded-xl border border-white/5 flex flex-col h-[460px]">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1">
              {sim.messages.map((msg, i) => {
                const c = colors[msg.who] || colors.system;
                const isRight = msg.who === 'doctor' || msg.who === 'nurse';
                return (
                  <div key={i} className={isRight ? 'flex justify-end' : ''}>
                    <div className={`max-w-[85%] rounded-lg px-2 py-1 ${c.bg} ${c.border} border`}>
                      <span className={`text-[10px] font-bold ${c.label}`}>{labels[msg.who]} </span>
                      <span className="text-xs text-slate-200">{msg.text}</span>
                    </div>
                  </div>
                );
              })}
              {sim.isGenerating && <div className="text-center text-slate-500 text-[10px] animate-pulse">...</div>}
            </div>

            <div className="p-2 border-t border-white/5 flex gap-1">
              <input
                type="text"
                value={doctorInput}
                onChange={(e) => setDoctorInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={canSpeak ? "Talk to family..." : "Start sim..."}
                disabled={!canSpeak || sim.isGenerating}
                className={`flex-1 bg-black/40 border rounded px-2 py-1 text-xs disabled:opacity-50 ${
                  sim.pendingAction ? 'border-amber-500/50' : 'border-white/10'
                }`}
              />
              <button
                onClick={handleSay}
                disabled={!canSpeak || !doctorInput.trim() || sim.isGenerating}
                className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 px-3 py-1 rounded text-xs font-bold disabled:opacity-50"
              >
                Say
              </button>
            </div>
          </div>
        </div>

        {/* Right - Vitals */}
        <div className="col-span-3">
          <VitalsMonitor vitals={sim.vitals} rhythm={sim.rhythm} phase={sim.phase} />
        </div>
      </div>
    </div>
  );
}
