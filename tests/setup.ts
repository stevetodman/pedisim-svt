// ============================================================================
// TEST SETUP
// Common fixtures and utilities for testing
// ============================================================================

import { beforeEach, afterEach } from 'vitest';
import { setRandomSeed, resetRandom } from '../src/kernel/random';

// Default test seed for reproducible outcomes
export const DEFAULT_TEST_SEED = 12345;

// Patient fixture matching the scenario
export const TEST_PATIENT = {
  name: 'Lily Henderson',
  age: 5,
  weight: 18.5,
  gender: 'female' as const,
  chiefComplaint: 'SVT, heart racing',
  history: 'Was playing tag when symptoms started',
};

// Standard vitals for SVT state
export const SVT_VITALS = {
  heartRate: 220,
  systolicBP: 92,
  diastolicBP: 64,
  respiratoryRate: 26,
  spO2: 97,
  temperature: 98.6,
  capillaryRefill: 2,
};

// PALS dosing reference values for 18.5kg patient
export const PALS_REFERENCE = {
  adenosineFirstDose: 1.85,    // 0.1 mg/kg
  adenosineSecondDose: 3.7,    // 0.2 mg/kg
  adenosineMaxFirst: 6,        // mg
  adenosineMaxSecond: 12,      // mg
  cardioversionInitial: 9,     // 0.5 J/kg (rounded)
  cardioversionEscalated: 37,  // 2 J/kg
};

// Setup seeded random before each test for reproducibility
beforeEach(() => {
  setRandomSeed(DEFAULT_TEST_SEED);
});

// Reset to Math.random after each test
afterEach(() => {
  resetRandom();
});

/**
 * Helper to run a test multiple times with different seeds
 * Returns array of results for statistical analysis
 */
export function runWithMultipleSeeds<T>(
  fn: () => T,
  seedCount: number = 100
): T[] {
  const results: T[] = [];
  for (let seed = 0; seed < seedCount; seed++) {
    setRandomSeed(seed);
    results.push(fn());
  }
  return results;
}

/**
 * Calculate success rate from boolean results
 */
export function calculateSuccessRate(results: boolean[]): number {
  const successes = results.filter(r => r).length;
  return successes / results.length;
}
