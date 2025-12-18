/**
 * State Mapper - Translates simulation state to avatar visual state
 */

import type { AvatarState, Posture, Expression, SkinTone, EyeState, RespiratoryEffort } from './types';
import { DEFAULT_AVATAR_STATE } from './types';

export type SimPhase = 'IDLE' | 'RUNNING' | 'ASYSTOLE' | 'CONVERTED';
export type DeteriorationStage = 'compensated' | 'early_stress' | 'moderate_stress' | 'decompensating' | 'critical';

export interface SimulationStateForAvatar {
  phase: SimPhase;
  deteriorationStage?: DeteriorationStage;
  lilyFear: number; // 0-5
  vitals: {
    hr: number;
    spo2: number;
    rr: number;
    sbp: number;
    dbp: number;
  };
  ivAccess: boolean;
  ivInProgress?: boolean;
  ioInProgress?: boolean;
  sedated?: boolean;
}

/**
 * Maps simulation state to avatar visual state
 */
export function mapSimulationToAvatar(simState: SimulationStateForAvatar): AvatarState {
  const {
    phase,
    deteriorationStage = 'compensated',
    lilyFear,
    vitals,
    ivInProgress = false,
    ioInProgress = false,
    sedated = false,
  } = simState;

  // Handle asystole - completely unresponsive
  if (phase === 'ASYSTOLE') {
    return {
      ...DEFAULT_AVATAR_STATE,
      posture: 'limp',
      expression: 'exhausted',
      skinTone: 'cyanotic',
      eyeState: 'closed',
      hasTears: false,
      respiratoryRate: 0,
      respiratoryEffort: 'none',
      hasRetractions: false,
      hasNasalFlaring: false,
      isSedated: false,
    };
  }

  // Handle sedated state
  if (sedated) {
    return {
      ...DEFAULT_AVATAR_STATE,
      posture: 'lying',
      expression: 'sleepy',
      skinTone: mapSkinTone(phase, deteriorationStage, vitals.spo2),
      eyeState: 'closed',
      hasTears: false,
      respiratoryRate: Math.max(12, vitals.rr - 4), // Slightly slower when sedated
      respiratoryEffort: 'shallow',
      hasRetractions: false,
      hasNasalFlaring: false,
      isSedated: true,
    };
  }

  // Map posture from phase and deterioration
  const posture = mapPosture(phase, deteriorationStage);

  // Map expression from fear level
  const expression = mapExpression(lilyFear, phase);

  // Map skin tone from perfusion/phase
  const skinTone = mapSkinTone(phase, deteriorationStage, vitals.spo2);

  // Map eye state from fear and phase
  const eyeState = mapEyeState(lilyFear, phase);

  // Map respiratory effort
  const respiratoryEffort = mapRespiratoryEffort(vitals.rr, deteriorationStage);

  return {
    posture,
    expression,
    skinTone,
    eyeState,
    hasTears: lilyFear >= 3,
    respiratoryRate: vitals.rr,
    respiratoryEffort,
    hasRetractions: deteriorationStage !== 'compensated' && deteriorationStage !== 'early_stress',
    hasNasalFlaring: deteriorationStage === 'decompensating' || deteriorationStage === 'critical',
    isReceivingIV: ivInProgress,
    isReceivingIO: ioInProgress,
    isFlinching: ivInProgress || ioInProgress,
    isSedated: false,
  };
}

function mapPosture(phase: SimPhase, deteriorationStage: DeteriorationStage): Posture {
  if (phase === 'IDLE') return 'sitting';
  if (phase === 'ASYSTOLE') return 'limp';
  if (phase === 'CONVERTED') return 'sitting';

  switch (deteriorationStage) {
    case 'compensated':
    case 'early_stress':
      return 'sitting';
    case 'moderate_stress':
      return 'leaning';
    case 'decompensating':
    case 'critical':
      return 'lying';
    default:
      return 'sitting';
  }
}

function mapExpression(lilyFear: number, phase: SimPhase): Expression {
  if (phase === 'CONVERTED') return 'relief';
  if (phase === 'IDLE') return 'neutral';

  if (lilyFear <= 1) return 'worried';
  if (lilyFear === 2) return 'worried';
  if (lilyFear === 3) return 'scared';
  if (lilyFear === 4) return 'distressed';
  return 'exhausted';
}

function mapSkinTone(phase: SimPhase, deteriorationStage: DeteriorationStage, spo2: number): SkinTone {
  if (phase === 'ASYSTOLE') return 'cyanotic';
  if (phase === 'CONVERTED') return 'pink';

  // Low SpO2 overrides deterioration stage
  if (spo2 < 85) return 'cyanotic';
  if (spo2 < 90) return 'gray';

  switch (deteriorationStage) {
    case 'critical':
      return 'gray';
    case 'decompensating':
      return 'mottled';
    case 'moderate_stress':
    case 'early_stress':
      return 'pale';
    case 'compensated':
    default:
      return 'pink';
  }
}

function mapEyeState(lilyFear: number, phase: SimPhase): EyeState {
  if (phase === 'ASYSTOLE') return 'closed';
  if (phase === 'CONVERTED') return 'open';

  if (lilyFear >= 4) return 'squinting';
  if (lilyFear >= 2) return 'wide';
  return 'open';
}

function mapRespiratoryEffort(rr: number, deteriorationStage: DeteriorationStage): RespiratoryEffort {
  if (rr === 0) return 'none';
  if (deteriorationStage === 'critical') return 'shallow';
  if (rr > 40 || deteriorationStage === 'decompensating') return 'labored';
  if (rr > 30 || deteriorationStage === 'moderate_stress') return 'increased';
  return 'normal';
}

/**
 * Calculate breathing animation duration in seconds
 */
export function getBreathDuration(respiratoryRate: number): number {
  if (respiratoryRate <= 0) return 0;
  return 60 / respiratoryRate;
}

/**
 * Get CSS animation class for breathing effort
 */
export function getBreathingClass(effort: RespiratoryEffort): string {
  switch (effort) {
    case 'labored':
      return 'breathing-labored';
    case 'increased':
      return 'breathing-increased';
    case 'shallow':
      return 'breathing-shallow';
    case 'none':
      return 'breathing-none';
    default:
      return 'breathing-normal';
  }
}
