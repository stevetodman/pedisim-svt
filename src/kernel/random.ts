// ============================================================================
// SHARED RANDOM UTILITY
// Seedable random for reproducible outcomes in tests
// ============================================================================

let randomFn: () => number = Math.random;

/**
 * Create a seeded random function using LCG algorithm
 */
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/**
 * Set a seed for reproducible random outcomes (for testing)
 */
export function setRandomSeed(seed: number): void {
  randomFn = seededRandom(seed);
}

/**
 * Reset to use Math.random (production behavior)
 */
export function resetRandom(): void {
  randomFn = Math.random;
}

/**
 * Get a random number between 0 and 1
 * Uses seeded random if set, otherwise Math.random
 */
export function random(): number {
  return randomFn();
}

/**
 * Get a random integer between min (inclusive) and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(randomFn() * (max - min + 1)) + min;
}
