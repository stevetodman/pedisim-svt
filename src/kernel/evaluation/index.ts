// ============================================================================
// EVALUATION ENGINE
// Decision-point analysis, causal chains, and counterfactuals
// ============================================================================

// Types
export * from './types';

// Timeline reconstruction
export {
  reconstructTimeline,
  identifyCommunicationWindows,
  findSilenceGaps,
  getEventsInPhase,
  calculateEmotionalTrajectory,
} from './timeline';
export type { ReconstructionInput } from './timeline';

// Pivot point identification
export {
  identifyPivotPoints,
  getMostCriticalPivot,
  getSuccesses,
  getErrors,
} from './pivots';

// Causal chain tracing
export {
  buildCausalChains,
  getMostImpactfulChain,
  formatChainForDisplay,
  getBreakpointIntervention,
} from './causal';

// Counterfactual analysis
export {
  generateCounterfactuals,
  getMostImpactfulCounterfactual,
  formatCounterfactualCompact,
  calculatePreventabilityScore,
} from './counterfactual';

// ============================================================================
// MAIN EVALUATION FUNCTION
// ============================================================================

import { ReconstructionInput, reconstructTimeline, identifyCommunicationWindows } from './timeline';
import { identifyPivotPoints, getMostCriticalPivot } from './pivots';
import { buildCausalChains, getMostImpactfulChain } from './causal';
import { generateCounterfactuals, getMostImpactfulCounterfactual } from './counterfactual';
import {
  EvaluationResult,
  PivotPoint,
  Counterfactual,
  DialogueHook,
  CharacterPerspective,
} from './types';

/**
 * Run full evaluation on simulation data.
 * This is the main entry point for generating a debrief.
 */
export function runEvaluation(input: ReconstructionInput): Omit<EvaluationResult, 'perspectives' | 'dialogueHooks'> {
  // Step 1: Reconstruct timeline
  const timeline = reconstructTimeline(input);

  // Step 2: Identify communication windows
  const communicationWindows = identifyCommunicationWindows(timeline);

  // Step 3: Identify pivot points
  const pivotPoints = identifyPivotPoints(timeline, communicationWindows);

  // Step 4: Build causal chains
  const causalChains = buildCausalChains(pivotPoints, timeline);

  // Step 5: Generate counterfactuals
  const counterfactuals = generateCounterfactuals(pivotPoints, timeline);

  // Step 6: Find the key insight
  const criticalPivot = getMostCriticalPivot(pivotPoints);
  // criticalChain available for future use in narrative generation
  getMostImpactfulChain(causalChains);
  const criticalCounterfactual = getMostImpactfulCounterfactual(counterfactuals);

  // Step 7: Calculate scores
  const scores = calculateScores(pivotPoints, communicationWindows, timeline);

  return {
    sessionId: `eval_${Date.now()}`,
    timestamp: Date.now(),
    timeline,
    communicationWindows,
    pivotPoints,
    causalChains,
    counterfactuals,
    pivotalMoment: {
      pivotId: criticalPivot?.id || '',
      whyThisMatters: criticalPivot?.teachingPoint || '',
      theOneInsight: criticalCounterfactual?.intervention.exactWords || '',
    },
    theOneThing: {
      behavior: criticalPivot?.description || 'No critical issues identified',
      exactWords: criticalPivot?.expertWouldSay || '',
      exactMoment: criticalPivot ? formatTimestamp(criticalPivot.timestamp) : '',
    },
    scores,
    trajectory: {
      sessionsCompleted: 1,
      improvement: 'plateau',
      rateLimiter: scores.communication < scores.clinical ? 'communication' : 'neither',
    },
  };
}

function calculateScores(
  pivots: PivotPoint[],
  windows: any[],
  _timeline: any[]
): { clinical: number; communication: number; overall: number } {
  // Clinical score: Based on dose accuracy and protocol adherence
  let clinical = 4;
  const doseErrors = pivots.filter(p => p.id.includes('underdose') || p.id.includes('overdose'));
  clinical -= doseErrors.length * 0.5;
  const skippedVagal = pivots.some(p => p.id === 'pivot_skipped_vagal');
  if (skippedVagal) clinical -= 0.3;
  clinical = Math.max(1, Math.min(5, clinical));

  // Communication score: Based on missed windows
  let communication = 4;
  const missedWindows = windows.filter(w => w.wasMissed);
  const criticalMissed = missedWindows.filter(w => w.impact === 'critical').length;
  const highMissed = missedWindows.filter(w => w.impact === 'high').length;
  communication -= criticalMissed * 1.5;
  communication -= highMissed * 0.5;
  communication = Math.max(1, Math.min(5, communication));

  // Overall: Weighted average
  const overall = (clinical * 0.4 + communication * 0.6);

  return {
    clinical: Math.round(clinical * 10) / 10,
    communication: Math.round(communication * 10) / 10,
    overall: Math.round(overall * 10) / 10,
  };
}

function formatTimestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// ============================================================================
// DIALOGUE HOOK GENERATION
// ============================================================================

/**
 * Generate dialogue hooks for interactive debrief
 */
export function generateDialogueHooks(
  pivots: PivotPoint[],
  _counterfactuals: Counterfactual[]
): DialogueHook[] {
  const hooks: DialogueHook[] = [];

  // Hook 1: Why did dad scream? (if asystole trauma cascade occurred)
  const asystolePivot = pivots.find(p => p.id === 'pivot_no_warning_before_asystole');
  if (asystolePivot) {
    hooks.push({
      id: 'hook_why_dad_screamed',
      question: 'At 0:21, when the flatline appeared, dad screamed. What do you think caused that reaction?',
      options: [
        "He didn't know it was coming",
        "He's just an anxious person",
        'The flatline is scary regardless of warning',
        "I'm not sure",
      ],
      correctOptionIndex: 0,
      followUpCorrect: "Exactly. He had no mental model for what was about to happen. When he saw the flatline, his only interpretation was 'my daughter's heart stopped.' He couldn't know it was expected, temporary, and therapeutic.",
      followUpIncorrect: "Actually, the key factor was lack of preparation. Even anxious parents can stay composed if they know what to expect. The flatline IS scary, but with warning, it becomes 'the expected scary thing' rather than 'sudden death.'",
      allowFreeText: false,
    });

    // Hook 2: What could you have said?
    hooks.push({
      id: 'hook_what_to_say',
      question: 'What could you have said in the 6 seconds between "flush going in" and the flatline appearing?',
      options: [],
      correctOptionIndex: -1,
      followUpCorrect: '',
      followUpIncorrect: '',
      allowFreeText: true,
      freeTextPrompt: 'Type what you would say to Mr. Henderson...',
      idealFreeTextResponse: "Mr. Henderson, watch the monitor with me. Her heart will pause briefly - that's the medicine working. It looks scary but it's temporary.",
    });
  }

  // Hook 3: Vagal question (if skipped)
  const vagalPivot = pivots.find(p => p.id === 'pivot_skipped_vagal');
  if (vagalPivot) {
    hooks.push({
      id: 'hook_vagal_decision',
      question: 'You went straight to adenosine without trying vagal maneuvers. Walk me through that decision.',
      options: [
        'Vagal rarely works, wanted to move faster',
        'Forgot about vagal as an option',
        'Patient seemed too unstable for vagal',
        'Wanted to give her the best chance with medication',
      ],
      correctOptionIndex: -1, // No "correct" answer - this is reflective
      followUpCorrect: "That's reasonable clinical thinking. For future reference: vagal works about 25% of the time with essentially zero risk. It's worth the 30 seconds even if you expect it to fail.",
      followUpIncorrect: "That's reasonable clinical thinking. For future reference: vagal works about 25% of the time with essentially zero risk. It's worth the 30 seconds even if you expect it to fail.",
      allowFreeText: true,
    });
  }

  return hooks;
}

/**
 * Placeholder for AI-generated perspectives (will be filled by evaluator service)
 */
export function createEmptyPerspectives(): {
  mark: CharacterPerspective;
  lily: CharacterPerspective;
  nurse: CharacterPerspective;
} {
  return {
    mark: {
      character: 'mark',
      narrative: '',
      emotionalTrajectory: { start: 3, peak: 5, end: 4 },
      keyMoment: { timestamp: 0, description: '', impact: '' },
    },
    lily: {
      character: 'lily',
      narrative: '',
      emotionalTrajectory: { start: 4, peak: 5, end: 3 },
      keyMoment: { timestamp: 0, description: '', impact: '' },
    },
    nurse: {
      character: 'nurse',
      narrative: '',
      emotionalTrajectory: { start: 2, peak: 3, end: 2 },
      keyMoment: { timestamp: 0, description: '', impact: '' },
      assessment: 'needs_improvement',
    },
  };
}
