// ============================================================================
// DOSES TESTS
// Priority 1: Safety-critical drug dosing calculations
// ============================================================================

import { describe, it, expect } from 'vitest';
import { calculateDrugDose, calculateEnergy, evaluateDoseAccuracy } from '../../src/kernel/doses';
import { PALS_REFERENCE, TEST_PATIENT } from '../setup';

describe('calculateDrugDose - Adenosine', () => {
  const weight = TEST_PATIENT.weight; // 18.5kg

  describe('first dose (0.1 mg/kg)', () => {
    it('calculates correct dose for 18.5kg patient', () => {
      const result = calculateDrugDose('ADENOSINE', weight);
      expect(result).not.toBeNull();
      expect(result?.calculatedDose).toBe(PALS_REFERENCE.adenosineFirstDose);
    });

    it('respects max dose of 6mg', () => {
      const result = calculateDrugDose('ADENOSINE', 80); // Would be 8mg without cap
      expect(result?.calculatedDose).toBe(6);
    });

    it('calculates for smaller child (10kg)', () => {
      const result = calculateDrugDose('ADENOSINE', 10);
      expect(result?.calculatedDose).toBe(1); // 0.1 * 10 = 1mg
    });
  });

  describe('second dose (0.2 mg/kg)', () => {
    it('doubles dose for second attempt', () => {
      const result = calculateDrugDose('ADENOSINE_2', weight);
      expect(result).not.toBeNull();
      expect(result?.calculatedDose).toBe(PALS_REFERENCE.adenosineSecondDose);
    });

    it('respects max dose of 12mg for second dose', () => {
      const result = calculateDrugDose('ADENOSINE_2', 80); // Would be 16mg without cap
      expect(result?.calculatedDose).toBe(12);
    });
  });
});

describe('calculateEnergy - Cardioversion', () => {
  const weight = TEST_PATIENT.weight;

  describe('initial energy (0.5 J/kg)', () => {
    it('calculates initial energy for 18.5kg', () => {
      const result = calculateEnergy('CARDIOVERSION_SYNC', weight, 1);
      expect(result).not.toBeNull();
      // 0.5 * 18.5 = 9.25
      expect(result?.calculatedDose).toBeCloseTo(PALS_REFERENCE.cardioversionInitial, 0);
    });
  });

  describe('escalated energy (2 J/kg)', () => {
    it('calculates escalated energy for 18.5kg', () => {
      const result = calculateEnergy('CARDIOVERSION_SYNC', weight, 2);
      expect(result).not.toBeNull();
      // 2 * 18.5 = 37
      expect(result?.calculatedDose).toBe(PALS_REFERENCE.cardioversionEscalated);
    });
  });
});

describe('evaluateDoseAccuracy', () => {
  const weight = TEST_PATIENT.weight;

  describe('adenosine dose evaluation', () => {
    it('returns 1.0 for exact correct dose', () => {
      const result = evaluateDoseAccuracy('ADENOSINE', 1.85, weight);
      expect(result.accuracy).toBe(1);
    });

    it('returns < 1 for underdose', () => {
      const result = evaluateDoseAccuracy('ADENOSINE', 1.0, weight);
      expect(result.accuracy).toBeLessThan(1);
      expect(result.accuracy).toBeGreaterThan(0);
    });

    it('returns > 1 for overdose', () => {
      const result = evaluateDoseAccuracy('ADENOSINE', 3.0, weight);
      expect(result.accuracy).toBeGreaterThan(1);
    });

    it('identifies significant underdose', () => {
      const result = evaluateDoseAccuracy('ADENOSINE', 0.5, weight);
      expect(result.accuracy).toBeLessThan(0.5);
    });
  });

  describe('cardioversion energy evaluation', () => {
    it('returns 1.0 for correct initial energy', () => {
      const result = evaluateDoseAccuracy('CARDIOVERSION_SYNC', 9, weight);
      expect(result.accuracy).toBeCloseTo(1, 1);
    });

    it('detects low energy setting', () => {
      const result = evaluateDoseAccuracy('CARDIOVERSION_SYNC', 5, weight);
      expect(result.accuracy).toBeLessThan(1);
    });
  });
});

describe('edge cases', () => {
  it('handles zero weight gracefully', () => {
    const result = calculateDrugDose('ADENOSINE', 0);
    expect(result?.calculatedDose).toBe(0);
  });

  it('handles negative dose evaluation', () => {
    const result = evaluateDoseAccuracy('ADENOSINE', -1, 18.5);
    // Negative dose divided by correct dose gives negative accuracy
    expect(result.accuracy).toBeLessThan(0);
  });

  it('handles unknown drug type', () => {
    // @ts-expect-error - testing invalid input
    const result = calculateDrugDose('UNKNOWN_DRUG', 18.5);
    expect(result).toBeNull();
  });
});
