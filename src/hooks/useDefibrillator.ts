// useDefibrillator hook - manages defibrillator state and audio coordination

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  DefibrillatorState,
  PadPosition,
  DefibAction,
  createInitialDefibState,
  getChargeTime,
  getRecommendedEnergy,
  PEDIATRIC_ENERGY_OPTIONS
} from '../kernel/defibrillator/types';
import * as machine from '../kernel/defibrillator/machine';

interface UseDefibrillatorOptions {
  patientWeight: number;
  rhythm: 'SVT' | 'SINUS' | 'ASYSTOLE';
  sedated: boolean;
  onShockDelivered: (energy: number, syncMode: boolean) => void;
  getSimulationTime: () => number;
}

interface UseDefibrillatorReturn {
  state: DefibrillatorState;
  actions: DefibAction[];

  // Device actions
  powerOn: () => void;
  powerOff: () => void;

  // Pad actions
  startAttachingPads: () => void;
  confirmPadPlacement: (position: PadPosition) => void;

  // Control actions
  toggleSyncMode: () => void;
  selectEnergy: (joules: number) => void;
  increaseEnergy: () => void;
  decreaseEnergy: () => void;

  // Shock workflow
  analyze: () => void;
  charge: () => void;
  cancelCharge: () => void;
  announceClear: () => void;
  deliverShock: () => void;

  // Validation
  validation: machine.ValidationResult;
  nurseMessage: string | null;

  // Helpers
  canCharge: boolean;
  canShock: boolean;
  recommendedEnergy: number;
  displayText: string;
  energyOptions: readonly number[];
}

export function useDefibrillator(options: UseDefibrillatorOptions): UseDefibrillatorReturn {
  const { patientWeight, rhythm, sedated, onShockDelivered, getSimulationTime } = options;

  const [state, setState] = useState<DefibrillatorState>(() => {
    const initial = createInitialDefibState();
    // Set initial energy based on patient weight
    initial.selectedEnergy = getRecommendedEnergy(patientWeight, 1);
    return initial;
  });

  const [actions, setActions] = useState<DefibAction[]>([]);

  // Refs for animation and audio
  const chargingIntervalRef = useRef<number | null>(null);
  const analysisTimeoutRef = useRef<number | null>(null);

  // Add action to log
  const logAction = useCallback((action: Omit<DefibAction, 'time'>) => {
    setActions(prev => [...prev, { ...action, time: getSimulationTime() }]);
  }, [getSimulationTime]);

  // ============================================================================
  // Device Actions
  // ============================================================================

  const powerOn = useCallback(() => {
    setState(s => machine.powerOn(s));
    logAction({ type: 'device_powered_on' });
  }, [logAction]);

  const powerOff = useCallback(() => {
    // Clean up any running timers
    if (chargingIntervalRef.current) {
      clearInterval(chargingIntervalRef.current);
      chargingIntervalRef.current = null;
    }
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
    setState(machine.powerOff);
  }, []);

  // ============================================================================
  // Pad Actions
  // ============================================================================

  const startAttachingPads = useCallback(() => {
    setState(s => machine.startAttachingPads(s));
  }, []);

  const confirmPadPlacement = useCallback((position: PadPosition) => {
    setState(s => machine.confirmPadPlacement(s, position, patientWeight));
    logAction({ type: 'pads_attached', padPosition: position });
  }, [patientWeight, logAction]);

  // ============================================================================
  // Control Actions
  // ============================================================================

  const toggleSyncMode = useCallback(() => {
    setState(s => {
      const newState = machine.toggleSyncMode(s);
      return newState;
    });
    // Log after state update
    setTimeout(() => {
      setState(s => {
        logAction({ type: 'sync_toggled', syncMode: s.syncMode });
        return s;
      });
    }, 0);
  }, [logAction]);

  const selectEnergy = useCallback((joules: number) => {
    setState(s => machine.selectEnergy(s, joules));
    logAction({ type: 'energy_selected', energy: joules });
  }, [logAction]);

  const increaseEnergy = useCallback(() => {
    setState(s => {
      const currentIndex = PEDIATRIC_ENERGY_OPTIONS.indexOf(s.selectedEnergy as typeof PEDIATRIC_ENERGY_OPTIONS[number]);
      if (currentIndex < PEDIATRIC_ENERGY_OPTIONS.length - 1) {
        const newEnergy = PEDIATRIC_ENERGY_OPTIONS[currentIndex + 1];
        logAction({ type: 'energy_selected', energy: newEnergy });
        return machine.selectEnergy(s, newEnergy);
      }
      return s;
    });
  }, [logAction]);

  const decreaseEnergy = useCallback(() => {
    setState(s => {
      const currentIndex = PEDIATRIC_ENERGY_OPTIONS.indexOf(s.selectedEnergy as typeof PEDIATRIC_ENERGY_OPTIONS[number]);
      if (currentIndex > 0) {
        const newEnergy = PEDIATRIC_ENERGY_OPTIONS[currentIndex - 1];
        logAction({ type: 'energy_selected', energy: newEnergy });
        return machine.selectEnergy(s, newEnergy);
      }
      return s;
    });
  }, [logAction]);

  // ============================================================================
  // Shock Workflow
  // ============================================================================

  const analyze = useCallback(() => {
    const now = getSimulationTime();
    setState(s => machine.startAnalysis(s, now));

    // Complete analysis after 4 seconds
    analysisTimeoutRef.current = window.setTimeout(() => {
      setState(s => machine.completeAnalysis(s, rhythm));
      analysisTimeoutRef.current = null;
    }, 4000);
  }, [rhythm, getSimulationTime]);

  const charge = useCallback(() => {
    const now = getSimulationTime();
    setState(s => {
      const newState = machine.startCharging(s, now);
      logAction({ type: 'charge_started', energy: s.selectedEnergy });
      return newState;
    });

    // Start charge level animation
    const chargeTime = getChargeTime(state.selectedEnergy);
    const startTime = Date.now();

    chargingIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const level = Math.min(100, (elapsed / chargeTime) * 100);

      setState(s => {
        if (s.deviceState !== 'CHARGING') {
          if (chargingIntervalRef.current) {
            clearInterval(chargingIntervalRef.current);
            chargingIntervalRef.current = null;
          }
          return s;
        }

        if (level >= 100) {
          if (chargingIntervalRef.current) {
            clearInterval(chargingIntervalRef.current);
            chargingIntervalRef.current = null;
          }
          return {
            ...s,
            deviceState: 'READY',
            chargeLevel: 100,
            chargeStartTime: null
          };
        }

        return { ...s, chargeLevel: level };
      });
    }, 50);
  }, [state.selectedEnergy, getSimulationTime, logAction]);

  const cancelCharge = useCallback(() => {
    if (chargingIntervalRef.current) {
      clearInterval(chargingIntervalRef.current);
      chargingIntervalRef.current = null;
    }
    setState(s => machine.cancelCharge(s));
    logAction({ type: 'charge_cancelled' });
  }, [logAction]);

  const announceClear = useCallback(() => {
    setState(s => machine.announceClear(s));
    logAction({ type: 'clear_announced' });
  }, [logAction]);

  const deliverShock = useCallback(() => {
    const now = getSimulationTime();

    // Capture current state values before updating
    const currentEnergy = state.selectedEnergy;
    const currentSyncMode = state.syncMode;

    setState(s => {
      const newState = machine.deliverShock(s, now);

      // Log the action
      logAction({
        type: 'shock_delivered',
        energy: s.selectedEnergy,
        syncMode: s.syncMode
      });

      // Complete shock after brief delay
      setTimeout(() => {
        setState(current => machine.completeShock(current));
      }, 500);

      return newState;
    });

    // Notify parent of shock AFTER setState (not inside it)
    // This avoids "Cannot update component while rendering" warning
    onShockDelivered(currentEnergy, currentSyncMode);
  }, [getSimulationTime, logAction, onShockDelivered, state.selectedEnergy, state.syncMode]);

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      if (chargingIntervalRef.current) {
        clearInterval(chargingIntervalRef.current);
      }
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const validation = machine.validateSetup(state, rhythm, sedated, patientWeight);
  const nurseMessage = machine.getNurseMessage(validation.issues);
  const canCharge = machine.canCharge(state);
  const canShock = machine.canShock(state);
  const recommendedEnergy = getRecommendedEnergy(patientWeight, state.shockCount + 1);
  const displayText = machine.getStateDisplayText(state);

  return {
    state,
    actions,

    powerOn,
    powerOff,

    startAttachingPads,
    confirmPadPlacement,

    toggleSyncMode,
    selectEnergy,
    increaseEnergy,
    decreaseEnergy,

    analyze,
    charge,
    cancelCharge,
    announceClear,
    deliverShock,

    validation,
    nurseMessage,

    canCharge,
    canShock,
    recommendedEnergy,
    displayText,
    energyOptions: PEDIATRIC_ENERGY_OPTIONS
  };
}
