// ============================================================================
// TIMELINE RECONSTRUCTION TESTS
// Tests for merging simulation data into unified timeline
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  reconstructTimeline,
  identifyCommunicationWindows,
  findSilenceGaps,
  getEventsInPhase,
  calculateEmotionalTrajectory,
  ReconstructionInput,
} from '../../../src/kernel/evaluation/timeline';
import { StateSnapshot } from '../../../src/kernel/evaluation/types';

// Helper to create minimal reconstruction input
function createInput(overrides: Partial<ReconstructionInput> = {}): ReconstructionInput {
  return {
    messages: [],
    actionLog: [],
    nurseCatches: [],
    stateSnapshots: [],
    startTime: 0,
    ...overrides,
  };
}

describe('reconstructTimeline', () => {
  describe('message conversion', () => {
    it('converts doctor messages to learner communication events', () => {
      const input = createInput({
        messages: [{ who: 'doctor', text: 'Hello family', time: 1000 }],
        startTime: 0,
      });

      const timeline = reconstructTimeline(input);
      const event = timeline.find(e => e.content === 'Hello family');

      expect(event).toBeDefined();
      expect(event?.type).toBe('communication');
      expect(event?.actor).toBe('learner');
      expect(event?.timestamp).toBe(1000);
    });

    it('converts nurse messages to character_response events', () => {
      const input = createInput({
        messages: [{ who: 'nurse', text: 'IV established', time: 2000 }],
        startTime: 0,
      });

      const timeline = reconstructTimeline(input);
      const event = timeline.find(e => e.content === 'IV established');

      expect(event?.type).toBe('character_response');
      expect(event?.actor).toBe('nurse');
    });

    it('converts mark messages correctly', () => {
      const input = createInput({
        messages: [{ who: 'mark', text: 'Is she okay?', time: 1500 }],
        startTime: 0,
      });

      const timeline = reconstructTimeline(input);
      const event = timeline.find(e => e.actor === 'mark');

      expect(event?.type).toBe('character_response');
    });

    it('converts lily messages correctly', () => {
      const input = createInput({
        messages: [{ who: 'lily', text: 'Daddy...', time: 1500 }],
        startTime: 0,
      });

      const timeline = reconstructTimeline(input);
      const event = timeline.find(e => e.actor === 'lily');

      expect(event?.type).toBe('character_response');
    });

    it('converts system messages correctly', () => {
      const input = createInput({
        messages: [{ who: 'system', text: 'Simulation started', time: 0 }],
        startTime: 0,
      });

      const timeline = reconstructTimeline(input);
      const event = timeline.find(e => e.content === 'Simulation started');

      expect(event?.type).toBe('system');
      expect(event?.actor).toBe('system');
    });
  });

  describe('action log conversion', () => {
    it('converts action log entries to action events', () => {
      const input = createInput({
        actionLog: [{
          type: 'adenosine',
          time: 5000,
          given: 1.85,
          correct: 1.85,
          unit: 'mg',
          result: 'success',
        }],
        startTime: 0,
      });

      const timeline = reconstructTimeline(input);
      const actionEvent = timeline.find(e => e.type === 'action');

      expect(actionEvent).toBeDefined();
      expect(actionEvent?.actor).toBe('learner');
      expect(actionEvent?.metadata?.intervention).toBe('adenosine');
      expect(actionEvent?.metadata?.dose).toBe(1.85);
    });
  });

  describe('nurse catch conversion', () => {
    it('converts nurse catches to nurse_catch events', () => {
      const input = createInput({
        nurseCatches: [{
          drug: 'adenosine',
          time: 3000,
          attempted: 10,
          unit: 'mg',
          reason: 'overdose',
        }],
        startTime: 0,
      });

      const timeline = reconstructTimeline(input);
      const catchEvent = timeline.find(e => e.type === 'nurse_catch');

      expect(catchEvent).toBeDefined();
      expect(catchEvent?.actor).toBe('nurse');
      expect(catchEvent?.metadata?.reason).toBe('overdose');
    });
  });

  describe('state change detection', () => {
    it('detects phase changes', () => {
      const input = createInput({
        stateSnapshots: [
          { timestamp: 0, phase: 'RUNNING', rhythm: 'SVT', vitals: { hr: 220, spo2: 97, bp: '92/64', rr: 26 }, sedated: false, adenosineCount: 0, cardioversionCount: 0, markAnxiety: 3, lilyFear: 4, inCrisis: false },
          { timestamp: 1000, phase: 'ASYSTOLE', rhythm: 'ASYSTOLE', vitals: { hr: 0, spo2: 97, bp: '92/64', rr: 26 }, sedated: false, adenosineCount: 1, cardioversionCount: 0, markAnxiety: 3, lilyFear: 4, inCrisis: true },
        ] as StateSnapshot[],
        startTime: 0,
      });

      const timeline = reconstructTimeline(input);
      const phaseChange = timeline.find(e =>
        e.type === 'state_change' && e.content.includes('RUNNING → ASYSTOLE')
      );

      expect(phaseChange).toBeDefined();
    });

    it('detects anxiety spikes (delta >= 2)', () => {
      const input = createInput({
        stateSnapshots: [
          { timestamp: 0, phase: 'RUNNING', rhythm: 'SVT', vitals: { hr: 220, spo2: 97, bp: '92/64', rr: 26 }, sedated: false, adenosineCount: 0, cardioversionCount: 0, markAnxiety: 3, lilyFear: 4, inCrisis: false },
          { timestamp: 1000, phase: 'RUNNING', rhythm: 'SVT', vitals: { hr: 220, spo2: 97, bp: '92/64', rr: 26 }, sedated: false, adenosineCount: 0, cardioversionCount: 0, markAnxiety: 5, lilyFear: 4, inCrisis: false },
        ] as StateSnapshot[],
        startTime: 0,
      });

      const timeline = reconstructTimeline(input);
      const anxietySpike = timeline.find(e =>
        e.type === 'state_change' && e.content.includes('anxiety spiked')
      );

      expect(anxietySpike).toBeDefined();
    });

    it('detects fear spikes (delta >= 1)', () => {
      const input = createInput({
        stateSnapshots: [
          { timestamp: 0, phase: 'RUNNING', rhythm: 'SVT', vitals: { hr: 220, spo2: 97, bp: '92/64', rr: 26 }, sedated: false, adenosineCount: 0, cardioversionCount: 0, markAnxiety: 3, lilyFear: 3, inCrisis: false },
          { timestamp: 1000, phase: 'RUNNING', rhythm: 'SVT', vitals: { hr: 220, spo2: 97, bp: '92/64', rr: 26 }, sedated: false, adenosineCount: 0, cardioversionCount: 0, markAnxiety: 3, lilyFear: 5, inCrisis: false },
        ] as StateSnapshot[],
        startTime: 0,
      });

      const timeline = reconstructTimeline(input);
      const fearSpike = timeline.find(e =>
        e.type === 'state_change' && e.content.includes('fear increased')
      );

      expect(fearSpike).toBeDefined();
    });
  });

  describe('metadata detection', () => {
    it('detects addressedTo from message content', () => {
      const input = createInput({
        messages: [
          { who: 'doctor', text: 'Mr. Henderson, watch the monitor', time: 1000 },
          { who: 'doctor', text: 'Lily, you are so brave', time: 2000 },
          { who: 'doctor', text: 'Nurse, prepare adenosine', time: 3000 },
        ],
        startTime: 0,
      });

      const timeline = reconstructTimeline(input);

      expect(timeline[0].metadata?.addressedTo).toBe('mark');
      expect(timeline[1].metadata?.addressedTo).toBe('lily');
      expect(timeline[2].metadata?.addressedTo).toBe('team');
    });

    it('detects explanatory messages', () => {
      const input = createInput({
        messages: [
          { who: 'doctor', text: 'This is expected and normal', time: 1000 },
          { who: 'doctor', text: 'Okay', time: 2000 },
        ],
        startTime: 0,
      });

      const timeline = reconstructTimeline(input);

      expect(timeline[0].metadata?.wasExplanatory).toBe(true);
      expect(timeline[1].metadata?.wasExplanatory).toBe(false);
    });
  });

  describe('timeline sorting', () => {
    it('sorts events by timestamp', () => {
      const input = createInput({
        messages: [
          { who: 'doctor', text: 'Third', time: 3000 },
          { who: 'doctor', text: 'First', time: 1000 },
          { who: 'doctor', text: 'Second', time: 2000 },
        ],
        startTime: 0,
      });

      const timeline = reconstructTimeline(input);

      for (let i = 1; i < timeline.length; i++) {
        expect(timeline[i].timestamp).toBeGreaterThanOrEqual(timeline[i - 1].timestamp);
      }
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const timeline = reconstructTimeline(createInput());
      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline.length).toBe(0);
    });

    it('handles input with only snapshots (no messages)', () => {
      const input = createInput({
        stateSnapshots: [
          { timestamp: 0, phase: 'RUNNING', rhythm: 'SVT', vitals: { hr: 220, spo2: 97, bp: '92/64', rr: 26 }, sedated: false, adenosineCount: 0, cardioversionCount: 0, markAnxiety: 3, lilyFear: 4, inCrisis: false },
        ] as StateSnapshot[],
      });

      const timeline = reconstructTimeline(input);
      expect(Array.isArray(timeline)).toBe(true);
    });

    it('uses default snapshot for messages without snapshots', () => {
      const input = createInput({
        messages: [{ who: 'doctor', text: 'Hello', time: 1000 }],
        stateSnapshots: [], // Empty snapshots
      });

      const timeline = reconstructTimeline(input);
      expect(timeline[0].stateAfter).toBeDefined();
      expect(timeline[0].stateAfter.rhythm).toBe('SVT'); // Default value
    });
  });
});

describe('identifyCommunicationWindows', () => {
  it('identifies pre-adenosine warning window', () => {
    const timeline = [
      {
        id: 'e1',
        timestamp: 1000,
        type: 'action' as const,
        actor: 'learner' as const,
        content: 'adenosine',
        metadata: { intervention: 'adenosine' },
        stateBefore: { phase: 'RUNNING' } as any,
        stateAfter: { phase: 'RUNNING' } as any,
      },
      {
        id: 'e2',
        timestamp: 2000,
        type: 'state_change' as const,
        actor: 'system' as const,
        content: 'Phase change',
        stateBefore: { phase: 'RUNNING' } as any,
        stateAfter: { phase: 'ASYSTOLE' } as any,
      },
    ];

    const windows = identifyCommunicationWindows(timeline);
    const preAdenosine = windows.find(w => w.id === 'window_pre_adenosine_warning');

    expect(preAdenosine).toBeDefined();
    expect(preAdenosine?.startTimestamp).toBe(1000);
    expect(preAdenosine?.endTimestamp).toBe(2000);
  });

  it('marks window as missed if no learner communication', () => {
    const timeline = [
      {
        id: 'e1',
        timestamp: 1000,
        type: 'action' as const,
        actor: 'learner' as const,
        content: 'adenosine',
        metadata: { intervention: 'adenosine' },
        stateBefore: { phase: 'RUNNING' } as any,
        stateAfter: { phase: 'RUNNING' } as any,
      },
      {
        id: 'e2',
        timestamp: 2000,
        type: 'state_change' as const,
        actor: 'system' as const,
        content: 'Phase change',
        stateBefore: { phase: 'RUNNING' } as any,
        stateAfter: { phase: 'ASYSTOLE' } as any,
      },
    ];

    const windows = identifyCommunicationWindows(timeline);
    const preAdenosine = windows.find(w => w.id === 'window_pre_adenosine_warning');

    expect(preAdenosine?.wasMissed).toBe(true);
  });

  it('marks window as not missed if explanatory communication exists', () => {
    const timeline = [
      {
        id: 'e1',
        timestamp: 1000,
        type: 'action' as const,
        actor: 'learner' as const,
        content: 'adenosine',
        metadata: { intervention: 'adenosine' },
        stateBefore: { phase: 'RUNNING' } as any,
        stateAfter: { phase: 'RUNNING' } as any,
      },
      {
        id: 'e2',
        timestamp: 1500,
        type: 'communication' as const,
        actor: 'learner' as const,
        content: 'This is expected and normal',
        metadata: { wasExplanatory: true },
        stateBefore: { phase: 'RUNNING' } as any,
        stateAfter: { phase: 'RUNNING' } as any,
      },
      {
        id: 'e3',
        timestamp: 2000,
        type: 'state_change' as const,
        actor: 'system' as const,
        content: 'Phase change',
        stateBefore: { phase: 'RUNNING' } as any,
        stateAfter: { phase: 'ASYSTOLE' } as any,
      },
    ];

    const windows = identifyCommunicationWindows(timeline);
    const preAdenosine = windows.find(w => w.id === 'window_pre_adenosine_warning');

    expect(preAdenosine?.wasMissed).toBe(false);
  });
});

describe('findSilenceGaps', () => {
  it('finds gaps >= minGapMs between learner events', () => {
    const timeline = [
      { id: 'e1', timestamp: 0, actor: 'learner' as const, type: 'communication' as const, content: '', stateBefore: {} as any, stateAfter: {} as any },
      { id: 'e2', timestamp: 10000, actor: 'learner' as const, type: 'communication' as const, content: '', stateBefore: {} as any, stateAfter: {} as any },
    ];

    const gaps = findSilenceGaps(timeline, 5000);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].start).toBe(0);
    expect(gaps[0].end).toBe(10000);
    expect(gaps[0].duration).toBe(10000);
  });

  it('ignores non-learner events', () => {
    const timeline = [
      { id: 'e1', timestamp: 0, actor: 'learner' as const, type: 'communication' as const, content: '', stateBefore: {} as any, stateAfter: {} as any },
      { id: 'e2', timestamp: 3000, actor: 'nurse' as const, type: 'communication' as const, content: '', stateBefore: {} as any, stateAfter: {} as any },
      { id: 'e3', timestamp: 10000, actor: 'learner' as const, type: 'communication' as const, content: '', stateBefore: {} as any, stateAfter: {} as any },
    ];

    const gaps = findSilenceGaps(timeline, 5000);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].duration).toBe(10000);
  });

  it('returns empty array if no gaps meet threshold', () => {
    const timeline = [
      { id: 'e1', timestamp: 0, actor: 'learner' as const, type: 'communication' as const, content: '', stateBefore: {} as any, stateAfter: {} as any },
      { id: 'e2', timestamp: 2000, actor: 'learner' as const, type: 'communication' as const, content: '', stateBefore: {} as any, stateAfter: {} as any },
    ];

    const gaps = findSilenceGaps(timeline, 5000);

    expect(gaps).toHaveLength(0);
  });
});

describe('getEventsInPhase', () => {
  it('returns events during specified phase', () => {
    const timeline = [
      { id: 'e1', timestamp: 0, type: 'action' as const, actor: 'learner' as const, content: '', stateBefore: { phase: 'RUNNING' } as any, stateAfter: { phase: 'RUNNING' } as any },
      { id: 'e2', timestamp: 1000, type: 'action' as const, actor: 'learner' as const, content: '', stateBefore: { phase: 'ASYSTOLE' } as any, stateAfter: { phase: 'ASYSTOLE' } as any },
      { id: 'e3', timestamp: 2000, type: 'action' as const, actor: 'learner' as const, content: '', stateBefore: { phase: 'RUNNING' } as any, stateAfter: { phase: 'RUNNING' } as any },
    ];

    const asystoleEvents = getEventsInPhase(timeline, 'ASYSTOLE');

    expect(asystoleEvents).toHaveLength(1);
    expect(asystoleEvents[0].id).toBe('e2');
  });

  it('includes events transitioning into phase', () => {
    const timeline = [
      { id: 'e1', timestamp: 0, type: 'state_change' as const, actor: 'system' as const, content: '', stateBefore: { phase: 'RUNNING' } as any, stateAfter: { phase: 'ASYSTOLE' } as any },
    ];

    const asystoleEvents = getEventsInPhase(timeline, 'ASYSTOLE');

    expect(asystoleEvents).toHaveLength(1);
  });
});

describe('calculateEmotionalTrajectory', () => {
  it('tracks markAnxiety changes over time', () => {
    const timeline = [
      { id: 'e1', timestamp: 0, type: 'action' as const, actor: 'learner' as const, content: '', stateBefore: {} as any, stateAfter: { markAnxiety: 3, lilyFear: 4 } as any },
      { id: 'e2', timestamp: 1000, type: 'action' as const, actor: 'learner' as const, content: '', stateBefore: {} as any, stateAfter: { markAnxiety: 5, lilyFear: 4 } as any },
      { id: 'e3', timestamp: 2000, type: 'action' as const, actor: 'learner' as const, content: '', stateBefore: {} as any, stateAfter: { markAnxiety: 4, lilyFear: 4 } as any },
    ];

    const trajectory = calculateEmotionalTrajectory(timeline);

    expect(trajectory.markAnxiety).toHaveLength(3);
    expect(trajectory.markAnxiety[0]).toEqual({ timestamp: 0, value: 3 });
    expect(trajectory.markAnxiety[1]).toEqual({ timestamp: 1000, value: 5 });
    expect(trajectory.markAnxiety[2]).toEqual({ timestamp: 2000, value: 4 });
  });

  it('tracks lilyFear changes over time', () => {
    const timeline = [
      { id: 'e1', timestamp: 0, type: 'action' as const, actor: 'learner' as const, content: '', stateBefore: {} as any, stateAfter: { markAnxiety: 3, lilyFear: 3 } as any },
      { id: 'e2', timestamp: 1000, type: 'action' as const, actor: 'learner' as const, content: '', stateBefore: {} as any, stateAfter: { markAnxiety: 3, lilyFear: 5 } as any },
    ];

    const trajectory = calculateEmotionalTrajectory(timeline);

    expect(trajectory.lilyFear).toHaveLength(2);
    expect(trajectory.lilyFear[1]).toEqual({ timestamp: 1000, value: 5 });
  });

  it('only records changes, not duplicate values', () => {
    const timeline = [
      { id: 'e1', timestamp: 0, type: 'action' as const, actor: 'learner' as const, content: '', stateBefore: {} as any, stateAfter: { markAnxiety: 3, lilyFear: 4 } as any },
      { id: 'e2', timestamp: 1000, type: 'action' as const, actor: 'learner' as const, content: '', stateBefore: {} as any, stateAfter: { markAnxiety: 3, lilyFear: 4 } as any },
      { id: 'e3', timestamp: 2000, type: 'action' as const, actor: 'learner' as const, content: '', stateBefore: {} as any, stateAfter: { markAnxiety: 3, lilyFear: 4 } as any },
    ];

    const trajectory = calculateEmotionalTrajectory(timeline);

    expect(trajectory.markAnxiety).toHaveLength(1);
    expect(trajectory.lilyFear).toHaveLength(1);
  });
});
