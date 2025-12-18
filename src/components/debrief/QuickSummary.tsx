// ============================================================================
// QUICK SUMMARY COMPONENT
// Compact summary card shown before opening full debrief
// ============================================================================

import React from 'react';
import { EvaluationResult } from '../../kernel/evaluation/types';

interface QuickSummaryProps {
  evaluation: Omit<EvaluationResult, 'perspectives' | 'dialogueHooks'>;
  onViewFull: () => void;
  onReplay: () => void;
}

const QuickSummary: React.FC<QuickSummaryProps> = ({
  evaluation,
  onViewFull,
  onReplay
}) => {
  const { scores, theOneThing, pivotPoints } = evaluation;

  const criticalCount = pivotPoints.filter(p => p.impact === 'critical' && p.type !== 'success').length;
  const successCount = pivotPoints.filter(p => p.type === 'success').length;

  // Determine overall assessment
  const getAssessment = () => {
    if (scores.overall >= 4) return { text: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
    if (scores.overall >= 3) return { text: 'Good', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (scores.overall >= 2) return { text: 'Needs Work', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    return { text: 'Review Needed', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  const assessment = getAssessment();

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header with score */}
        <div className={`p-6 ${assessment.bg} border-b border-white/5`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-100">Simulation Complete</h2>
              <p className={`text-sm font-bold ${assessment.color}`}>{assessment.text}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-slate-100">
                {scores.overall.toFixed(1)}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Overall</div>
            </div>
          </div>
        </div>

        {/* Score bars */}
        <div className="p-6 space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Clinical Skills</span>
              <span className="text-purple-400 font-bold">{scores.clinical.toFixed(1)}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(scores.clinical / 5) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Communication</span>
              <span className="text-blue-400 font-bold">{scores.communication.toFixed(1)}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(scores.communication / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="px-6 pb-4 flex gap-4">
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="text-red-400">⚠️</span>
              <span className="text-xs text-red-300">{criticalCount} critical issue{criticalCount > 1 ? 's' : ''}</span>
            </div>
          )}
          {successCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
              <span className="text-green-400">✓</span>
              <span className="text-xs text-green-300">{successCount} thing{successCount > 1 ? 's' : ''} done well</span>
            </div>
          )}
        </div>

        {/* The One Thing */}
        {theOneThing.behavior && (
          <div className="px-6 pb-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">
                ⭐ Key Takeaway
              </h3>
              <p className="text-sm text-amber-200">
                {theOneThing.behavior}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 bg-slate-800/50 border-t border-white/5 flex gap-3">
          <button
            onClick={onViewFull}
            className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-sm transition-colors"
          >
            📊 View Full Debrief
          </button>
          <button
            onClick={onReplay}
            className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-bold text-sm transition-colors"
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickSummary;
