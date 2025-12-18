// ============================================================================
// COUNTERFACTUAL ENGINE TESTS
// Tests for "what if" analysis generation
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  generateCounterfactuals,
  getMostImpactfulCounterfactual,
  formatCounterfactualCompact,
  calculatePreventabilityScore,
} from '../../../src/kernel/evaluation/counterfactual';
import { TimelineEvent, PivotPoint, Counterfactual } from '../../../src/kernel/evaluation/types';

// Helper to create timeline events
function createEvent(timestamp: number, markAnxiety: number, lilyFear: number, phase = 'RUNNING'): TimelineEvent {
  return {
    id: `evt_${timestamp}`,
    timestamp,
    type: 'action',
    actor: 'learner',
    content: 'test',
    stateBefore: { phase, markAnxiety, lilyFear } as any,
    stateAfter: { phase, markAnxiety, lilyFear } as any,
  };
}

// Helper to create pivot points
function createPivot(id: string, timestamp: number): PivotPoint {
  return {
    id,
    timestamp,
    type: 'missed_opportunity',
    impact: 'critical',
    description: 'Test pivot',
    alternatives: [],
    actualOutcome: 'Test outcome',
    affectedCharacters: ['mark'],
    stateImpact: { markAnxietyDelta: 2, lilyFearDelta: 1 },
    teachingPoint: 'Test teaching point',
  };
}

describe('generateCounterfactuals', () => {
  describe('no_warning_before_asystole model', () => {
    it('generates counterfactual for missing warning pivot', () => {
      const pivots = [createPivot('pivot_no_warning_before_asystole', 1000)];
      const timeline = [
        createEvent(0, 3, 4),
        createEvent(1000, 5, 5),
      ];

      const counterfactuals = generateCounterfactuals(pivots, timeline);

      expect(counterfactuals).toHaveLength(1);
      expect(counterfactuals[0].pivotId).toBe('pivot_no_warning_before_asystole');
    });

    it('calculates actual anxiety peak from timeline', () => {
      const pivots = [createPivot('pivot_no_warning_before_asystole', 1000)];
      const timeline = [
        createEvent(0, 3, 4),
        createEvent(500, 4, 4),
        createEvent(1000, 5, 5), // Peak
        createEvent(1500, 4, 4),
      ];

      const counterfactuals = generateCounterfactuals(pivots, timeline);

      expect(counterfactuals[0].actual.markAnxietyPeak).toBe(5);
      expect(counterfactuals[0].actual.lilyFearPeak).toBe(5);
    });

    it('includes alternative model with lower values', () => {
      const pivots = [createPivot('pivot_no_warning_before_asystole', 1000)];
      const timeline = [createEvent(1000, 5, 5)];

      const counterfactuals = generateCounterfactuals(pivots, timeline);

      expect(counterfactuals[0].alternative.markAnxietyPeak).toBeLessThan(
        counterfactuals[0].actual.markAnxietyPeak
      );
    });

    it('includes intervention with exact words', () => {
      const pivots = [createPivot('pivot_no_warning_before_asystole', 1000)];
      const timeline = [createEvent(1000, 5, 5)];

      const counterfactuals = generateCounterfactuals(pivots, timeline);

      expect(counterfactuals[0].intervention.exactWords).toContain('pause');
      expect(counterfactuals[0].intervention.exactWords).toContain('temporary');
    });
  });

  describe('silence_during_asystole model', () => {
    it('generates counterfactual for silence pivot', () => {
      const pivots = [createPivot('pivot_silence_during_asystole', 1000)];
      const timeline = [createEvent(1000, 5, 5, 'ASYSTOLE')];

      const counterfactuals = generateCounterfactuals(pivots, timeline);

      expect(counterfactuals).toHaveLength(1);
      expect(counterfactuals[0].pivotId).toBe('pivot_silence_during_asystole');
    });
  });

  describe('skipped_vagal model', () => {
    it('generates counterfactual for skipped vagal pivot', () => {
      const pivots = [createPivot('pivot_skipped_vagal', 1000)];
      const timeline = [createEvent(1000, 4, 4)];

      const counterfactuals = generateCounterfactuals(pivots, timeline);

      expect(counterfactuals).toHaveLength(1);
      expect(counterfactuals[0].intervention.action).toContain('vagal');
    });
  });

  describe('significant_underdose model', () => {
    it('generates counterfactual for underdose pivot', () => {
      const pivots = [createPivot('pivot_significant_underdose', 1000)];
      const timeline = [createEvent(1000, 5, 5)];

      const counterfactuals = generateCounterfactuals(pivots, timeline);

      expect(counterfactuals).toHaveLength(1);
      expect(counterfactuals[0].intervention.exactWords).toContain('0.1 mg/kg');
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty pivots', () => {
      const counterfactuals = generateCounterfactuals([], []);
      expect(counterfactuals).toHaveLength(0);
    });

    it('skips pivots without matching model', () => {
      const pivots = [createPivot('pivot_unknown_type', 1000)];
      const timeline = [createEvent(1000, 5, 5)];

      const counterfactuals = generateCounterfactuals(pivots, timeline);

      expect(counterfactuals).toHaveLength(0);
    });

    it('handles empty timeline gracefully', () => {
      const pivots = [createPivot('pivot_no_warning_before_asystole', 1000)];

      const counterfactuals = generateCounterfactuals(pivots, []);

      expect(counterfactuals).toHaveLength(1);
      // Should use default values
      expect(counterfactuals[0].actual.markAnxietyPeak).toBeGreaterThanOrEqual(3);
    });

    it('processes multiple pivots', () => {
      const pivots = [
        createPivot('pivot_no_warning_before_asystole', 1000),
        createPivot('pivot_silence_during_asystole', 2000),
        createPivot('pivot_skipped_vagal', 500),
      ];
      const timeline = [createEvent(1000, 5, 5)];

      const counterfactuals = generateCounterfactuals(pivots, timeline);

      expect(counterfactuals).toHaveLength(3);
    });
  });
});

describe('getMostImpactfulCounterfactual', () => {
  it('returns null for empty array', () => {
    expect(getMostImpactfulCounterfactual([])).toBeNull();
  });

  it('returns single counterfactual if only one', () => {
    const cfs: Counterfactual[] = [{
      pivotId: 'test',
      actual: { markAnxietyPeak: 5, lilyFearPeak: 5, trustDelta: -2, outcome: 'bad' },
      alternative: { markAnxietyPeak: 3, lilyFearPeak: 3, trustDelta: 0, outcome: 'good' },
      intervention: { timestamp: 0, action: 'test', exactWords: 'test' },
      differenceNarrative: 'test',
    }];

    expect(getMostImpactfulCounterfactual(cfs)).toBe(cfs[0]);
  });

  it('returns counterfactual with biggest difference', () => {
    const small: Counterfactual = {
      pivotId: 'small',
      actual: { markAnxietyPeak: 4, lilyFearPeak: 4, trustDelta: -1, outcome: 'bad' },
      alternative: { markAnxietyPeak: 3, lilyFearPeak: 3, trustDelta: 0, outcome: 'good' },
      intervention: { timestamp: 0, action: 'test', exactWords: 'test' },
      differenceNarrative: 'test',
    };

    const big: Counterfactual = {
      pivotId: 'big',
      actual: { markAnxietyPeak: 5, lilyFearPeak: 5, trustDelta: -3, outcome: 'bad' },
      alternative: { markAnxietyPeak: 2, lilyFearPeak: 2, trustDelta: 0, outcome: 'good' },
      intervention: { timestamp: 0, action: 'test', exactWords: 'test' },
      differenceNarrative: 'test',
    };

    const result = getMostImpactfulCounterfactual([small, big]);
    expect(result?.pivotId).toBe('big');
  });

  it('weights trust delta higher', () => {
    const highAnxiety: Counterfactual = {
      pivotId: 'anxiety',
      actual: { markAnxietyPeak: 5, lilyFearPeak: 5, trustDelta: 0, outcome: 'bad' },
      alternative: { markAnxietyPeak: 2, lilyFearPeak: 2, trustDelta: 0, outcome: 'good' },
      intervention: { timestamp: 0, action: 'test', exactWords: 'test' },
      differenceNarrative: 'test',
    };

    const highTrust: Counterfactual = {
      pivotId: 'trust',
      actual: { markAnxietyPeak: 4, lilyFearPeak: 4, trustDelta: -3, outcome: 'bad' },
      alternative: { markAnxietyPeak: 3, lilyFearPeak: 3, trustDelta: 0, outcome: 'good' },
      intervention: { timestamp: 0, action: 'test', exactWords: 'test' },
      differenceNarrative: 'test',
    };

    const result = getMostImpactfulCounterfactual([highAnxiety, highTrust]);
    expect(result?.pivotId).toBe('trust');
  });
});

describe('formatCounterfactualCompact', () => {
  it('formats counterfactual with actual, alternative, and fix', () => {
    const cf: Counterfactual = {
      pivotId: 'test',
      actual: { markAnxietyPeak: 5, lilyFearPeak: 5, trustDelta: -2, outcome: 'Panic occurred' },
      alternative: { markAnxietyPeak: 3, lilyFearPeak: 3, trustDelta: 0, outcome: 'Calm maintained' },
      intervention: { timestamp: 0, action: 'warn', exactWords: 'Watch the monitor' },
      differenceNarrative: 'test',
    };

    const formatted = formatCounterfactualCompact(cf);

    expect(formatted).toContain('**Actual:**');
    expect(formatted).toContain('Panic occurred');
    expect(formatted).toContain('**With intervention:**');
    expect(formatted).toContain('Calm maintained');
    expect(formatted).toContain('**The fix:**');
    expect(formatted).toContain('Watch the monitor');
  });
});

describe('calculatePreventabilityScore', () => {
  it('returns 0 for no difference', () => {
    const cf: Counterfactual = {
      pivotId: 'test',
      actual: { markAnxietyPeak: 3, lilyFearPeak: 3, trustDelta: 0, outcome: 'same' },
      alternative: { markAnxietyPeak: 3, lilyFearPeak: 3, trustDelta: 0, outcome: 'same' },
      intervention: { timestamp: 0, action: 'none', exactWords: '' },
      differenceNarrative: '',
    };

    expect(calculatePreventabilityScore(cf)).toBe(0);
  });

  it('increases score for anxiety prevented', () => {
    const cf: Counterfactual = {
      pivotId: 'test',
      actual: { markAnxietyPeak: 5, lilyFearPeak: 4, trustDelta: 0, outcome: '' },
      alternative: { markAnxietyPeak: 3, lilyFearPeak: 4, trustDelta: 0, outcome: '' },
      intervention: { timestamp: 0, action: '', exactWords: '' },
      differenceNarrative: '',
    };

    expect(calculatePreventabilityScore(cf)).toBeGreaterThan(0);
  });

  it('increases score for fear prevented', () => {
    const cf: Counterfactual = {
      pivotId: 'test',
      actual: { markAnxietyPeak: 3, lilyFearPeak: 5, trustDelta: 0, outcome: '' },
      alternative: { markAnxietyPeak: 3, lilyFearPeak: 3, trustDelta: 0, outcome: '' },
      intervention: { timestamp: 0, action: '', exactWords: '' },
      differenceNarrative: '',
    };

    expect(calculatePreventabilityScore(cf)).toBeGreaterThan(0);
  });

  it('increases score significantly for trust saved', () => {
    const trustCf: Counterfactual = {
      pivotId: 'test',
      actual: { markAnxietyPeak: 3, lilyFearPeak: 3, trustDelta: -2, outcome: '' },
      alternative: { markAnxietyPeak: 3, lilyFearPeak: 3, trustDelta: 0, outcome: '' },
      intervention: { timestamp: 0, action: '', exactWords: '' },
      differenceNarrative: '',
    };

    const anxietyCf: Counterfactual = {
      pivotId: 'test',
      actual: { markAnxietyPeak: 5, lilyFearPeak: 3, trustDelta: 0, outcome: '' },
      alternative: { markAnxietyPeak: 3, lilyFearPeak: 3, trustDelta: 0, outcome: '' },
      intervention: { timestamp: 0, action: '', exactWords: '' },
      differenceNarrative: '',
    };

    const trustScore = calculatePreventabilityScore(trustCf);
    const anxietyScore = calculatePreventabilityScore(anxietyCf);

    expect(trustScore).toBeGreaterThan(anxietyScore);
  });

  it('caps at 100', () => {
    const cf: Counterfactual = {
      pivotId: 'test',
      actual: { markAnxietyPeak: 10, lilyFearPeak: 10, trustDelta: -10, outcome: '' },
      alternative: { markAnxietyPeak: 0, lilyFearPeak: 0, trustDelta: 10, outcome: '' },
      intervention: { timestamp: 0, action: '', exactWords: '' },
      differenceNarrative: '',
    };

    expect(calculatePreventabilityScore(cf)).toBe(100);
  });
});
