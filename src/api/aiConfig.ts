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
  // Return cached result if already checked
  if (aiModeChecked) {
    console.log('[AIConfig] Using cached result:', aiModeEnabled);
    return aiModeEnabled;
  }

  // Return existing promise if check is in progress (prevents race condition)
  if (checkPromise) {
    console.log('[AIConfig] Check already in progress, waiting...');
    return checkPromise;
  }

  console.log('[AIConfig] Checking AI mode...');

  // Create and store the promise
  checkPromise = (async () => {
    try {
      console.log('[AIConfig] Making test request to /api/anthropic/v1/messages...');
      // Quick test to see if proxy is configured
      const response = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'hi' }]
        })
      });
      console.log('[AIConfig] Proxy response status:', response.status, response.statusText);
      if (!response.ok) {
        const text = await response.text();
        console.error('[AIConfig] Response body:', text.substring(0, 500));
      }
      aiModeEnabled = response.ok;
    } catch (error) {
      console.error('[AIConfig] Proxy check failed with error:', error);
      console.error('[AIConfig] Error name:', (error as Error).name);
      console.error('[AIConfig] Error message:', (error as Error).message);
      aiModeEnabled = false;
    }

    aiModeChecked = true;
    console.log(`[AIConfig] AI Mode: ${aiModeEnabled ? 'ENABLED (proxy detected)' : 'DISABLED (using scripted responses)'}`);
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
