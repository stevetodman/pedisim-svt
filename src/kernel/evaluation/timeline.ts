// ============================================================================
// TIMELINE RECONSTRUCTION
// Merge simulation events into unified timeline for analysis
// ============================================================================

import {
  TimelineEvent,
  StateSnapshot,
  CommunicationWindow,
  WindowType,
  EventType,
  EventActor,
} from './types';
import { Message, ActionLogEntry, NurseCatch, Vitals, SimPhase, Rhythm } from '../../hooks/useSimulation';

// ============================================================================
// COMMUNICATION WINDOW DEFINITIONS
// ============================================================================

interface WindowDefinition {
  type: WindowType;
  name: string;
  detectStart: (event: TimelineEvent, timeline: TimelineEvent[]) => boolean;
  detectEnd: (event: TimelineEvent, timeline: TimelineEvent[], startEvent: TimelineEvent) => boolean;
  optimalMessage: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  impactDescription: string;
}

const WINDOW_DEFINITIONS: WindowDefinition[] = [
  {
    type: 'pre_adenosine_warning',
    name: 'Pre-Adenosine Warning Window',
    detectStart: (event, _timeline) =>
      event.type === 'action' &&
      event.metadata?.intervention === 'adenosine',
    detectEnd: (event, _timeline, _startEvent) =>
      event.type === 'state_change' &&
      event.stateAfter.phase === 'ASYSTOLE',
    optimalMessage: "Mr. Henderson, watch the monitor with me. Her heart will pause briefly - that's the medicine working. It looks scary but it's temporary and expected.",
    impact: 'critical',
    impactDescription: 'Without warning, dad interprets asystole as cardiac arrest. His panic terrifies Lily.',
  },
  {
    type: 'during_asystole',
    name: 'Asystole Reassurance Window',
    detectStart: (event, _timeline) =>
      event.type === 'state_change' &&
      event.stateAfter.phase === 'ASYSTOLE',
    detectEnd: (event, _timeline, _startEvent) =>
      event.type === 'state_change' &&
      event.stateBefore.phase === 'ASYSTOLE' &&
      event.stateAfter.phase !== 'ASYSTOLE',
    optimalMessage: "This is exactly what we expected. Her heart is resetting. Watch with me - it should come back in a few seconds.",
    impact: 'high',
    impactDescription: 'Family needs ongoing reassurance during the terrifying flatline period.',
  },
  {
    type: 'post_conversion',
    name: 'Post-Conversion Celebration Window',
    detectStart: (event, _timeline) =>
      event.type === 'state_change' &&
      event.stateAfter.phase === 'CONVERTED',
    detectEnd: (event, _timeline, startEvent) =>
      event.timestamp > startEvent.timestamp + 15000, // 15 seconds
    optimalMessage: "Lily, you were so brave! Your heart is all better now. Mr. Henderson, she's going to be fine - her heart rhythm is normal.",
    impact: 'medium',
    impactDescription: 'Acknowledging success helps family process trauma and builds trust.',
  },
  {
    type: 'initial_reassurance',
    name: 'Initial Reassurance Window',
    detectStart: (event, _timeline) =>
      event.type === 'system' &&
      event.content.toLowerCase().includes('start'),
    detectEnd: (event, _timeline, startEvent) =>
      event.timestamp > startEvent.timestamp + 30000, // 30 seconds
    optimalMessage: "Mr. Henderson, I know this is scary. Lily's heart is beating too fast, but she's stable. We're going to fix this.",
    impact: 'medium',
    impactDescription: 'Early reassurance sets expectations and builds trust before interventions.',
  },
  {
    type: 'pre_cardioversion',
    name: 'Pre-Cardioversion Warning Window',
    detectStart: (event, _timeline) =>
      event.type === 'action' &&
      event.metadata?.intervention === 'cardioversion',
    detectEnd: (event, _timeline, _startEvent) =>
      event.type === 'system' &&
      event.content.toLowerCase().includes('shock'),
    optimalMessage: "Mr. Henderson, we're going to reset her heart with a small electrical pulse. She's sedated so she won't feel it. You'll see her body jump - that's normal.",
    impact: 'high',
    impactDescription: 'Cardioversion is visually dramatic. Unprepared families may panic.',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function createSnapshot(params: {
  timestamp: number;
  phase: SimPhase;
  rhythm: Rhythm;
  vitals: Vitals;
  sedated: boolean;
  adenosineCount: number;
  cardioversionCount: number;
  markAnxiety: number;
  lilyFear: number;
}): StateSnapshot {
  return {
    ...params,
    inCrisis: params.phase === 'ASYSTOLE' || params.vitals.hr === 0,
  };
}

// ============================================================================
// TIMELINE RECONSTRUCTION
// ============================================================================

export interface ReconstructionInput {
  messages: Message[];
  actionLog: ActionLogEntry[];
  nurseCatches: NurseCatch[];
  stateSnapshots: StateSnapshot[];
  startTime: number;
}

/**
 * Reconstruct a unified timeline from simulation data sources.
 * This is the foundation for all analysis.
 */
export function reconstructTimeline(input: ReconstructionInput): TimelineEvent[] {
  const { messages, actionLog, nurseCatches, stateSnapshots, startTime } = input;
  const events: TimelineEvent[] = [];

  // Helper to find nearest snapshot
  const findSnapshot = (timestamp: number): StateSnapshot => {
    if (stateSnapshots.length === 0) {
      return createSnapshot({
        timestamp,
        phase: 'IDLE',
        rhythm: 'SVT',
        vitals: { hr: 220, spo2: 97, bp: '92/64', rr: 26 },
        sedated: false,
        adenosineCount: 0,
        cardioversionCount: 0,
        markAnxiety: 3,
        lilyFear: 4,
      });
    }

    // Find the snapshot just before or at this timestamp
    const sorted = [...stateSnapshots].sort((a, b) => a.timestamp - b.timestamp);
    let best = sorted[0];
    for (const snap of sorted) {
      if (snap.timestamp <= timestamp) {
        best = snap;
      } else {
        break;
      }
    }
    return best;
  };

  // Convert messages to timeline events
  for (const msg of messages) {
    const timestamp = msg.time - startTime;
    const stateBefore = findSnapshot(timestamp - 1);
    const stateAfter = findSnapshot(timestamp);

    let type: EventType = 'communication';
    let actor: EventActor = 'system';

    switch (msg.who) {
      case 'doctor':
        type = 'communication';
        actor = 'learner';
        break;
      case 'nurse':
        type = 'character_response';
        actor = 'nurse';
        break;
      case 'lily':
        type = 'character_response';
        actor = 'lily';
        break;
      case 'mark':
        type = 'character_response';
        actor = 'mark';
        break;
      case 'system':
        type = 'system';
        actor = 'system';
        break;
    }

    events.push({
      id: generateEventId(),
      timestamp,
      type,
      actor,
      content: msg.text,
      stateBefore,
      stateAfter,
      metadata: {
        addressedTo: detectAddressedTo(msg.text),
        wasExplanatory: isExplanatory(msg.text),
      },
    });
  }

  // Convert action log to timeline events
  for (const action of actionLog) {
    const stateBefore = findSnapshot(action.time - 1);
    const stateAfter = findSnapshot(action.time);

    events.push({
      id: generateEventId(),
      timestamp: action.time,
      type: 'action',
      actor: 'learner',
      content: formatActionContent(action),
      stateBefore,
      stateAfter,
      metadata: {
        intervention: action.type,
        dose: action.given,
        correct: action.correct,
        unit: action.unit,
        result: action.result,
      },
    });
  }

  // Convert nurse catches to timeline events
  for (const catch_ of nurseCatches) {
    const stateBefore = findSnapshot(catch_.time - 1);
    const stateAfter = findSnapshot(catch_.time);

    events.push({
      id: generateEventId(),
      timestamp: catch_.time,
      type: 'nurse_catch',
      actor: 'nurse',
      content: `Nurse prevented: ${catch_.drug} ${catch_.attempted}${catch_.unit} (${catch_.reason})`,
      stateBefore,
      stateAfter,
      metadata: {
        intervention: catch_.drug,
        dose: catch_.attempted,
        unit: catch_.unit,
        reason: catch_.reason,
      },
    });
  }

  // Add state change events by detecting transitions in snapshots
  const stateChangeEvents = detectStateChanges(stateSnapshots);
  events.push(...stateChangeEvents);

  // Sort by timestamp
  events.sort((a, b) => a.timestamp - b.timestamp);

  return events;
}

function detectAddressedTo(text: string): 'family' | 'team' | 'lily' | 'mark' | undefined {
  const lower = text.toLowerCase();
  if (/lily|sweetie|honey|sweetheart|kiddo/.test(lower)) return 'lily';
  if (/mr\.?\s*henderson|dad|father|sir/.test(lower)) return 'mark';
  if (/nurse|team|everyone/.test(lower)) return 'team';
  if (/you|your|family/.test(lower)) return 'family';
  return undefined;
}

function isExplanatory(text: string): boolean {
  return /because|going to|will |this is|expected|normal|medicine|heart|help|working/.test(text.toLowerCase());
}

function formatActionContent(action: ActionLogEntry): string {
  if (action.given !== undefined) {
    return `${action.type} ${action.given}${action.unit || ''} (correct: ${action.correct}${action.unit || ''})`;
  }
  return action.type;
}

function detectStateChanges(snapshots: StateSnapshot[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (snapshots.length < 2) return events;

  const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    // Detect phase change
    if (prev.phase !== curr.phase) {
      events.push({
        id: generateEventId(),
        timestamp: curr.timestamp,
        type: 'state_change',
        actor: 'system',
        content: `Phase: ${prev.phase} → ${curr.phase}`,
        stateBefore: prev,
        stateAfter: curr,
        metadata: {
          trigger: 'phase_change',
        },
      });
    }

    // Detect anxiety spike
    if (curr.markAnxiety - prev.markAnxiety >= 2) {
      events.push({
        id: generateEventId(),
        timestamp: curr.timestamp,
        type: 'state_change',
        actor: 'system',
        content: `Dad anxiety spiked: ${prev.markAnxiety} → ${curr.markAnxiety}`,
        stateBefore: prev,
        stateAfter: curr,
        metadata: {
          trigger: 'anxiety_spike',
        },
      });
    }

    // Detect fear spike
    if (curr.lilyFear - prev.lilyFear >= 1) {
      events.push({
        id: generateEventId(),
        timestamp: curr.timestamp,
        type: 'state_change',
        actor: 'system',
        content: `Lily fear increased: ${prev.lilyFear} → ${curr.lilyFear}`,
        stateBefore: prev,
        stateAfter: curr,
        metadata: {
          trigger: 'fear_spike',
        },
      });
    }
  }

  return events;
}

// ============================================================================
// COMMUNICATION WINDOW DETECTION
// ============================================================================

/**
 * Identify communication windows in the timeline.
 * These are moments when the learner should have communicated.
 */
export function identifyCommunicationWindows(
  timeline: TimelineEvent[]
): CommunicationWindow[] {
  const windows: CommunicationWindow[] = [];

  for (const def of WINDOW_DEFINITIONS) {
    // Find start event
    const startEvent = timeline.find(e => def.detectStart(e, timeline));
    if (!startEvent) continue;

    // Find end event
    const endEvent = timeline.find(e =>
      e.timestamp > startEvent.timestamp &&
      def.detectEnd(e, timeline, startEvent)
    );
    if (!endEvent) continue;

    // Find learner communications in this window
    const learnerComms = timeline.filter(e =>
      e.timestamp >= startEvent.timestamp &&
      e.timestamp <= endEvent.timestamp &&
      e.actor === 'learner' &&
      e.type === 'communication'
    );

    const wasMissed = learnerComms.length === 0 ||
      !learnerComms.some(c => c.metadata?.wasExplanatory);

    windows.push({
      id: `window_${def.type}`,
      name: def.name,
      startTimestamp: startEvent.timestamp,
      endTimestamp: endEvent.timestamp,
      duration: endEvent.timestamp - startEvent.timestamp,
      triggerEventId: startEvent.id,
      closingEventId: endEvent.id,
      optimalMessage: def.optimalMessage,
      actualMessages: learnerComms.map(c => c.content),
      wasMissed,
      impact: def.impact,
      impactDescription: def.impactDescription,
    });
  }

  return windows;
}

// ============================================================================
// TIMELINE ANALYSIS HELPERS
// ============================================================================

/**
 * Find the time gap between two events where learner said nothing
 */
export function findSilenceGaps(
  timeline: TimelineEvent[],
  minGapMs: number = 5000
): { start: number; end: number; duration: number }[] {
  const gaps: { start: number; end: number; duration: number }[] = [];

  const sorted = timeline
    .filter(e => e.actor === 'learner')
    .sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestamp - sorted[i - 1].timestamp;
    if (gap >= minGapMs) {
      gaps.push({
        start: sorted[i - 1].timestamp,
        end: sorted[i].timestamp,
        duration: gap,
      });
    }
  }

  return gaps;
}

/**
 * Get all events during a specific phase
 */
export function getEventsInPhase(
  timeline: TimelineEvent[],
  phase: SimPhase
): TimelineEvent[] {
  return timeline.filter(e =>
    e.stateBefore.phase === phase || e.stateAfter.phase === phase
  );
}

/**
 * Calculate emotional trajectory over time
 */
export function calculateEmotionalTrajectory(
  timeline: TimelineEvent[]
): {
  markAnxiety: { timestamp: number; value: number }[];
  lilyFear: { timestamp: number; value: number }[];
} {
  const markAnxiety: { timestamp: number; value: number }[] = [];
  const lilyFear: { timestamp: number; value: number }[] = [];

  let lastMark = -1;
  let lastLily = -1;

  for (const event of timeline) {
    if (event.stateAfter.markAnxiety !== lastMark) {
      markAnxiety.push({
        timestamp: event.timestamp,
        value: event.stateAfter.markAnxiety,
      });
      lastMark = event.stateAfter.markAnxiety;
    }

    if (event.stateAfter.lilyFear !== lastLily) {
      lilyFear.push({
        timestamp: event.timestamp,
        value: event.stateAfter.lilyFear,
      });
      lastLily = event.stateAfter.lilyFear;
    }
  }

  return { markAnxiety, lilyFear };
}
