// Defibrillator type definitions for pediatric synchronized cardioversion

export type DeviceState =
  | 'OFF'
  | 'STANDBY'          // Device on, awaiting pads
  | 'ANALYZING'        // Analyzing rhythm (4s)
  | 'SHOCK_ADVISED'    // Ready to charge
  | 'CHARGING'         // Capacitor charging
  | 'READY'            // Charged, awaiting shock delivery
  | 'DISCHARGING';     // Shock being delivered

export type PadState =
  | 'NOT_ATTACHED'
  | 'ATTACHING'        // Showing placement UI
  | 'POOR_CONTACT'     // High impedance
  | 'GOOD_CONTACT';    // Ready for use

export type PadPosition =
  | 'ANTERIOR_LATERAL'     // Adult standard: right clavicle + left axilla
  | 'ANTERIOR_POSTERIOR';  // Pediatric preferred: sternum + back

export type RhythmAnalysis = 'SHOCKABLE' | 'NON_SHOCKABLE' | null;

export interface DefibrillatorState {
  // Device state
  deviceState: DeviceState;
  syncMode: boolean;               // true for cardioversion, false for defib
  selectedEnergy: number;          // Current energy in joules
  chargeLevel: number;             // 0-100 percentage during charging
  chargeStartTime: number | null;  // timestamp when charging started

  // Pads
  padState: PadState;
  padPosition: PadPosition | null;
  impedance: number;               // Ohms (40-150 normal, >150 poor)

  // Safety
  clearAnnounced: boolean;         // Has user confirmed "everyone clear"
  shockCount: number;              // Total shocks delivered this session
  lastShockEnergy: number | null;
  lastShockTime: number | null;

  // Analysis
  rhythmAnalysis: RhythmAnalysis;
  analysisStartTime: number | null;
}

// Action types for defibrillator events (for debrief tracking)
export type DefibActionType =
  | 'device_powered_on'
  | 'pads_attached'
  | 'sync_toggled'
  | 'energy_selected'
  | 'charge_started'
  | 'charge_cancelled'
  | 'clear_announced'
  | 'shock_delivered'
  | 'shock_cancelled';

export interface DefibAction {
  type: DefibActionType;
  time: number;                    // simulation time in ms
  energy?: number;
  syncMode?: boolean;
  padPosition?: PadPosition;
  success?: boolean;               // for shock_delivered
}

// Energy options available on the device (pediatric mode)
export const PEDIATRIC_ENERGY_OPTIONS = [
  5, 10, 15, 20, 25, 30, 35, 40, 50, 70, 100, 150, 200
] as const;

// PALS-recommended energy range for synchronized cardioversion
export const PALS_CARDIOVERSION = {
  initial: 0.5,     // J/kg for first shock
  subsequent: 1.0,  // J/kg for second shock
  maximum: 2.0      // J/kg maximum
} as const;

/**
 * Calculate charge time in milliseconds based on energy level
 * Real devices: ~2-4 seconds depending on capacitor and energy
 */
export function getChargeTime(joules: number): number {
  // Linear interpolation: 1.5s at low energy, up to 4s at 200J
  return 1500 + (joules / 200) * 2500;
}

/**
 * Calculate recommended energy for a given patient weight and attempt number
 */
export function getRecommendedEnergy(weightKg: number, attemptNumber: number): number {
  const jPerKg = attemptNumber === 1 ? PALS_CARDIOVERSION.initial : PALS_CARDIOVERSION.subsequent;
  const rawEnergy = weightKg * jPerKg;

  // Round to nearest available energy option
  const options = [...PEDIATRIC_ENERGY_OPTIONS] as number[];
  let closest: number = options[0];
  let minDiff = Math.abs(rawEnergy - closest);

  for (const opt of options) {
    const diff = Math.abs(rawEnergy - opt);
    if (diff < minDiff) {
      minDiff = diff;
      closest = opt;
    }
  }

  return closest;
}

/**
 * Initial defibrillator state
 */
export function createInitialDefibState(): DefibrillatorState {
  return {
    deviceState: 'OFF',
    syncMode: true,                // Default to sync for SVT
    selectedEnergy: 10,            // Will be adjusted when patient weight known
    chargeLevel: 0,
    chargeStartTime: null,

    padState: 'NOT_ATTACHED',
    padPosition: null,
    impedance: 0,

    clearAnnounced: false,
    shockCount: 0,
    lastShockEnergy: null,
    lastShockTime: null,

    rhythmAnalysis: null,
    analysisStartTime: null
  };
}

/**
 * Check if impedance indicates good pad contact
 */
export function isGoodContact(impedance: number): boolean {
  return impedance >= 40 && impedance <= 150;
}

/**
 * Generate realistic impedance value based on pad position and patient
 * Pediatric patients typically have lower impedance (thinner chest wall)
 */
export function generateImpedance(position: PadPosition, weightKg: number): number {
  // Base impedance for pediatric (lower than adult)
  const base = position === 'ANTERIOR_POSTERIOR' ? 45 : 55;

  // Add some realistic variation
  const variation = (Math.random() - 0.5) * 20;

  // Slightly higher for larger children
  const weightFactor = Math.min(1.3, weightKg / 20);

  return Math.round(base * weightFactor + variation);
}
