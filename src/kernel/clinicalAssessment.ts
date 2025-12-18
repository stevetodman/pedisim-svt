// ============================================================================
// CLINICAL ASSESSMENT - Bedside physical exam findings
// ============================================================================
// Models the clinical signs that change with deterioration
// Teaching goal: "Look at the patient, not just the monitor"

import type { DeteriorationState } from './deterioration';

// ============================================================================
// PERFUSION ASSESSMENT
// ============================================================================

export type PulseQuality = 'bounding' | 'strong' | 'normal' | 'weak' | 'thready' | 'absent';
export type TemperatureZone = 'warm' | 'cool' | 'cold';
export type MottlingPattern = 'none' | 'peripheral' | 'central' | 'generalized';

export interface PerfusionAssessment {
  pulseQuality: PulseQuality;
  extremityTemp: {
    hands: TemperatureZone;
    wrists: TemperatureZone;
    elbows: TemperatureZone;
  };
  coolTo: 'normal' | 'fingertips' | 'hands' | 'wrists' | 'elbows' | 'knees';
  mottling: MottlingPattern;
  capRefill: number; // seconds
  skinColor: 'pink' | 'pale' | 'mottled' | 'gray';
}

// ============================================================================
// PERFUSION BY DETERIORATION STAGE
// ============================================================================

const PERFUSION_BY_STAGE: Record<DeteriorationState['stage'], PerfusionAssessment> = {
  compensated: {
    pulseQuality: 'strong',
    extremityTemp: { hands: 'warm', wrists: 'warm', elbows: 'warm' },
    coolTo: 'normal',
    mottling: 'none',
    capRefill: 2,
    skinColor: 'pink',
  },
  early_stress: {
    pulseQuality: 'normal',
    extremityTemp: { hands: 'cool', wrists: 'warm', elbows: 'warm' },
    coolTo: 'hands',
    mottling: 'none',
    capRefill: 2.5,
    skinColor: 'pale',
  },
  moderate_stress: {
    pulseQuality: 'weak',
    extremityTemp: { hands: 'cool', wrists: 'cool', elbows: 'warm' },
    coolTo: 'wrists',
    mottling: 'peripheral',
    capRefill: 3.5,
    skinColor: 'pale',
  },
  decompensating: {
    pulseQuality: 'thready',
    extremityTemp: { hands: 'cold', wrists: 'cool', elbows: 'cool' },
    coolTo: 'elbows',
    mottling: 'central',
    capRefill: 4.5,
    skinColor: 'mottled',
  },
  critical: {
    pulseQuality: 'thready',
    extremityTemp: { hands: 'cold', wrists: 'cold', elbows: 'cold' },
    coolTo: 'knees',
    mottling: 'generalized',
    capRefill: 6,
    skinColor: 'gray',
  },
};

// Perfusion during asystole
const ASYSTOLE_PERFUSION: PerfusionAssessment = {
  pulseQuality: 'absent',
  extremityTemp: { hands: 'cold', wrists: 'cold', elbows: 'cool' },
  coolTo: 'elbows',
  mottling: 'generalized',
  capRefill: 6,
  skinColor: 'gray',
};

// Perfusion after conversion (recovers over 60 seconds)
function getRecoveryPerfusion(timeAfterConversionMs: number): PerfusionAssessment {
  const progress = Math.min(1, timeAfterConversionMs / 60000); // 60 seconds to full recovery

  if (progress < 0.2) {
    return {
      pulseQuality: 'weak',
      extremityTemp: { hands: 'cool', wrists: 'cool', elbows: 'warm' },
      coolTo: 'wrists',
      mottling: 'peripheral',
      capRefill: 3.5,
      skinColor: 'pale',
    };
  } else if (progress < 0.5) {
    return {
      pulseQuality: 'normal',
      extremityTemp: { hands: 'cool', wrists: 'warm', elbows: 'warm' },
      coolTo: 'hands',
      mottling: 'none',
      capRefill: 2.5,
      skinColor: 'pale',
    };
  } else {
    return {
      pulseQuality: 'strong',
      extremityTemp: { hands: 'warm', wrists: 'warm', elbows: 'warm' },
      coolTo: 'normal',
      mottling: 'none',
      capRefill: 2,
      skinColor: 'pink',
    };
  }
}

/**
 * Calculate perfusion assessment based on current state
 */
export function calculatePerfusion(
  stage: DeteriorationState['stage'],
  isAsystole: boolean,
  isConverted: boolean,
  timeAfterConversionMs?: number
): PerfusionAssessment {
  if (isAsystole) {
    return ASYSTOLE_PERFUSION;
  }

  if (isConverted && timeAfterConversionMs !== undefined) {
    return getRecoveryPerfusion(timeAfterConversionMs);
  }

  return PERFUSION_BY_STAGE[stage];
}

// ============================================================================
// PROCEDURAL EFFECTS
// ============================================================================

export interface ProceduralEffect {
  spO2Delta: number;        // Change in SpO2 (negative = drop)
  hrDelta: number;          // Change in HR
  durationMs: number;       // How long the effect lasts
  hasArtifact: boolean;     // Monitor artifact from motion
  artifactSeverity?: 'mild' | 'moderate' | 'severe';
}

/**
 * Get physiologic effects of IV insertion attempt
 * Child cries, holds breath, struggles
 */
export function getIVInsertionEffects(attemptNumber: number): ProceduralEffect {
  // First attempt: moderate stress
  // Subsequent: worse (child is now terrified)
  const multiplier = attemptNumber === 1 ? 1 : 1.5;

  return {
    spO2Delta: -Math.floor((3 + Math.random() * 5) * multiplier), // -3 to -8, worse on retries
    hrDelta: Math.floor(5 + Math.random() * 10), // +5 to +15 (limited effect at 220)
    durationMs: 8000 + Math.random() * 4000, // 8-12 seconds
    hasArtifact: true,
    artifactSeverity: attemptNumber === 1 ? 'mild' : 'moderate',
  };
}

/**
 * Get physiologic effects of IO insertion
 * Very painful - screaming, severe distress
 */
export function getIOInsertionEffects(): ProceduralEffect {
  return {
    spO2Delta: -Math.floor(8 + Math.random() * 7), // -8 to -15 (significant)
    hrDelta: Math.floor(10 + Math.random() * 15), // +10 to +25
    durationMs: 10000, // ~10 seconds during drilling
    hasArtifact: true,
    artifactSeverity: 'severe',
  };
}

/**
 * Get physiologic effects of sedation onset
 * Mild respiratory depression, but anxiety component of WOB removed
 */
export function getSedationEffects(): ProceduralEffect {
  return {
    spO2Delta: -Math.floor(1 + Math.random() * 2), // -1 to -3 (mild)
    hrDelta: -Math.floor(5 + Math.random() * 10), // Slight HR decrease (less anxiety)
    durationMs: 45000, // Onset period
    hasArtifact: false,
  };
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get human-readable description of pulse quality
 */
export function describePulseQuality(quality: PulseQuality): string {
  switch (quality) {
    case 'bounding': return 'Bounding pulse';
    case 'strong': return 'Strong pulse';
    case 'normal': return 'Normal pulse';
    case 'weak': return 'Weak pulse';
    case 'thready': return 'Thready pulse';
    case 'absent': return 'No pulse palpable';
  }
}

/**
 * Get human-readable description of temperature gradient
 */
export function describeCoolTo(coolTo: PerfusionAssessment['coolTo']): string {
  switch (coolTo) {
    case 'normal': return 'Warm extremities';
    case 'fingertips': return 'Cool fingertips';
    case 'hands': return 'Cool to hands';
    case 'wrists': return 'Cool to wrists';
    case 'elbows': return 'Cool to elbows';
    case 'knees': return 'Cool to knees';
  }
}

/**
 * Get human-readable description of mottling
 */
export function describeMottling(mottling: MottlingPattern): string {
  switch (mottling) {
    case 'none': return 'No mottling';
    case 'peripheral': return 'Peripheral mottling';
    case 'central': return 'Central mottling';
    case 'generalized': return 'Generalized mottling';
  }
}

/**
 * Get cap refill description
 */
export function describeCapRefill(seconds: number): string {
  if (seconds <= 2) return 'Brisk (<2s)';
  if (seconds <= 3) return 'Slightly delayed (2-3s)';
  if (seconds <= 4) return 'Delayed (3-4s)';
  if (seconds <= 5) return 'Significantly delayed (4-5s)';
  return 'Severely delayed (>5s)';
}

/**
 * Get overall perfusion status label
 */
export function getPerfusionStatus(assessment: PerfusionAssessment): {
  label: string;
  severity: 'good' | 'concerning' | 'poor' | 'critical';
} {
  if (assessment.pulseQuality === 'absent') {
    return { label: 'NO PERFUSION', severity: 'critical' };
  }
  if (assessment.pulseQuality === 'thready' || assessment.mottling === 'generalized') {
    return { label: 'CRITICAL', severity: 'critical' };
  }
  if (assessment.pulseQuality === 'weak' || assessment.mottling !== 'none') {
    return { label: 'POOR', severity: 'poor' };
  }
  if (assessment.coolTo !== 'normal' || assessment.capRefill > 2.5) {
    return { label: 'DELAYED', severity: 'concerning' };
  }
  return { label: 'ADEQUATE', severity: 'good' };
}

// ============================================================================
// NURSE OBSERVATION TRIGGERS
// ============================================================================

export type ClinicalObservationType =
  | 'perfusion_hands_cool'
  | 'perfusion_wrists_cool'
  | 'perfusion_mottling'
  | 'perfusion_pulse_weak'
  | 'perfusion_pulse_thready'
  | 'perfusion_recovering'
  | 'procedure_artifact'
  | 'procedure_spo2_drop';

/**
 * Detect which clinical observations should trigger based on state change
 */
export function detectPerfusionChanges(
  previous: PerfusionAssessment | null,
  current: PerfusionAssessment
): ClinicalObservationType[] {
  const triggers: ClinicalObservationType[] = [];

  if (!previous) return triggers;

  // Hands getting cool
  if (previous.extremityTemp.hands === 'warm' && current.extremityTemp.hands !== 'warm') {
    triggers.push('perfusion_hands_cool');
  }

  // Cool spreading to wrists
  if (previous.coolTo === 'hands' && current.coolTo === 'wrists') {
    triggers.push('perfusion_wrists_cool');
  }

  // Mottling appearing
  if (previous.mottling === 'none' && current.mottling !== 'none') {
    triggers.push('perfusion_mottling');
  }

  // Pulse weakening
  if (previous.pulseQuality === 'normal' && current.pulseQuality === 'weak') {
    triggers.push('perfusion_pulse_weak');
  }

  // Pulse becoming thready
  if (previous.pulseQuality === 'weak' && current.pulseQuality === 'thready') {
    triggers.push('perfusion_pulse_thready');
  }

  // Perfusion recovering after conversion
  if (previous.pulseQuality === 'weak' && current.pulseQuality === 'strong') {
    triggers.push('perfusion_recovering');
  }

  return triggers;
}

/**
 * Get nurse dialogue for clinical observation
 */
export function getNurseObservation(type: ClinicalObservationType): string {
  const observations: Record<ClinicalObservationType, string[]> = {
    perfusion_hands_cool: [
      "Doctor, her hands are getting cool.",
      "I'm noticing her fingers are cooler than before.",
      "Her peripheral perfusion is changing - hands are cool now.",
    ],
    perfusion_wrists_cool: [
      "She's cool up to her wrists now.",
      "The coolness is spreading - I can feel it to her wrists.",
      "Peripheral perfusion is getting worse.",
    ],
    perfusion_mottling: [
      "Doctor, I'm seeing some mottling on her knees.",
      "She's starting to mottle.",
      "I see mottled skin appearing - we need to move faster.",
    ],
    perfusion_pulse_weak: [
      "Her pulse is getting weaker.",
      "I'm feeling a weaker pulse now.",
      "Pulse quality is declining.",
    ],
    perfusion_pulse_thready: [
      "Doctor, I can barely feel her pulse. It's thready.",
      "Her pulse is thready now. She's not perfusing well.",
      "We're losing her pulse - it's very weak.",
    ],
    perfusion_recovering: [
      "Her pulse is getting stronger!",
      "Perfusion is improving - I can feel a better pulse.",
      "Good - her color is coming back.",
    ],
    procedure_artifact: [
      "I'm getting some artifact on the monitor from her moving.",
      "SpO2 reading may not be accurate - she's moving a lot.",
    ],
    procedure_spo2_drop: [
      "SpO2 dropped a bit - she's breath-holding from crying.",
      "Sats dipped with that poke - should come back up.",
    ],
  };

  const options = observations[type];
  return options[Math.floor(Math.random() * options.length)];
}
