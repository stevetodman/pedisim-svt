// ============================================================================
// CLINICAL ASSESSMENT TESTS
// Tests for perfusion assessment, procedural effects, and nurse observations
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  calculatePerfusion,
  getIVInsertionEffects,
  getIOInsertionEffects,
  getSedationEffects,
  detectPerfusionChanges,
  getPerfusionStatus,
  describePulseQuality,
  describeCoolTo,
  describeMottling,
  describeCapRefill,
  getNurseObservation,
  type PerfusionAssessment,
} from '../../src/kernel/clinicalAssessment';

// ============================================================================
// PERFUSION CALCULATION TESTS
// ============================================================================

describe('calculatePerfusion', () => {
  describe('perfusion by deterioration stage', () => {
    it('returns adequate perfusion for compensated stage', () => {
      const perfusion = calculatePerfusion('compensated', false, false);
      expect(perfusion.pulseQuality).toBe('strong');
      expect(perfusion.extremityTemp.hands).toBe('warm');
      expect(perfusion.coolTo).toBe('normal');
      expect(perfusion.mottling).toBe('none');
      expect(perfusion.capRefill).toBe(2);
      expect(perfusion.skinColor).toBe('pink');
    });

    it('returns early stress perfusion with cool hands', () => {
      const perfusion = calculatePerfusion('early_stress', false, false);
      expect(perfusion.pulseQuality).toBe('normal');
      expect(perfusion.extremityTemp.hands).toBe('cool');
      expect(perfusion.coolTo).toBe('hands');
      expect(perfusion.mottling).toBe('none');
      expect(perfusion.capRefill).toBe(2.5);
      expect(perfusion.skinColor).toBe('pale');
    });

    it('returns moderate stress perfusion with peripheral mottling', () => {
      const perfusion = calculatePerfusion('moderate_stress', false, false);
      expect(perfusion.pulseQuality).toBe('weak');
      expect(perfusion.extremityTemp.wrists).toBe('cool');
      expect(perfusion.coolTo).toBe('wrists');
      expect(perfusion.mottling).toBe('peripheral');
      expect(perfusion.capRefill).toBe(3.5);
    });

    it('returns decompensating perfusion with thready pulse', () => {
      const perfusion = calculatePerfusion('decompensating', false, false);
      expect(perfusion.pulseQuality).toBe('thready');
      expect(perfusion.extremityTemp.hands).toBe('cold');
      expect(perfusion.coolTo).toBe('elbows');
      expect(perfusion.mottling).toBe('central');
      expect(perfusion.capRefill).toBe(4.5);
      expect(perfusion.skinColor).toBe('mottled');
    });

    it('returns critical perfusion with generalized mottling', () => {
      const perfusion = calculatePerfusion('critical', false, false);
      expect(perfusion.pulseQuality).toBe('thready');
      expect(perfusion.extremityTemp.elbows).toBe('cold');
      expect(perfusion.coolTo).toBe('knees');
      expect(perfusion.mottling).toBe('generalized');
      expect(perfusion.capRefill).toBe(6);
      expect(perfusion.skinColor).toBe('gray');
    });
  });

  describe('perfusion during asystole', () => {
    it('returns absent pulse for asystole', () => {
      const perfusion = calculatePerfusion('compensated', true, false);
      expect(perfusion.pulseQuality).toBe('absent');
      expect(perfusion.mottling).toBe('generalized');
      expect(perfusion.skinColor).toBe('gray');
    });

    it('prioritizes asystole over deterioration stage', () => {
      // Even if stage is compensated, asystole takes precedence
      const perfusion = calculatePerfusion('compensated', true, false);
      expect(perfusion.pulseQuality).toBe('absent');
    });
  });

  describe('perfusion during recovery', () => {
    it('returns weak pulse in early recovery (0-12s)', () => {
      const perfusion = calculatePerfusion('compensated', false, true, 5000);
      expect(perfusion.pulseQuality).toBe('weak');
      expect(perfusion.mottling).toBe('peripheral');
    });

    it('returns normal pulse in mid recovery (12-30s)', () => {
      const perfusion = calculatePerfusion('compensated', false, true, 20000);
      expect(perfusion.pulseQuality).toBe('normal');
      expect(perfusion.mottling).toBe('none');
    });

    it('returns strong pulse in full recovery (>30s)', () => {
      const perfusion = calculatePerfusion('compensated', false, true, 45000);
      expect(perfusion.pulseQuality).toBe('strong');
      expect(perfusion.extremityTemp.hands).toBe('warm');
      expect(perfusion.skinColor).toBe('pink');
    });
  });
});

// ============================================================================
// PROCEDURAL EFFECTS TESTS
// ============================================================================

describe('getIVInsertionEffects', () => {
  it('returns negative SpO2 delta on first attempt', () => {
    const effect = getIVInsertionEffects(1);
    expect(effect.spO2Delta).toBeLessThan(0);
    expect(effect.spO2Delta).toBeGreaterThanOrEqual(-8);
  });

  it('returns worse SpO2 delta on subsequent attempts', () => {
    // Run multiple times to verify trend
    let firstAttemptAvg = 0;
    let secondAttemptAvg = 0;

    for (let i = 0; i < 100; i++) {
      firstAttemptAvg += Math.abs(getIVInsertionEffects(1).spO2Delta);
      secondAttemptAvg += Math.abs(getIVInsertionEffects(2).spO2Delta);
    }

    // Second attempt should be worse on average (1.5x multiplier)
    expect(secondAttemptAvg / 100).toBeGreaterThan(firstAttemptAvg / 100);
  });

  it('returns appropriate duration (8-12 seconds)', () => {
    const effect = getIVInsertionEffects(1);
    expect(effect.durationMs).toBeGreaterThanOrEqual(8000);
    expect(effect.durationMs).toBeLessThanOrEqual(12000);
  });

  it('has artifact on IV attempts', () => {
    const effect = getIVInsertionEffects(1);
    expect(effect.hasArtifact).toBe(true);
    expect(effect.artifactSeverity).toBe('mild');
  });

  it('has more severe artifact on retry', () => {
    const effect = getIVInsertionEffects(2);
    expect(effect.artifactSeverity).toBe('moderate');
  });
});

describe('getIOInsertionEffects', () => {
  it('returns significant SpO2 drop (-8 to -15)', () => {
    const effect = getIOInsertionEffects();
    expect(effect.spO2Delta).toBeLessThan(-7);
    expect(effect.spO2Delta).toBeGreaterThanOrEqual(-15);
  });

  it('returns ~10 second duration', () => {
    const effect = getIOInsertionEffects();
    expect(effect.durationMs).toBe(10000);
  });

  it('has severe artifact', () => {
    const effect = getIOInsertionEffects();
    expect(effect.hasArtifact).toBe(true);
    expect(effect.artifactSeverity).toBe('severe');
  });
});

describe('getSedationEffects', () => {
  it('returns mild SpO2 drop (-1 to -3)', () => {
    const effect = getSedationEffects();
    expect(effect.spO2Delta).toBeLessThan(0);
    expect(effect.spO2Delta).toBeGreaterThanOrEqual(-3);
  });

  it('returns negative HR delta (reduced anxiety)', () => {
    const effect = getSedationEffects();
    expect(effect.hrDelta).toBeLessThan(0);
  });

  it('has 45 second duration for onset', () => {
    const effect = getSedationEffects();
    expect(effect.durationMs).toBe(45000);
  });

  it('has no artifact (calm patient)', () => {
    const effect = getSedationEffects();
    expect(effect.hasArtifact).toBe(false);
  });
});

// ============================================================================
// PERFUSION CHANGE DETECTION TESTS
// ============================================================================

describe('detectPerfusionChanges', () => {
  it('returns empty array when previous is null', () => {
    const current: PerfusionAssessment = {
      pulseQuality: 'normal',
      extremityTemp: { hands: 'warm', wrists: 'warm', elbows: 'warm' },
      coolTo: 'normal',
      mottling: 'none',
      capRefill: 2,
      skinColor: 'pink',
    };
    const changes = detectPerfusionChanges(null, current);
    expect(changes).toEqual([]);
  });

  it('detects hands getting cool', () => {
    const previous: PerfusionAssessment = {
      pulseQuality: 'strong',
      extremityTemp: { hands: 'warm', wrists: 'warm', elbows: 'warm' },
      coolTo: 'normal',
      mottling: 'none',
      capRefill: 2,
      skinColor: 'pink',
    };
    const current: PerfusionAssessment = {
      ...previous,
      extremityTemp: { hands: 'cool', wrists: 'warm', elbows: 'warm' },
      coolTo: 'hands',
    };
    const changes = detectPerfusionChanges(previous, current);
    expect(changes).toContain('perfusion_hands_cool');
  });

  it('detects cool spreading to wrists', () => {
    const previous: PerfusionAssessment = {
      pulseQuality: 'normal',
      extremityTemp: { hands: 'cool', wrists: 'warm', elbows: 'warm' },
      coolTo: 'hands',
      mottling: 'none',
      capRefill: 2.5,
      skinColor: 'pale',
    };
    const current: PerfusionAssessment = {
      ...previous,
      extremityTemp: { hands: 'cool', wrists: 'cool', elbows: 'warm' },
      coolTo: 'wrists',
    };
    const changes = detectPerfusionChanges(previous, current);
    expect(changes).toContain('perfusion_wrists_cool');
  });

  it('detects mottling appearing', () => {
    const previous: PerfusionAssessment = {
      pulseQuality: 'weak',
      extremityTemp: { hands: 'cool', wrists: 'cool', elbows: 'warm' },
      coolTo: 'wrists',
      mottling: 'none',
      capRefill: 3,
      skinColor: 'pale',
    };
    const current: PerfusionAssessment = {
      ...previous,
      mottling: 'peripheral',
    };
    const changes = detectPerfusionChanges(previous, current);
    expect(changes).toContain('perfusion_mottling');
  });

  it('detects pulse weakening from normal to weak', () => {
    const previous: PerfusionAssessment = {
      pulseQuality: 'normal',
      extremityTemp: { hands: 'cool', wrists: 'warm', elbows: 'warm' },
      coolTo: 'hands',
      mottling: 'none',
      capRefill: 2.5,
      skinColor: 'pale',
    };
    const current: PerfusionAssessment = {
      ...previous,
      pulseQuality: 'weak',
    };
    const changes = detectPerfusionChanges(previous, current);
    expect(changes).toContain('perfusion_pulse_weak');
  });

  it('detects pulse becoming thready', () => {
    const previous: PerfusionAssessment = {
      pulseQuality: 'weak',
      extremityTemp: { hands: 'cool', wrists: 'cool', elbows: 'warm' },
      coolTo: 'wrists',
      mottling: 'peripheral',
      capRefill: 3.5,
      skinColor: 'pale',
    };
    const current: PerfusionAssessment = {
      ...previous,
      pulseQuality: 'thready',
    };
    const changes = detectPerfusionChanges(previous, current);
    expect(changes).toContain('perfusion_pulse_thready');
  });

  it('detects perfusion recovering', () => {
    const previous: PerfusionAssessment = {
      pulseQuality: 'weak',
      extremityTemp: { hands: 'cool', wrists: 'cool', elbows: 'warm' },
      coolTo: 'wrists',
      mottling: 'peripheral',
      capRefill: 3.5,
      skinColor: 'pale',
    };
    const current: PerfusionAssessment = {
      pulseQuality: 'strong',
      extremityTemp: { hands: 'warm', wrists: 'warm', elbows: 'warm' },
      coolTo: 'normal',
      mottling: 'none',
      capRefill: 2,
      skinColor: 'pink',
    };
    const changes = detectPerfusionChanges(previous, current);
    expect(changes).toContain('perfusion_recovering');
  });
});

// ============================================================================
// PERFUSION STATUS TESTS
// ============================================================================

describe('getPerfusionStatus', () => {
  it('returns NO PERFUSION for absent pulse', () => {
    const assessment: PerfusionAssessment = {
      pulseQuality: 'absent',
      extremityTemp: { hands: 'cold', wrists: 'cold', elbows: 'cold' },
      coolTo: 'knees',
      mottling: 'generalized',
      capRefill: 6,
      skinColor: 'gray',
    };
    const status = getPerfusionStatus(assessment);
    expect(status.label).toBe('NO PERFUSION');
    expect(status.severity).toBe('critical');
  });

  it('returns CRITICAL for thready pulse', () => {
    const assessment: PerfusionAssessment = {
      pulseQuality: 'thready',
      extremityTemp: { hands: 'cold', wrists: 'cool', elbows: 'cool' },
      coolTo: 'elbows',
      mottling: 'central',
      capRefill: 4.5,
      skinColor: 'mottled',
    };
    const status = getPerfusionStatus(assessment);
    expect(status.label).toBe('CRITICAL');
    expect(status.severity).toBe('critical');
  });

  it('returns CRITICAL for generalized mottling', () => {
    const assessment: PerfusionAssessment = {
      pulseQuality: 'weak',
      extremityTemp: { hands: 'cold', wrists: 'cold', elbows: 'cold' },
      coolTo: 'knees',
      mottling: 'generalized',
      capRefill: 6,
      skinColor: 'gray',
    };
    const status = getPerfusionStatus(assessment);
    expect(status.label).toBe('CRITICAL');
    expect(status.severity).toBe('critical');
  });

  it('returns POOR for weak pulse', () => {
    const assessment: PerfusionAssessment = {
      pulseQuality: 'weak',
      extremityTemp: { hands: 'cool', wrists: 'cool', elbows: 'warm' },
      coolTo: 'wrists',
      mottling: 'none',
      capRefill: 3.5,
      skinColor: 'pale',
    };
    const status = getPerfusionStatus(assessment);
    expect(status.label).toBe('POOR');
    expect(status.severity).toBe('poor');
  });

  it('returns POOR for peripheral mottling', () => {
    const assessment: PerfusionAssessment = {
      pulseQuality: 'normal',
      extremityTemp: { hands: 'cool', wrists: 'cool', elbows: 'warm' },
      coolTo: 'wrists',
      mottling: 'peripheral',
      capRefill: 3.5,
      skinColor: 'pale',
    };
    const status = getPerfusionStatus(assessment);
    expect(status.label).toBe('POOR');
    expect(status.severity).toBe('poor');
  });

  it('returns DELAYED for cool extremities', () => {
    const assessment: PerfusionAssessment = {
      pulseQuality: 'normal',
      extremityTemp: { hands: 'cool', wrists: 'warm', elbows: 'warm' },
      coolTo: 'hands',
      mottling: 'none',
      capRefill: 2.5,
      skinColor: 'pale',
    };
    const status = getPerfusionStatus(assessment);
    expect(status.label).toBe('DELAYED');
    expect(status.severity).toBe('concerning');
  });

  it('returns DELAYED for prolonged cap refill', () => {
    const assessment: PerfusionAssessment = {
      pulseQuality: 'normal',
      extremityTemp: { hands: 'warm', wrists: 'warm', elbows: 'warm' },
      coolTo: 'normal',
      mottling: 'none',
      capRefill: 3,
      skinColor: 'pink',
    };
    const status = getPerfusionStatus(assessment);
    expect(status.label).toBe('DELAYED');
    expect(status.severity).toBe('concerning');
  });

  it('returns ADEQUATE for good perfusion', () => {
    const assessment: PerfusionAssessment = {
      pulseQuality: 'strong',
      extremityTemp: { hands: 'warm', wrists: 'warm', elbows: 'warm' },
      coolTo: 'normal',
      mottling: 'none',
      capRefill: 2,
      skinColor: 'pink',
    };
    const status = getPerfusionStatus(assessment);
    expect(status.label).toBe('ADEQUATE');
    expect(status.severity).toBe('good');
  });
});

// ============================================================================
// DISPLAY HELPER TESTS
// ============================================================================

describe('display helpers', () => {
  describe('describePulseQuality', () => {
    it('returns correct descriptions', () => {
      expect(describePulseQuality('bounding')).toBe('Bounding pulse');
      expect(describePulseQuality('strong')).toBe('Strong pulse');
      expect(describePulseQuality('normal')).toBe('Normal pulse');
      expect(describePulseQuality('weak')).toBe('Weak pulse');
      expect(describePulseQuality('thready')).toBe('Thready pulse');
      expect(describePulseQuality('absent')).toBe('No pulse palpable');
    });
  });

  describe('describeCoolTo', () => {
    it('returns correct descriptions', () => {
      expect(describeCoolTo('normal')).toBe('Warm extremities');
      expect(describeCoolTo('fingertips')).toBe('Cool fingertips');
      expect(describeCoolTo('hands')).toBe('Cool to hands');
      expect(describeCoolTo('wrists')).toBe('Cool to wrists');
      expect(describeCoolTo('elbows')).toBe('Cool to elbows');
      expect(describeCoolTo('knees')).toBe('Cool to knees');
    });
  });

  describe('describeMottling', () => {
    it('returns correct descriptions', () => {
      expect(describeMottling('none')).toBe('No mottling');
      expect(describeMottling('peripheral')).toBe('Peripheral mottling');
      expect(describeMottling('central')).toBe('Central mottling');
      expect(describeMottling('generalized')).toBe('Generalized mottling');
    });
  });

  describe('describeCapRefill', () => {
    it('returns correct descriptions based on seconds', () => {
      expect(describeCapRefill(1.5)).toBe('Brisk (<2s)');
      expect(describeCapRefill(2)).toBe('Brisk (<2s)');
      expect(describeCapRefill(2.5)).toBe('Slightly delayed (2-3s)');
      expect(describeCapRefill(3.5)).toBe('Delayed (3-4s)');
      expect(describeCapRefill(4.5)).toBe('Significantly delayed (4-5s)');
      expect(describeCapRefill(6)).toBe('Severely delayed (>5s)');
    });
  });
});

// ============================================================================
// NURSE OBSERVATION TESTS
// ============================================================================

describe('getNurseObservation', () => {
  it('returns string for each observation type', () => {
    const types = [
      'perfusion_hands_cool',
      'perfusion_wrists_cool',
      'perfusion_mottling',
      'perfusion_pulse_weak',
      'perfusion_pulse_thready',
      'perfusion_recovering',
      'procedure_artifact',
      'procedure_spo2_drop',
    ] as const;

    for (const type of types) {
      const observation = getNurseObservation(type);
      expect(typeof observation).toBe('string');
      expect(observation.length).toBeGreaterThan(0);
    }
  });

  it('returns varied responses (not always the same)', () => {
    // Run multiple times and check for variation
    const responses = new Set<string>();
    for (let i = 0; i < 100; i++) {
      responses.add(getNurseObservation('perfusion_hands_cool'));
    }
    // Should have multiple different responses
    expect(responses.size).toBeGreaterThan(1);
  });
});
