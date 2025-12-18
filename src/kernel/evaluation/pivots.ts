// ============================================================================
// PIVOT POINT IDENTIFICATION
// Find the critical decision moments that matter most for learning
// ============================================================================

import {
  TimelineEvent,
  PivotPoint,
  PivotType,
  PivotImpact,
  Alternative,
  CommunicationWindow,
} from './types';

// ============================================================================
// PIVOT DETECTION RULES
// ============================================================================

interface PivotRule {
  id: string;
  name: string;
  type: PivotType;
  impact: PivotImpact;

  // Detection function
  detect: (timeline: TimelineEvent[], windows: CommunicationWindow[]) => DetectionResult | null;

  // Teaching content
  description: string;
  teachingPoint: string;
  alternatives: Alternative[];
  expertWouldSay?: string;
}

interface DetectionResult {
  timestamp: number;
  decision?: string;
  actualOutcome: string;
  affectedCharacters: ('learner' | 'nurse' | 'lily' | 'mark' | 'system')[];
  stateImpact: {
    markAnxietyDelta: number;
    lilyFearDelta: number;
  };
}

const PIVOT_RULES: PivotRule[] = [
  // =========================================================================
  // CRITICAL: Pre-Asystole Warning
  // =========================================================================
  {
    id: 'no_warning_before_asystole',
    name: 'No Warning Before Asystole',
    type: 'missed_opportunity',
    impact: 'critical',
    detect: (timeline, windows) => {
      const warningWindow = windows.find(w => w.id === 'window_pre_adenosine_warning');
      if (!warningWindow || !warningWindow.wasMissed) return null;

      // Find the asystole onset
      const asystoleEvent = timeline.find(e =>
        e.type === 'state_change' &&
        e.stateAfter.phase === 'ASYSTOLE'
      );
      if (!asystoleEvent) return null;

      return {
        timestamp: warningWindow.startTimestamp,
        decision: 'Said nothing to family before adenosine effect',
        actualOutcome: 'Dad blindsided by flatline, panicked, screamed. Lily heard and became terrified.',
        affectedCharacters: ['mark', 'lily'],
        stateImpact: {
          markAnxietyDelta: 2,  // typically 3→5
          lilyFearDelta: 1,     // typically 4→5
        },
      };
    },
    description: 'Failed to warn family before adenosine-induced asystole',
    teachingPoint: 'The 6-second window between "pushing adenosine" and asystole is critical. A prepared family stays calm; an unprepared family panics.',
    alternatives: [
      {
        action: 'Warn dad before pushing adenosine',
        rationale: 'Prepared families interpret asystole as expected, not as death',
        expectedOutcome: 'Dad stays at 3-4/5 anxiety instead of spiking to 5',
        isPALSPreferred: true,
      },
    ],
    expertWouldSay: "Mr. Henderson, watch the monitor with me. Her heart will pause briefly - that's the medicine working. It looks scary but it's temporary.",
  },

  // =========================================================================
  // HIGH: Silence During Asystole
  // =========================================================================
  {
    id: 'silence_during_asystole',
    name: 'Silence During Asystole',
    type: 'missed_opportunity',
    impact: 'high',
    detect: (_timeline, windows) => {
      const asystoleWindow = windows.find(w => w.id === 'window_during_asystole');
      if (!asystoleWindow || !asystoleWindow.wasMissed) return null;

      return {
        timestamp: asystoleWindow.startTimestamp,
        decision: 'Remained silent during asystole period',
        actualOutcome: 'Family left alone with terror during flatline. No ongoing reassurance.',
        affectedCharacters: ['mark', 'lily'],
        stateImpact: {
          markAnxietyDelta: 1,
          lilyFearDelta: 1,
        },
      };
    },
    description: 'No reassurance provided during the asystole period',
    teachingPoint: 'Even if you warned before, ongoing narration during the flatline ("It\'s coming back... any second now...") helps families cope.',
    alternatives: [
      {
        action: 'Provide ongoing reassurance during asystole',
        rationale: 'Narrating what\'s happening gives family something to hold onto',
        expectedOutcome: 'Family remains anxious but not panicked',
        isPALSPreferred: true,
      },
    ],
    expertWouldSay: "This is exactly what we expected. Watch with me - her heart is resetting. Should come back any second now...",
  },

  // =========================================================================
  // MEDIUM: Skipped Vagal Maneuvers
  // =========================================================================
  {
    id: 'skipped_vagal',
    name: 'Skipped Vagal Maneuvers',
    type: 'decision',
    impact: 'medium',
    detect: (timeline) => {
      // Find first adenosine
      const firstAdenosine = timeline.find(e =>
        e.type === 'action' &&
        e.metadata?.intervention === 'adenosine'
      );
      if (!firstAdenosine) return null;

      // Check if any vagal was done before adenosine
      const vagalBeforeAdenosine = timeline.find(e =>
        e.type === 'action' &&
        e.metadata?.intervention === 'vagal' &&
        e.timestamp < firstAdenosine.timestamp
      );

      if (vagalBeforeAdenosine) return null;

      return {
        timestamp: firstAdenosine.timestamp,
        decision: 'Proceeded directly to adenosine without trying vagal maneuvers',
        actualOutcome: 'Jumped to medication. Vagal has 25% success rate with zero risk.',
        affectedCharacters: ['lily'],
        stateImpact: {
          markAnxietyDelta: 0,
          lilyFearDelta: 0,
        },
      };
    },
    description: 'Skipped vagal maneuvers before adenosine',
    teachingPoint: 'Vagal maneuvers (ice to face) work 25% of the time with zero medication risk. Worth trying first for stable SVT.',
    alternatives: [
      {
        action: 'Try vagal maneuvers first',
        rationale: '25% success rate, no medication needed, demonstrates conservative approach',
        expectedOutcome: '1 in 4 patients convert without needing adenosine',
        isPALSPreferred: true,
      },
      {
        action: 'Proceed to adenosine (current choice)',
        rationale: 'Faster, higher success rate, reasonable for clearly SVT',
        expectedOutcome: 'Patient gets medication, 60% success on first dose',
        isPALSPreferred: false,
      },
    ],
  },

  // =========================================================================
  // HIGH: Cardioversion Without Sedation Warning
  // =========================================================================
  {
    id: 'no_cardioversion_warning',
    name: 'No Pre-Cardioversion Warning',
    type: 'missed_opportunity',
    impact: 'high',
    detect: (_timeline, windows) => {
      const cardioWindow = windows.find(w => w.id === 'window_pre_cardioversion');
      if (!cardioWindow || !cardioWindow.wasMissed) return null;

      return {
        timestamp: cardioWindow.startTimestamp,
        decision: 'Did not warn family before cardioversion',
        actualOutcome: 'Family saw child shocked without preparation. Visually traumatic.',
        affectedCharacters: ['mark'],
        stateImpact: {
          markAnxietyDelta: 2,
          lilyFearDelta: 0, // sedated
        },
      };
    },
    description: 'Did not prepare family for cardioversion',
    teachingPoint: 'Cardioversion looks violent - the body jumps. Unprepared families may think you\'re hurting their child.',
    alternatives: [
      {
        action: 'Explain cardioversion before shocking',
        rationale: 'Family understands the body movement is expected',
        expectedOutcome: 'Family tense but not horrified',
        isPALSPreferred: true,
      },
    ],
    expertWouldSay: "Mr. Henderson, we're going to reset her heart with a small electrical pulse. She's sedated so she won't feel it. You'll see her body jump - that's normal.",
  },

  // =========================================================================
  // LOW: No Post-Conversion Acknowledgment
  // =========================================================================
  {
    id: 'no_post_conversion_ack',
    name: 'No Post-Conversion Acknowledgment',
    type: 'missed_opportunity',
    impact: 'low',
    detect: (_timeline, windows) => {
      const postWindow = windows.find(w => w.id === 'window_post_conversion');
      if (!postWindow || !postWindow.wasMissed) return null;

      return {
        timestamp: postWindow.startTimestamp,
        decision: 'Did not acknowledge successful conversion to family',
        actualOutcome: 'Family left uncertain about outcome. Missed chance to rebuild trust.',
        affectedCharacters: ['mark', 'lily'],
        stateImpact: {
          markAnxietyDelta: 0,
          lilyFearDelta: 0,
        },
      };
    },
    description: 'Did not celebrate success with family',
    teachingPoint: 'After a successful intervention, explicitly telling the family "It worked!" helps them process the trauma.',
    alternatives: [
      {
        action: 'Acknowledge success to family',
        rationale: 'Closure helps family process the scary experience',
        expectedOutcome: 'Family relieved, trust rebuilt',
        isPALSPreferred: true,
      },
    ],
    expertWouldSay: "Lily, you were so brave! Your heart is all better now. Mr. Henderson, she's going to be fine.",
  },

  // =========================================================================
  // MEDIUM: Dose Error (Caught by Nurse)
  // =========================================================================
  {
    id: 'dose_error_caught',
    name: 'Dose Error Caught by Nurse',
    type: 'error',
    impact: 'medium',
    detect: (timeline) => {
      const nurseCatch = timeline.find(e => e.type === 'nurse_catch');
      if (!nurseCatch) return null;

      return {
        timestamp: nurseCatch.timestamp,
        decision: `Ordered ${nurseCatch.metadata?.dose}${nurseCatch.metadata?.unit} ${nurseCatch.metadata?.intervention}`,
        actualOutcome: `Nurse caught error: ${nurseCatch.metadata?.reason}. Patient protected.`,
        affectedCharacters: ['nurse'],
        stateImpact: {
          markAnxietyDelta: 0,
          lilyFearDelta: 0,
        },
      };
    },
    description: 'Medication dose error caught by nurse',
    teachingPoint: 'Nurses are the safety net. But errors that reach them indicate knowledge gaps.',
    alternatives: [
      {
        action: 'Calculate dose correctly',
        rationale: 'Weight-based dosing is core PALS skill',
        expectedOutcome: 'Correct dose given without nurse intervention',
        isPALSPreferred: true,
      },
    ],
  },

  // =========================================================================
  // HIGH: Underdosed Significantly
  // =========================================================================
  {
    id: 'significant_underdose',
    name: 'Significant Underdosing',
    type: 'error',
    impact: 'high',
    detect: (timeline) => {
      const adenosineAction = timeline.find(e =>
        e.type === 'action' &&
        e.metadata?.intervention === 'adenosine' &&
        e.metadata?.dose !== undefined &&
        e.metadata?.correct !== undefined
      );

      if (!adenosineAction) return null;

      const ratio = adenosineAction.metadata!.dose! / adenosineAction.metadata!.correct!;
      if (ratio >= 0.7) return null; // Not significantly underdosed

      return {
        timestamp: adenosineAction.timestamp,
        decision: `Gave ${adenosineAction.metadata!.dose}${adenosineAction.metadata!.unit} (correct: ${adenosineAction.metadata!.correct}${adenosineAction.metadata!.unit})`,
        actualOutcome: `Dose was ${Math.round((1 - ratio) * 100)}% under. Reduced efficacy.`,
        affectedCharacters: ['lily'],
        stateImpact: {
          markAnxietyDelta: 0,
          lilyFearDelta: 0,
        },
      };
    },
    description: 'Administered significantly underdosed medication',
    teachingPoint: 'Underdosing reduces efficacy. Adenosine needs adequate dose to terminate re-entry circuit.',
    alternatives: [
      {
        action: 'Use correct weight-based dose',
        rationale: '0.1 mg/kg first dose, 0.2 mg/kg second dose',
        expectedOutcome: 'Optimal chance of conversion',
        isPALSPreferred: true,
      },
    ],
  },

  // =========================================================================
  // SUCCESS: Good Warning
  // =========================================================================
  {
    id: 'good_warning_given',
    name: 'Effective Pre-Asystole Warning',
    type: 'success',
    impact: 'high',
    detect: (_timeline, windows) => {
      const warningWindow = windows.find(w => w.id === 'window_pre_adenosine_warning');
      if (!warningWindow || warningWindow.wasMissed) return null;

      // Check if warning was explanatory
      const hasExplanatoryWarning = warningWindow.actualMessages.some(msg =>
        /expect|normal|pause|temporary|brief|watch|monitor/.test(msg.toLowerCase())
      );
      if (!hasExplanatoryWarning) return null;

      return {
        timestamp: warningWindow.startTimestamp,
        decision: 'Warned family before adenosine effect',
        actualOutcome: 'Family prepared for asystole. Anxiety stayed manageable.',
        affectedCharacters: ['mark'],
        stateImpact: {
          markAnxietyDelta: 1, // Still increases but not as much
          lilyFearDelta: 0,
        },
      };
    },
    description: 'Successfully warned family before adenosine-induced asystole',
    teachingPoint: 'This is exactly right. Anticipatory guidance transforms a terrifying moment into an expected one.',
    alternatives: [],
  },
];

// ============================================================================
// PIVOT IDENTIFICATION
// ============================================================================

/**
 * Identify pivot points in the timeline.
 * Returns pivots sorted by impact (critical first).
 */
export function identifyPivotPoints(
  timeline: TimelineEvent[],
  communicationWindows: CommunicationWindow[]
): PivotPoint[] {
  const pivots: PivotPoint[] = [];

  for (const rule of PIVOT_RULES) {
    const result = rule.detect(timeline, communicationWindows);
    if (!result) continue;

    pivots.push({
      id: `pivot_${rule.id}`,
      timestamp: result.timestamp,
      type: rule.type,
      impact: rule.impact,
      description: rule.description,
      decision: result.decision,
      alternatives: rule.alternatives,
      actualOutcome: result.actualOutcome,
      affectedCharacters: result.affectedCharacters,
      stateImpact: result.stateImpact,
      teachingPoint: rule.teachingPoint,
      expertWouldSay: rule.expertWouldSay,
    });
  }

  // Sort by impact
  const impactOrder: Record<PivotImpact, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  pivots.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);

  return pivots;
}

/**
 * Get the single most important pivot point (the one to focus the debrief on)
 */
export function getMostCriticalPivot(pivots: PivotPoint[]): PivotPoint | null {
  // Prefer critical missed opportunities over other types
  const criticalMissed = pivots.find(p =>
    p.impact === 'critical' && p.type === 'missed_opportunity'
  );
  if (criticalMissed) return criticalMissed;

  // Otherwise, highest impact
  return pivots[0] || null;
}

/**
 * Get successes for positive reinforcement
 */
export function getSuccesses(pivots: PivotPoint[]): PivotPoint[] {
  return pivots.filter(p => p.type === 'success');
}

/**
 * Get errors for learning
 */
export function getErrors(pivots: PivotPoint[]): PivotPoint[] {
  return pivots.filter(p => p.type === 'error' || p.type === 'missed_opportunity');
}
