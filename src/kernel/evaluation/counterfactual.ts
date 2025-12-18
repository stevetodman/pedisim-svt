// ============================================================================
// COUNTERFACTUAL ENGINE
// Generate "what if" analyses for pivot points
// ============================================================================

import {
  TimelineEvent,
  PivotPoint,
  Counterfactual,
} from './types';

// ============================================================================
// COUNTERFACTUAL MODELS
// ============================================================================

interface CounterfactualModel {
  pivotId: string;

  // What actually happened
  actualModel: {
    markAnxietyPeak: (timeline: TimelineEvent[]) => number;
    lilyFearPeak: (timeline: TimelineEvent[]) => number;
    trustDelta: number;
    outcomeDescription: string;
  };

  // What would have happened with intervention
  alternativeModel: {
    markAnxietyPeak: number;
    lilyFearPeak: number;
    trustDelta: number;
    outcomeDescription: string;
  };

  // The intervention
  intervention: {
    timingDescription: string;
    action: string;
    exactWords: string;
  };

  // Narrative
  differenceNarrative: string;
}

const COUNTERFACTUAL_MODELS: CounterfactualModel[] = [
  // =========================================================================
  // No Warning Before Asystole
  // =========================================================================
  {
    pivotId: 'pivot_no_warning_before_asystole',
    actualModel: {
      markAnxietyPeak: (timeline) => {
        const peaks = timeline.map(e => e.stateAfter.markAnxiety);
        return Math.max(...peaks, 3);
      },
      lilyFearPeak: (timeline) => {
        const peaks = timeline.map(e => e.stateAfter.lilyFear);
        return Math.max(...peaks, 4);
      },
      trustDelta: -2,
      outcomeDescription: 'Dad blindsided by flatline. Screamed. Lily terrified. Trust damaged.',
    },
    alternativeModel: {
      markAnxietyPeak: 4,  // Still anxious but not panicked
      lilyFearPeak: 4,     // Doesn't spike because dad doesn't scream
      trustDelta: 0,       // Trust preserved
      outcomeDescription: 'Dad prepared for flatline. Tense but silent. Lily protected. Trust maintained.',
    },
    intervention: {
      timingDescription: '6 seconds before asystole onset',
      action: 'Warn dad about expected asystole',
      exactWords: "Mr. Henderson, watch the monitor with me. Her heart will pause briefly - that's the medicine working. It looks scary but it's temporary.",
    },
    differenceNarrative: `**What actually happened:**
Dad's anxiety: 3 → 5 (panic spike)
Lily's fear: 4 → 5 (heard dad scream)
Family trust: Decreased significantly

**What would have happened with warning:**
Dad's anxiety: 3 → 4 (controlled tension)
Lily's fear: 4 → 4 (protected from dad's reaction)
Family trust: Maintained

**The difference:** A 10-second warning transforms a traumatic experience into a stressful but manageable one.`,
  },

  // =========================================================================
  // Silence During Asystole
  // =========================================================================
  {
    pivotId: 'pivot_silence_during_asystole',
    actualModel: {
      markAnxietyPeak: (timeline) => {
        const asystoleEvents = timeline.filter(e => e.stateAfter.phase === 'ASYSTOLE');
        const peaks = asystoleEvents.map(e => e.stateAfter.markAnxiety);
        return Math.max(...peaks, 4);
      },
      lilyFearPeak: (timeline) => {
        const asystoleEvents = timeline.filter(e => e.stateAfter.phase === 'ASYSTOLE');
        const peaks = asystoleEvents.map(e => e.stateAfter.lilyFear);
        return Math.max(...peaks, 4);
      },
      trustDelta: -1,
      outcomeDescription: 'Family isolated during flatline. Doctor seemed as uncertain as they were.',
    },
    alternativeModel: {
      markAnxietyPeak: 4,
      lilyFearPeak: 4,
      trustDelta: 0,
      outcomeDescription: 'Ongoing narration gave family something to hold onto. Doctor appeared confident.',
    },
    intervention: {
      timingDescription: 'Throughout asystole period',
      action: 'Provide ongoing reassurance',
      exactWords: "This is exactly what we expected. Watch with me - her heart is resetting. Should come back any second now...",
    },
    differenceNarrative: `**What actually happened:**
Silence during the flatline left family alone with their terror.
They remember: "The doctor didn't say anything - maybe they didn't know what was happening."

**What would have happened with narration:**
Ongoing commentary: "This is expected... watching for rhythm... any second..."
Family has your voice as an anchor through the scariest moment.

**The difference:** Your voice is the lifeline. Silence = uncertainty.`,
  },

  // =========================================================================
  // Skipped Vagal
  // =========================================================================
  {
    pivotId: 'pivot_skipped_vagal',
    actualModel: {
      markAnxietyPeak: () => 5,  // Same as actual
      lilyFearPeak: () => 5,    // Same as actual
      trustDelta: 0,
      outcomeDescription: 'Proceeded directly to medication. Vagal never attempted.',
    },
    alternativeModel: {
      markAnxietyPeak: 4,
      lilyFearPeak: 4,
      trustDelta: 0,
      outcomeDescription: '25% chance: converts without medication. 75% chance: vagal fails, proceed to adenosine anyway.',
    },
    intervention: {
      timingDescription: 'Before ordering adenosine',
      action: 'Attempt vagal maneuvers first',
      exactWords: "Let's try something simple first. Nurse, can we get some ice? Lily, I'm going to put something cold on your face - it might help your heart slow down.",
    },
    differenceNarrative: `**What actually happened:**
Went straight to adenosine (60% success, causes scary asystole)

**What would have happened with vagal first:**
25% chance: Converts with ice to face. No medications needed.
75% chance: Vagal fails, but you lose only 30 seconds before adenosine anyway.

**The calculation:** 30 seconds of low-risk attempt vs. 1-in-4 chance of avoiding medication entirely.

**PALS recommends:** Vagal first for stable SVT.`,
  },

  // =========================================================================
  // No Cardioversion Warning
  // =========================================================================
  {
    pivotId: 'pivot_no_cardioversion_warning',
    actualModel: {
      markAnxietyPeak: () => 5,
      lilyFearPeak: () => 3, // Sedated
      trustDelta: -2,
      outcomeDescription: 'Dad watched child shocked without preparation. Looked like violence.',
    },
    alternativeModel: {
      markAnxietyPeak: 4,
      lilyFearPeak: 3,
      trustDelta: 0,
      outcomeDescription: 'Dad understood the body movement was electrical, not pain. Trusted the process.',
    },
    intervention: {
      timingDescription: 'Before delivering shock',
      action: 'Explain cardioversion',
      exactWords: "Mr. Henderson, we're going to reset her heart with a small electrical pulse. She's sedated so she won't feel it. You'll see her body jump - that's the electricity, not pain.",
    },
    differenceNarrative: `**What actually happened:**
Dad saw you shock his daughter
Her body convulsed from the electricity
Without context, this looked like you were hurting her

**What would have happened with explanation:**
Dad knows: sedated = no pain
Dad knows: body jump = expected electrical response
Dad's interpretation: "They're helping her" not "They're hurting her"

**The difference:** Context transforms apparent violence into visible healing.`,
  },

  // =========================================================================
  // Significant Underdose
  // =========================================================================
  {
    pivotId: 'pivot_significant_underdose',
    actualModel: {
      markAnxietyPeak: () => 5,
      lilyFearPeak: () => 5,
      trustDelta: -1,
      outcomeDescription: 'Underdosed adenosine failed. Family experienced terrifying asystole with no benefit.',
    },
    alternativeModel: {
      markAnxietyPeak: 5,  // Still scary
      lilyFearPeak: 5,    // Still scary
      trustDelta: 0,
      outcomeDescription: 'Correct dose: 60% chance of success on first try. Family experiences asystole once, with purpose.',
    },
    intervention: {
      timingDescription: 'When calculating dose',
      action: 'Use correct weight-based dosing',
      exactWords: "Adenosine 1.85mg - that's 0.1 mg/kg for 18.5kg. Rapid push with flush.",
    },
    differenceNarrative: `**What actually happened:**
Underdosed → asystole → back to SVT → need another attempt
Family watched the flatline TWICE for one conversion

**What would have happened with correct dose:**
Correct dose → asystole → 60% convert on first try
If it works: one scary moment instead of two

**The math:** Each underdosed attempt means another round of terror for the family.`,
  },
];

// ============================================================================
// COUNTERFACTUAL GENERATION
// ============================================================================

/**
 * Generate counterfactuals for detected pivot points
 */
export function generateCounterfactuals(
  pivots: PivotPoint[],
  timeline: TimelineEvent[]
): Counterfactual[] {
  const counterfactuals: Counterfactual[] = [];

  for (const pivot of pivots) {
    const model = COUNTERFACTUAL_MODELS.find(m => m.pivotId === pivot.id);
    if (!model) continue;

    counterfactuals.push({
      pivotId: pivot.id,
      actual: {
        markAnxietyPeak: model.actualModel.markAnxietyPeak(timeline),
        lilyFearPeak: model.actualModel.lilyFearPeak(timeline),
        trustDelta: model.actualModel.trustDelta,
        outcome: model.actualModel.outcomeDescription,
      },
      alternative: {
        markAnxietyPeak: model.alternativeModel.markAnxietyPeak,
        lilyFearPeak: model.alternativeModel.lilyFearPeak,
        trustDelta: model.alternativeModel.trustDelta,
        outcome: model.alternativeModel.outcomeDescription,
      },
      intervention: {
        timestamp: pivot.timestamp - 6000, // 6 seconds before the problem
        action: model.intervention.action,
        exactWords: model.intervention.exactWords,
      },
      differenceNarrative: model.differenceNarrative,
    });
  }

  return counterfactuals;
}

/**
 * Get the most impactful counterfactual (biggest difference)
 */
export function getMostImpactfulCounterfactual(
  counterfactuals: Counterfactual[]
): Counterfactual | null {
  if (counterfactuals.length === 0) return null;

  // Score by total state difference
  const scored = counterfactuals.map(cf => ({
    cf,
    score:
      Math.abs(cf.actual.markAnxietyPeak - cf.alternative.markAnxietyPeak) +
      Math.abs(cf.actual.lilyFearPeak - cf.alternative.lilyFearPeak) +
      Math.abs(cf.actual.trustDelta - cf.alternative.trustDelta) * 2, // Trust weighted higher
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.cf || null;
}

/**
 * Format counterfactual for compact display
 */
export function formatCounterfactualCompact(cf: Counterfactual): string {
  return `**Actual:** ${cf.actual.outcome}
**With intervention:** ${cf.alternative.outcome}
**The fix:** "${cf.intervention.exactWords}"`;
}

/**
 * Calculate the "preventability score" - how much could have been prevented
 */
export function calculatePreventabilityScore(cf: Counterfactual): number {
  const anxietyPrevented = cf.actual.markAnxietyPeak - cf.alternative.markAnxietyPeak;
  const fearPrevented = cf.actual.lilyFearPeak - cf.alternative.lilyFearPeak;
  const trustSaved = cf.alternative.trustDelta - cf.actual.trustDelta;

  // Score 0-100
  return Math.min(100, (anxietyPrevented + fearPrevented) * 15 + trustSaved * 20);
}
