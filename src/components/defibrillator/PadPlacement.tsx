// PadPlacement - Educational pad position selection dialog
// Teaches proper pad placement for pediatric patients

import { PadPosition } from '../../kernel/defibrillator/types';

interface PadPlacementProps {
  patientWeight: number;
  onSelect: (position: PadPosition) => void;
  onCancel: () => void;
}

export default function PadPlacement({
  patientWeight,
  onSelect,
  onCancel
}: PadPlacementProps) {
  const isPediatric = patientWeight < 25;

  return (
    <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4 z-10">
      <div className="bg-slate-800 rounded-lg border-2 border-slate-600 max-w-2xl w-full p-6">
        <h2 className="text-2xl font-bold text-white text-center mb-4">
          PAD PLACEMENT
        </h2>

        <p className="text-slate-400 text-center mb-6">
          Select placement for {patientWeight}kg patient:
        </p>

        <div className="grid grid-cols-2 gap-4">
          {/* Anterior-Posterior Option */}
          <button
            onClick={() => onSelect('ANTERIOR_POSTERIOR')}
            className={`
              p-4 rounded-lg border-2 transition-all text-left
              ${isPediatric
                ? 'border-green-500 bg-green-900/30 hover:bg-green-900/50'
                : 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/50'
              }
            `}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-white">
                Anterior-Posterior
              </h3>
              {isPediatric && (
                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                  RECOMMENDED
                </span>
              )}
            </div>

            {/* Diagram */}
            <div className="bg-slate-900 rounded p-4 mb-3 text-center font-mono text-sm">
              <div className="text-slate-400">
                {`    ┌─────┐`}<br/>
                {`    │     │`}<br/>
                {`    │  ●  │ ← sternum`}<br/>
                {`    │     │`}<br/>
                {`    └──┬──┘`}<br/>
                {`       │`}<br/>
                {`       └───────● ← back`}
              </div>
            </div>

            <ul className="text-sm space-y-1">
              <li className="text-green-400 flex items-center gap-2">
                <span>✓</span> Better energy delivery
              </li>
              <li className="text-green-400 flex items-center gap-2">
                <span>✓</span> Lower impedance
              </li>
              <li className="text-green-400 flex items-center gap-2">
                <span>✓</span> Preferred in small children
              </li>
            </ul>
          </button>

          {/* Anterior-Lateral Option */}
          <button
            onClick={() => onSelect('ANTERIOR_LATERAL')}
            className={`
              p-4 rounded-lg border-2 transition-all text-left
              ${!isPediatric
                ? 'border-blue-500 bg-blue-900/30 hover:bg-blue-900/50'
                : 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/50'
              }
            `}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-white">
                Anterior-Lateral
              </h3>
              {!isPediatric && (
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                  ADULT STANDARD
                </span>
              )}
            </div>

            {/* Diagram */}
            <div className="bg-slate-900 rounded p-4 mb-3 text-center font-mono text-sm">
              <div className="text-slate-400">
                {`    ┌─────┐`}<br/>
                {`    │  ●  │ ← R clavicle`}<br/>
                {`    │     │`}<br/>
                {`    └──┬──┘`}<br/>
                {`       │`}<br/>
                {`       │    ● ← L axilla`}
              </div>
            </div>

            <ul className="text-sm space-y-1">
              <li className="text-slate-400 flex items-center gap-2">
                <span>○</span> Standard adult approach
              </li>
              <li className="text-slate-400 flex items-center gap-2">
                <span>○</span> Pads must not touch
              </li>
              <li className={`flex items-center gap-2 ${isPediatric ? 'text-amber-400' : 'text-slate-400'}`}>
                <span>{isPediatric ? '⚠' : '○'}</span> {isPediatric ? 'May have higher impedance' : 'Good for larger patients'}
              </li>
            </ul>
          </button>
        </div>

        {/* Educational tip */}
        <div className="mt-4 bg-blue-900/30 border border-blue-700 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-blue-400 text-lg">💡</span>
            <p className="text-blue-200 text-sm">
              <strong>TIP:</strong> In pediatric patients, anterior-posterior placement
              reduces transthoracic impedance and improves shock delivery to the heart.
              The posterior pad can be placed directly behind the sternum or slightly
              to the left.
            </p>
          </div>
        </div>

        {/* Cancel button */}
        <div className="mt-4 text-center">
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
