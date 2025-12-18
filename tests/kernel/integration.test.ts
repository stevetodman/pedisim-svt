// ============================================================================
// INTEGRATION TESTS
// Multi-intervention sequences and end-to-end scenarios
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { processIntervention } from '../../src/kernel/physiology';
import { PatientState, InterventionRequest, InterventionResult } from '../../src/kernel/types';
import { setRandomSeed } from '../../src/kernel/random';
import { TEST_PATIENT, SVT_VITALS } from '../setup';

function createTestPatientState(overrides: Partial<PatientState> = {}): PatientState {
  return {
    profile: TEST_PATIENT,
    rhythm: 'SVT',
    vitals: SVT_VITALS,
    stability: 'compensated',
    mentalStatus: 'alert',
    perfusion: 'adequate',
    ivAccess: false,
    ioAccess: false,
    sedated: false,
    intubated: false,
    deteriorationStage: 0,
    timeInCurrentRhythm: 0,
    transientState: null,
    ...overrides,
  };
}

// Helper to merge partial newState with original state
function applyResult(state: PatientState, result: InterventionResult): PatientState {
  return {
    ...state,
    ...result.newState,
    vitals: result.newState.vitals ? { ...state.vitals, ...result.newState.vitals } : state.vitals,
  };
}

describe('Multi-intervention sequences', () => {
  describe('standard PALS SVT protocol', () => {
    it('vagal → adenosine sequence works', () => {
      setRandomSeed(999); // Seed where vagal fails
      let state = createTestPatientState({ ivAccess: true });

      // Step 1: Try vagal (may fail)
      const vagalRequest: InterventionRequest = {
        type: 'VAGAL_ICE',
        timestamp: 1000,
      };
      let result = processIntervention(state, vagalRequest);

      // If vagal failed, proceed to adenosine
      if (!result.success) {
        state = applyResult(state, result);

        // Step 2: Adenosine
        const adenosineRequest: InterventionRequest = {
          type: 'ADENOSINE',
          timestamp: 2000,
          dose: 1.85,
        };
        result = processIntervention(state, adenosineRequest);

        expect(result.executed).toBe(true);
        expect(result.newState.rhythm).toBe('ASYSTOLE'); // Transient
      } else {
        expect(result.newState.rhythm).toBe('SINUS');
      }
    });

    it('adenosine 1 → adenosine 2 → cardioversion escalation', () => {
      setRandomSeed(0); // Ensure adenosine fails
      let state = createTestPatientState({ ivAccess: true, sedated: true });

      // First adenosine
      let result = processIntervention(state, {
        type: 'ADENOSINE',
        timestamp: 1000,
        dose: 1.85,
      });
      expect(result.executed).toBe(true);

      // Second adenosine (higher dose) - reset rhythm to SVT after transient
      state = { ...state, ...result.newState, rhythm: 'SVT' };
      result = processIntervention(state, {
        type: 'ADENOSINE_2',
        timestamp: 5000,
        dose: 3.7,
      });
      expect(result.executed).toBe(true);

      // Cardioversion - reset rhythm to SVT after transient
      state = { ...state, ...result.newState, rhythm: 'SVT', sedated: true };
      result = processIntervention(state, {
        type: 'CARDIOVERSION_SYNC',
        timestamp: 10000,
        dose: 9,
      });
      expect(result.executed).toBe(true);
    });
  });

  describe('access establishment sequences', () => {
    it('establish IV → adenosine sequence', () => {
      let state = createTestPatientState();

      // Try adenosine without IV - should fail
      let result = processIntervention(state, {
        type: 'ADENOSINE',
        timestamp: 1000,
        dose: 1.85,
      });
      expect(result.outcome).toBe('PREREQUISITE_MISSING');

      // Find a seed where IV succeeds
      for (let seed = 0; seed < 100; seed++) {
        setRandomSeed(seed);
        result = processIntervention(state, {
          type: 'ESTABLISH_IV',
          timestamp: 2000,
        });
        if (result.success) break;
      }
      expect(result.success).toBe(true);
      state = applyResult(state, result);

      // Now adenosine should work
      result = processIntervention(state, {
        type: 'ADENOSINE',
        timestamp: 3000,
        dose: 1.85,
      });
      expect(result.executed).toBe(true);
    });

    it('IO access enables adenosine', () => {
      let state = createTestPatientState();

      // Find seed where IO succeeds (IO has high success rate ~95%)
      for (let seed = 0; seed < 100; seed++) {
        setRandomSeed(seed);
        const result = processIntervention(state, {
          type: 'ESTABLISH_IO',
          timestamp: 1000,
        });
        if (result.success) {
          state = applyResult(state, result);
          break;
        }
      }
      expect(state.ioAccess).toBe(true);

      // Adenosine should work with IO access
      const result = processIntervention(state, {
        type: 'ADENOSINE',
        timestamp: 2000,
        dose: 1.85,
      });
      expect(result.executed).toBe(true);
    });
  });

  describe('sedation requirements', () => {
    it('sedation → cardioversion sequence', () => {
      let state = createTestPatientState({ ivAccess: true });

      // Try cardioversion without sedation - should fail
      let result = processIntervention(state, {
        type: 'CARDIOVERSION_SYNC',
        timestamp: 1000,
        dose: 9,
      });
      expect(result.outcome).toBe('PREREQUISITE_MISSING');

      // Sedate
      result = processIntervention(state, {
        type: 'SEDATION',
        timestamp: 2000,
      });
      expect(result.success).toBe(true);
      state = applyResult(state, result);

      // Now cardioversion should work
      result = processIntervention(state, {
        type: 'CARDIOVERSION_SYNC',
        timestamp: 3000,
        dose: 9,
      });
      expect(result.executed).toBe(true);
    });
  });
});

describe('State persistence across interventions', () => {
  it('IV access is preserved in original state after vagal', () => {
    let state = createTestPatientState({ ivAccess: true });

    // Vagal doesn't change ivAccess - partial newState won't include it
    setRandomSeed(42);
    const result = processIntervention(state, {
      type: 'VAGAL_ICE',
      timestamp: 1000,
    });

    // newState is partial - it doesn't include ivAccess since it wasn't changed
    // When merged, ivAccess should be preserved
    const mergedState = applyResult(state, result);
    expect(mergedState.ivAccess).toBe(true);
  });

  it('sedation state is preserved when not modified', () => {
    let state = createTestPatientState({ ivAccess: true, sedated: true });

    // Adenosine doesn't change sedation - partial newState won't include it
    const result = processIntervention(state, {
      type: 'ADENOSINE',
      timestamp: 1000,
      dose: 1.85,
    });

    // When merged, sedation should be preserved
    const mergedState = applyResult(state, result);
    expect(mergedState.sedated).toBe(true);
  });
});

describe('Rhythm transition sequences', () => {
  it('adenosine causes transient asystole', () => {
    const state = createTestPatientState({ ivAccess: true });

    setRandomSeed(42);
    const result = processIntervention(state, {
      type: 'ADENOSINE',
      timestamp: 1000,
      dose: 1.85,
    });

    // Adenosine always causes transient asystole
    expect(result.outcome).toBe('TRANSIENT_RESPONSE');
    expect(result.newState.rhythm).toBe('ASYSTOLE');
    expect(result.newState.transientState).not.toBeNull();
  });

  it('successful cardioversion converts to sinus', () => {
    const state = createTestPatientState({ ivAccess: true, sedated: true });

    // Find seed that produces success
    for (let seed = 0; seed < 100; seed++) {
      setRandomSeed(seed);
      const result = processIntervention(state, {
        type: 'CARDIOVERSION_SYNC',
        timestamp: 1000,
        dose: 9,
      });

      if (result.success) {
        expect(result.newState.rhythm).toBe('SINUS');
        expect(result.newState.vitals?.heartRate).toBeGreaterThan(80);
        expect(result.newState.vitals?.heartRate).toBeLessThan(110);
        break;
      }
    }
  });
});

describe('Error handling in sequences', () => {
  it('failed vagal allows subsequent adenosine', () => {
    let state = createTestPatientState({ ivAccess: true });

    // Find seed where vagal fails
    for (let seed = 0; seed < 100; seed++) {
      setRandomSeed(seed);
      const result = processIntervention(state, {
        type: 'VAGAL_ICE',
        timestamp: 1000,
      });
      if (!result.success) {
        state = applyResult(state, result);
        break;
      }
    }

    // Next intervention should work - state is still valid
    const result = processIntervention(state, {
      type: 'ADENOSINE',
      timestamp: 2000,
      dose: 1.85,
    });
    expect(result.executed).toBe(true);
  });

  it('adenosine on sinus rhythm has no effect', () => {
    const state = createTestPatientState({ rhythm: 'SINUS', ivAccess: true });

    // Adenosine on sinus rhythm - should have no effect
    const result = processIntervention(state, {
      type: 'ADENOSINE',
      timestamp: 1000,
      dose: 1.85,
    });

    expect(result.outcome).toBe('NO_EFFECT');
    // newState is partial and empty for NO_EFFECT, original rhythm preserved
  });
});
