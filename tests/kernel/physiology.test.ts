// ============================================================================
// PHYSIOLOGY TESTS
// Priority 2: Intervention outcome verification
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { processIntervention } from '../../src/kernel/physiology';
import { PatientState, InterventionRequest } from '../../src/kernel/types';
import { setRandomSeed } from '../../src/kernel/random';
import { TEST_PATIENT, SVT_VITALS, runWithMultipleSeeds, calculateSuccessRate } from '../setup';

// Create a valid patient state for testing
function createTestPatientState(overrides: Partial<PatientState> = {}): PatientState {
  return {
    profile: TEST_PATIENT,
    rhythm: 'SVT',
    vitals: SVT_VITALS,
    stability: 'compensated',
    mentalStatus: 'alert',
    perfusion: 'adequate',
    ivAccess: true,
    ioAccess: false,
    sedated: false,
    intubated: false,
    deteriorationStage: 0,
    timeInCurrentRhythm: 0,
    transientState: null,
    ...overrides,
  };
}

describe('processIntervention - Vagal Maneuver', () => {
  it('only works for SVT rhythm', () => {
    const state = createTestPatientState({ rhythm: 'SINUS' });
    const request: InterventionRequest = {
      type: 'VAGAL_ICE',
      timestamp: 1000,
    };

    const result = processIntervention(state, request);
    expect(result.outcome).toBe('NO_EFFECT');
    expect(result.reason).toContain('SVT');
  });

  it('has approximately 25% success rate', () => {
    const state = createTestPatientState();
    const request: InterventionRequest = {
      type: 'VAGAL_ICE',
      timestamp: 1000,
    };

    const results = runWithMultipleSeeds(() => {
      return processIntervention(state, request).success;
    }, 100);

    const successRate = calculateSuccessRate(results);
    // Allow 10% variance around 25%
    expect(successRate).toBeGreaterThanOrEqual(0.15);
    expect(successRate).toBeLessThanOrEqual(0.35);
  });

  it('converts to sinus on success', () => {
    setRandomSeed(42); // Known seed that produces success
    const state = createTestPatientState();
    const request: InterventionRequest = {
      type: 'VAGAL_ICE',
      timestamp: 1000,
    };

    // Find a seed that produces success
    let result;
    for (let seed = 0; seed < 100; seed++) {
      setRandomSeed(seed);
      result = processIntervention(state, request);
      if (result.success) break;
    }

    expect(result?.success).toBe(true);
    expect(result?.newState.rhythm).toBe('SINUS');
    expect(result?.newState.vitals?.heartRate).toBeGreaterThan(80);
    expect(result?.newState.vitals?.heartRate).toBeLessThan(110);
  });
});

describe('processIntervention - Adenosine', () => {
  describe('prerequisites', () => {
    it('requires IV or IO access', () => {
      const state = createTestPatientState({ ivAccess: false, ioAccess: false });
      const request: InterventionRequest = {
        type: 'ADENOSINE',
        timestamp: 1000,
        dose: 1.85,
      };

      const result = processIntervention(state, request);
      expect(result.outcome).toBe('PREREQUISITE_MISSING');
      expect(result.executed).toBe(false);
    });

    it('works with IV access', () => {
      const state = createTestPatientState({ ivAccess: true });
      const request: InterventionRequest = {
        type: 'ADENOSINE',
        timestamp: 1000,
        dose: 1.85,
      };

      const result = processIntervention(state, request);
      expect(result.executed).toBe(true);
    });

    it('works with IO access', () => {
      const state = createTestPatientState({ ivAccess: false, ioAccess: true });
      const request: InterventionRequest = {
        type: 'ADENOSINE',
        timestamp: 1000,
        dose: 1.85,
      };

      const result = processIntervention(state, request);
      expect(result.executed).toBe(true);
    });
  });

  describe('rhythm requirements', () => {
    it('only effective for SVT', () => {
      const state = createTestPatientState({ rhythm: 'SINUS' });
      const request: InterventionRequest = {
        type: 'ADENOSINE',
        timestamp: 1000,
        dose: 1.85,
      };

      const result = processIntervention(state, request);
      expect(result.outcome).toBe('NO_EFFECT');
    });
  });

  describe('transient asystole', () => {
    it('always causes transient asystole', () => {
      const state = createTestPatientState();
      const request: InterventionRequest = {
        type: 'ADENOSINE',
        timestamp: 1000,
        dose: 1.85,
      };

      const result = processIntervention(state, request);
      expect(result.outcome).toBe('TRANSIENT_RESPONSE');
      expect(result.newState.rhythm).toBe('ASYSTOLE');
      expect(result.newState.vitals?.heartRate).toBe(0);
    });

    it('stores transient state info', () => {
      const state = createTestPatientState();
      const request: InterventionRequest = {
        type: 'ADENOSINE',
        timestamp: 1000,
        dose: 1.85,
      };

      const result = processIntervention(state, request);
      expect(result.newState.transientState).not.toBeNull();
      expect(result.newState.transientState?.type).toBe('ADENOSINE_EFFECT');
      expect(result.newState.transientState?.previousRhythm).toBe('SVT');
    });
  });

  describe('success rates', () => {
    it('first dose has ~60% success with correct dosing', () => {
      const state = createTestPatientState();
      const request: InterventionRequest = {
        type: 'ADENOSINE',
        timestamp: 1000,
        dose: 1.85, // Correct dose
      };

      const results = runWithMultipleSeeds(() => {
        const result = processIntervention(state, request) as { _pendingConversion?: boolean };
        return result._pendingConversion ?? false;
      }, 100);

      const successRate = calculateSuccessRate(results);
      // Allow variance around 60%
      expect(successRate).toBeGreaterThanOrEqual(0.45);
      expect(successRate).toBeLessThanOrEqual(0.75);
    });

    it('second dose has ~80% success with correct dosing', () => {
      const state = createTestPatientState();
      const request: InterventionRequest = {
        type: 'ADENOSINE_2',
        timestamp: 1000,
        dose: 3.7, // Correct second dose
      };

      const results = runWithMultipleSeeds(() => {
        const result = processIntervention(state, request) as { _pendingConversion?: boolean };
        return result._pendingConversion ?? false;
      }, 100);

      const successRate = calculateSuccessRate(results);
      // Allow variance around 80%
      expect(successRate).toBeGreaterThanOrEqual(0.65);
      expect(successRate).toBeLessThanOrEqual(0.95);
    });

    it('underdose significantly reduces success', () => {
      const state = createTestPatientState();
      const request: InterventionRequest = {
        type: 'ADENOSINE',
        timestamp: 1000,
        dose: 0.5, // Very underdosed
      };

      const results = runWithMultipleSeeds(() => {
        const result = processIntervention(state, request) as { _pendingConversion?: boolean };
        return result._pendingConversion ?? false;
      }, 100);

      const successRate = calculateSuccessRate(results);
      // Should be much lower than 60%
      expect(successRate).toBeLessThan(0.3);
    });
  });
});

describe('processIntervention - Cardioversion', () => {
  describe('prerequisites', () => {
    it('requires sedation', () => {
      const state = createTestPatientState({ sedated: false });
      const request: InterventionRequest = {
        type: 'CARDIOVERSION_SYNC',
        timestamp: 1000,
        dose: 9,
      };

      const result = processIntervention(state, request);
      expect(result.outcome).toBe('PREREQUISITE_MISSING');
      expect(result.executed).toBe(false);
    });

    it('works when sedated', () => {
      const state = createTestPatientState({ sedated: true });
      const request: InterventionRequest = {
        type: 'CARDIOVERSION_SYNC',
        timestamp: 1000,
        dose: 9,
      };

      const result = processIntervention(state, request);
      expect(result.executed).toBe(true);
    });
  });

  describe('success rates', () => {
    it('has ~92% success with correct energy', () => {
      const state = createTestPatientState({ sedated: true });
      const request: InterventionRequest = {
        type: 'CARDIOVERSION_SYNC',
        timestamp: 1000,
        dose: 9, // Correct for 18.5kg
      };

      const results = runWithMultipleSeeds(() => {
        return processIntervention(state, request).success;
      }, 100);

      const successRate = calculateSuccessRate(results);
      // Allow variance around 92%
      expect(successRate).toBeGreaterThanOrEqual(0.80);
      expect(successRate).toBeLessThanOrEqual(0.99);
    });
  });
});

describe('processIntervention - Access Establishment', () => {
  describe('IV access', () => {
    it('has ~85% success rate', () => {
      const state = createTestPatientState({ ivAccess: false });
      const request: InterventionRequest = {
        type: 'ESTABLISH_IV',
        timestamp: 1000,
      };

      const results = runWithMultipleSeeds(() => {
        return processIntervention(state, request).success;
      }, 100);

      const successRate = calculateSuccessRate(results);
      expect(successRate).toBeGreaterThanOrEqual(0.75);
      expect(successRate).toBeLessThanOrEqual(0.95);
    });

    it('sets ivAccess on success', () => {
      setRandomSeed(1); // Known successful seed
      const state = createTestPatientState({ ivAccess: false });
      const request: InterventionRequest = {
        type: 'ESTABLISH_IV',
        timestamp: 1000,
      };

      // Find a seed that produces success
      let result;
      for (let seed = 0; seed < 100; seed++) {
        setRandomSeed(seed);
        result = processIntervention(state, request);
        if (result.success) break;
      }

      expect(result?.newState.ivAccess).toBe(true);
    });
  });

  describe('IO access', () => {
    it('has ~95% success rate', () => {
      const state = createTestPatientState({ ioAccess: false });
      const request: InterventionRequest = {
        type: 'ESTABLISH_IO',
        timestamp: 1000,
      };

      const results = runWithMultipleSeeds(() => {
        return processIntervention(state, request).success;
      }, 100);

      const successRate = calculateSuccessRate(results);
      expect(successRate).toBeGreaterThanOrEqual(0.85);
      expect(successRate).toBeLessThanOrEqual(1.0);
    });
  });
});

describe('processIntervention - Sedation', () => {
  it('requires IV or IO access', () => {
    const state = createTestPatientState({ ivAccess: false, ioAccess: false });
    const request: InterventionRequest = {
      type: 'SEDATION',
      timestamp: 1000,
    };

    const result = processIntervention(state, request);
    expect(result.outcome).toBe('PREREQUISITE_MISSING');
  });

  it('sets sedated state on success', () => {
    const state = createTestPatientState({ sedated: false });
    const request: InterventionRequest = {
      type: 'SEDATION',
      timestamp: 1000,
    };

    const result = processIntervention(state, request);
    expect(result.success).toBe(true);
    expect(result.newState.sedated).toBe(true);
  });
});
