// ============================================================================
// NARRATIVE ENGINE
// Multi-perspective story generation for simulation debrief
// ============================================================================

export * from './types';
export { generateMarkNarrative } from './mark';
export { generateLilyNarrative } from './lily';
export { generateNurseNarrative } from './nurse';

import { CharacterNarrative, NarrativeContext } from './types';
import { generateMarkNarrative } from './mark';
import { generateLilyNarrative } from './lily';
import { generateNurseNarrative } from './nurse';
import {
  PivotPoint,
  TimelineEvent,
  CommunicationWindow,
} from '../evaluation/types';

// ============================================================================
// CONTEXT BUILDER
// ============================================================================

/**
 * Build narrative context from evaluation data
 */
export function buildNarrativeContext(
  pivots: PivotPoint[],
  timeline: TimelineEvent[],
  communicationWindows: CommunicationWindow[]
): NarrativeContext {
  // Determine key states
  const dadWarned = !communicationWindows.some(
    w => w.id === 'window_pre_adenosine_warning' && w.wasMissed
  );

  const asystoleOccurred = timeline.some(
    e => e.type === 'state_change' && e.stateAfter.phase === 'ASYSTOLE'
  );

  const conversionSuccessful = timeline.some(
    e => e.type === 'state_change' && e.stateAfter.phase === 'CONVERTED'
  );

  const cardioversionUsed = timeline.some(
    e => e.type === 'action' && e.metadata?.intervention === 'cardioversion'
  );

  // Find peak emotional states
  let markPeakAnxiety = 3;
  let lilyPeakFear = 4;
  for (const event of timeline) {
    if (event.stateAfter.markAnxiety > markPeakAnxiety) {
      markPeakAnxiety = event.stateAfter.markAnxiety;
    }
    if (event.stateAfter.lilyFear > lilyPeakFear) {
      lilyPeakFear = event.stateAfter.lilyFear;
    }
  }

  // Determine if dad panicked
  const dadPanicked = markPeakAnxiety >= 5;
  const lilyHeardScream = dadPanicked && lilyPeakFear >= 5;

  // Find key timestamps
  const asystoleEvent = timeline.find(
    e => e.type === 'state_change' && e.stateAfter.phase === 'ASYSTOLE'
  );
  const conversionEvent = timeline.find(
    e => e.type === 'state_change' && e.stateAfter.phase === 'CONVERTED'
  );

  // Find dad scream (if it happened)
  const dadScreamEvent = timeline.find(
    e => e.actor === 'mark' &&
      (e.content.toUpperCase().includes('STOP') ||
       e.content.toUpperCase().includes('FLAT') ||
       e.content.toUpperCase().includes('HEART'))
  );

  return {
    pivots,
    timeline,
    communicationWindows,
    dadWarned,
    asystoleOccurred,
    dadPanicked,
    lilyHeardScream,
    conversionSuccessful,
    cardioversionUsed,
    markPeakAnxiety,
    lilyPeakFear,
    asystoleTimestamp: asystoleEvent?.timestamp,
    conversionTimestamp: conversionEvent?.timestamp,
    dadScreamTimestamp: dadScreamEvent?.timestamp,
  };
}

// ============================================================================
// MAIN NARRATIVE GENERATION
// ============================================================================

export interface NarrativeSet {
  mark: CharacterNarrative;
  lily: CharacterNarrative;
  nurse: CharacterNarrative;
  context: NarrativeContext;
}

/**
 * Generate all character narratives from evaluation data
 */
export function generateAllNarratives(
  pivots: PivotPoint[],
  timeline: TimelineEvent[],
  communicationWindows: CommunicationWindow[]
): NarrativeSet {
  const context = buildNarrativeContext(pivots, timeline, communicationWindows);

  return {
    mark: generateMarkNarrative(context),
    lily: generateLilyNarrative(context),
    nurse: generateNurseNarrative(context),
    context,
  };
}

// ============================================================================
// NARRATIVE UTILITIES
// ============================================================================

/**
 * Get a single character's narrative
 */
export function generateCharacterNarrative(
  character: 'mark' | 'lily' | 'nurse',
  pivots: PivotPoint[],
  timeline: TimelineEvent[],
  communicationWindows: CommunicationWindow[]
): CharacterNarrative {
  const context = buildNarrativeContext(pivots, timeline, communicationWindows);

  switch (character) {
    case 'mark':
      return generateMarkNarrative(context);
    case 'lily':
      return generateLilyNarrative(context);
    case 'nurse':
      return generateNurseNarrative(context);
  }
}

/**
 * Format narrative for display
 */
export function formatNarrativeForDisplay(narrative: CharacterNarrative): string {
  let output = `## ${narrative.displayName}\n\n`;
  output += `*"${narrative.openingLine}"*\n\n`;
  output += narrative.narrative + '\n\n';
  output += `---\n\n`;
  output += `*"${narrative.closingReflection}"*\n\n`;

  if (narrative.wishStatement) {
    output += `**What I wish had happened:** "${narrative.wishStatement}"\n\n`;
  }

  if (narrative.professionalAssessment) {
    output += `### Professional Assessment\n`;
    output += `**Rating:** ${narrative.professionalAssessment.rating}\n`;
    output += `**Summary:** ${narrative.professionalAssessment.summary}\n`;
    output += `**Mentor would say:** "${narrative.professionalAssessment.wouldMentorSay}"\n`;
  }

  return output;
}

/**
 * Get the key moment from each narrative for a summary view
 */
export function getKeyMomentsSummary(narratives: NarrativeSet): {
  mark: string;
  lily: string;
  nurse: string;
} {
  const getKeyMoment = (narrative: CharacterNarrative): string => {
    const turningPoint = narrative.keyMoments.find(m => m.significance === 'turning_point');
    const trauma = narrative.keyMoments.find(m => m.significance === 'trauma');
    const key = turningPoint || trauma || narrative.keyMoments[0];

    if (!key) return narrative.closingReflection;
    return `${key.description}: "${key.thought}"`;
  };

  return {
    mark: getKeyMoment(narratives.mark),
    lily: getKeyMoment(narratives.lily),
    nurse: getKeyMoment(narratives.nurse),
  };
}

/**
 * Get emotional trajectory for visualization
 */
export function getEmotionalTrajectories(narratives: NarrativeSet): {
  mark: { start: number; peak: number; end: number };
  lily: { start: number; peak: number; end: number };
} {
  return {
    mark: {
      start: narratives.mark.emotionalArc.start.intensity,
      peak: narratives.mark.emotionalArc.peak.intensity,
      end: narratives.mark.emotionalArc.end.intensity,
    },
    lily: {
      start: narratives.lily.emotionalArc.start.intensity,
      peak: narratives.lily.emotionalArc.peak.intensity,
      end: narratives.lily.emotionalArc.end.intensity,
    },
  };
}
