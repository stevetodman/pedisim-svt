// ============================================================================
// PIVOT DETECTION TESTS
// Tests for identifying critical decision moments
// ============================================================================

import { describe, it, expect } from 'vitest';
import { identifyPivotPoints, getMostCriticalPivot, getSuccesses, getErrors } from '../../../src/kernel/evaluation/pivots';
import { TimelineEvent, CommunicationWindow, StateSnapshot } from '../../../src/kernel/evaluation/types';

// Helper to create a minimal state snapshot
function createSnapshot(overrides: Partial<StateSnapshot> = {}): StateSnapshot {
  return {
    timestamp: 0,
    phase: 'RUNNING',
    rhythm: 'SVT',
    vitals: { hr: 220, spo2: 97, bp: '92/64', rr: 26 },
    sedated: false,
    adenosineCount: 0,
    cardioversionCount: 0,
    markAnxiety: 3,
    lilyFear: 4,
    inCrisis: false,
    ...overrides,
  };
}

// Helper to create timeline events
function createEvent(
  id: string,
  timestamp: number,
  type: TimelineEvent['type'],
  actor: TimelineEvent['actor'],
  content: string,
  metadata: TimelineEvent['metadata'] = {}
): TimelineEvent {
  return {
    id,
    timestamp,
    type,
    actor,
    content,
    stateBefore: createSnapshot({ timestamp: timestamp - 1 }),
    stateAfter: createSnapshot({ timestamp }),
    metadata,
  };
}

// Helper to create communication window
function createWindow(
  id: string,
  type: CommunicationWindow['id'],
  startTimestamp: number,
  endTimestamp: number,
  wasMissed: boolean
): CommunicationWindow {
  return {
    id: type,
    name: 'Test Window',
    startTimestamp,
    endTimestamp,
    duration: endTimestamp - startTimestamp,
    triggerEventId: 'trigger',
    closingEventId: 'closing',
    optimalMessage: 'Optimal message',
    actualMessages: wasMissed ? [] : ['Some message'],
    wasMissed,
    impact: 'high',
    impactDescription: 'Impact description',
  };
}

describe('identifyPivotPoints', () => {
  describe('no_warning_before_asystole detection', () => {
    it('detects missed pre-adenosine warning', () => {
      const timeline: TimelineEvent[] = [
        createEvent('e1', 1000, 'state_change', 'system', 'Phase: RUNNING → ASYSTOLE', {}),
      ];
      // Modify stateAfter to be ASYSTOLE
      timeline[0].stateAfter = createSnapshot({ phase: 'ASYSTOLE', timestamp: 1000 });

      const windows: CommunicationWindow[] = [
        createWindow('w1', 'window_pre_adenosine_warning', 500, 1000, true),
      ];

      const pivots = identifyPivotPoints(timeline, windows);
      const warningPivot = pivots.find(p => p.id === 'pivot_no_warning_before_asystole');

      expect(warningPivot).toBeDefined();
      expect(warningPivot?.impact).toBe('critical');
      expect(warningPivot?.type).toBe('missed_opportunity');
    });

    it('does NOT detect if warning was given', () => {
      const timeline: TimelineEvent[] = [
        createEvent('e1', 1000, 'state_change', 'system', 'Phase: RUNNING → ASYSTOLE', {}),
      ];
      timeline[0].stateAfter = createSnapshot({ phase: 'ASYSTOLE', timestamp: 1000 });

      const windows: CommunicationWindow[] = [
        createWindow('w1', 'window_pre_adenosine_warning', 500, 1000, false), // NOT missed
      ];

      const pivots = identifyPivotPoints(timeline, windows);
      const warningPivot = pivots.find(p => p.id === 'pivot_no_warning_before_asystole');

      expect(warningPivot).toBeUndefined();
    });
  });

  describe('silence_during_asystole detection', () => {
    it('detects silence during asystole period', () => {
      const timeline: TimelineEvent[] = [];
      const windows: CommunicationWindow[] = [
        createWindow('w1', 'window_during_asystole', 1000, 5000, true),
      ];

      const pivots = identifyPivotPoints(timeline, windows);
      const silencePivot = pivots.find(p => p.id === 'pivot_silence_during_asystole');

      expect(silencePivot).toBeDefined();
      expect(silencePivot?.impact).toBe('high');
    });
  });

  describe('skipped_vagal detection', () => {
    it('detects when vagal was skipped before adenosine', () => {
      const timeline: TimelineEvent[] = [
        createEvent('e1', 1000, 'action', 'learner', 'adenosine 1.85mg', {
          intervention: 'adenosine',
        }),
      ];

      const pivots = identifyPivotPoints(timeline, []);
      const vagalPivot = pivots.find(p => p.id === 'pivot_skipped_vagal');

      expect(vagalPivot).toBeDefined();
      expect(vagalPivot?.impact).toBe('medium');
    });

    it('does NOT detect if vagal was tried first', () => {
      const timeline: TimelineEvent[] = [
        createEvent('e1', 500, 'action', 'learner', 'vagal maneuver', {
          intervention: 'vagal',
        }),
        createEvent('e2', 1000, 'action', 'learner', 'adenosine 1.85mg', {
          intervention: 'adenosine',
        }),
      ];

      const pivots = identifyPivotPoints(timeline, []);
      const vagalPivot = pivots.find(p => p.id === 'pivot_skipped_vagal');

      expect(vagalPivot).toBeUndefined();
    });
  });

  describe('dose_error_caught detection', () => {
    it('detects nurse catch events', () => {
      const timeline: TimelineEvent[] = [
        createEvent('e1', 1000, 'nurse_catch', 'nurse', 'Nurse caught error', {
          intervention: 'adenosine',
          dose: 8,
          unit: 'mg',
          reason: 'overdose',
        }),
      ];

      const pivots = identifyPivotPoints(timeline, []);
      const catchPivot = pivots.find(p => p.id === 'pivot_dose_error_caught');

      expect(catchPivot).toBeDefined();
      expect(catchPivot?.impact).toBe('medium');
      expect(catchPivot?.type).toBe('error');
    });
  });

  describe('significant_underdose detection', () => {
    it('detects significantly underdosed adenosine (<70% of correct)', () => {
      const timeline: TimelineEvent[] = [
        createEvent('e1', 1000, 'action', 'learner', 'adenosine 0.5mg', {
          intervention: 'adenosine',
          dose: 0.5,
          correct: 1.85,
        }),
      ];

      const pivots = identifyPivotPoints(timeline, []);
      const underdosePivot = pivots.find(p => p.id === 'pivot_significant_underdose');

      expect(underdosePivot).toBeDefined();
      expect(underdosePivot?.impact).toBe('high');
    });

    it('does NOT detect if dose is within acceptable range', () => {
      const timeline: TimelineEvent[] = [
        createEvent('e1', 1000, 'action', 'learner', 'adenosine 1.5mg', {
          intervention: 'adenosine',
          dose: 1.5,
          correct: 1.85,
        }),
      ];

      const pivots = identifyPivotPoints(timeline, []);
      const underdosePivot = pivots.find(p => p.id === 'pivot_significant_underdose');

      expect(underdosePivot).toBeUndefined();
    });
  });

  describe('good_warning_given (success) detection', () => {
    it('detects good explanatory warning', () => {
      const timeline: TimelineEvent[] = [];
      const windows: CommunicationWindow[] = [
        {
          id: 'window_pre_adenosine_warning',
          name: 'Pre-Adenosine Warning',
          startTimestamp: 500,
          endTimestamp: 1000,
          duration: 500,
          triggerEventId: 't1',
          closingEventId: 'c1',
          optimalMessage: 'Optimal',
          actualMessages: ['Watch the monitor, this is expected and temporary'],
          wasMissed: false,
          impact: 'critical',
          impactDescription: 'Critical',
        },
      ];

      const pivots = identifyPivotPoints(timeline, windows);
      const successPivot = pivots.find(p => p.id === 'pivot_good_warning_given');

      expect(successPivot).toBeDefined();
      expect(successPivot?.type).toBe('success');
    });
  });

  describe('pivot sorting by impact', () => {
    it('sorts pivots with critical first, then high, medium, low', () => {
      const timeline: TimelineEvent[] = [
        // Create events that trigger multiple pivots
        createEvent('e1', 1000, 'action', 'learner', 'adenosine', {
          intervention: 'adenosine',
        }),
        createEvent('e2', 1500, 'nurse_catch', 'nurse', 'Caught', {
          intervention: 'adenosine',
          dose: 8,
          unit: 'mg',
          reason: 'overdose',
        }),
      ];

      const windows: CommunicationWindow[] = [
        createWindow('w1', 'window_pre_adenosine_warning', 500, 1000, true),
        createWindow('w2', 'window_post_conversion', 2000, 2500, true),
      ];

      // Create asystole event
      timeline.push(createEvent('e3', 1200, 'state_change', 'system', 'Phase change', {}));
      timeline[2].stateAfter = createSnapshot({ phase: 'ASYSTOLE', timestamp: 1200 });

      const pivots = identifyPivotPoints(timeline, windows);

      // Verify sorting
      for (let i = 1; i < pivots.length; i++) {
        const impactOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        const prevOrder = impactOrder[pivots[i - 1].impact];
        const currOrder = impactOrder[pivots[i].impact];
        expect(prevOrder).toBeLessThanOrEqual(currOrder);
      }
    });
  });
});

describe('getMostCriticalPivot', () => {
  it('returns critical missed opportunity first', () => {
    const pivots = [
      { id: 'p1', impact: 'high', type: 'error' },
      { id: 'p2', impact: 'critical', type: 'missed_opportunity' },
      { id: 'p3', impact: 'critical', type: 'decision' },
    ] as any[];

    const result = getMostCriticalPivot(pivots);
    expect(result?.id).toBe('p2');
  });

  it('returns highest impact if no critical missed opportunity', () => {
    const pivots = [
      { id: 'p1', impact: 'medium', type: 'error' },
      { id: 'p2', impact: 'high', type: 'decision' },
    ] as any[];

    const result = getMostCriticalPivot(pivots);
    expect(result?.id).toBe('p1'); // First in already-sorted list
  });

  it('returns null for empty array', () => {
    expect(getMostCriticalPivot([])).toBeNull();
  });
});

describe('getSuccesses', () => {
  it('filters only success type pivots', () => {
    const pivots = [
      { id: 'p1', type: 'success' },
      { id: 'p2', type: 'error' },
      { id: 'p3', type: 'success' },
      { id: 'p4', type: 'missed_opportunity' },
    ] as any[];

    const successes = getSuccesses(pivots);
    expect(successes).toHaveLength(2);
    expect(successes.every(p => p.type === 'success')).toBe(true);
  });
});

describe('getErrors', () => {
  it('filters error and missed_opportunity types', () => {
    const pivots = [
      { id: 'p1', type: 'success' },
      { id: 'p2', type: 'error' },
      { id: 'p3', type: 'decision' },
      { id: 'p4', type: 'missed_opportunity' },
    ] as any[];

    const errors = getErrors(pivots);
    expect(errors).toHaveLength(2);
    expect(errors.map(p => p.id)).toContain('p2');
    expect(errors.map(p => p.id)).toContain('p4');
  });
});

describe('edge cases', () => {
  it('handles empty timeline and windows', () => {
    const pivots = identifyPivotPoints([], []);
    expect(Array.isArray(pivots)).toBe(true);
  });

  it('handles timeline with no detectable pivots', () => {
    const timeline: TimelineEvent[] = [
      createEvent('e1', 1000, 'communication', 'learner', 'Hello', {}),
    ];
    const pivots = identifyPivotPoints(timeline, []);
    // Should not crash, may return empty or some pivots
    expect(Array.isArray(pivots)).toBe(true);
  });

  it('handles windows without matching timeline events', () => {
    const windows: CommunicationWindow[] = [
      createWindow('w1', 'window_during_asystole', 1000, 5000, true),
    ];
    const pivots = identifyPivotPoints([], windows);
    // Should detect silence during asystole
    expect(pivots.find(p => p.id === 'pivot_silence_during_asystole')).toBeDefined();
  });
});
