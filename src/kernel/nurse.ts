// ============================================================================
// NURSE SAFETY EVALUATION
// The nurse acts as a safety net, catching errors before they reach the patient
// ============================================================================

export interface NurseEvaluation {
  allow: boolean;
  action: 'confirm' | 'note' | 'question' | 'warn' | 'cap' | 'refuse';
  reason?: string;
  message: string;
  actualDose?: number;
  needsConfirmation?: boolean;
}

/**
 * Nurse evaluates adenosine order
 */
export function evaluateAdenosineOrder(
  doseGiven: number,
  adenosineCount: number,
  weight: number
): NurseEvaluation {
  const isSecondDose = adenosineCount > 0;
  const isThirdDose = adenosineCount > 1;
  const targetDose = isSecondDose ? weight * 0.2 : weight * 0.1;
  const maxDose = isSecondDose ? 12 : 6;
  const mgPerKg = doseGiven / weight;

  // Third dose - not in PALS
  if (isThirdDose) {
    return {
      allow: false,
      action: 'refuse',
      reason: 'third_dose',
      message: "Doctor, we've already given two doses of adenosine. PALS recommends synchronized cardioversion at this point. Want me to get the pads ready?"
    };
  }

  // Dangerous overdose
  if (doseGiven > maxDose * 1.5) {
    return {
      allow: false,
      action: 'refuse',
      reason: 'dangerous_overdose',
      message: `Doctor, ${doseGiven}mg is significantly over the max dose of ${maxDose}mg. That could cause prolonged heart block. Did you mean ${targetDose.toFixed(1)}mg?`
    };
  }

  // Over max but not dangerous - cap it
  if (doseGiven > maxDose) {
    return {
      allow: true,
      action: 'cap',
      reason: 'over_max',
      actualDose: maxDose,
      message: `Doctor, max dose is ${maxDose}mg. I'll give ${maxDose}mg. Pushing now with flush...`
    };
  }

  // Significantly overdosed but under max
  if (mgPerKg > (isSecondDose ? 0.35 : 0.18)) {
    return {
      allow: true,
      action: 'question',
      reason: 'high_dose',
      message: `${doseGiven}mg? That's ${mgPerKg.toFixed(2)}mg/kg - a bit high. Confirming you want ${doseGiven}mg?`,
      needsConfirmation: true
    };
  }

  // Severely underdosed
  if (doseGiven < targetDose * 0.3) {
    return {
      allow: true,
      action: 'question',
      reason: 'very_low',
      message: `${doseGiven}mg? That's only ${mgPerKg.toFixed(2)}mg/kg - probably won't be effective. Standard ${isSecondDose ? 'second' : 'first'} dose is ${targetDose.toFixed(1)}mg. Want me to draw up ${targetDose.toFixed(1)}mg instead?`,
      needsConfirmation: true
    };
  }

  // Underdosed but might work
  if (doseGiven < targetDose * 0.7) {
    return {
      allow: true,
      action: 'note',
      reason: 'low_dose',
      message: `${doseGiven}mg - that's a bit under the ${targetDose.toFixed(1)}mg we'd usually give, but pushing it now with flush...`
    };
  }

  // Good dose
  return {
    allow: true,
    action: 'confirm',
    message: `${doseGiven}mg adenosine IV push... flush going in now.`
  };
}

/**
 * Nurse evaluates cardioversion order
 */
export function evaluateCardioversionOrder(
  joulesGiven: number,
  attemptNumber: number,
  weight: number,
  rhythm: string,
  sedated: boolean
): NurseEvaluation {
  const targetJ = attemptNumber === 1 ? weight * 0.5 : weight * 1.0;
  const maxSafeJ = weight * 2;
  const jPerKg = joulesGiven / weight;

  // Can't cardiovert if not in SVT
  if (rhythm === 'SINUS') {
    return {
      allow: false,
      action: 'refuse',
      reason: 'wrong_rhythm',
      message: "Doctor, she's in sinus rhythm now. We don't need to cardiovert - she's converted!"
    };
  }

  if (rhythm === 'ASYSTOLE') {
    return {
      allow: false,
      action: 'refuse',
      reason: 'not_shockable',
      message: "Doctor, asystole isn't a shockable rhythm. We need to wait for this to resolve or start CPR if it doesn't."
    };
  }

  // Must be sedated
  if (!sedated) {
    return {
      allow: false,
      action: 'refuse',
      reason: 'not_sedated',
      message: "Doctor, she's not sedated. I can't shock an awake child - that would be traumatic. Want me to draw up midazolam first?"
    };
  }

  // Dangerously high - refuse (device max)
  if (joulesGiven > 200) {
    return {
      allow: false,
      action: 'refuse',
      reason: 'over_device_max',
      message: `Doctor, ${joulesGiven}J is above the device maximum. Our defibrillator maxes out at 200J for pediatric pads.`
    };
  }

  // Very high - could cause damage
  if (jPerKg > 4) {
    return {
      allow: false,
      action: 'refuse',
      reason: 'dangerous_energy',
      message: `Doctor, ${joulesGiven}J is ${jPerKg.toFixed(1)} J/kg - that's way too high for a child this size and could cause myocardial damage. Max recommended is 2 J/kg which is ${maxSafeJ.toFixed(0)}J. Did you mean ${targetJ.toFixed(0)}J?`
    };
  }

  // High but technically possible - strong warning
  if (jPerKg > 2.5) {
    return {
      allow: true,
      action: 'warn',
      reason: 'high_energy',
      message: `Doctor, ${joulesGiven}J is ${jPerKg.toFixed(1)} J/kg - that's above the recommended max of 2 J/kg. Are you sure? I'd recommend ${maxSafeJ.toFixed(0)}J or less.`,
      needsConfirmation: true
    };
  }

  // Slightly high but acceptable
  if (jPerKg > 2) {
    return {
      allow: true,
      action: 'note',
      reason: 'upper_limit',
      message: `${joulesGiven}J - that's ${jPerKg.toFixed(1)} J/kg, at the upper limit but acceptable. Charging...`
    };
  }

  // Very low - probably won't work
  if (joulesGiven < targetJ * 0.3) {
    return {
      allow: true,
      action: 'question',
      reason: 'very_low',
      message: `${joulesGiven}J? That's only ${jPerKg.toFixed(2)} J/kg - might not be enough energy to convert. Standard initial is ${targetJ.toFixed(0)}J. Want me to set it higher?`,
      needsConfirmation: true
    };
  }

  // Low
  if (joulesGiven < targetJ * 0.6) {
    return {
      allow: true,
      action: 'note',
      reason: 'low_energy',
      message: `${joulesGiven}J - on the low side but let's try it. Charging...`
    };
  }

  // Good dose
  const doseDescription = attemptNumber > 1 ? ' Increasing from last attempt.' : '';
  return {
    allow: true,
    action: 'confirm',
    message: `${joulesGiven}J synchronized cardioversion.${doseDescription} Charging... everyone stand clear!`
  };
}

/**
 * Calculate success probability for adenosine based on dose
 */
export function calcAdenosineSuccess(
  doseGiven: number,
  isSecondDose: boolean,
  weight: number
): number {
  const targetDose = isSecondDose ? weight * 0.2 : weight * 0.1;
  const maxDose = isSecondDose ? 12 : 6;
  const effectiveDose = Math.min(doseGiven, maxDose);
  const ratio = effectiveDose / targetDose;

  // Base success rates from literature
  const baseRate = isSecondDose ? 0.80 : 0.60;

  // Dose-response curve
  if (ratio < 0.3) return baseRate * 0.05;   // Severely underdosed - almost never works
  if (ratio < 0.5) return baseRate * 0.15;   // Very underdosed
  if (ratio < 0.7) return baseRate * 0.40;   // Underdosed
  if (ratio < 0.85) return baseRate * 0.70;  // Slightly under
  if (ratio <= 1.15) return baseRate;        // Correct range
  if (ratio <= 1.5) return baseRate * 0.95;  // Slightly over - still works
  if (ratio <= 2.0) return baseRate * 0.85;  // Overdosed - works but not ideal
  return baseRate * 0.75;                     // Significantly overdosed
}

/**
 * Calculate success probability for cardioversion based on energy
 */
export function calcCardioversionSuccess(
  joulesGiven: number,
  attemptNumber: number,
  weight: number
): number {
  const targetJ = attemptNumber === 1 ? weight * 0.5 : weight * 1.0;
  const ratio = joulesGiven / targetJ;

  // Base success rate for cardioversion is high when dose is correct
  const baseRate = 0.92;

  if (ratio < 0.3) return 0.10;     // Way too low - almost never works
  if (ratio < 0.5) return 0.30;     // Too low
  if (ratio < 0.7) return 0.55;     // Borderline low
  if (ratio < 0.85) return 0.75;    // Slightly low
  if (ratio <= 1.5) return baseRate; // Good range (0.5-1.5 J/kg on first attempt)
  if (ratio <= 2.5) return baseRate; // Still acceptable (up to ~2 J/kg)
  if (ratio <= 4.0) return 0.90;    // High but might work
  return 0.85;                       // Very high - works but dangerous
}

/**
 * Format dose accuracy for display (not "400% accurate")
 */
export function formatDoseAccuracy(given: number, correct: number): { text: string; color: string } {
  const ratio = given / correct;
  
  if (ratio >= 0.9 && ratio <= 1.1) {
    return { text: '✓ correct', color: 'text-green-400' };
  }
  if (ratio >= 0.7 && ratio <= 0.9) {
    return { text: `↓ ${Math.round((1 - ratio) * 100)}% under`, color: 'text-yellow-400' };
  }
  if (ratio > 1.1 && ratio <= 1.3) {
    return { text: `↑ ${Math.round((ratio - 1) * 100)}% over`, color: 'text-yellow-400' };
  }
  if (ratio < 0.7) {
    return { text: `↓↓ ${Math.round((1 - ratio) * 100)}% under`, color: 'text-red-400' };
  }
  // ratio > 1.3
  return { text: `↑↑ ${ratio.toFixed(1)}x overdose`, color: 'text-red-400' };
}

/**
 * Get reason description for nurse catch
 */
export function getNurseCatchDescription(reason: string): string {
  const descriptions: Record<string, string> = {
    'third_dose': 'Third adenosine - exceeds PALS protocol',
    'dangerous_overdose': 'Dangerous overdose prevented',
    'not_sedated': 'Patient not sedated for cardioversion',
    'wrong_rhythm': 'Wrong rhythm for cardioversion',
    'not_shockable': 'Asystole is not shockable',
    'over_device_max': 'Exceeds device maximum',
    'dangerous_energy': 'Dangerous energy level',
  };
  return descriptions[reason] || reason;
}
