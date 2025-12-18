// ============================================================================
// NARRATIVE TYPES
// Types for multi-perspective story generation
// ============================================================================

import { PivotPoint, TimelineEvent, CommunicationWindow } from '../evaluation/types';

// ============================================================================
// CORE NARRATIVE TYPES
// ============================================================================

export type CharacterName = 'mark' | 'lily' | 'nurse';

export interface EmotionalBeat {
  timestamp: number;
  emotion: string;
  intensity: number;  // 1-5
  trigger: string;
  internalMonologue: string;
}

export interface NarrativeMoment {
  timestamp: number;
  description: string;
  emotionalState: {
    emotion: string;
    intensity: number;
  };
  thought: string;
  significance: 'turning_point' | 'escalation' | 'relief' | 'trauma' | 'normal';
}

export interface CharacterNarrative {
  character: CharacterName;
  displayName: string;

  // The first-person story
  openingLine: string;
  narrative: string;
  closingReflection: string;

  // Emotional journey
  emotionalArc: {
    start: EmotionalBeat;
    peak: EmotionalBeat;
    end: EmotionalBeat;
  };

  // Key moments from their perspective
  keyMoments: NarrativeMoment[];

  // What they wish had happened
  wishStatement?: string;

  // For nurse: professional assessment
  professionalAssessment?: {
    rating: 'excellent' | 'good' | 'needs_improvement' | 'concerning';
    summary: string;
    wouldMentorSay: string;
  };
}

// ============================================================================
// NARRATIVE CONTEXT
// ============================================================================

export interface NarrativeContext {
  // From evaluation
  pivots: PivotPoint[];
  timeline: TimelineEvent[];
  communicationWindows: CommunicationWindow[];

  // Derived state
  dadWarned: boolean;
  asystoleOccurred: boolean;
  dadPanicked: boolean;
  lilyHeardScream: boolean;
  conversionSuccessful: boolean;
  cardioversionUsed: boolean;

  // Emotional peaks
  markPeakAnxiety: number;
  lilyPeakFear: number;

  // Key timestamps
  asystoleTimestamp?: number;
  conversionTimestamp?: number;
  dadScreamTimestamp?: number;
}

// ============================================================================
// NARRATIVE TEMPLATES
// ============================================================================

export interface NarrativeTemplate {
  id: string;
  character: CharacterName;
  condition: (ctx: NarrativeContext) => boolean;
  priority: number;  // Higher = more specific, use first

  generate: (ctx: NarrativeContext) => Partial<CharacterNarrative>;
}

// ============================================================================
// NARRATIVE FRAGMENTS
// ============================================================================

// Building blocks for narratives
export interface NarrativeFragment {
  id: string;
  character: CharacterName;
  condition: (ctx: NarrativeContext) => boolean;
  text: string;
  emotionalWeight: number;
}
