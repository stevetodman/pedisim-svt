// ============================================================================
// PIVOT CARD COMPONENT
// Displays a decision point with alternatives and teaching content
// ============================================================================

import React, { useState } from 'react';
import { PivotPoint } from '../../kernel/evaluation/types';

interface PivotCardProps {
  pivot: PivotPoint;
  expanded?: boolean;
  onToggle?: () => void;
}

const impactColors: Record<string, { bg: string; border: string; badge: string }> = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', badge: 'bg-red-500' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', badge: 'bg-orange-500' },
  medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', badge: 'bg-yellow-500' },
  low: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', badge: 'bg-slate-500' },
};

const typeIcons: Record<string, string> = {
  missed_opportunity: '⏰',
  decision: '🔀',
  error: '⚠️',
  success: '✅',
};

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

const PivotCard: React.FC<PivotCardProps> = ({
  pivot,
  expanded = false,
  onToggle
}) => {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const colors = impactColors[pivot.impact] || impactColors.medium;
  const icon = typeIcons[pivot.type] || '📌';
  const isSuccess = pivot.type === 'success';

  return (
    <div
      className={`
        ${colors.bg} ${colors.border} border rounded-2xl overflow-hidden
        transition-all duration-300
        ${expanded ? 'ring-1 ring-white/10' : ''}
      `}
    >
      {/* Header */}
      <div
        onClick={onToggle}
        className={`
          p-4 cursor-pointer transition-colors
          ${onToggle ? 'hover:bg-white/5' : ''}
        `}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {/* Impact badge and time */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`
                  ${colors.badge} text-[9px] font-black uppercase px-2 py-0.5 rounded-full
                  ${isSuccess ? 'text-white' : 'text-black'}
                `}
              >
                {isSuccess ? 'Well done' : pivot.impact}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                {formatTime(pivot.timestamp)}
              </span>
            </div>

            {/* Description */}
            <h4 className="text-sm font-semibold text-slate-100 mb-1">
              {icon} {pivot.description}
            </h4>

            {/* Decision made */}
            {pivot.decision && (
              <p className="text-xs text-slate-400 italic">
                "{pivot.decision}"
              </p>
            )}
          </div>

          {/* Expand indicator */}
          {onToggle && (
            <div className={`text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>
              ▼
            </div>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {/* Outcome */}
          <div>
            <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2">
              What Happened
            </h5>
            <p className="text-sm text-slate-300">
              {pivot.actualOutcome}
            </p>
          </div>

          {/* State impact */}
          {(pivot.stateImpact.markAnxietyDelta !== 0 || pivot.stateImpact.lilyFearDelta !== 0) && (
            <div className="flex gap-4">
              {pivot.stateImpact.markAnxietyDelta !== 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">👨</span>
                  <span className={`text-sm ${pivot.stateImpact.markAnxietyDelta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {pivot.stateImpact.markAnxietyDelta > 0 ? '+' : ''}{pivot.stateImpact.markAnxietyDelta} anxiety
                  </span>
                </div>
              )}
              {pivot.stateImpact.lilyFearDelta !== 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-pink-400">👧</span>
                  <span className={`text-sm ${pivot.stateImpact.lilyFearDelta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {pivot.stateImpact.lilyFearDelta > 0 ? '+' : ''}{pivot.stateImpact.lilyFearDelta} fear
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Teaching point */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
            <h5 className="text-[9px] font-black text-blue-400 uppercase tracking-wider mb-2">
              💡 Teaching Point
            </h5>
            <p className="text-sm text-blue-100">
              {pivot.teachingPoint}
            </p>
          </div>

          {/* Expert would say */}
          {pivot.expertWouldSay && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
              <h5 className="text-[9px] font-black text-green-400 uppercase tracking-wider mb-2">
                🎓 Expert Would Say
              </h5>
              <p className="text-sm text-green-100 italic">
                "{pivot.expertWouldSay}"
              </p>
            </div>
          )}

          {/* Alternatives */}
          {pivot.alternatives.length > 0 && (
            <div>
              <button
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="text-[9px] font-black text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
              >
                {showAlternatives ? '▼' : '▶'} View Alternatives ({pivot.alternatives.length})
              </button>

              {showAlternatives && (
                <div className="mt-3 space-y-2">
                  {pivot.alternatives.map((alt, idx) => (
                    <div
                      key={idx}
                      className={`
                        rounded-lg p-3 border
                        ${alt.isPALSPreferred
                          ? 'bg-emerald-500/10 border-emerald-500/20'
                          : 'bg-slate-500/10 border-slate-500/20'}
                      `}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-200">
                          {alt.action}
                        </span>
                        {alt.isPALSPreferred && (
                          <span className="text-[8px] bg-emerald-500 text-black px-1.5 py-0.5 rounded-full font-bold">
                            PALS
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-1">
                        {alt.rationale}
                      </p>
                      <p className="text-xs text-slate-500">
                        → {alt.expectedOutcome}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PivotCard;
