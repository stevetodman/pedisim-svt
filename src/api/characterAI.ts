// ============================================================================
// CHARACTER AI API
// Unified interface for character responses - AI when available, scripted fallback
// ============================================================================

import { getAIConfig, isAIModeEnabled } from './aiConfig';
import {
  DialogueRequest,
  DialogueResponse,
  generateScriptedResponse,
  buildCharacterPrompt,
} from '../characters';

/**
 * Get a character response - uses AI if enabled, otherwise scripted fallback
 */
export async function getCharacterResponse(
  request: DialogueRequest
): Promise<DialogueResponse> {
  // Use scripted responses if AI is not enabled
  if (!isAIModeEnabled()) {
    return generateScriptedResponse(request);
  }

  // Try AI, fall back to scripted on error
  try {
    return await fetchAIResponse(request);
  } catch (error) {
    console.warn('AI response failed, using scripted fallback:', error);
    return generateScriptedResponse(request);
  }
}

/**
 * Fetch response from Claude API via Vite proxy
 */
async function fetchAIResponse(request: DialogueRequest): Promise<DialogueResponse> {
  const config = getAIConfig();

  const prompt = buildCharacterPrompt(
    request.character,
    request.characterState,
    request.patientState,
    request.recentEvents,
    request.learnerMessage
  );

  const response = await fetch(config.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  // Determine emotion from response context
  const emotion = inferEmotionFromContext(request);

  return {
    character: request.character,
    text,
    emotion,
    timestamp: Date.now(),
  };
}

/**
 * Infer emotion based on character state and patient condition
 */
function inferEmotionFromContext(request: DialogueRequest): string {
  const { character, characterState, patientState } = request;

  switch (character) {
    case 'lily':
      if (patientState.rhythm === 'ASYSTOLE') return 'scared';
      if (patientState.rhythm === 'SINUS') return 'relieved';
      if (characterState.lily.fearLevel >= 7) return 'crying';
      return 'scared';

    case 'mark':
      if (patientState.rhythm === 'ASYSTOLE' || characterState.mark.anxietyLevel >= 5) {
        return 'panicked';
      }
      if (patientState.rhythm === 'SINUS') return 'relieved';
      if (characterState.mark.anxietyLevel >= 3) return 'scared';
      return 'worried';

    case 'nurse':
      return 'professional';

    default:
      return 'normal';
  }
}

// Re-export types for convenience
export type { DialogueRequest, DialogueResponse };
