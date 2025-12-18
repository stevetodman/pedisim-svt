// ============================================================================
// DETERIORATION MODEL - Dynamic vital sign changes during SVT
// ============================================================================
// Models progressive compensation failure in pediatric SVT
// Based on pediatric physiology: children compensate well initially,
// then decompensate rapidly once reserves exhausted

export interface VitalSigns {
  hr: number;
  spo2: number;
  systolic: number;
  diastolic: number;
  rr: number;
  capRefill: number;      // seconds
  mentalStatus: 'alert' | 'anxious' | 'irritable' | 'lethargic' | 'unresponsive';
  skinColor: 'pink' | 'pale' | 'mottled' | 'gray';
}

export interface DeteriorationState {
  stage: 'compensated' | 'early_stress' | 'moderate_stress' | 'decompensating' | 'critical';
  elapsedInSVT: number;   // ms in SVT rhythm
  interventions: {
    oxygenApplied: boolean;
    ivFluidsGiven: boolean;
    positionOptimized: boolean;
  };
}

// Baseline vitals for 5-year-old (18.5kg) - exported for reference
export const BASELINE_VITALS: VitalSigns = {
  hr: 90,
  spo2: 98,
  systolic: 95,
  diastolic: 60,
  rr: 22,
  capRefill: 2,
  mentalStatus: 'alert',
  skinColor: 'pink',
};

// SVT vitals by deterioration stage
const SVT_STAGES = {
  compensated: {
    maxTime: 2 * 60 * 1000,  // 0-2 minutes
    vitals: {
      hr: 220,
      spo2: 97,
      systolic: 95,
      diastolic: 60,
      rr: 26,
      capRefill: 2,
      mentalStatus: 'anxious' as const,
      skinColor: 'pink' as const,
    }
  },
  early_stress: {
    maxTime: 5 * 60 * 1000,  // 2-5 minutes
    vitals: {
      hr: 220,
      spo2: 95,
      systolic: 88,
      diastolic: 56,
      rr: 30,
      capRefill: 2.5,
      mentalStatus: 'anxious' as const,
      skinColor: 'pale' as const,
    }
  },
  moderate_stress: {
    maxTime: 8 * 60 * 1000,  // 5-8 minutes
    vitals: {
      hr: 220,
      spo2: 93,
      systolic: 82,
      diastolic: 52,
      rr: 34,
      capRefill: 3,
      mentalStatus: 'irritable' as const,
      skinColor: 'pale' as const,
    }
  },
  decompensating: {
    maxTime: 12 * 60 * 1000,  // 8-12 minutes
    vitals: {
      hr: 220,
      spo2: 90,
      systolic: 72,
      diastolic: 45,
      rr: 40,
      capRefill: 4,
      mentalStatus: 'lethargic' as const,
      skinColor: 'mottled' as const,
    }
  },
  critical: {
    maxTime: Infinity,  // 12+ minutes
    vitals: {
      hr: 220,
      spo2: 85,
      systolic: 60,
      diastolic: 35,
      rr: 45,
      capRefill: 5,
      mentalStatus: 'unresponsive' as const,
      skinColor: 'gray' as const,
    }
  },
};

/**
 * Determine deterioration stage based on time in SVT
 */
export function getDeteriorationStage(elapsedMs: number): DeteriorationState['stage'] {
  if (elapsedMs < SVT_STAGES.compensated.maxTime) return 'compensated';
  if (elapsedMs < SVT_STAGES.early_stress.maxTime) return 'early_stress';
  if (elapsedMs < SVT_STAGES.moderate_stress.maxTime) return 'moderate_stress';
  if (elapsedMs < SVT_STAGES.decompensating.maxTime) return 'decompensating';
  return 'critical';
}

/**
 * Linear interpolation between two values
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Calculate current vitals based on time in SVT with smooth transitions
 */
export function calculateSVTVitals(
  elapsedMs: number,
  interventions: DeteriorationState['interventions'] = {
    oxygenApplied: false,
    ivFluidsGiven: false,
    positionOptimized: false,
  }
): VitalSigns {
  const stage = getDeteriorationStage(elapsedMs);
  const stageConfig = SVT_STAGES[stage];
  const baseVitals = { ...stageConfig.vitals };

  // Get previous stage for interpolation
  const stages: DeteriorationState['stage'][] = [
    'compensated', 'early_stress', 'moderate_stress', 'decompensating', 'critical'
  ];
  const stageIndex = stages.indexOf(stage);

  // Calculate progress within current stage
  let stageProgress = 0;
  if (stageIndex > 0) {
    const prevStageEnd = SVT_STAGES[stages[stageIndex - 1]].maxTime;
    const currentStageEnd = stageConfig.maxTime;
    const stageDuration = currentStageEnd - prevStageEnd;
    const timeInStage = elapsedMs - prevStageEnd;
    stageProgress = stageDuration > 0 ? timeInStage / stageDuration : 1;
  } else {
    stageProgress = elapsedMs / stageConfig.maxTime;
  }

  // Interpolate to next stage vitals for smooth transitions
  if (stageIndex < stages.length - 1) {
    const nextStage = stages[stageIndex + 1];
    const nextVitals = SVT_STAGES[nextStage].vitals;

    // Smooth transition in last 30% of stage
    if (stageProgress > 0.7) {
      const transitionProgress = (stageProgress - 0.7) / 0.3;
      baseVitals.spo2 = Math.round(lerp(baseVitals.spo2, nextVitals.spo2, transitionProgress * 0.3));
      baseVitals.systolic = Math.round(lerp(baseVitals.systolic, nextVitals.systolic, transitionProgress * 0.3));
      baseVitals.diastolic = Math.round(lerp(baseVitals.diastolic, nextVitals.diastolic, transitionProgress * 0.3));
      baseVitals.rr = Math.round(lerp(baseVitals.rr, nextVitals.rr, transitionProgress * 0.3));
    }
  }

  // Apply intervention modifiers
  if (interventions.oxygenApplied) {
    baseVitals.spo2 = Math.min(99, baseVitals.spo2 + 3);
  }
  if (interventions.ivFluidsGiven) {
    baseVitals.systolic = Math.min(95, baseVitals.systolic + 8);
    baseVitals.diastolic = Math.min(60, baseVitals.diastolic + 5);
  }
  if (interventions.positionOptimized) {
    baseVitals.spo2 = Math.min(99, baseVitals.spo2 + 1);
  }

  // Add small random variation for realism (±1-2)
  baseVitals.spo2 = Math.max(80, Math.min(100, baseVitals.spo2 + Math.floor(Math.random() * 3) - 1));
  baseVitals.rr = Math.max(20, baseVitals.rr + Math.floor(Math.random() * 3) - 1);

  return baseVitals;
}

/**
 * Calculate vitals during asystole phase
 */
export function calculateAsystoleVitals(timeInAsystoleMs: number): VitalSigns {
  return {
    hr: 0,
    spo2: Math.max(70, 97 - Math.floor(timeInAsystoleMs / 1000) * 3), // Drops ~3%/sec
    systolic: 0,
    diastolic: 0,
    rr: 0,  // Apneic during asystole
    capRefill: 5,
    mentalStatus: 'unresponsive',
    skinColor: 'gray',
  };
}

/**
 * Calculate vitals during post-conversion recovery
 * Recovery follows exponential curve back to baseline
 */
export function calculateRecoveryVitals(
  timeAfterConversionMs: number,
  targetHR: number = 90
): VitalSigns {
  // Recovery phases:
  // 0-2s: Junctional escape (50-60 bpm)
  // 2-5s: Sinus bradycardia (65-75 bpm)
  // 5-10s: Normal sinus (85-95 bpm)
  // 10-30s: Stable with normalizing vitals

  let hr: number;
  if (timeAfterConversionMs < 2000) {
    // Junctional escape
    hr = lerp(0, 55, timeAfterConversionMs / 2000);
  } else if (timeAfterConversionMs < 5000) {
    // Sinus bradycardia
    hr = lerp(55, 70, (timeAfterConversionMs - 2000) / 3000);
  } else if (timeAfterConversionMs < 10000) {
    // Approaching normal
    hr = lerp(70, targetHR, (timeAfterConversionMs - 5000) / 5000);
  } else {
    // Stable
    hr = targetHR + Math.floor(Math.random() * 5) - 2;
  }

  // Recovery progress (0 to 1 over 30 seconds)
  const recoveryProgress = Math.min(1, timeAfterConversionMs / 30000);

  // Vitals normalize gradually
  return {
    hr: Math.round(hr),
    spo2: Math.round(lerp(94, 98, recoveryProgress)),
    systolic: Math.round(lerp(85, 95, recoveryProgress)),
    diastolic: Math.round(lerp(52, 60, recoveryProgress)),
    rr: Math.round(lerp(28, 22, recoveryProgress)),
    capRefill: lerp(3, 2, recoveryProgress),
    mentalStatus: recoveryProgress < 0.3 ? 'lethargic' : recoveryProgress < 0.7 ? 'anxious' : 'alert',
    skinColor: recoveryProgress < 0.5 ? 'pale' : 'pink',
  };
}

/**
 * Format BP as string
 */
export function formatBP(systolic: number, diastolic: number): string {
  if (systolic === 0) return '--/--';
  return `${systolic}/${diastolic}`;
}

/**
 * Get stage description for UI
 */
export function getStageDescription(stage: DeteriorationState['stage']): string {
  switch (stage) {
    case 'compensated': return 'Compensated';
    case 'early_stress': return 'Early Stress';
    case 'moderate_stress': return 'Moderate Stress';
    case 'decompensating': return 'Decompensating';
    case 'critical': return 'Critical';
  }
}

/**
 * Get stage color for UI
 */
export function getStageColor(stage: DeteriorationState['stage']): string {
  switch (stage) {
    case 'compensated': return 'text-amber-400';
    case 'early_stress': return 'text-orange-400';
    case 'moderate_stress': return 'text-orange-500';
    case 'decompensating': return 'text-red-400';
    case 'critical': return 'text-red-500';
  }
}
