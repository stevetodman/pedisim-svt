// DefibrillatorPanel - Main container for the defibrillator interface
// Modeled after Zoll X Series for maximum realism

import { useState, useEffect, useCallback } from 'react';
import { useDefibrillator } from '../../hooks/useDefibrillator';
import { PadPosition } from '../../kernel/defibrillator/types';
import DefibScreen from './DefibScreen';
import DefibControls from './DefibControls';
import ChargeBar from './ChargeBar';
import PadPlacement from './PadPlacement';
import ClearConfirmation from './ClearConfirmation';

interface DefibrillatorPanelProps {
  patient: {
    name: string;
    age: string;
    weight: number;
  };
  rhythm: 'SVT' | 'SINUS' | 'ASYSTOLE';
  vitals: {
    hr: number;
    spo2: number;
    systolic: number;
    diastolic: number;
  };
  sedated: boolean;
  getSimulationTime: () => number;
  onShockDelivered: (energy: number, syncMode: boolean) => void;
  onClose: () => void;
  onNurseMessage: (message: string) => void;
}

export default function DefibrillatorPanel({
  patient,
  rhythm,
  vitals,
  sedated,
  getSimulationTime,
  onShockDelivered,
  onClose,
  onNurseMessage
}: DefibrillatorPanelProps) {
  const [showPadPlacement, setShowPadPlacement] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);

  const defib = useDefibrillator({
    patientWeight: patient.weight,
    rhythm,
    sedated,
    onShockDelivered: (energy, syncMode) => {
      onShockDelivered(energy, syncMode);
    },
    getSimulationTime
  });

  // Auto power on when panel opens
  useEffect(() => {
    if (defib.state.deviceState === 'OFF') {
      defib.powerOn();
    }
  }, []);

  // Show nurse messages for validation issues
  useEffect(() => {
    if (defib.nurseMessage && defib.state.deviceState === 'SHOCK_ADVISED') {
      onNurseMessage(defib.nurseMessage);
    }
  }, [defib.nurseMessage, defib.state.deviceState, onNurseMessage]);

  // Handle pad attachment
  const handleAttachPads = useCallback(() => {
    defib.startAttachingPads();
    setShowPadPlacement(true);
  }, [defib]);

  const handlePadPlacementConfirm = useCallback((position: PadPosition) => {
    defib.confirmPadPlacement(position);
    setShowPadPlacement(false);

    // Nurse feedback on position
    if (position === 'ANTERIOR_LATERAL' && patient.weight < 25) {
      onNurseMessage("For kids this size, A-P usually works better, but this should be fine.");
    } else {
      onNurseMessage("Pads on, good contact. Ready when you are, doctor.");
    }

    // Auto-start analysis after pads attached
    setTimeout(() => {
      defib.analyze();
    }, 500);
  }, [defib, patient.weight, onNurseMessage]);

  // Handle charge button
  const handleCharge = useCallback(() => {
    // Check validation first
    if (!defib.validation.canProceed) {
      if (defib.nurseMessage) {
        onNurseMessage(defib.nurseMessage);
      }
      return;
    }

    // Check sedation with dialog
    if (!sedated) {
      onNurseMessage("Doctor, she's awake. Cardioversion is extremely painful. Do you want to sedate first?");
      return;
    }

    defib.charge();
  }, [defib, sedated, onNurseMessage]);

  // Handle shock button - show clear confirmation
  const handleShockClick = useCallback(() => {
    if (defib.canShock) {
      setShowClearConfirmation(true);
    }
  }, [defib.canShock]);

  // Handle shock delivery from clear confirmation
  const handleConfirmShock = useCallback(() => {
    defib.announceClear();
    defib.deliverShock();
    setShowClearConfirmation(false);
  }, [defib]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPadPlacement || showClearConfirmation) return;

      switch (e.key.toLowerCase()) {
        case 'escape':
          if (defib.state.deviceState === 'CHARGING' || defib.state.deviceState === 'READY') {
            defib.cancelCharge();
          } else {
            onClose();
          }
          break;
        case 's':
          defib.toggleSyncMode();
          break;
        case 'arrowup':
          defib.increaseEnergy();
          break;
        case 'arrowdown':
          defib.decreaseEnergy();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [defib, showPadPlacement, showClearConfirmation, onClose]);

  // Get status color for header
  const getStatusColor = () => {
    switch (defib.state.deviceState) {
      case 'READY':
        return 'bg-red-600';
      case 'CHARGING':
        return 'bg-yellow-600';
      case 'SHOCK_ADVISED':
        return 'bg-green-600';
      case 'DISCHARGING':
        return 'bg-white';
      default:
        return 'bg-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg border-2 border-slate-600 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`${getStatusColor()} px-4 py-2 flex justify-between items-center transition-colors duration-200`}>
          <div className="flex items-center gap-4">
            <span className="text-white font-bold text-lg">
              SYNCHRONIZED CARDIOVERSION
            </span>
            <span className="text-white/80 text-sm">
              {patient.name} ({patient.age}, {patient.weight}kg)
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Main Device Area */}
        <div className="p-4 space-y-4">
          {/* Screen */}
          <DefibScreen
            rhythm={rhythm}
            vitals={vitals}
            syncMode={defib.state.syncMode}
            deviceState={defib.state.deviceState}
            displayText={defib.displayText}
          />

          {/* Energy & Pad Status Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Energy Selector */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
              <div className="text-slate-400 text-sm mb-2">ENERGY (J/kg)</div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={defib.decreaseEnergy}
                  disabled={defib.state.deviceState === 'CHARGING' || defib.state.deviceState === 'READY'}
                  className="w-10 h-10 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-white text-xl font-bold"
                >
                  ◄
                </button>
                <div className="bg-black px-6 py-2 rounded min-w-[100px] text-center">
                  <span className="text-green-400 text-3xl font-mono font-bold">
                    {defib.state.selectedEnergy}
                  </span>
                  <span className="text-green-400 text-lg ml-1">J</span>
                </div>
                <button
                  onClick={defib.increaseEnergy}
                  disabled={defib.state.deviceState === 'CHARGING' || defib.state.deviceState === 'READY'}
                  className="w-10 h-10 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-white text-xl font-bold"
                >
                  ►
                </button>
              </div>
              <div className="text-slate-500 text-xs text-center mt-2">
                {(defib.state.selectedEnergy / patient.weight).toFixed(1)} J/kg
                {defib.state.shockCount === 0 && defib.state.selectedEnergy !== defib.recommendedEnergy && (
                  <span className="text-amber-400 ml-2">
                    (recommended: {defib.recommendedEnergy}J)
                  </span>
                )}
              </div>
              <div className="text-slate-600 text-xs text-center mt-1">
                PALS range: 0.5-2 J/kg ({Math.round(patient.weight * 0.5)}-{Math.round(patient.weight * 2)}J)
              </div>
            </div>

            {/* Pad Status */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
              <div className="text-slate-400 text-sm mb-2">PAD STATUS</div>
              {defib.state.padState === 'NOT_ATTACHED' ? (
                <button
                  onClick={handleAttachPads}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-lg font-bold"
                >
                  ATTACH PADS
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      defib.state.padState === 'GOOD_CONTACT' ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-white">
                      {defib.state.padState === 'GOOD_CONTACT' ? 'Good Contact' : 'Poor Contact'}
                    </span>
                  </div>
                  <div className="text-slate-400 text-sm">
                    Position: {defib.state.padPosition === 'ANTERIOR_POSTERIOR' ? 'Anterior-Posterior' : 'Anterior-Lateral'}
                  </div>
                  <div className="text-slate-500 text-xs">
                    Impedance: {defib.state.impedance}Ω
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Charge Bar */}
          <ChargeBar
            chargeLevel={defib.state.chargeLevel}
            deviceState={defib.state.deviceState}
            selectedEnergy={defib.state.selectedEnergy}
          />

          {/* Controls */}
          <DefibControls
            syncMode={defib.state.syncMode}
            deviceState={defib.state.deviceState}
            canCharge={defib.canCharge}
            canShock={defib.canShock}
            onToggleSync={defib.toggleSyncMode}
            onCharge={handleCharge}
            onCancelCharge={defib.cancelCharge}
            onShock={handleShockClick}
          />

          {/* Safety Checklist */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="text-slate-400 text-sm mb-2">PRE-SHOCK CHECKLIST</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className={`flex items-center gap-2 ${sedated ? 'text-green-400' : 'text-red-400'}`}>
                {sedated ? '☑' : '☐'} Sedation administered
              </div>
              <div className={`flex items-center gap-2 ${defib.state.syncMode ? 'text-green-400' : 'text-amber-400'}`}>
                {defib.state.syncMode ? '☑' : '⚠'} Sync mode enabled
              </div>
              <div className={`flex items-center gap-2 ${defib.state.clearAnnounced ? 'text-green-400' : 'text-slate-500'}`}>
                {defib.state.clearAnnounced ? '☑' : '☐'} "Everyone clear" announced
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                ☐ No one touching patient
              </div>
            </div>
          </div>
        </div>

        {/* Pad Placement Modal */}
        {showPadPlacement && (
          <PadPlacement
            patientWeight={patient.weight}
            onSelect={handlePadPlacementConfirm}
            onCancel={() => setShowPadPlacement(false)}
          />
        )}

        {/* Clear Confirmation Modal */}
        {showClearConfirmation && (
          <ClearConfirmation
            energy={defib.state.selectedEnergy}
            syncMode={defib.state.syncMode}
            onConfirm={handleConfirmShock}
            onCancel={() => {
              setShowClearConfirmation(false);
              defib.cancelCharge();
            }}
          />
        )}
      </div>
    </div>
  );
}
