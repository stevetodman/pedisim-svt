// ============================================================================
// EVALUATION SYSTEM TYPES
// Types for decision-point analysis, causal chains, and debrief generation
// ============================================================================

import { SimPhase, Rhythm, Vitals } from '../../hooks/useSimulation';

// ============================================================================
// STATE SNAPSHOTS
// ============================================================================

/**
 * Complete snapshot of simulation state at a moment in time.
 * Used for before/after comparison and trajectory analysis.
 */
export interface StateSnapshot {
  timestamp: number;

  // Simulation state
  phase: SimPhase;
  rhythm: Rhythm;
  vitals: Vitals;

  // Treatment state
  sedated: boolean;
  adenosineCount: number;
  cardioversionCount: number;

  // Character emotional state (the key insight)
  markAnxiety: number;  // 1-5
  lilyFear: number;     // 1-5

  // Derived
  inCrisis: boolean;    // true during ASYSTOLE or when vitals critical
}

// ============================================================================
// TIMELINE EVENTS
// ============================================================================

export type EventType =
  | 'action'              // Learner performed intervention
  | 'communication'       // Learner spoke to family/team
  | 'character_response'  // Character (Lily/Mark/Nurse) spoke
  | 'state_change'        // Phase/rhythm/vitals changed
  | 'nurse_catch'         // Nurse prevented an error
  | 'system';             // System message

export type EventActor = 'learner' | 'nurse' | 'lily' | 'mark' | 'system';

/**
 * A single event in the simulation timeline.
 * Rich enough to reconstruct what happened and analyze decisions.
 */
export interface TimelineEvent {
  id: string;
  timestamp: number;

  type: EventType;
  actor: EventActor;
  content: string;

  // State context
  stateBefore: StateSnapshot;
  stateAfter: StateSnapshot;

  // Optional metadata for specific event types
  metadata?: {
    // For actions
    intervention?: string;
    dose?: number;
    correct?: number;
    unit?: string;
    result?: 'success' | 'failed' | 'pending';

    // For nurse catches
    reason?: string;

    // For state changes
    trigger?: string;

    // For communication
    addressedTo?: 'family' | 'team' | 'lily' | 'mark';
    wasExplanatory?: boolean;
  };
}

// ============================================================================
// COMMUNICATION WINDOWS
// ============================================================================

/**
 * A window of opportunity for communication.
 * Identifies moments when the learner should have said something.
 */
export interface CommunicationWindow {
  id: string;
  name: string;

  // Timing
  startTimestamp: number;
  endTimestamp: number;
  duration: number;

  // What triggered this window
  triggerEventId: string;
  closingEventId: string;

  // Analysis
  optimalMessage: string;       // What expert would say
  actualMessages: string[];     // What learner actually said (if anything)
  wasMissed: boolean;

  // Impact of missing it
  impact: 'low' | 'medium' | 'high' | 'critical';
  impactDescription: string;
}

/**
 * Known communication windows in the simulation
 */
export type WindowType =
  | 'pre_adenosine_warning'    // Between order and asystole (CRITICAL)
  | 'during_asystole'          // While flatline showing
  | 'post_conversion'          // After successful conversion
  | 'post_failed_intervention' // After intervention didn't work
  | 'initial_reassurance'      // First 30 seconds
  | 'pre_cardioversion';       // Before shocking

// ============================================================================
// PIVOT POINTS
// ============================================================================

export type PivotType =
  | 'decision'           // Active choice (e.g., skipped vagal)
  | 'missed_opportunity' // Failed to act when should have
  | 'error'              // Made a mistake (caught or not)
  | 'success';           // Did something well

export type PivotImpact = 'low' | 'medium' | 'high' | 'critical';

/**
 * A critical decision point in the simulation.
 * The moments that matter most for learning.
 */
export interface PivotPoint {
  id: string;
  timestamp: number;

  type: PivotType;
  impact: PivotImpact;

  // What happened
  description: string;
  decision?: string;              // What learner chose to do

  // Alternatives
  alternatives: Alternative[];

  // Outcomes
  actualOutcome: string;
  counterfactualOutcome?: string;

  // Who was affected
  affectedCharacters: EventActor[];
  stateImpact: {
    markAnxietyDelta: number;
    lilyFearDelta: number;
  };

  // For causal analysis
  causalChainId?: string;

  // Teaching
  teachingPoint: string;
  expertWouldSay?: string;
}

export interface Alternative {
  action: string;
  rationale: string;
  expectedOutcome: string;
  isPALSPreferred: boolean;
}

// ============================================================================
// CAUSAL CHAINS
// ============================================================================

/**
 * A link in a causal chain
 */
export interface CausalLink {
  fromEventId: string;
  toEventId: string;
  mechanism: string;  // How A caused B

  // State changes this link caused
  stateChange?: Partial<StateSnapshot>;
}

/**
 * A chain of causally linked events.
 * Shows how one decision cascaded into consequences.
 */
export interface CausalChain {
  id: string;
  name: string;

  // The chain
  rootCauseEventId: string;
  links: CausalLink[];
  finalEffect: string;

  // Where it could have been broken
  breakpoints: Breakpoint[];

  // For display
  narrativeSummary: string;
}

export interface Breakpoint {
  afterEventId: string;
  intervention: string;         // What could have been done
  alternativeChain: string;     // What would have happened instead
}

// ============================================================================
// COUNTERFACTUALS
// ============================================================================

/**
 * A "what if" analysis for a pivot point
 */
export interface Counterfactual {
  pivotId: string;

  // What actually happened
  actual: {
    markAnxietyPeak: number;
    lilyFearPeak: number;
    trustDelta: number;
    outcome: string;
  };

  // What would have happened
  alternative: {
    markAnxietyPeak: number;
    lilyFearPeak: number;
    trustDelta: number;
    outcome: string;
  };

  // The intervention that would have changed things
  intervention: {
    timestamp: number;
    action: string;
    exactWords?: string;
  };

  // Impact summary
  differenceNarrative: string;
}

// ============================================================================
// PERSPECTIVES
// ============================================================================

/**
 * First-person narrative from a character's POV
 */
export interface CharacterPerspective {
  character: 'mark' | 'lily' | 'nurse';

  // The narrative
  narrative: string;  // 3-4 sentences, first person

  // Trajectory
  emotionalTrajectory: {
    start: number;
    peak: number;
    end: number;
  };

  // Key moment for this character
  keyMoment: {
    timestamp: number;
    description: string;
    impact: string;
  };

  // For nurse specifically
  assessment?: 'would_work_with_again' | 'needs_improvement' | 'concerning';
}

// ============================================================================
// EVALUATION RESULT
// ============================================================================

/**
 * Complete evaluation of a simulation session
 */
export interface EvaluationResult {
  sessionId: string;
  timestamp: number;

  // Timeline data
  timeline: TimelineEvent[];
  communicationWindows: CommunicationWindow[];

  // Analysis
  pivotPoints: PivotPoint[];
  causalChains: CausalChain[];
  counterfactuals: Counterfactual[];

  // The key insight
  pivotalMoment: {
    pivotId: string;
    whyThisMatters: string;
    theOneInsight: string;
  };

  // Perspectives
  perspectives: {
    mark: CharacterPerspective;
    lily: CharacterPerspective;
    nurse: CharacterPerspective;
  };

  // The one thing to improve
  theOneThing: {
    behavior: string;
    exactWords: string;
    exactMoment: string;
  };

  // For interactive debrief
  dialogueHooks: DialogueHook[];

  // Scoring (still useful for trajectory)
  scores: {
    clinical: number;        // 1-5
    communication: number;   // 1-5
    overall: number;         // 1-5
  };

  // Trajectory context
  trajectory: {
    sessionsCompleted: number;
    improvement: 'declining' | 'plateau' | 'improving' | 'rapid_improvement';
    rateLimiter: 'clinical' | 'communication' | 'neither';
  };
}

// ============================================================================
// DIALOGUE HOOKS
// ============================================================================

/**
 * A question for interactive debrief dialogue
 */
export interface DialogueHook {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;

  // Response after user answers
  followUpCorrect: string;
  followUpIncorrect: string;

  // If free text allowed
  allowFreeText: boolean;
  freeTextPrompt?: string;
  idealFreeTextResponse?: string;
}

// ============================================================================
// SESSION RECORD (for persistence)
// ============================================================================

/**
 * Minimal record for cross-session trajectory tracking
 */
export interface SessionRecord {
  id: string;
  timestamp: number;
  scenario: string;

  // Outcome
  outcome: 'converted' | 'failed' | 'incomplete';
  timeToConversion: number | null;

  // Key metrics
  pivotPointCount: number;
  criticalPivots: string[];  // IDs
  missedWindows: string[];   // Window names

  // Scores
  scores: {
    clinical: number;
    communication: number;
    overall: number;
  };

  // The one thing from this session
  theOneThing: string;
}
