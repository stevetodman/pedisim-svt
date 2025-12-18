// ============================================================================
// CAUSAL CHAIN VIEW COMPONENT
// Visual representation of cause-effect cascade
// ============================================================================

import React, { useState } from 'react';
import { CausalChain } from '../../kernel/evaluation/types';

interface CausalChainViewProps {
  chain: CausalChain;
  showBreakpoint?: boolean;
}

const CausalChainView: React.FC<CausalChainViewProps> = ({
  chain,
  showBreakpoint = true
}) => {
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const [showIntervention, setShowIntervention] = useState(false);

  return (
    <div className="bg-slate-900 rounded-2xl border border-white/5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
            Causal Chain
          </h3>
          <h4 className="text-lg font-semibold text-slate-100">
            {chain.name}
          </h4>
        </div>
        <span className="text-2xl">🔗</span>
      </div>

      {/* Chain visualization */}
      <div className="space-y-0">
        {chain.links.map((link, idx) => (
          <div
            key={idx}
            onMouseEnter={() => setHoveredLink(idx)}
            onMouseLeave={() => setHoveredLink(null)}
            className="relative"
          >
            {/* Link card */}
            <div
              className={`
                relative p-4 rounded-xl border transition-all duration-200
                ${hoveredLink === idx
                  ? 'bg-red-500/20 border-red-500/40 scale-[1.02]'
                  : 'bg-slate-800/50 border-white/5'}
              `}
            >
              {/* Step number */}
              <div
                className={`
                  absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6
                  rounded-full flex items-center justify-center text-xs font-bold
                  ${hoveredLink === idx ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'}
                `}
              >
                {idx + 1}
              </div>

              {/* Mechanism */}
              <p className="text-sm text-slate-200 pl-4">
                {link.mechanism}
              </p>

              {/* Breakpoint indicator */}
              {showBreakpoint && idx === 0 && chain.breakpoints.length > 0 && (
                <button
                  onClick={() => setShowIntervention(!showIntervention)}
                  className="absolute -right-2 top-1/2 -translate-y-1/2
                           bg-green-500 hover:bg-green-400 text-black text-xs font-bold
                           px-2 py-1 rounded-full transition-colors"
                >
                  ✂️ Break here
                </button>
              )}
            </div>

            {/* Arrow between links */}
            {idx < chain.links.length - 1 && (
              <div className="flex justify-center py-2">
                <div
                  className={`
                    text-xl transition-colors
                    ${hoveredLink === idx || hoveredLink === idx + 1
                      ? 'text-red-400'
                      : 'text-slate-600'}
                  `}
                >
                  ↓
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Final effect */}
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <h5 className="text-[9px] font-black text-red-400 uppercase tracking-wider mb-1">
            Final Effect
          </h5>
          <p className="text-sm text-red-200">
            {chain.finalEffect}
          </p>
        </div>
      </div>

      {/* Intervention panel */}
      {showIntervention && chain.breakpoints.length > 0 && (
        <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <h5 className="text-[9px] font-black text-green-400 uppercase tracking-wider mb-3">
            ✂️ How to Break This Chain
          </h5>

          <div className="space-y-3">
            <div>
              <span className="text-[9px] text-slate-500 uppercase">Intervention:</span>
              <p className="text-sm text-green-200 italic mt-1">
                "{chain.breakpoints[0].intervention}"
              </p>
            </div>

            <div>
              <span className="text-[9px] text-slate-500 uppercase">Alternative Outcome:</span>
              <p className="text-sm text-slate-300 mt-1">
                {chain.breakpoints[0].alternativeChain}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Narrative summary */}
      {chain.narrativeSummary && (
        <div className="mt-6 p-4 bg-slate-800/50 border border-white/5 rounded-xl">
          <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-3">
            📖 The Full Story
          </h5>
          <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
            {chain.narrativeSummary}
          </div>
        </div>
      )}
    </div>
  );
};

export default CausalChainView;
