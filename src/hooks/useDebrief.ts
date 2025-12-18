// ============================================================================
// DEBRIEF HOOK
// Orchestrates evaluation, narrative generation, and debrief state
// ============================================================================

import { useState, useCallback } from 'react';
import {
  runEvaluation,
  generateDialogueHooks,
  ReconstructionInput,
} from '../kernel/evaluation';
import {
  generateAllNarratives,
  NarrativeSet,
} from '../kernel/narrative';
import {
  EvaluationResult,
  DialogueHook,
} from '../kernel/evaluation/types';

// ============================================================================
// TYPES
// ============================================================================

export interface DebriefState {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  evaluation: Omit<EvaluationResult, 'perspectives' | 'dialogueHooks'> | null;
  narratives: NarrativeSet | null;
  dialogueHooks: DialogueHook[];
}

export interface UseDebriefReturn extends DebriefState {
  generateDebrief: (input: ReconstructionInput) => void;
  clearDebrief: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useDebrief(): UseDebriefReturn {
  const [state, setState] = useState<DebriefState>({
    isReady: false,
    isLoading: false,
    error: null,
    evaluation: null,
    narratives: null,
    dialogueHooks: [],
  });

  /**
   * Generate the full debrief from simulation data
   */
  const generateDebrief = useCallback((input: ReconstructionInput) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Step 1: Run evaluation
      const evaluation = runEvaluation(input);

      // Step 2: Generate narratives
      const narratives = generateAllNarratives(
        evaluation.pivotPoints,
        evaluation.timeline,
        evaluation.communicationWindows
      );

      // Step 3: Generate dialogue hooks
      const dialogueHooks = generateDialogueHooks(
        evaluation.pivotPoints,
        evaluation.counterfactuals
      );

      setState({
        isReady: true,
        isLoading: false,
        error: null,
        evaluation,
        narratives,
        dialogueHooks,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to generate debrief',
      }));
    }
  }, []);

  /**
   * Clear the debrief state
   */
  const clearDebrief = useCallback(() => {
    setState({
      isReady: false,
      isLoading: false,
      error: null,
      evaluation: null,
      narratives: null,
      dialogueHooks: [],
    });
  }, []);

  return {
    ...state,
    generateDebrief,
    clearDebrief,
  };
}

// ============================================================================
// QUICK SUMMARY HELPER
// ============================================================================

/**
 * Get a quick summary for display before full debrief
 */
export function getQuickSummary(evaluation: Omit<EvaluationResult, 'perspectives' | 'dialogueHooks'>) {
  const criticalIssues = evaluation.pivotPoints.filter(
    p => p.impact === 'critical' && p.type !== 'success'
  );
  const successes = evaluation.pivotPoints.filter(p => p.type === 'success');

  return {
    overallScore: evaluation.scores.overall,
    clinicalScore: evaluation.scores.clinical,
    communicationScore: evaluation.scores.communication,
    criticalIssueCount: criticalIssues.length,
    successCount: successes.length,
    theOneThing: evaluation.theOneThing.behavior,
    hasTrauma: evaluation.pivotPoints.some(
      p => p.id.includes('no_warning') && p.impact === 'critical'
    ),
  };
}
