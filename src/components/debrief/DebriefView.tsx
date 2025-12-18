// ============================================================================
// DEBRIEF VIEW COMPONENT
// Main container for the post-simulation debrief experience
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  EvaluationResult,
  DialogueHook,
} from '../../kernel/evaluation/types';
import { NarrativeSet } from '../../kernel/narrative';
import Timeline from './Timeline';
import PivotCard from './PivotCard';
import CausalChainView from './CausalChainView';
import NarrativePanel from './NarrativePanel';
import DialogueHookComponent from './DialogueHook';
import CounterfactualCompare from './CounterfactualCompare';
import EmotionalChart from './EmotionalChart';

interface DebriefViewProps {
  evaluation: Omit<EvaluationResult, 'perspectives' | 'dialogueHooks'>;
  narratives: NarrativeSet;
  dialogueHooks: DialogueHook[];
  onClose?: () => void;
  onReplay?: () => void;
}

type TabId = 'summary' | 'pivots' | 'perspectives' | 'dialogue' | 'timeline';

const DebriefView: React.FC<DebriefViewProps> = ({
  evaluation,
  narratives,
  dialogueHooks,
  onClose,
  onReplay
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [expandedPivotId, setExpandedPivotId] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<'mark' | 'lily' | 'nurse'>('mark');

  // Get the most critical pivot and chain
  const criticalPivot = useMemo(() => {
    return evaluation.pivotPoints.find(p => p.impact === 'critical') ||
           evaluation.pivotPoints[0];
  }, [evaluation.pivotPoints]);

  const criticalChain = useMemo(() => {
    return evaluation.causalChains[0];
  }, [evaluation.causalChains]);

  // Separate successes from issues
  const { successes } = useMemo(() => {
    const successes = evaluation.pivotPoints.filter(p => p.type === 'success');
    return { successes };
  }, [evaluation.pivotPoints]);

  const tabs = [
    { id: 'summary' as TabId, label: 'Summary', icon: '📊' },
    { id: 'pivots' as TabId, label: 'Decision Points', icon: '🔀' },
    { id: 'perspectives' as TabId, label: 'Perspectives', icon: '👥' },
    { id: 'dialogue' as TabId, label: 'Reflect', icon: '💬' },
    { id: 'timeline' as TabId, label: 'Timeline', icon: '📅' },
  ];

  // Score visualization helper
  const renderScoreBar = (score: number, label: string, color: string) => (
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <span className={`text-lg font-black ${color}`}>
          {score.toFixed(1)}
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color.replace('text', 'bg')}`}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              Simulation Debrief
            </h2>
            <p className="text-sm text-slate-500">
              Review your performance and learn from key moments
            </p>
          </div>
          <div className="flex gap-3">
            {onReplay && (
              <button
                onClick={onReplay}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl
                         text-sm font-bold transition-colors"
              >
                🔄 Try Again
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl
                         text-sm font-bold transition-colors"
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 mt-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
              `}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Scores */}
            <div className="bg-slate-900 rounded-2xl border border-white/5 p-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                Performance Scores
              </h3>
              <div className="flex gap-8">
                {renderScoreBar(evaluation.scores.clinical, 'Clinical', 'text-purple-400')}
                {renderScoreBar(evaluation.scores.communication, 'Communication', 'text-blue-400')}
                {renderScoreBar(evaluation.scores.overall, 'Overall', 'text-emerald-400')}
              </div>
            </div>

            {/* Emotional Trajectory */}
            {evaluation.timeline.length > 0 && (
              <div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  Emotional Trajectory
                </h3>
                <EmotionalChart timeline={evaluation.timeline} height={140} />
              </div>
            )}

            {/* The One Thing */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
              <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">
                ⭐ The One Thing
              </h3>
              <p className="text-lg text-slate-100 font-medium mb-4">
                {evaluation.theOneThing.behavior}
              </p>
              {evaluation.theOneThing.exactWords && (
                <div className="bg-black/20 rounded-xl p-4">
                  <span className="text-[9px] text-slate-500 uppercase">At {evaluation.theOneThing.exactMoment}, say:</span>
                  <p className="text-sm text-amber-200 italic mt-1">
                    "{evaluation.theOneThing.exactWords}"
                  </p>
                </div>
              )}
            </div>

            {/* Critical Chain */}
            {criticalChain && (
              <CausalChainView chain={criticalChain} showBreakpoint={true} />
            )}

            {/* Most Critical Pivot */}
            {criticalPivot && (
              <div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  Critical Decision Point
                </h3>
                <PivotCard pivot={criticalPivot} expanded={true} />
              </div>
            )}

            {/* Counterfactual - What If */}
            {evaluation.counterfactuals.length > 0 && (
              <div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  Alternative Outcome
                </h3>
                <CounterfactualCompare counterfactual={evaluation.counterfactuals[0]} />
              </div>
            )}

            {/* Successes */}
            {successes.length > 0 && (
              <div>
                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">
                  ✅ What You Did Well
                </h3>
                <div className="space-y-3">
                  {successes.map(s => (
                    <PivotCard key={s.id} pivot={s} expanded={false} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pivots Tab */}
        {activeTab === 'pivots' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
              All Decision Points ({evaluation.pivotPoints.length})
            </h3>
            {evaluation.pivotPoints.map(pivot => (
              <PivotCard
                key={pivot.id}
                pivot={pivot}
                expanded={expandedPivotId === pivot.id}
                onToggle={() => setExpandedPivotId(
                  expandedPivotId === pivot.id ? null : pivot.id
                )}
              />
            ))}
          </div>
        )}

        {/* Perspectives Tab */}
        {activeTab === 'perspectives' && (
          <div className="max-w-4xl mx-auto">
            {/* Character selector */}
            <div className="flex gap-2 mb-6">
              {(['mark', 'lily', 'nurse'] as const).map(char => (
                <button
                  key={char}
                  onClick={() => setSelectedCharacter(char)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl transition-all
                    ${selectedCharacter === char
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
                  `}
                >
                  <span>
                    {char === 'mark' ? '👨' : char === 'lily' ? '👧' : '👩‍⚕️'}
                  </span>
                  <span className="font-medium">
                    {char === 'mark' ? 'Dad' : char === 'lily' ? 'Lily' : 'Nurse'}
                  </span>
                </button>
              ))}
            </div>

            {/* Selected narrative */}
            <NarrativePanel narrative={narratives[selectedCharacter]} />
          </div>
        )}

        {/* Dialogue Tab */}
        {activeTab === 'dialogue' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <p className="text-sm text-slate-400 text-center">
              Reflect on your decisions by answering these questions
            </p>
            {dialogueHooks.map(hook => (
              <DialogueHookComponent key={hook.id} hook={hook} />
            ))}
            {dialogueHooks.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <span className="text-4xl">🤔</span>
                <p className="mt-4">No reflection questions for this session.</p>
              </div>
            )}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="max-w-4xl mx-auto">
            <Timeline events={evaluation.timeline} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DebriefView;
