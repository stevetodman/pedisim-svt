// ============================================================================
// LOADING STATE COMPONENT
// Animated loading display while debrief generates
// ============================================================================

import React from 'react';

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Analyzing your performance...'
}) => {
  const steps = [
    { icon: '📊', text: 'Reconstructing timeline', delay: 0 },
    { icon: '🔍', text: 'Identifying decision points', delay: 200 },
    { icon: '🔗', text: 'Tracing causal chains', delay: 400 },
    { icon: '👥', text: 'Generating perspectives', delay: 600 },
    { icon: '💡', text: 'Preparing insights', delay: 800 },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        {/* Pulsing heart icon */}
        <div className="relative mb-8">
          <div className="text-6xl animate-pulse">❤️</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-2 border-red-500/30 animate-ping" />
          </div>
        </div>

        {/* Main message */}
        <h2 className="text-xl font-bold text-slate-100 mb-2">
          {message}
        </h2>
        <p className="text-sm text-slate-500 mb-8">
          Building your personalized debrief
        </p>

        {/* Steps animation */}
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 text-left animate-in fade-in slide-in-from-left-4"
              style={{ animationDelay: `${step.delay}ms`, animationFillMode: 'backwards' }}
            >
              <span className="text-xl">{step.icon}</span>
              <span className="text-sm text-slate-400">{step.text}</span>
              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full animate-pulse"
                  style={{
                    width: '100%',
                    animationDelay: `${step.delay + 500}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Loading bar */}
        <div className="mt-8 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full animate-loading-bar" />
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingState;
