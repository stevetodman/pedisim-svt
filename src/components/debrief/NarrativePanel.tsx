// ============================================================================
// NARRATIVE PANEL COMPONENT
// Display character's first-person perspective of the simulation
// ============================================================================

import React, { useState } from 'react';
import { CharacterNarrative } from '../../kernel/narrative/types';

interface NarrativePanelProps {
  narrative: CharacterNarrative;
  compact?: boolean;
}

const characterStyles: Record<string, {
  bg: string;
  border: string;
  accent: string;
  avatar: string;
}> = {
  mark: {
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    accent: 'text-amber-400',
    avatar: '👨',
  },
  lily: {
    bg: 'bg-pink-500/5',
    border: 'border-pink-500/20',
    accent: 'text-pink-400',
    avatar: '👧',
  },
  nurse: {
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20',
    accent: 'text-blue-400',
    avatar: '👩‍⚕️',
  },
};

const ratingColors: Record<string, { bg: string; text: string }> = {
  excellent: { bg: 'bg-emerald-500', text: 'text-white' },
  good: { bg: 'bg-blue-500', text: 'text-white' },
  needs_improvement: { bg: 'bg-amber-500', text: 'text-black' },
  concerning: { bg: 'bg-red-500', text: 'text-white' },
};

const NarrativePanel: React.FC<NarrativePanelProps> = ({
  narrative,
  compact = false
}) => {
  const [expanded, setExpanded] = useState(!compact);
  const styles = characterStyles[narrative.character] || characterStyles.nurse;

  // Render emotional arc visualization
  const renderEmotionalArc = () => {
    const { start, peak, end } = narrative.emotionalArc;
    const maxIntensity = 5;

    return (
      <div className="flex items-end gap-1 h-12">
        {[start, peak, end].map((beat, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1 flex-1">
            <div
              className={`w-full rounded-t transition-all ${styles.border.replace('border', 'bg')}`}
              style={{ height: `${(beat.intensity / maxIntensity) * 100}%` }}
            />
            <span className="text-[8px] text-slate-500 uppercase">
              {idx === 0 ? 'Start' : idx === 1 ? 'Peak' : 'End'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (compact) {
    return (
      <div
        onClick={() => setExpanded(!expanded)}
        className={`
          ${styles.bg} ${styles.border} border rounded-2xl p-4
          cursor-pointer hover:bg-white/5 transition-all
        `}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{styles.avatar}</span>
          <div className="flex-1">
            <h4 className={`text-sm font-semibold ${styles.accent}`}>
              {narrative.displayName}
            </h4>
            <p className="text-xs text-slate-400 italic line-clamp-1">
              "{narrative.openingLine}"
            </p>
          </div>
          <div className={`text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
              {narrative.narrative}
            </p>

            {narrative.wishStatement && (
              <p className="mt-4 text-sm text-amber-300/80 italic">
                💭 {narrative.wishStatement}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-2xl overflow-hidden`}>
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{styles.avatar}</span>
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${styles.accent}`}>
              {narrative.displayName}
            </h3>
            <p className="text-sm text-slate-400 italic">
              "{narrative.openingLine}"
            </p>
          </div>

          {/* Professional assessment badge for nurse */}
          {narrative.professionalAssessment && (
            <div
              className={`
                ${ratingColors[narrative.professionalAssessment.rating].bg}
                ${ratingColors[narrative.professionalAssessment.rating].text}
                px-3 py-1 rounded-full text-xs font-bold uppercase
              `}
            >
              {narrative.professionalAssessment.rating.replace('_', ' ')}
            </div>
          )}
        </div>
      </div>

      {/* Main narrative */}
      <div className="p-6">
        <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
          {narrative.narrative}
        </p>
      </div>

      {/* Emotional arc */}
      <div className="px-6 pb-4">
        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-3">
          Emotional Journey
        </h4>
        {renderEmotionalArc()}

        {/* Peak moment */}
        <div className="mt-3 p-3 bg-black/20 rounded-lg">
          <span className="text-[9px] text-slate-500 uppercase">Peak Moment:</span>
          <p className="text-xs text-slate-400 mt-1">
            {narrative.emotionalArc.peak.emotion} — "{narrative.emotionalArc.peak.internalMonologue}"
          </p>
        </div>
      </div>

      {/* Key moments */}
      {narrative.keyMoments.length > 0 && (
        <div className="px-6 pb-4">
          <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-3">
            Key Moments
          </h4>
          <div className="space-y-2">
            {narrative.keyMoments.map((moment, idx) => (
              <div
                key={idx}
                className={`
                  p-3 rounded-lg border
                  ${moment.significance === 'trauma' ? 'bg-red-500/10 border-red-500/20' :
                    moment.significance === 'turning_point' ? 'bg-amber-500/10 border-amber-500/20' :
                    moment.significance === 'relief' ? 'bg-green-500/10 border-green-500/20' :
                    'bg-slate-500/10 border-slate-500/20'}
                `}
              >
                <p className="text-xs text-slate-300">{moment.description}</p>
                <p className="text-xs text-slate-500 italic mt-1">"{moment.thought}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wish statement */}
      {narrative.wishStatement && (
        <div className="px-6 pb-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <h4 className="text-[9px] font-black text-amber-400 uppercase tracking-wider mb-2">
              💭 What I Wish Had Happened
            </h4>
            <p className="text-sm text-amber-200 italic">
              "{narrative.wishStatement}"
            </p>
          </div>
        </div>
      )}

      {/* Professional assessment (nurse only) */}
      {narrative.professionalAssessment && (
        <div className="px-6 pb-6">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-wider mb-2">
              🩺 Professional Assessment
            </h4>
            <p className="text-sm text-slate-300 mb-3">
              {narrative.professionalAssessment.summary}
            </p>
            <div className="p-3 bg-black/20 rounded-lg">
              <span className="text-[9px] text-slate-500 uppercase">A mentor would say:</span>
              <p className="text-sm text-blue-200 italic mt-1">
                "{narrative.professionalAssessment.wouldMentorSay}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Closing */}
      <div className="p-6 bg-black/20 border-t border-white/5">
        <p className={`text-sm italic ${styles.accent}`}>
          "{narrative.closingReflection}"
        </p>
      </div>
    </div>
  );
};

export default NarrativePanel;
