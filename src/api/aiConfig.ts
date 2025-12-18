// ============================================================================
// AI CONFIGURATION
// Environment-based settings for AI character responses
// ============================================================================

/// <reference types="vite/client" />

/**
 * AI configuration for character responses
 */
export interface AIConfig {
  enabled: boolean;
  apiEndpoint: string;
  model: string;
}

/**
 * Get the current AI configuration based on environment variables
 */
export function getAIConfig(): AIConfig {
  // Access Vite environment variables
  const apiKey = (import.meta as { env: Record<string, string | undefined> }).env.VITE_ANTHROPIC_API_KEY;

  return {
    enabled: Boolean(apiKey),
    apiEndpoint: '/api/anthropic/v1/messages',
    model: 'claude-sonnet-4-20250514',
  };
}

/**
 * Check if AI mode is enabled (API key is configured)
 */
export function isAIModeEnabled(): boolean {
  const apiKey = (import.meta as { env: Record<string, string | undefined> }).env.VITE_ANTHROPIC_API_KEY;
  return Boolean(apiKey);
}
