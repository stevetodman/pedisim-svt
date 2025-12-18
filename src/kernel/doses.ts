// ============================================================================
// PALS DOSE CALCULATOR
// Weight-based dose calculations per PALS 2020 guidelines
// ============================================================================

import { DoseCalculation, InterventionType } from './types';

export interface DrugProtocol {
  name: string;
  indication: string;
  dosePerKg: number;
  maxDose: number;
  unit: string;
  route: string[];
  notes: string;
  secondDoseMultiplier?: number;  // For drugs with escalating doses
}

// PALS Drug Protocols
const DRUG_PROTOCOLS: Record<string, DrugProtocol> = {
  ADENOSINE: {
    name: 'Adenosine',
    indication: 'SVT',
    dosePerKg: 0.1,
    maxDose: 6,
    unit: 'mg',
    route: ['IV', 'IO'],
    notes: 'Rapid IV push followed by immediate 5-10mL NS flush. Use proximal IV site.',
    secondDoseMultiplier: 2,  // Second dose is 0.2 mg/kg
  },
  ADENOSINE_2: {
    name: 'Adenosine (2nd dose)',
    indication: 'SVT refractory to first dose',
    dosePerKg: 0.2,
    maxDose: 12,
    unit: 'mg',
    route: ['IV', 'IO'],
    notes: 'Rapid IV push followed by immediate 10-20mL NS flush.',
  },
  AMIODARONE: {
    name: 'Amiodarone',
    indication: 'VF/pVT, SVT, VT with pulse',
    dosePerKg: 5,
    maxDose: 300,
    unit: 'mg',
    route: ['IV', 'IO'],
    notes: 'For VF/pVT: rapid bolus. For perfusing rhythms: load over 20-60 min.',
  },
  EPINEPHRINE: {
    name: 'Epinephrine',
    indication: 'Cardiac arrest, bradycardia, anaphylaxis',
    dosePerKg: 0.01,  // 0.01 mg/kg = 0.1 mL/kg of 1:10,000
    maxDose: 1,
    unit: 'mg',
    route: ['IV', 'IO', 'ETT'],
    notes: 'IV/IO: 0.01 mg/kg (1:10,000). ETT: 0.1 mg/kg (1:1,000). Repeat q3-5min.',
  },
  ATROPINE: {
    name: 'Atropine',
    indication: 'Symptomatic bradycardia (vagal origin)',
    dosePerKg: 0.02,
    maxDose: 0.5,
    unit: 'mg',
    route: ['IV', 'IO', 'ETT'],
    notes: 'Minimum dose 0.1mg to avoid paradoxical bradycardia.',
  },
  LIDOCAINE: {
    name: 'Lidocaine',
    indication: 'VF/pVT (alternative to amiodarone)',
    dosePerKg: 1,
    maxDose: 100,
    unit: 'mg',
    route: ['IV', 'IO'],
    notes: 'Bolus followed by infusion 20-50 mcg/kg/min.',
  },
  PROCAINAMIDE: {
    name: 'Procainamide',
    indication: 'SVT, VT with pulse (especially WPW)',
    dosePerKg: 15,
    maxDose: 1000,
    unit: 'mg',
    route: ['IV', 'IO'],
    notes: 'Load over 30-60 min. Monitor for hypotension, QRS widening.',
  },
  MIDAZOLAM: {
    name: 'Midazolam',
    indication: 'Sedation for cardioversion',
    dosePerKg: 0.1,
    maxDose: 5,
    unit: 'mg',
    route: ['IV', 'IO'],
    notes: 'Titrate to effect. Have flumazenil available.',
  },
  KETAMINE: {
    name: 'Ketamine',
    indication: 'Sedation for cardioversion (preserves hemodynamics)',
    dosePerKg: 1.5,
    maxDose: 100,
    unit: 'mg',
    route: ['IV', 'IO'],
    notes: 'Good choice for hemodynamically unstable patients.',
  },
  FENTANYL: {
    name: 'Fentanyl',
    indication: 'Analgesia/sedation',
    dosePerKg: 0.001, // 1 mcg/kg
    maxDose: 0.05,    // 50 mcg
    unit: 'mg',
    route: ['IV', 'IO'],
    notes: 'Actually dosed in mcg. 1-2 mcg/kg.',
  },
};

// Cardioversion/Defibrillation energy protocols
const ENERGY_PROTOCOLS = {
  CARDIOVERSION_SYNC: {
    name: 'Synchronized Cardioversion',
    indication: 'SVT, VT with pulse, A-fib/flutter with instability',
    initialJPerKg: 0.5,
    maxJPerKg: 2,
    maxJ: 200,
    notes: 'Start 0.5-1 J/kg. May increase to 2 J/kg if needed.',
  },
  DEFIBRILLATION: {
    name: 'Defibrillation',
    indication: 'VF, pulseless VT',
    initialJPerKg: 2,
    maxJPerKg: 4,
    maxJ: 360,  // biphasic; 360 for monophasic
    notes: 'Initial 2 J/kg, subsequent 4 J/kg. Maximize to device max.',
  },
};

/**
 * Calculate weight-based drug dose
 */
export function calculateDrugDose(
  drug: string,
  weightKg: number,
  isSecondDose: boolean = false
): DoseCalculation | null {
  const protocol = DRUG_PROTOCOLS[drug];
  if (!protocol) return null;

  let dosePerKg = protocol.dosePerKg;
  let maxDose = protocol.maxDose;

  // Handle second dose for adenosine
  if (isSecondDose && protocol.secondDoseMultiplier) {
    dosePerKg *= protocol.secondDoseMultiplier;
    maxDose = DRUG_PROTOCOLS[`${drug}_2`]?.maxDose || maxDose * protocol.secondDoseMultiplier;
  }

  const calculatedDose = Math.min(weightKg * dosePerKg, maxDose);

  return {
    drug: protocol.name,
    weightBasedDose: dosePerKg,
    calculatedDose: Math.round(calculatedDose * 100) / 100, // Round to 2 decimal places
    maxDose,
    unit: protocol.unit,
    route: protocol.route.join('/'),
    notes: protocol.notes,
  };
}

/**
 * Calculate cardioversion/defibrillation energy
 */
export function calculateEnergy(
  type: 'CARDIOVERSION_SYNC' | 'DEFIBRILLATION',
  weightKg: number,
  attempt: number = 1
): DoseCalculation | null {
  const protocol = ENERGY_PROTOCOLS[type];
  if (!protocol) return null;

  // First attempt uses initial, subsequent uses higher
  const jPerKg = attempt === 1 ? protocol.initialJPerKg : protocol.maxJPerKg;
  const calculatedJ = Math.min(weightKg * jPerKg, protocol.maxJ);

  return {
    drug: protocol.name,
    weightBasedDose: jPerKg,
    calculatedDose: Math.round(calculatedJ),
    maxDose: protocol.maxJ,
    unit: 'J',
    route: 'EXTERNAL',
    notes: protocol.notes,
  };
}

/**
 * Evaluate dose accuracy (for assessment)
 * Returns ratio of given dose to correct dose
 */
export function evaluateDoseAccuracy(
  intervention: InterventionType,
  givenDose: number,
  weightKg: number
): { accuracy: number; correct: number; given: number; feedback: string } {
  let correctDose: number;
  let unit: string;

  switch (intervention) {
    case 'ADENOSINE':
      correctDose = calculateDrugDose('ADENOSINE', weightKg)?.calculatedDose || 0;
      unit = 'mg';
      break;
    case 'ADENOSINE_2':
      correctDose = calculateDrugDose('ADENOSINE', weightKg, true)?.calculatedDose || 0;
      unit = 'mg';
      break;
    case 'CARDIOVERSION_SYNC':
      correctDose = calculateEnergy('CARDIOVERSION_SYNC', weightKg)?.calculatedDose || 0;
      unit = 'J';
      break;
    case 'DEFIBRILLATION':
      correctDose = calculateEnergy('DEFIBRILLATION', weightKg)?.calculatedDose || 0;
      unit = 'J';
      break;
    case 'EPINEPHRINE':
      correctDose = calculateDrugDose('EPINEPHRINE', weightKg)?.calculatedDose || 0;
      unit = 'mg';
      break;
    default:
      return { accuracy: 1, correct: 0, given: givenDose, feedback: 'Not a dosed intervention' };
  }

  const accuracy = correctDose > 0 ? givenDose / correctDose : 0;
  
  let feedback: string;
  if (accuracy >= 0.9 && accuracy <= 1.1) {
    feedback = 'Correct dose';
  } else if (accuracy >= 0.8 && accuracy <= 1.2) {
    feedback = 'Acceptable dose (within 20%)';
  } else if (accuracy < 0.8) {
    feedback = `Underdosed: gave ${givenDose}${unit}, correct is ${correctDose}${unit}`;
  } else {
    feedback = `Overdosed: gave ${givenDose}${unit}, correct is ${correctDose}${unit}`;
  }

  return { accuracy, correct: correctDose, given: givenDose, feedback };
}

/**
 * Get all dose calculations for a patient weight (for display)
 */
export function getAllDoseCalculations(weightKg: number): Record<string, DoseCalculation> {
  const calculations: Record<string, DoseCalculation> = {};

  for (const drug of Object.keys(DRUG_PROTOCOLS)) {
    const calc = calculateDrugDose(drug, weightKg);
    if (calc) calculations[drug] = calc;
  }

  const cardio = calculateEnergy('CARDIOVERSION_SYNC', weightKg);
  if (cardio) calculations['CARDIOVERSION'] = cardio;

  const defib = calculateEnergy('DEFIBRILLATION', weightKg);
  if (defib) calculations['DEFIBRILLATION'] = defib;

  return calculations;
}

// Export for reference
export { DRUG_PROTOCOLS, ENERGY_PROTOCOLS };
