// Defibrillator state machine - pure functions for state transitions
// Following kernel pattern: deterministic, no side effects, testable

import {
  DefibrillatorState,
  DeviceState,
  PadPosition,
  getChargeTime,
  generateImpedance,
  isGoodContact,
  createInitialDefibState
} from './types';

// ============================================================================
// State Machine Transition Functions
// ============================================================================

/**
 * Power on the defibrillator
 */
export function powerOn(state: DefibrillatorState): DefibrillatorState {
  if (state.deviceState !== 'OFF') return state;

  return {
    ...state,
    deviceState: 'STANDBY',
    syncMode: true  // Default to sync mode for SVT
  };
}

/**
 * Power off the defibrillator
 */
export function powerOff(_state: DefibrillatorState): DefibrillatorState {
  return createInitialDefibState();
}

/**
 * Start attaching pads (shows placement UI)
 */
export function startAttachingPads(state: DefibrillatorState): DefibrillatorState {
  if (state.deviceState !== 'STANDBY') return state;
  if (state.padState !== 'NOT_ATTACHED') return state;

  return {
    ...state,
    padState: 'ATTACHING'
  };
}

/**
 * Confirm pad placement with selected position
 */
export function confirmPadPlacement(
  state: DefibrillatorState,
  position: PadPosition,
  patientWeightKg: number
): DefibrillatorState {
  if (state.padState !== 'ATTACHING') return state;

  const impedance = generateImpedance(position, patientWeightKg);
  const hasGoodContact = isGoodContact(impedance);

  return {
    ...state,
    padState: hasGoodContact ? 'GOOD_CONTACT' : 'POOR_CONTACT',
    padPosition: position,
    impedance
  };
}

/**
 * Toggle sync mode on/off
 */
export function toggleSyncMode(state: DefibrillatorState): DefibrillatorState {
  // Can toggle in most states except during discharge
  if (state.deviceState === 'DISCHARGING') return state;

  return {
    ...state,
    syncMode: !state.syncMode
  };
}

/**
 * Select energy level
 */
export function selectEnergy(state: DefibrillatorState, joules: number): DefibrillatorState {
  // Can change energy in standby, analyzing, or shock_advised states
  const allowedStates: DeviceState[] = ['STANDBY', 'ANALYZING', 'SHOCK_ADVISED'];
  if (!allowedStates.includes(state.deviceState)) return state;

  return {
    ...state,
    selectedEnergy: joules
  };
}

/**
 * Start rhythm analysis
 */
export function startAnalysis(
  state: DefibrillatorState,
  currentTime: number
): DefibrillatorState {
  // Must have pads attached
  if (state.padState !== 'GOOD_CONTACT' && state.padState !== 'POOR_CONTACT') {
    return state;
  }

  if (state.deviceState !== 'STANDBY' && state.deviceState !== 'SHOCK_ADVISED') {
    return state;
  }

  return {
    ...state,
    deviceState: 'ANALYZING',
    analysisStartTime: currentTime,
    rhythmAnalysis: null
  };
}

/**
 * Complete rhythm analysis (called after analysis duration)
 */
export function completeAnalysis(
  state: DefibrillatorState,
  rhythm: 'SVT' | 'SINUS' | 'ASYSTOLE' | string
): DefibrillatorState {
  if (state.deviceState !== 'ANALYZING') return state;

  // Determine if rhythm is shockable
  // SVT is shockable (with sync), VF/VT would be shockable (without sync)
  // Sinus and asystole are not shockable
  const isShockable = rhythm === 'SVT'; // For this simulation, only SVT

  return {
    ...state,
    deviceState: isShockable ? 'SHOCK_ADVISED' : 'STANDBY',
    rhythmAnalysis: isShockable ? 'SHOCKABLE' : 'NON_SHOCKABLE',
    analysisStartTime: null
  };
}

/**
 * Start charging the defibrillator
 */
export function startCharging(
  state: DefibrillatorState,
  currentTime: number
): DefibrillatorState {
  if (state.deviceState !== 'SHOCK_ADVISED') return state;

  return {
    ...state,
    deviceState: 'CHARGING',
    chargeStartTime: currentTime,
    chargeLevel: 0,
    clearAnnounced: false
  };
}

/**
 * Update charge level during charging (called on animation frame)
 */
export function updateChargeLevel(
  state: DefibrillatorState,
  currentTime: number
): DefibrillatorState {
  if (state.deviceState !== 'CHARGING') return state;
  if (state.chargeStartTime === null) return state;

  const elapsed = currentTime - state.chargeStartTime;
  const totalChargeTime = getChargeTime(state.selectedEnergy);
  const level = Math.min(100, (elapsed / totalChargeTime) * 100);

  if (level >= 100) {
    // Charging complete
    return {
      ...state,
      deviceState: 'READY',
      chargeLevel: 100,
      chargeStartTime: null
    };
  }

  return {
    ...state,
    chargeLevel: level
  };
}

/**
 * Cancel charging (disarm)
 */
export function cancelCharge(state: DefibrillatorState): DefibrillatorState {
  if (state.deviceState !== 'CHARGING' && state.deviceState !== 'READY') {
    return state;
  }

  return {
    ...state,
    deviceState: 'SHOCK_ADVISED',
    chargeLevel: 0,
    chargeStartTime: null,
    clearAnnounced: false
  };
}

/**
 * Announce "everyone clear"
 */
export function announceClear(state: DefibrillatorState): DefibrillatorState {
  if (state.deviceState !== 'READY') return state;

  return {
    ...state,
    clearAnnounced: true
  };
}

/**
 * Deliver shock
 */
export function deliverShock(
  state: DefibrillatorState,
  currentTime: number
): DefibrillatorState {
  if (state.deviceState !== 'READY') return state;

  return {
    ...state,
    deviceState: 'DISCHARGING',
    lastShockEnergy: state.selectedEnergy,
    lastShockTime: currentTime,
    shockCount: state.shockCount + 1
  };
}

/**
 * Complete shock delivery (return to analyzing or standby)
 */
export function completeShock(state: DefibrillatorState): DefibrillatorState {
  if (state.deviceState !== 'DISCHARGING') return state;

  return {
    ...state,
    deviceState: 'STANDBY',  // Will go back to ANALYZING when re-analyzed
    chargeLevel: 0,
    clearAnnounced: false,
    rhythmAnalysis: null     // Need to re-analyze after shock
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  canProceed: boolean;
}

export interface ValidationIssue {
  code: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

/**
 * Validate defibrillator setup before shock
 */
export function validateSetup(
  state: DefibrillatorState,
  rhythm: string,
  sedated: boolean,
  patientWeight: number
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check sync mode for SVT
  if (rhythm === 'SVT' && !state.syncMode) {
    issues.push({
      code: 'sync_off_for_svt',
      severity: 'critical',
      message: 'SVT requires synchronized cardioversion. Enable SYNC mode.'
    });
  }

  // Check sedation
  if (!sedated) {
    issues.push({
      code: 'not_sedated',
      severity: 'critical',
      message: 'Patient is awake. Cardioversion is extremely painful without sedation.'
    });
  }

  // Check energy level
  const jPerKg = state.selectedEnergy / patientWeight;
  if (jPerKg > 1.5 && state.shockCount === 0) {
    issues.push({
      code: 'high_initial_energy',
      severity: 'warning',
      message: `${state.selectedEnergy}J is ${jPerKg.toFixed(1)} J/kg. PALS recommends starting at 0.5 J/kg.`
    });
  }

  if (jPerKg > 2.0) {
    issues.push({
      code: 'excessive_energy',
      severity: 'warning',
      message: `${state.selectedEnergy}J exceeds maximum recommended 2 J/kg (${Math.round(patientWeight * 2)}J).`
    });
  }

  // Check pad contact
  if (state.padState === 'POOR_CONTACT') {
    issues.push({
      code: 'poor_contact',
      severity: 'warning',
      message: `Pad impedance is ${state.impedance}Ω. Check pad placement for better contact.`
    });
  }

  // Check pad position for pediatric
  if (state.padPosition === 'ANTERIOR_LATERAL' && patientWeight < 25) {
    issues.push({
      code: 'adult_pad_position',
      severity: 'info',
      message: 'Anterior-posterior placement is preferred for pediatric patients.'
    });
  }

  // Determine if can proceed
  const hasCritical = issues.some(i => i.severity === 'critical');
  const canProceed = !hasCritical;

  return {
    valid: issues.length === 0,
    issues,
    canProceed
  };
}

/**
 * Get nurse message for validation issues
 */
export function getNurseMessage(issues: ValidationIssue[]): string | null {
  // Prioritize critical issues
  const critical = issues.find(i => i.severity === 'critical');
  if (critical) {
    switch (critical.code) {
      case 'sync_off_for_svt':
        return "Doctor, you're in defibrillation mode. Did you want synchronized cardioversion for SVT?";
      case 'not_sedated':
        return "Doctor, she's awake. Cardioversion is extremely painful. Do you want to sedate first?";
      default:
        return critical.message;
    }
  }

  // Then warnings
  const warning = issues.find(i => i.severity === 'warning');
  if (warning) {
    switch (warning.code) {
      case 'high_initial_energy':
        return `That's ${warning.message.split('J/kg')[0]}J/kg - we usually start at 0.5 for stable SVT. Your call, but we could start lower.`;
      case 'poor_contact':
        return "Impedance is a bit high. Might want to check the pad placement.";
      default:
        return warning.message;
    }
  }

  return null;
}

/**
 * Check if device can start charging
 */
export function canCharge(state: DefibrillatorState): boolean {
  return (
    state.deviceState === 'SHOCK_ADVISED' &&
    (state.padState === 'GOOD_CONTACT' || state.padState === 'POOR_CONTACT') &&
    state.selectedEnergy > 0
  );
}

/**
 * Check if device can deliver shock
 */
export function canShock(state: DefibrillatorState): boolean {
  return state.deviceState === 'READY' && state.chargeLevel >= 100;
}

/**
 * Get display text for current device state
 */
export function getStateDisplayText(state: DefibrillatorState): string {
  switch (state.deviceState) {
    case 'OFF':
      return 'DEVICE OFF';
    case 'STANDBY':
      if (state.padState === 'NOT_ATTACHED') {
        return 'ATTACH PADS TO PATIENT';
      }
      return 'STANDBY - SELECT ENERGY AND ANALYZE';
    case 'ANALYZING':
      return 'ANALYZING RHYTHM... STAND CLEAR';
    case 'SHOCK_ADVISED':
      return `SHOCK ADVISED - ${state.selectedEnergy}J`;
    case 'CHARGING':
      return `CHARGING... ${Math.round(state.chargeLevel)}%`;
    case 'READY':
      return `CHARGED ${state.selectedEnergy}J - STAND CLEAR`;
    case 'DISCHARGING':
      return 'SHOCK DELIVERED';
    default:
      return '';
  }
}
