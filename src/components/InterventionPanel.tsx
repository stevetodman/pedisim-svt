// ============================================================================
// INTERVENTION PANEL COMPONENT
// Treatment buttons with dose input
// ============================================================================

import React, { useState } from 'react';
import { PatientState } from '../kernel/types';

interface InterventionPanelProps {
  patientState: PatientState | null;
  phase: string;
  onVagal: () => void;
  onAdenosine: (dose: number) => void;
  onAdenosine2: (dose: number) => void;
  onCardiovert: (joules: number) => void;
  onSedate: () => void;
  getDoseCalculations: () => Record<string, any>;
}

const InterventionPanel: React.FC<InterventionPanelProps> = ({
  patientState,
  phase,
  onVagal,
  onAdenosine,
  onAdenosine2,
  onCardiovert,
  onSedate,
  getDoseCalculations,
}) => {
  const [showAdenosineInput, setShowAdenosineInput] = useState(false);
  const [showAdenosine2Input, setShowAdenosine2Input] = useState(false);
  const [showCardiovertInput, setShowCardiovertInput] = useState(false);
  const [adenosineDose, setAdenosineDose] = useState(1.85);
  const [adenosine2Dose, setAdenosine2Dose] = useState(3.7);
  const [cardiovertJoules, setCardiovertJoules] = useState(10);

  const isActive = phase === 'RUNNING';
  const isAsystole = phase === 'ASYSTOLE';
  const doses = getDoseCalculations();

  const handleAdenosineClick = () => {
    if (showAdenosineInput) {
      onAdenosine(adenosineDose);
      setShowAdenosineInput(false);
    } else {
      setShowAdenosineInput(true);
      setShowAdenosine2Input(false);
      setShowCardiovertInput(false);
    }
  };

  const handleAdenosine2Click = () => {
    if (showAdenosine2Input) {
      onAdenosine2(adenosine2Dose);
      setShowAdenosine2Input(false);
    } else {
      setShowAdenosine2Input(true);
      setShowAdenosineInput(false);
      setShowCardiovertInput(false);
    }
  };

  const handleCardiovertClick = () => {
    if (showCardiovertInput) {
      onCardiovert(cardiovertJoules);
      setShowCardiovertInput(false);
    } else {
      setShowCardiovertInput(true);
      setShowAdenosineInput(false);
      setShowAdenosine2Input(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-4 border border-white/5">
      <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">
        Interventions
      </h3>

      <div className="space-y-3">
        {/* Vagal Maneuver */}
        <button
          onClick={onVagal}
          disabled={!isActive || isAsystole}
          className="w-full text-left p-3 rounded-xl 
                   bg-cyan-500/5 hover:bg-cyan-500/10 
                   border border-cyan-500/20 
                   transition-all disabled:opacity-30 disabled:cursor-not-allowed
                   group"
        >
          <div className="text-[10px] font-black text-cyan-500 uppercase tracking-wider 
                        group-hover:tracking-widest transition-all">
            Vagal Maneuver
          </div>
          <div className="text-[9px] text-cyan-700 font-bold uppercase">
            Ice to face
          </div>
        </button>

        {/* Adenosine (1st dose) */}
        <div>
          <button
            onClick={handleAdenosineClick}
            disabled={!isActive || isAsystole}
            className="w-full text-left p-3 rounded-xl 
                     bg-amber-500/5 hover:bg-amber-500/10 
                     border border-amber-500/20 
                     transition-all disabled:opacity-30 disabled:cursor-not-allowed
                     group"
          >
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-wider 
                          group-hover:tracking-widest transition-all">
              Adenosine (1st)
            </div>
            <div className="text-[9px] text-amber-700 font-bold uppercase">
              0.1 mg/kg = {doses.ADENOSINE?.calculatedDose || '?'}mg
            </div>
          </button>
          
          {showAdenosineInput && (
            <div className="mt-2 p-3 bg-amber-900/20 rounded-lg border border-amber-500/30">
              <label className="text-[9px] text-amber-400 font-bold uppercase block mb-2">
                Dose (mg):
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={adenosineDose}
                  onChange={(e) => setAdenosineDose(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-black/50 border border-amber-500/30 rounded-lg 
                           px-3 py-2 text-amber-300 font-mono text-sm"
                  autoFocus
                />
                <button
                  onClick={handleAdenosineClick}
                  className="bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg 
                           font-bold text-sm transition-all"
                >
                  PUSH
                </button>
              </div>
              <div className="text-[8px] text-amber-600 mt-1">
                Correct: 0.1mg/kg × {patientState?.profile.weight || 18.5}kg = {doses.ADENOSINE?.calculatedDose}mg
              </div>
            </div>
          )}
        </div>

        {/* Adenosine (2nd dose) */}
        <div>
          <button
            onClick={handleAdenosine2Click}
            disabled={!isActive || isAsystole}
            className="w-full text-left p-3 rounded-xl 
                     bg-orange-500/5 hover:bg-orange-500/10 
                     border border-orange-500/20 
                     transition-all disabled:opacity-30 disabled:cursor-not-allowed
                     group"
          >
            <div className="text-[10px] font-black text-orange-500 uppercase tracking-wider 
                          group-hover:tracking-widest transition-all">
              Adenosine (2nd)
            </div>
            <div className="text-[9px] text-orange-700 font-bold uppercase">
              0.2 mg/kg = {doses.ADENOSINE_2?.calculatedDose || '?'}mg
            </div>
          </button>
          
          {showAdenosine2Input && (
            <div className="mt-2 p-3 bg-orange-900/20 rounded-lg border border-orange-500/30">
              <label className="text-[9px] text-orange-400 font-bold uppercase block mb-2">
                Dose (mg):
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={adenosine2Dose}
                  onChange={(e) => setAdenosine2Dose(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-black/50 border border-orange-500/30 rounded-lg 
                           px-3 py-2 text-orange-300 font-mono text-sm"
                  autoFocus
                />
                <button
                  onClick={handleAdenosine2Click}
                  className="bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded-lg 
                           font-bold text-sm transition-all"
                >
                  PUSH
                </button>
              </div>
              <div className="text-[8px] text-orange-600 mt-1">
                Correct: 0.2mg/kg × {patientState?.profile.weight || 18.5}kg = {doses.ADENOSINE_2?.calculatedDose}mg
              </div>
            </div>
          )}
        </div>

        {/* Sedation */}
        <button
          onClick={onSedate}
          disabled={!isActive || isAsystole || patientState?.sedated}
          className="w-full text-left p-3 rounded-xl 
                   bg-purple-500/5 hover:bg-purple-500/10 
                   border border-purple-500/20 
                   transition-all disabled:opacity-30 disabled:cursor-not-allowed
                   group"
        >
          <div className="text-[10px] font-black text-purple-500 uppercase tracking-wider 
                        group-hover:tracking-widest transition-all">
            Sedation
          </div>
          <div className="text-[9px] text-purple-700 font-bold uppercase">
            {patientState?.sedated ? '✓ Sedated' : 'Midazolam 0.1mg/kg'}
          </div>
        </button>

        {/* Cardioversion */}
        <div>
          <button
            onClick={handleCardiovertClick}
            disabled={!isActive || isAsystole}
            className="w-full text-left p-3 rounded-xl 
                     bg-red-500/5 hover:bg-red-500/10 
                     border border-red-500/20 
                     transition-all disabled:opacity-30 disabled:cursor-not-allowed
                     group"
          >
            <div className="text-[10px] font-black text-red-500 uppercase tracking-wider 
                          group-hover:tracking-widest transition-all">
              Sync Cardioversion
            </div>
            <div className="text-[9px] text-red-700 font-bold uppercase">
              0.5-1 J/kg = {doses.CARDIOVERSION?.calculatedDose || '?'}J
              {!patientState?.sedated && ' (requires sedation)'}
            </div>
          </button>
          
          {showCardiovertInput && (
            <div className="mt-2 p-3 bg-red-900/20 rounded-lg border border-red-500/30">
              {!patientState?.sedated ? (
                <div className="text-[10px] text-red-400 font-bold uppercase">
                  ⚠️ Patient must be sedated first
                </div>
              ) : (
                <>
                  <label className="text-[9px] text-red-400 font-bold uppercase block mb-2">
                    Energy (Joules):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="5"
                      min="5"
                      max="200"
                      value={cardiovertJoules}
                      onChange={(e) => setCardiovertJoules(parseInt(e.target.value) || 0)}
                      className="flex-1 bg-black/50 border border-red-500/30 rounded-lg 
                               px-3 py-2 text-red-300 font-mono text-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleCardiovertClick}
                      className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg 
                               font-bold text-sm transition-all"
                    >
                      SHOCK
                    </button>
                  </div>
                  <div className="text-[8px] text-red-600 mt-1">
                    Correct: 0.5-1 J/kg × {patientState?.profile.weight || 18.5}kg = {doses.CARDIOVERSION?.calculatedDose}J
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status indicators */}
      <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
        <div className="flex justify-between text-[9px] uppercase">
          <span className="text-slate-600 font-bold">IV Access</span>
          <span className={patientState?.ivAccess ? 'text-green-500' : 'text-slate-500'}>
            {patientState?.ivAccess ? '✓ Established' : 'Not established'}
          </span>
        </div>
        <div className="flex justify-between text-[9px] uppercase">
          <span className="text-slate-600 font-bold">Sedation</span>
          <span className={patientState?.sedated ? 'text-green-500' : 'text-slate-500'}>
            {patientState?.sedated ? '✓ Sedated' : 'Not sedated'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default InterventionPanel;
