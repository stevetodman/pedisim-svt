// ============================================================================
// PHYSIOLOGY ENGINE
// Deterministic clinical outcome calculations for interventions
// This is the "source of truth" - AI cannot override these outcomes
// ============================================================================

import {
  PatientState,
  InterventionRequest,
  InterventionResult,
  SimulationEvent,
  Rhythm,
  TransientState,
} from './types';
import { evaluateDoseAccuracy } from './doses';

// Import shared random utility for testability
import { random, setRandomSeed, resetRandom } from './random';

// Re-export for backwards compatibility
export { setRandomSeed, resetRandom };

// ============================================================================
// INTERVENTION PROCESSORS
// ============================================================================

/**
 * Process vagal maneuver (ice to face, Valsalva, etc.)
 */
function processVagalManeuver(
  state: PatientState,
  request: InterventionRequest
): InterventionResult {
  const events: SimulationEvent[] = [];
  
  // Only works for SVT
  if (state.rhythm !== 'SVT') {
    return {
      success: false,
      executed: true,
      reason: 'Vagal maneuvers only effective for SVT',
      outcome: 'NO_EFFECT',
      newState: {},
      events: [{
        timestamp: request.timestamp,
        type: 'INTERVENTION_EXECUTED',
        data: { intervention: request.type, outcome: 'NO_EFFECT' }
      }]
    };
  }

  // Success rate: ~15-30% for vagal maneuvers in peds
  const successRate = 0.25;
  const success = random() < successRate;

  if (success) {
    events.push({
      timestamp: request.timestamp,
      type: 'RHYTHM_CHANGE',
      data: { from: 'SVT', to: 'SINUS', mechanism: 'vagal_conversion' }
    });

    return {
      success: true,
      executed: true,
      outcome: 'CONVERTED',
      newState: {
        rhythm: 'SINUS',
        vitals: {
          ...state.vitals,
          heartRate: 85 + Math.floor(random() * 20), // 85-105 sinus
        },
        timeInCurrentRhythm: 0,
      },
      events
    };
  }

  // Failed - no change
  events.push({
    timestamp: request.timestamp,
    type: 'INTERVENTION_EXECUTED',
    data: { intervention: request.type, outcome: 'NO_EFFECT' }
  });

  return {
    success: false,
    executed: true,
    outcome: 'NO_EFFECT',
    newState: {},
    events
  };
}

/**
 * Process adenosine administration
 */
function processAdenosine(
  state: PatientState,
  request: InterventionRequest,
  isSecondDose: boolean = false
): InterventionResult {
  const events: SimulationEvent[] = [];

  // Prerequisites check
  if (!state.ivAccess && !state.ioAccess) {
    return {
      success: false,
      executed: false,
      reason: 'No IV/IO access established',
      outcome: 'PREREQUISITE_MISSING',
      newState: {},
      events: [{
        timestamp: request.timestamp,
        type: 'INTERVENTION_ATTEMPTED',
        data: { intervention: request.type, blocked: 'NO_ACCESS' }
      }]
    };
  }

  // Only effective for SVT (or reveals underlying rhythm)
  if (state.rhythm !== 'SVT' && state.rhythm !== 'ATRIAL_FLUTTER') {
    return {
      success: false,
      executed: true,
      reason: 'Adenosine not indicated for this rhythm',
      outcome: 'NO_EFFECT',
      newState: {},
      events: [{
        timestamp: request.timestamp,
        type: 'INTERVENTION_EXECUTED',
        data: { intervention: request.type, outcome: 'NO_EFFECT' }
      }]
    };
  }

  // Evaluate dose accuracy
  const dose = request.dose || 0;
  const doseEval = evaluateDoseAccuracy(
    isSecondDose ? 'ADENOSINE_2' : 'ADENOSINE',
    dose,
    state.profile.weight
  );

  // Success probability based on dose accuracy
  // Correct dose: 60% first, 80% second
  // Under/over dose: reduced probability
  let baseSuccessRate = isSecondDose ? 0.80 : 0.60;
  
  // Modify by dose accuracy
  if (doseEval.accuracy < 0.5) {
    baseSuccessRate *= 0.2;  // Very underdosed - likely to fail
  } else if (doseEval.accuracy < 0.8) {
    baseSuccessRate *= 0.6;  // Underdosed
  } else if (doseEval.accuracy > 1.5) {
    baseSuccessRate *= 0.9;  // Overdosed - still works but not ideal
  }

  // Adenosine ALWAYS causes transient asystole/AV block (this is the teaching moment)
  const asystoleDuration = 3000 + Math.floor(random() * 4000); // 3-7 seconds

  // Create transient state
  const transientState: TransientState = {
    type: 'ADENOSINE_EFFECT',
    startTime: request.timestamp,
    duration: asystoleDuration,
    previousRhythm: state.rhythm,
    previousHR: state.vitals.heartRate,
  };

  events.push({
    timestamp: request.timestamp,
    type: 'TRANSIENT_START',
    data: { 
      type: 'ADENOSINE_EFFECT', 
      duration: asystoleDuration,
      dose: dose,
      doseAccuracy: doseEval.accuracy
    }
  });

  // Will it convert?
  const willConvert = random() < baseSuccessRate;

  // Return result with transient state
  // The kernel will manage the transition after asystole
  return {
    success: willConvert,
    executed: true,
    outcome: 'TRANSIENT_RESPONSE',
    newState: {
      transientState,
      // During transient, show asystole
      rhythm: 'ASYSTOLE',
      vitals: {
        ...state.vitals,
        heartRate: 0,
      },
    },
    events,
    // Store conversion result for after transient
    _pendingConversion: willConvert,
    _doseAccuracy: doseEval.accuracy,
  } as InterventionResult & { _pendingConversion: boolean; _doseAccuracy: number };
}

/**
 * Process synchronized cardioversion
 */
function processCardioversion(
  state: PatientState,
  request: InterventionRequest
): InterventionResult {
  const events: SimulationEvent[] = [];

  // Prerequisites
  if (!state.sedated) {
    return {
      success: false,
      executed: false,
      reason: 'Patient must be sedated before cardioversion',
      outcome: 'PREREQUISITE_MISSING',
      newState: {},
      events: [{
        timestamp: request.timestamp,
        type: 'INTERVENTION_ATTEMPTED',
        data: { intervention: request.type, blocked: 'NOT_SEDATED' }
      }]
    };
  }

  // Check rhythm is shockable with sync
  const syncableRhythms: Rhythm[] = ['SVT', 'ATRIAL_FLUTTER', 'ATRIAL_FIB', 'VTACH_PULSE'];
  if (!syncableRhythms.includes(state.rhythm)) {
    return {
      success: false,
      executed: true,
      reason: 'Rhythm not appropriate for synchronized cardioversion',
      outcome: 'NO_EFFECT',
      newState: {},
      events: [{
        timestamp: request.timestamp,
        type: 'INTERVENTION_EXECUTED',
        data: { intervention: request.type, outcome: 'NOT_INDICATED' }
      }]
    };
  }

  // Evaluate energy dose
  const energy = request.dose || 0;
  const energyEval = evaluateDoseAccuracy('CARDIOVERSION_SYNC', energy, state.profile.weight);

  // Success rate based on dose
  // Correct energy: 90%+ success for SVT
  let successRate = 0.92;
  if (energyEval.accuracy < 0.5) {
    successRate = 0.4;  // Too low - might not convert
  } else if (energyEval.accuracy < 0.8) {
    successRate = 0.7;
  }

  const success = random() < successRate;

  events.push({
    timestamp: request.timestamp,
    type: 'INTERVENTION_EXECUTED',
    data: { 
      intervention: 'CARDIOVERSION_SYNC',
      energy: energy,
      energyAccuracy: energyEval.accuracy,
      success
    }
  });

  if (success) {
    events.push({
      timestamp: request.timestamp + 100,
      type: 'RHYTHM_CHANGE',
      data: { from: state.rhythm, to: 'SINUS', mechanism: 'cardioversion' }
    });

    return {
      success: true,
      executed: true,
      outcome: 'CONVERTED',
      newState: {
        rhythm: 'SINUS',
        vitals: {
          ...state.vitals,
          heartRate: 80 + Math.floor(random() * 25),
        },
        timeInCurrentRhythm: 0,
      },
      events
    };
  }

  // Failed cardioversion
  return {
    success: false,
    executed: true,
    outcome: 'NO_EFFECT',
    newState: {},
    events
  };
}

/**
 * Process IV/IO access establishment
 */
function processAccessEstablishment(
  state: PatientState,
  request: InterventionRequest,
  type: 'IV' | 'IO'
): InterventionResult {
  const isIV = type === 'IV';
  const alreadyHas = isIV ? state.ivAccess : state.ioAccess;

  if (alreadyHas) {
    return {
      success: true,
      executed: false,
      reason: `${type} access already established`,
      outcome: 'NO_EFFECT',
      newState: {},
      events: []
    };
  }

  // IV success rate in pediatrics: ~85% first attempt
  // IO success rate: ~95%
  const successRate = isIV ? 0.85 : 0.95;
  const success = random() < successRate;

  return {
    success,
    executed: true,
    outcome: success ? 'CONVERTED' : 'NO_EFFECT',
    newState: success ? (isIV ? { ivAccess: true } : { ioAccess: true }) : {},
    events: [{
      timestamp: request.timestamp,
      type: 'INTERVENTION_EXECUTED',
      data: { intervention: request.type, success }
    }]
  };
}

/**
 * Process sedation
 */
function processSedation(
  state: PatientState,
  request: InterventionRequest
): InterventionResult {
  if (!state.ivAccess && !state.ioAccess) {
    return {
      success: false,
      executed: false,
      reason: 'No IV/IO access for sedation',
      outcome: 'PREREQUISITE_MISSING',
      newState: {},
      events: [{
        timestamp: request.timestamp,
        type: 'INTERVENTION_ATTEMPTED',
        data: { intervention: request.type, blocked: 'NO_ACCESS' }
      }]
    };
  }

  // Sedation takes ~30-60 seconds to take effect
  return {
    success: true,
    executed: true,
    outcome: 'CONVERTED',
    newState: { sedated: true },
    events: [{
      timestamp: request.timestamp,
      type: 'INTERVENTION_EXECUTED',
      data: { intervention: 'SEDATION', drug: request.verbalization || 'midazolam' }
    }]
  };
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

/**
 * Process any intervention through the appropriate handler
 */
export function processIntervention(
  state: PatientState,
  request: InterventionRequest
): InterventionResult {
  switch (request.type) {
    case 'VAGAL_ICE':
    case 'VAGAL_VALSALVA':
      return processVagalManeuver(state, request);

    case 'ADENOSINE':
      return processAdenosine(state, request, false);

    case 'ADENOSINE_2':
      return processAdenosine(state, request, true);

    case 'CARDIOVERSION_SYNC':
      return processCardioversion(state, request);

    case 'ESTABLISH_IV':
      return processAccessEstablishment(state, request, 'IV');

    case 'ESTABLISH_IO':
      return processAccessEstablishment(state, request, 'IO');

    case 'SEDATION':
      return processSedation(state, request);

    default:
      return {
        success: false,
        executed: false,
        reason: `Intervention ${request.type} not yet implemented`,
        outcome: 'NO_EFFECT',
        newState: {},
        events: []
      };
  }
}

// ============================================================================
// DETERIORATION ENGINE
// ============================================================================

/**
 * Calculate deterioration based on time in untreated rhythm
 */
export function calculateDeterioration(
  state: PatientState,
  elapsedMs: number
): Partial<PatientState> | null {
  // SVT deterioration timeline
  if (state.rhythm === 'SVT') {
    const timeInSVT = state.timeInCurrentRhythm + elapsedMs;
    
    // Stage 1: 5-10 min - compensated → mild symptoms
    if (timeInSVT > 300000 && state.deteriorationStage < 1) {
      return {
        deteriorationStage: 1,
        stability: 'compensated',
        vitals: {
          ...state.vitals,
          systolicBP: state.vitals.systolicBP - 10,
        },
        mentalStatus: 'alert', // Still alert but symptomatic
      };
    }
    
    // Stage 2: 10-15 min - decompensating
    if (timeInSVT > 600000 && state.deteriorationStage < 2) {
      return {
        deteriorationStage: 2,
        stability: 'decompensated',
        vitals: {
          ...state.vitals,
          systolicBP: state.vitals.systolicBP - 20,
          capillaryRefill: 4,
        },
        mentalStatus: 'verbal',
        perfusion: 'delayed',
      };
    }
    
    // Stage 3: >15 min - shock
    if (timeInSVT > 900000 && state.deteriorationStage < 3) {
      return {
        deteriorationStage: 3,
        stability: 'shock',
        vitals: {
          ...state.vitals,
          systolicBP: 60,
          diastolicBP: 35,
          capillaryRefill: 6,
          spO2: 90,
        },
        mentalStatus: 'pain',
        perfusion: 'poor',
      };
    }
  }

  return null;
}

/**
 * Resolve transient state (e.g., after adenosine asystole ends)
 */
export function resolveTransientState(
  state: PatientState,
  willConvert: boolean
): Partial<PatientState> {
  if (!state.transientState) return {};

  if (state.transientState.type === 'ADENOSINE_EFFECT') {
    if (willConvert) {
      // Success - return to sinus
      return {
        transientState: null,
        rhythm: 'SINUS',
        vitals: {
          ...state.vitals,
          heartRate: 85 + Math.floor(random() * 20),
        },
        timeInCurrentRhythm: 0,
      };
    } else {
      // Failed - back to SVT
      return {
        transientState: null,
        rhythm: state.transientState.previousRhythm,
        vitals: {
          ...state.vitals,
          heartRate: state.transientState.previousHR - Math.floor(random() * 10), // Slightly lower
        },
      };
    }
  }

  return { transientState: null };
}
