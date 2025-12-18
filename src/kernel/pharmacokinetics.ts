// ============================================================================
// PHARMACOKINETICS - Drug timing and effect modeling
// ============================================================================
// Models realistic drug onset, peak, and offset for pediatric medications

// ============================================================================
// SEDATION (MIDAZOLAM)
// ============================================================================

export type SedationState =
  | 'NONE'           // No sedation ordered
  | 'ORDERED'        // Order placed
  | 'DRAWING'        // Nurse drawing medication
  | 'ADMINISTERING'  // Pushing medication
  | 'ONSET'          // Drug circulating, patient becoming drowsy
  | 'SEDATED';       // Fully sedated, safe for procedures

export interface SedationPhase {
  state: SedationState;
  startTime: number;        // When this phase started (simulation time)
  duration: number;         // Expected duration of this phase in ms
  progress: number;         // 0-1 progress through phase
}

// Midazolam IV timing for pediatric patient
export const SEDATION_TIMING = {
  DRAWING: 8000,            // 8 seconds to draw medication
  ADMINISTERING: 3000,      // 3 seconds to push
  ONSET: 45000,             // 45 seconds to full sedation (30-60s range)
};

/**
 * Get the next sedation state
 */
export function getNextSedationState(current: SedationState): SedationState {
  switch (current) {
    case 'NONE': return 'ORDERED';
    case 'ORDERED': return 'DRAWING';
    case 'DRAWING': return 'ADMINISTERING';
    case 'ADMINISTERING': return 'ONSET';
    case 'ONSET': return 'SEDATED';
    case 'SEDATED': return 'SEDATED';
  }
}

/**
 * Get duration for a sedation phase
 */
export function getSedationPhaseDuration(state: SedationState): number {
  switch (state) {
    case 'ORDERED': return 500;  // Brief acknowledgment
    case 'DRAWING': return SEDATION_TIMING.DRAWING;
    case 'ADMINISTERING': return SEDATION_TIMING.ADMINISTERING;
    case 'ONSET': return SEDATION_TIMING.ONSET;
    default: return 0;
  }
}

/**
 * Get patient consciousness level during sedation onset
 */
export function getSedationLevel(onsetProgress: number): {
  level: 'awake' | 'drowsy' | 'responsive' | 'unresponsive';
  description: string;
} {
  if (onsetProgress < 0.2) {
    return { level: 'awake', description: 'Still awake, may feel relaxed' };
  } else if (onsetProgress < 0.5) {
    return { level: 'drowsy', description: 'Becoming drowsy, eyes heavy' };
  } else if (onsetProgress < 0.8) {
    return { level: 'responsive', description: 'Sleepy but rousable' };
  } else {
    return { level: 'unresponsive', description: 'Adequately sedated' };
  }
}

// ============================================================================
// ADENOSINE
// ============================================================================

export type AdenosinePhase =
  | 'NONE'           // No adenosine given
  | 'ORDERED'        // Order placed
  | 'DRAWING'        // Nurse preparing
  | 'READY'          // Ready to push with flush
  | 'PUSHED'         // Drug pushed, flush going
  | 'CIRCULATING'    // Drug reaching heart
  | 'EFFECT'         // Drug at AV node, causing effect
  | 'CLEARING'       // Drug metabolizing (half-life <10s)
  | 'COMPLETE';      // Effect complete, outcome determined

export interface AdenosineState {
  phase: AdenosinePhase;
  phaseStartTime: number;
  doseGiven: number;
  attemptNumber: number;
  route: 'peripheral_iv' | 'central_line' | 'io';
}

// Adenosine timing (peripheral IV)
export const ADENOSINE_TIMING = {
  DRAWING: 12000,           // 12 seconds to draw + prepare flush
  READY: 2000,              // Brief ready check
  PUSHED: 2000,             // Push drug + flush
  CIRCULATING: 1500,        // Time to reach heart (arm IV)
  EFFECT: 5000,             // Duration of AV block effect
  CLEARING: 3000,           // Metabolism/clearance
};

// Central line is faster
export const ADENOSINE_TIMING_CENTRAL = {
  ...ADENOSINE_TIMING,
  CIRCULATING: 500,         // Much faster from central line
};

/**
 * Get adenosine phase duration based on route
 */
export function getAdenosinePhaseDuration(
  phase: AdenosinePhase,
  route: AdenosineState['route'] = 'peripheral_iv'
): number {
  const timing = route === 'central_line' ? ADENOSINE_TIMING_CENTRAL : ADENOSINE_TIMING;

  switch (phase) {
    case 'ORDERED': return 500;
    case 'DRAWING': return timing.DRAWING;
    case 'READY': return timing.READY;
    case 'PUSHED': return timing.PUSHED;
    case 'CIRCULATING': return timing.CIRCULATING;
    case 'EFFECT': return timing.EFFECT;
    case 'CLEARING': return timing.CLEARING;
    default: return 0;
  }
}

/**
 * Calculate expected asystole duration based on dose and route
 * Higher doses = longer pause (within safe limits)
 * Central route = slightly shorter due to faster clearance
 */
export function calculateAsystoleDuration(
  doseGiven: number,
  correctDose: number,
  route: AdenosineState['route'] = 'peripheral_iv'
): number {
  // Base duration: 3-7 seconds
  const baseDuration = 3000 + Math.random() * 4000;

  // Dose effect: overdose can prolong pause
  const doseRatio = doseGiven / correctDose;
  const doseEffect = Math.min((doseRatio - 1) * 2000, 5000); // Max 5s additional

  // Route effect: central is slightly shorter
  const routeEffect = route === 'central_line' ? -1000 : 0;

  // Calculate total, capped at 15 seconds (dangerous but survivable)
  const total = baseDuration + Math.max(0, doseEffect) + routeEffect;
  return Math.min(Math.max(total, 2000), 15000);
}

/**
 * Get patient symptoms during adenosine effect
 */
export function getAdenosineSymptoms(phase: AdenosinePhase): {
  feeling: string;
  visible: string;
} {
  switch (phase) {
    case 'PUSHED':
      return {
        feeling: 'Warm sensation spreading',
        visible: 'Facial flushing beginning'
      };
    case 'CIRCULATING':
      return {
        feeling: 'Chest feels tight, hard to breathe',
        visible: 'Face flushed, grimacing'
      };
    case 'EFFECT':
      return {
        feeling: 'Heart stopped, panicking',
        visible: 'Eyes wide, pale, not breathing'
      };
    case 'CLEARING':
      return {
        feeling: 'Heart beating again, still scared',
        visible: 'Color returning, starting to breathe'
      };
    default:
      return { feeling: '', visible: '' };
  }
}

// ============================================================================
// CARDIOVERSION
// ============================================================================

export type CardioversionPhase =
  | 'NONE'
  | 'PREPARING'       // Pads on, device ready
  | 'CHARGING'        // Energy building
  | 'READY'           // Charged, awaiting shock
  | 'SHOCKING'        // Discharge in progress
  | 'POST_SHOCK';     // Evaluating result

export interface CardioversionState {
  phase: CardioversionPhase;
  phaseStartTime: number;
  energy: number;
  syncMode: boolean;
}

// ============================================================================
// POST-CONVERSION RECOVERY
// ============================================================================

export type RecoveryPhase =
  | 'IMMEDIATE'       // 0-2s: Junctional escape
  | 'EARLY'           // 2-5s: Sinus bradycardia
  | 'TRANSITIONAL'    // 5-10s: Approaching normal
  | 'STABLE';         // 10s+: Normal sinus

/**
 * Get recovery phase based on time after conversion
 */
export function getRecoveryPhase(timeAfterConversionMs: number): RecoveryPhase {
  if (timeAfterConversionMs < 2000) return 'IMMEDIATE';
  if (timeAfterConversionMs < 5000) return 'EARLY';
  if (timeAfterConversionMs < 10000) return 'TRANSITIONAL';
  return 'STABLE';
}

/**
 * Get expected heart rate during recovery phase
 */
export function getRecoveryHeartRate(phase: RecoveryPhase, progress: number): number {
  switch (phase) {
    case 'IMMEDIATE':
      // Junctional escape: 40-60 bpm
      return Math.round(40 + progress * 20);
    case 'EARLY':
      // Sinus bradycardia: 60-75 bpm
      return Math.round(60 + progress * 15);
    case 'TRANSITIONAL':
      // Approaching normal: 75-90 bpm
      return Math.round(75 + progress * 15);
    case 'STABLE':
      // Normal sinus: 85-95 bpm with small variation
      return 90 + Math.floor(Math.random() * 10) - 5;
  }
}

/**
 * Get ECG description during recovery
 */
export function getRecoveryECGDescription(phase: RecoveryPhase): string {
  switch (phase) {
    case 'IMMEDIATE':
      return 'Junctional escape rhythm';
    case 'EARLY':
      return 'Sinus bradycardia';
    case 'TRANSITIONAL':
      return 'Sinus rhythm, rate increasing';
    case 'STABLE':
      return 'Normal sinus rhythm';
  }
}
