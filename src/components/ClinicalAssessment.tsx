// ============================================================================
// CLINICAL ASSESSMENT COMPONENT
// Bedside physical exam findings - perfusion status
// ============================================================================
// Teaching goal: "Look at the patient, not just the monitor"

import React, { useState, useEffect } from 'react';
import type { PerfusionAssessment } from '../kernel/clinicalAssessment';
import {
  describePulseQuality,
  describeCoolTo,
  describeMottling,
  describeCapRefill,
  getPerfusionStatus,
} from '../kernel/clinicalAssessment';

interface ClinicalAssessmentProps {
  perfusion: PerfusionAssessment;
  phase: string;
}

const ClinicalAssessment: React.FC<ClinicalAssessmentProps> = ({ perfusion, phase }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = getPerfusionStatus(perfusion);

  // Auto-expand when perfusion is concerning or worse
  useEffect(() => {
    if (status.severity !== 'good') {
      setIsExpanded(true);
    }
  }, [status.severity]);

  // Don't show during IDLE
  if (phase === 'IDLE') {
    return null;
  }

  // Color schemes based on severity
  const severityColors = {
    good: {
      bg: 'bg-green-900/30',
      border: 'border-green-700/50',
      text: 'text-green-400',
      icon: '✓',
    },
    concerning: {
      bg: 'bg-yellow-900/30',
      border: 'border-yellow-700/50',
      text: 'text-yellow-400',
      icon: '⚠',
    },
    poor: {
      bg: 'bg-orange-900/30',
      border: 'border-orange-700/50',
      text: 'text-orange-400',
      icon: '⚠',
    },
    critical: {
      bg: 'bg-red-900/30',
      border: 'border-red-700/50',
      text: 'text-red-400',
      icon: '⚠',
    },
  };

  const colors = severityColors[status.severity];

  // Temperature color based on zone
  const getTempColor = (temp: 'warm' | 'cool' | 'cold') => {
    switch (temp) {
      case 'warm': return 'text-green-400';
      case 'cool': return 'text-yellow-400';
      case 'cold': return 'text-red-400';
    }
  };

  // Skin color based on assessment
  const getSkinColorDisplay = (color: 'pink' | 'pale' | 'mottled' | 'gray') => {
    switch (color) {
      case 'pink': return { text: 'Pink', color: 'text-green-400' };
      case 'pale': return { text: 'Pale', color: 'text-yellow-400' };
      case 'mottled': return { text: 'Mottled', color: 'text-orange-400' };
      case 'gray': return { text: 'Gray/Ashen', color: 'text-red-400' };
    }
  };

  const skinDisplay = getSkinColorDisplay(perfusion.skinColor);

  return (
    <div className={`mt-3 rounded-xl border ${colors.border} ${colors.bg} transition-all duration-300`}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm ${colors.text}`}>{colors.icon}</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Perfusion</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${colors.text}`}>{status.label}</span>
          <span className="text-slate-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-800/50">
          {/* Pulse Quality */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-[10px] text-slate-500 uppercase">Pulse</span>
            <span className={`text-xs font-medium ${
              perfusion.pulseQuality === 'strong' || perfusion.pulseQuality === 'normal'
                ? 'text-green-400'
                : perfusion.pulseQuality === 'weak'
                  ? 'text-yellow-400'
                  : perfusion.pulseQuality === 'thready'
                    ? 'text-orange-400'
                    : 'text-red-400'
            }`}>
              {describePulseQuality(perfusion.pulseQuality)}
            </span>
          </div>

          {/* Temperature Gradient */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500 uppercase">Temp</span>
            <span className={`text-xs font-medium ${
              perfusion.coolTo === 'normal' ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {describeCoolTo(perfusion.coolTo)}
            </span>
          </div>

          {/* Extremity temperatures (if not normal) */}
          {perfusion.coolTo !== 'normal' && (
            <div className="flex justify-between items-center pl-4">
              <div className="flex gap-3 text-[9px]">
                <span className={getTempColor(perfusion.extremityTemp.hands)}>
                  Hands: {perfusion.extremityTemp.hands}
                </span>
                <span className={getTempColor(perfusion.extremityTemp.wrists)}>
                  Wrists: {perfusion.extremityTemp.wrists}
                </span>
                <span className={getTempColor(perfusion.extremityTemp.elbows)}>
                  Elbows: {perfusion.extremityTemp.elbows}
                </span>
              </div>
            </div>
          )}

          {/* Cap Refill */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500 uppercase">Cap Refill</span>
            <span className={`text-xs font-medium ${
              perfusion.capRefill <= 2 ? 'text-green-400' :
              perfusion.capRefill <= 3 ? 'text-yellow-400' :
              perfusion.capRefill <= 4 ? 'text-orange-400' : 'text-red-400'
            }`}>
              {describeCapRefill(perfusion.capRefill)}
            </span>
          </div>

          {/* Mottling */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500 uppercase">Mottling</span>
            <span className={`text-xs font-medium ${
              perfusion.mottling === 'none' ? 'text-green-400' :
              perfusion.mottling === 'peripheral' ? 'text-yellow-400' :
              perfusion.mottling === 'central' ? 'text-orange-400' : 'text-red-400'
            }`}>
              {describeMottling(perfusion.mottling)}
            </span>
          </div>

          {/* Skin Color */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500 uppercase">Skin Color</span>
            <span className={`text-xs font-medium ${skinDisplay.color}`}>
              {skinDisplay.text}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalAssessment;
