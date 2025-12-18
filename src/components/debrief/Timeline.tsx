// ============================================================================
// TIMELINE COMPONENT
// Visual timeline showing simulation events with emotional overlays
// ============================================================================

import React from 'react';
import { TimelineEvent } from '../../kernel/evaluation/types';

interface TimelineProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  highlightedEventId?: string;
}

const eventTypeIcons: Record<string, string> = {
  action: '💉',
  communication: '💬',
  character_response: '🗣️',
  state_change: '⚡',
  nurse_catch: '🛡️',
  system: '📋',
};

const eventTypeColors: Record<string, { bg: string; border: string; dot: string }> = {
  action: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', dot: 'bg-purple-500' },
  communication: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  character_response: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  state_change: { bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500' },
  nurse_catch: { bg: 'bg-green-500/10', border: 'border-green-500/30', dot: 'bg-green-500' },
  system: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', dot: 'bg-slate-500' },
};

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

const Timeline: React.FC<TimelineProps> = ({
  events,
  onEventClick,
  highlightedEventId
}) => {
  // Filter to significant events only
  const significantEvents = events.filter(e =>
    e.type === 'action' ||
    e.type === 'nurse_catch' ||
    (e.type === 'state_change' && e.content.includes('Phase')) ||
    (e.type === 'communication' && e.actor === 'learner')
  );

  return (
    <div className="bg-slate-900 rounded-2xl border border-white/5 p-6">
      {/* Header */}
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">
        Timeline
      </h3>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />

        {/* Events */}
        <div className="space-y-4">
          {significantEvents.map((event) => {
            const colors = eventTypeColors[event.type] || eventTypeColors.system;
            const icon = eventTypeIcons[event.type] || '📌';
            const isHighlighted = event.id === highlightedEventId;

            return (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className={`
                  relative pl-10 cursor-pointer transition-all duration-200
                  ${onEventClick ? 'hover:translate-x-1' : ''}
                  ${isHighlighted ? 'scale-105' : ''}
                `}
              >
                {/* Dot */}
                <div
                  className={`
                    absolute left-2 top-3 w-4 h-4 rounded-full
                    ${colors.dot}
                    ${isHighlighted ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}
                  `}
                />

                {/* Event card */}
                <div
                  className={`
                    ${colors.bg} ${colors.border} border rounded-xl p-3
                    ${isHighlighted ? 'ring-1 ring-white/20' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      {formatTime(event.timestamp)}
                    </span>
                    <span className="text-sm">{icon}</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {event.content}
                  </p>

                  {/* Emotional state indicator */}
                  {(event.stateAfter.markAnxiety >= 4 || event.stateAfter.lilyFear >= 4) && (
                    <div className="flex gap-2 mt-2">
                      {event.stateAfter.markAnxiety >= 4 && (
                        <span className="text-[9px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                          Dad: {event.stateAfter.markAnxiety}/5
                        </span>
                      )}
                      {event.stateAfter.lilyFear >= 4 && (
                        <span className="text-[9px] px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded-full">
                          Lily: {event.stateAfter.lilyFear}/5
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
