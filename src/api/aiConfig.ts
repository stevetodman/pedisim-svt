// ============================================================================
// AI CONFIGURATION
// Environment-based settings for AI character responses
// ============================================================================

/**
 * AI configuration for character responses
 */
export interface AIConfig {
  enabled: boolean;
  apiEndpoint: string;
  model: string;
}

// Cache the AI mode check result
let aiModeChecked = false;
let aiModeEnabled = false;
let checkPromise: Promise<boolean> | null = null;

/**
 * Get the current AI configuration based on environment variables
 */
export function getAIConfig(): AIConfig {
  return {
    enabled: aiModeEnabled,
    apiEndpoint: '/api/anthropic/v1/messages',
    model: 'claude-sonnet-4-20250514',
  };
}

/**
 * Check if AI mode is enabled by testing the proxy endpoint
 * This is called once on startup to detect if the proxy is configured
 */
export async function checkAIMode(): Promise<boolean> {
  if (aiModeChecked) return aiModeEnabled;
  if (checkPromise) return checkPromise;

  checkPromise = (async () => {
    try {
      const response = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'hi' }]
        })
      });
      aiModeEnabled = response.ok;
    } catch {
      aiModeEnabled = false;
    }
    aiModeChecked = true;
    return aiModeEnabled;
  })();

  return checkPromise;
}

/**
 * Check if AI mode is enabled (synchronous - uses cached result)
 */
export function isAIModeEnabled(): boolean {
  return aiModeEnabled;
}

// Auto-check on module load
checkAIMode();
