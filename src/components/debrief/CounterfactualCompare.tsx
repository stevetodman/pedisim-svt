// ============================================================================
// COUNTERFACTUAL COMPARE COMPONENT
// Side-by-side comparison of actual vs alternative outcomes
// ============================================================================

import React from 'react';
import { Counterfactual } from '../../kernel/evaluation/types';

interface CounterfactualCompareProps {
  counterfactual: Counterfactual;
}

const CounterfactualCompare: React.FC<CounterfactualCompareProps> = ({
  counterfactual
}) => {
  const { actual, alternative, intervention, differenceNarrative } = counterfactual;

  // Calculate the difference for visualization
  const anxietyDiff = actual.markAnxietyPeak - alternative.markAnxietyPeak;
  const fearDiff = actual.lilyFearPeak - alternative.lilyFearPeak;
  const trustDiff = alternative.trustDelta - actual.trustDelta;

  return (
    <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-red-500/10 to-green-500/10 border-b border-white/5">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
          What If?
        </h3>
        <p className="text-sm text-slate-300">
          How a single intervention would have changed everything
        </p>
      </div>

      {/* Side by side comparison */}
      <div className="grid grid-cols-2 divide-x divide-white/5">
        {/* Actual */}
        <div className="p-4 bg-red-500/5">
          <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">
            ✗ What Happened
          </h4>

          <div className="space-y-3">
            {/* Metrics */}
            <div className="flex items-center gap-2">
              <span className="text-amber-400">👨</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Dad's Anxiety Peak</span>
                  <span className="text-red-400 font-bold">{actual.markAnxietyPeak}/5</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full mt-1">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${(actual.markAnxietyPeak / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-pink-400">👧</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Lily's Fear Peak</span>
                  <span className="text-red-400 font-bold">{actual.lilyFearPeak}/5</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full mt-1">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${(actual.lilyFearPeak / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-blue-400">🤝</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Trust Change</span>
                  <span className="text-red-400 font-bold">{actual.trustDelta}</span>
                </div>
              </div>
            </div>

            {/* Outcome */}
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-200">{actual.outcome}</p>
            </div>
          </div>
        </div>

        {/* Alternative */}
        <div className="p-4 bg-green-500/5">
          <h4 className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-3">
            ✓ What Could Have Been
          </h4>

          <div className="space-y-3">
            {/* Metrics */}
            <div className="flex items-center gap-2">
              <span className="text-amber-400">👨</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Dad's Anxiety Peak</span>
                  <span className="text-green-400 font-bold">{alternative.markAnxietyPeak}/5</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full mt-1">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(alternative.markAnxietyPeak / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-pink-400">👧</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Lily's Fear Peak</span>
                  <span className="text-green-400 font-bold">{alternative.lilyFearPeak}/5</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full mt-1">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(alternative.lilyFearPeak / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-blue-400">🤝</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Trust Change</span>
                  <span className="text-green-400 font-bold">{alternative.trustDelta >= 0 ? '+' : ''}{alternative.trustDelta}</span>
                </div>
              </div>
            </div>

            {/* Outcome */}
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-xs text-green-200">{alternative.outcome}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Impact summary */}
      <div className="p-4 bg-slate-800/50 border-t border-white/5">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
          Impact of Intervention
        </h4>
        <div className="flex gap-4 justify-center">
          {anxietyDiff > 0 && (
            <div className="text-center">
              <div className="text-2xl font-black text-green-400">-{anxietyDiff}</div>
              <div className="text-[9px] text-slate-500 uppercase">Dad Anxiety</div>
            </div>
          )}
          {fearDiff > 0 && (
            <div className="text-center">
              <div className="text-2xl font-black text-green-400">-{fearDiff}</div>
              <div className="text-[9px] text-slate-500 uppercase">Lily Fear</div>
            </div>
          )}
          {trustDiff > 0 && (
            <div className="text-center">
              <div className="text-2xl font-black text-green-400">+{trustDiff}</div>
              <div className="text-[9px] text-slate-500 uppercase">Trust Points</div>
            </div>
          )}
        </div>
      </div>

      {/* The intervention */}
      <div className="p-4 bg-blue-500/10 border-t border-white/5">
        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
          💬 The 10-Second Fix
        </h4>
        <p className="text-sm text-blue-200 italic mb-2">
          "{intervention.exactWords}"
        </p>
        <p className="text-[10px] text-slate-500">
          {intervention.action}
        </p>
      </div>

      {/* Full narrative */}
      {differenceNarrative && (
        <div className="p-4 border-t border-white/5">
          <details className="group">
            <summary className="cursor-pointer text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors">
              📖 Full Analysis
            </summary>
            <div className="mt-3 text-sm text-slate-400 whitespace-pre-line leading-relaxed">
              {differenceNarrative}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default CounterfactualCompare;
