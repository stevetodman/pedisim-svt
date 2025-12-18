// ============================================================================
// CAUSAL CHAIN TRACING
// Trace how decisions cascade into consequences
// ============================================================================

import {
  TimelineEvent,
  PivotPoint,
  CausalChain,
} from './types';

// ============================================================================
// CAUSAL CHAIN TEMPLATES
// ============================================================================

interface ChainTemplate {
  id: string;
  name: string;
  triggerPivotId: string;  // Which pivot triggers this chain

  // The chain of causation
  links: {
    from: string;       // Description of cause
    to: string;         // Description of effect
    mechanism: string;  // How A causes B
  }[];

  // Where the chain could be broken
  breakpoint: {
    description: string;
    intervention: string;
    alternativeOutcome: string;
  };

  // For narrative
  narrativeTemplate: string;
}

const CHAIN_TEMPLATES: ChainTemplate[] = [
  // =========================================================================
  // The Asystole Trauma Cascade
  // =========================================================================
  {
    id: 'asystole_trauma_cascade',
    name: 'Asystole Trauma Cascade',
    triggerPivotId: 'pivot_no_warning_before_asystole',
    links: [
      {
        from: 'No warning given before adenosine',
        to: 'Dad sees flatline without context',
        mechanism: 'Dad has no mental model for expected asystole',
      },
      {
        from: 'Dad sees flatline without context',
        to: 'Dad interprets as cardiac arrest',
        mechanism: 'Only framework available is "flatline = death"',
      },
      {
        from: 'Dad interprets as cardiac arrest',
        to: 'Dad panics and screams',
        mechanism: 'Belief that daughter is dying triggers fight-or-flight',
      },
      {
        from: 'Dad panics and screams',
        to: 'Lily hears father\'s terror',
        mechanism: 'Screaming audible to child despite illness',
      },
      {
        from: 'Lily hears father\'s terror',
        to: 'Lily\'s fear spikes to maximum',
        mechanism: 'Child mirrors parent\'s emotional state',
      },
      {
        from: 'Lily\'s fear spikes',
        to: 'Potential lasting medical trauma',
        mechanism: 'Terrifying medical experience at age 5 can create healthcare avoidance',
      },
    ],
    breakpoint: {
      description: 'Before adenosine takes effect',
      intervention: 'Warn dad: "Her heart will pause briefly - that\'s the medicine working"',
      alternativeOutcome: 'Dad prepared → stays tense but silent → Lily unaware → fear stays at 4 → no trauma',
    },
    narrativeTemplate: `Your decision not to warn Mr. Henderson before adenosine created a cascade:

1. When asystole appeared, he had no framework to understand it
2. His scream ("HER HEART STOPPED!") was audible to Lily
3. Lily's fear spiked to 5/5 at the moment she most needed to feel safe
4. Dad's trust decreased (he learned critical info from the monitor, not from you)

**The 10-second intervention that would have changed everything:**
"Mr. Henderson, watch the monitor with me. Her heart will pause briefly - that's the medicine working."`,
  },

  // =========================================================================
  // The Dose Error Chain
  // =========================================================================
  {
    id: 'dose_error_chain',
    name: 'Underdose Failure Chain',
    triggerPivotId: 'pivot_significant_underdose',
    links: [
      {
        from: 'Underdosed adenosine given',
        to: 'Insufficient AV node blockade',
        mechanism: 'Adenosine needs threshold concentration to terminate re-entry',
      },
      {
        from: 'Insufficient AV node blockade',
        to: 'Transient asystole but no conversion',
        mechanism: 'Re-entry circuit survives the brief pause',
      },
      {
        from: 'Transient asystole but no conversion',
        to: 'Family witnesses scary flatline with no benefit',
        mechanism: 'All the terror, none of the therapeutic effect',
      },
      {
        from: 'Failed conversion',
        to: 'Need for additional interventions',
        mechanism: 'Must try higher dose or move to cardioversion',
      },
    ],
    breakpoint: {
      description: 'At dose calculation',
      intervention: 'Calculate 0.1 mg/kg (first dose) or 0.2 mg/kg (second dose)',
      alternativeOutcome: 'Correct dose → optimal chance of conversion → fewer interventions needed',
    },
    narrativeTemplate: `The underdosed adenosine created unnecessary suffering:

1. The dose was too low to terminate the re-entry circuit
2. Family watched the terrifying asystole period
3. Heart returned to SVT - all that fear for nothing
4. Now need additional intervention with additional risk

**Correct dosing:** 0.1 mg/kg first dose, 0.2 mg/kg second dose. For 18.5kg: 1.85mg then 3.7mg.`,
  },

  // =========================================================================
  // The Communication Void Chain
  // =========================================================================
  {
    id: 'communication_void_chain',
    name: 'Communication Void Chain',
    triggerPivotId: 'pivot_silence_during_asystole',
    links: [
      {
        from: 'No communication during asystole',
        to: 'Family left alone with terror',
        mechanism: 'Silence interpreted as "doctor doesn\'t know what\'s happening"',
      },
      {
        from: 'Family left alone with terror',
        to: 'Anxiety peaks and sustains',
        mechanism: 'No new information to process, fear loops',
      },
      {
        from: 'Anxiety peaks and sustains',
        to: 'Trust in medical team erodes',
        mechanism: '"They didn\'t seem to know what was going on"',
      },
    ],
    breakpoint: {
      description: 'During asystole period',
      intervention: 'Narrate: "This is expected, watch with me, should come back any second..."',
      alternativeOutcome: 'Ongoing narration → family has something to hold onto → anxiety manageable',
    },
    narrativeTemplate: `During the asystole, your silence left the family isolated:

1. With no words from you, they assumed you were as scared as they were
2. Their anxiety peaked and stayed high with no relief
3. Even after conversion, they remember: "The doctor didn't say anything"

**Simple fix:** Narrate during the flatline. Even just "This is expected... watching..." helps enormously.`,
  },

  // =========================================================================
  // The Cardioversion Shock Chain
  // =========================================================================
  {
    id: 'cardioversion_shock_chain',
    name: 'Cardioversion Without Warning Chain',
    triggerPivotId: 'pivot_no_cardioversion_warning',
    links: [
      {
        from: 'No warning before cardioversion',
        to: 'Dad sees child\'s body convulse',
        mechanism: 'Electrical shock causes visible muscle contraction',
      },
      {
        from: 'Dad sees body convulse',
        to: 'Dad interprets as violence/harm',
        mechanism: 'Without context, shocking a child looks like assault',
      },
      {
        from: 'Dad interprets as violence',
        to: 'Trust destroyed, potential interference',
        mechanism: 'Protective parent instinct to stop perceived harm',
      },
    ],
    breakpoint: {
      description: 'Before delivering shock',
      intervention: 'Explain: "She\'s sedated, won\'t feel it. You\'ll see her body jump - that\'s normal."',
      alternativeOutcome: 'Dad prepared → understands body movement → stays out of way → trust preserved',
    },
    narrativeTemplate: `Cardioversion without warning looked like violence to Mr. Henderson:

1. He saw you shock his sedated daughter
2. Her body jumped from the electricity
3. Without warning, this looked like you were hurting her
4. His trust in you is now severely damaged

**Always explain:** "She's sedated, won't feel anything. Her body will jump when we deliver the pulse - that's the electricity, not pain."`,
  },
];

// ============================================================================
// CAUSAL CHAIN CONSTRUCTION
// ============================================================================

/**
 * Build causal chains from detected pivot points and timeline events
 */
export function buildCausalChains(
  pivots: PivotPoint[],
  timeline: TimelineEvent[]
): CausalChain[] {
  const chains: CausalChain[] = [];

  for (const template of CHAIN_TEMPLATES) {
    // Check if the triggering pivot was detected
    const triggerPivot = pivots.find(p => p.id === template.triggerPivotId);
    if (!triggerPivot) continue;

    // Find related timeline events
    const relevantEvents = findRelevantEvents(timeline, triggerPivot, template);

    // Build the chain
    const chain: CausalChain = {
      id: template.id,
      name: template.name,
      rootCauseEventId: findRootCauseEventId(timeline, triggerPivot),
      links: template.links.map((link, index) => ({
        fromEventId: relevantEvents[index]?.id || `synthetic_${index}`,
        toEventId: relevantEvents[index + 1]?.id || `synthetic_${index + 1}`,
        mechanism: link.mechanism,
      })),
      finalEffect: template.links[template.links.length - 1].to,
      breakpoints: [{
        afterEventId: relevantEvents[0]?.id || 'root',
        intervention: template.breakpoint.intervention,
        alternativeChain: template.breakpoint.alternativeOutcome,
      }],
      narrativeSummary: template.narrativeTemplate,
    };

    // Link pivot to chain
    triggerPivot.causalChainId = chain.id;

    chains.push(chain);
  }

  return chains;
}

function findRelevantEvents(
  timeline: TimelineEvent[],
  pivot: PivotPoint,
  template: ChainTemplate
): TimelineEvent[] {
  // Find events that correspond to chain links
  const events: TimelineEvent[] = [];

  // Start from pivot timestamp
  const pivotTime = pivot.timestamp;

  // For asystole cascade, find key events
  if (template.id === 'asystole_trauma_cascade') {
    // Find asystole onset
    const asystoleEvent = timeline.find(e =>
      e.timestamp >= pivotTime &&
      e.type === 'state_change' &&
      e.stateAfter.phase === 'ASYSTOLE'
    );
    if (asystoleEvent) events.push(asystoleEvent);

    // Find dad's scream
    const dadScream = timeline.find(e =>
      e.timestamp >= pivotTime &&
      e.actor === 'mark' &&
      (e.content.toUpperCase().includes('FLAT') ||
       e.content.toUpperCase().includes('HEART') ||
       e.content.toUpperCase().includes('STOP'))
    );
    if (dadScream) events.push(dadScream);

    // Find anxiety spike
    const anxietySpike = timeline.find(e =>
      e.timestamp >= pivotTime &&
      e.type === 'state_change' &&
      e.metadata?.trigger === 'anxiety_spike'
    );
    if (anxietySpike) events.push(anxietySpike);
  }

  return events;
}

function findRootCauseEventId(
  timeline: TimelineEvent[],
  pivot: PivotPoint
): string {
  // Find the event closest to pivot timestamp that represents the decision
  const nearbyEvents = timeline.filter(e =>
    Math.abs(e.timestamp - pivot.timestamp) < 2000
  );

  // Prefer action events
  const actionEvent = nearbyEvents.find(e => e.type === 'action');
  if (actionEvent) return actionEvent.id;

  // Otherwise, closest event
  return nearbyEvents[0]?.id || 'unknown';
}

// ============================================================================
// CHAIN ANALYSIS
// ============================================================================

/**
 * Get the most impactful chain (for focusing the debrief)
 */
export function getMostImpactfulChain(chains: CausalChain[]): CausalChain | null {
  // Prioritize by chain length and severity
  const scored = chains.map(chain => ({
    chain,
    score: chain.links.length * (chain.id.includes('trauma') ? 2 : 1),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.chain || null;
}

/**
 * Format chain for display as visual flow
 */
export function formatChainForDisplay(chain: CausalChain): string {
  const lines = chain.links.map((link) => {
    return `${link.mechanism}`;
  });

  return lines.join('\n  ↓\n');
}

/**
 * Get the breakpoint intervention (what could have prevented this)
 */
export function getBreakpointIntervention(chain: CausalChain): string {
  return chain.breakpoints[0]?.intervention || 'No clear intervention identified';
}
