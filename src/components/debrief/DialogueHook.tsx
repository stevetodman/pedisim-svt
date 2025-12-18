// ============================================================================
// DIALOGUE HOOK COMPONENT
// Interactive question-answer elements for reflective learning
// ============================================================================

import React, { useState } from 'react';
import { DialogueHook as DialogueHookType } from '../../kernel/evaluation/types';

interface DialogueHookProps {
  hook: DialogueHookType;
  onAnswer?: (answer: string | number) => void;
}

const DialogueHookComponent: React.FC<DialogueHookProps> = ({
  hook,
  onAnswer
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [freeTextValue, setFreeTextValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleOptionClick = (idx: number) => {
    if (submitted) return;
    setSelectedOption(idx);
  };

  const handleSubmit = () => {
    if (hook.allowFreeText && hook.options.length === 0) {
      // Free text only
      if (!freeTextValue.trim()) return;
      setSubmitted(true);
      setShowFeedback(true);
      onAnswer?.(freeTextValue);
    } else if (selectedOption !== null) {
      // Multiple choice
      setSubmitted(true);
      setShowFeedback(true);
      onAnswer?.(selectedOption);
    }
  };

  const isCorrect = selectedOption === hook.correctOptionIndex;
  const feedbackText = hook.correctOptionIndex === -1
    ? hook.followUpCorrect  // Reflective question - no right/wrong
    : isCorrect
      ? hook.followUpCorrect
      : hook.followUpIncorrect;

  return (
    <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden">
      {/* Question */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🤔</span>
          <div>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Reflection Question
            </h4>
            <p className="text-lg text-slate-100 font-medium leading-relaxed">
              {hook.question}
            </p>
          </div>
        </div>
      </div>

      {/* Options */}
      {hook.options.length > 0 && (
        <div className="p-6 space-y-3">
          {hook.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const showAsCorrect = submitted && idx === hook.correctOptionIndex && hook.correctOptionIndex !== -1;
            const showAsIncorrect = submitted && isSelected && !isCorrect && hook.correctOptionIndex !== -1;

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(idx)}
                disabled={submitted}
                className={`
                  w-full text-left p-4 rounded-xl border transition-all duration-200
                  ${isSelected && !submitted
                    ? 'bg-blue-500/20 border-blue-500/40 ring-1 ring-blue-500/20'
                    : 'bg-slate-800/50 border-white/5 hover:border-white/20'}
                  ${showAsCorrect ? 'bg-green-500/20 border-green-500/40' : ''}
                  ${showAsIncorrect ? 'bg-red-500/20 border-red-500/40' : ''}
                  ${submitted ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Radio circle */}
                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${isSelected
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-slate-600'}
                      ${showAsCorrect ? 'border-green-500 bg-green-500' : ''}
                      ${showAsIncorrect ? 'border-red-500 bg-red-500' : ''}
                    `}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Option text */}
                  <span
                    className={`
                      text-sm
                      ${isSelected ? 'text-slate-100' : 'text-slate-400'}
                      ${showAsCorrect ? 'text-green-200' : ''}
                      ${showAsIncorrect ? 'text-red-200' : ''}
                    `}
                  >
                    {option}
                  </span>

                  {/* Result indicator */}
                  {showAsCorrect && <span className="ml-auto text-green-400">✓</span>}
                  {showAsIncorrect && <span className="ml-auto text-red-400">✗</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Free text input */}
      {hook.allowFreeText && (
        <div className="px-6 pb-6">
          {hook.freeTextPrompt && (
            <p className="text-xs text-slate-500 mb-2">{hook.freeTextPrompt}</p>
          )}
          <textarea
            value={freeTextValue}
            onChange={(e) => setFreeTextValue(e.target.value)}
            disabled={submitted}
            placeholder="Type your response..."
            className={`
              w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm
              focus:outline-none focus:border-blue-500 transition-colors
              resize-none h-24
              ${submitted ? 'opacity-50 cursor-default' : ''}
            `}
          />

          {/* Ideal response comparison */}
          {submitted && hook.idealFreeTextResponse && (
            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <span className="text-[9px] text-green-400 uppercase font-bold">Example Response:</span>
              <p className="text-sm text-green-200 italic mt-1">
                "{hook.idealFreeTextResponse}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Submit button */}
      {!submitted && (
        <div className="px-6 pb-6">
          <button
            onClick={handleSubmit}
            disabled={(hook.options.length > 0 && selectedOption === null) ||
                     (hook.options.length === 0 && !freeTextValue.trim())}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700
                     py-3 rounded-xl text-sm font-bold transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        </div>
      )}

      {/* Feedback */}
      {showFeedback && feedbackText && (
        <div
          className={`
            p-6 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-300
            ${hook.correctOptionIndex === -1
              ? 'bg-blue-500/10'
              : isCorrect
                ? 'bg-green-500/10'
                : 'bg-amber-500/10'}
          `}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">
              {hook.correctOptionIndex === -1 ? '💬' : isCorrect ? '✅' : '💡'}
            </span>
            <div>
              <h5
                className={`
                  text-[10px] font-black uppercase tracking-widest mb-2
                  ${hook.correctOptionIndex === -1
                    ? 'text-blue-400'
                    : isCorrect
                      ? 'text-green-400'
                      : 'text-amber-400'}
                `}
              >
                {hook.correctOptionIndex === -1
                  ? 'Reflection'
                  : isCorrect
                    ? 'Correct!'
                    : 'Consider This'}
              </h5>
              <p className="text-sm text-slate-300 leading-relaxed">
                {feedbackText}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DialogueHookComponent;
