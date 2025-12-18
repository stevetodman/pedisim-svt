// ============================================================================
// DIALOGUE PANEL COMPONENT
// Displays conversation between learner and characters
// ============================================================================

import React, { useEffect, useRef } from 'react';
import { DialogueResponse } from '../characters';

interface DialoguePanelProps {
  dialogue: DialogueResponse[];
  onSendMessage?: (message: string) => void;
  disabled?: boolean;
}

const emotionEmojis: Record<string, string> = {
  scared: '😰',
  panicked: '😱',
  crying: '😢',
  relieved: '😮‍💨',
  calm: '😌',
  professional: '👩‍⚕️',
  urgent: '⚠️',
  normal: '',
};

const characterColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
  lily: { 
    bg: 'bg-pink-500/10', 
    border: 'border-pink-500/30', 
    text: 'text-pink-100', 
    label: 'text-pink-400' 
  },
  mark: { 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/30', 
    text: 'text-amber-100', 
    label: 'text-amber-400' 
  },
  nurse: { 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/30', 
    text: 'text-blue-100', 
    label: 'text-blue-400' 
  },
  system: { 
    bg: 'bg-slate-500/10', 
    border: 'border-slate-500/30', 
    text: 'text-slate-300', 
    label: 'text-slate-400' 
  },
};

const characterLabels: Record<string, string> = {
  lily: 'Lily (5yo)',
  mark: 'Dad (Mark)',
  nurse: 'Nurse Sarah',
  system: 'System',
};

const DialoguePanel: React.FC<DialoguePanelProps> = ({ 
  dialogue, 
  onSendMessage,
  disabled = false 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = React.useState('');

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [dialogue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-white/5 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          Encounter Log
        </h3>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {dialogue.length === 0 ? (
          <div className="text-center text-slate-700 py-16">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-[10px] font-bold uppercase tracking-wider">
              Start simulation to begin
            </p>
          </div>
        ) : (
          dialogue.map((msg, idx) => {
            const colors = characterColors[msg.character] || characterColors.system;
            const label = characterLabels[msg.character] || msg.character;
            const emoji = emotionEmojis[msg.emotion] || '';
            
            // Determine alignment
            const isNurse = msg.character === 'nurse';
            
            return (
              <div
                key={idx}
                className={`flex ${isNurse ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[85%] rounded-2xl px-4 py-3 
                    ${colors.bg} ${colors.border} border
                    animate-in fade-in slide-in-from-bottom-2 duration-300
                    ${isNurse ? 'rounded-br-sm' : 'rounded-bl-sm'}
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${colors.label}`}>
                      {label}
                    </span>
                    {emoji && <span className="text-sm">{emoji}</span>}
                  </div>
                  <p className={`text-sm leading-relaxed ${colors.text}`}>
                    {msg.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      {onSendMessage && (
        <form onSubmit={handleSubmit} className="p-4 border-t border-white/5">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Speak to patient or family..."
              disabled={disabled}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm 
                       focus:outline-none focus:border-blue-500 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={disabled || !inputValue.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 
                       px-4 py-2 rounded-xl text-sm font-bold transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
          <p className="text-[9px] text-slate-600 mt-2 text-center uppercase tracking-wider">
            Use this to communicate with Lily and Mark
          </p>
        </form>
      )}
    </div>
  );
};

export default DialoguePanel;
