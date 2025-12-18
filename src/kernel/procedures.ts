// ============================================================================
// PROCEDURES - Realistic procedure timing and outcomes
// ============================================================================
// Models IV/IO access attempts, medication preparation, and procedure timing

// ============================================================================
// IV ACCESS
// ============================================================================

export type IVAccessState =
  | 'NOT_ATTEMPTED'     // No IV attempt yet
  | 'ATTEMPTING'        // Nurse working on IV
  | 'FAILED_FIRST'      // First attempt failed (blown vein)
  | 'ATTEMPTING_SECOND' // Trying second site
  | 'DIFFICULT'         // Veins are difficult, considering IO
  | 'SUCCESS'           // IV established
  | 'FAILED_ALL';       // All attempts failed, need IO

export type IOAccessState =
  | 'NOT_ATTEMPTED'     // No IO attempt
  | 'PREPARING'         // Getting IO kit ready
  | 'DRILLING'          // Drill in progress
  | 'CONFIRMING'        // Checking placement
  | 'SUCCESS';          // IO established

export interface IVAttempt {
  site: 'right_ac' | 'left_ac' | 'right_hand' | 'left_hand';
  success: boolean;
  reason?: 'blown_vein' | 'no_flash' | 'infiltrated' | 'too_small';
  duration: number;  // ms
}

export interface AccessState {
  ivState: IVAccessState;
  ioState: IOAccessState;
  ivAttempts: IVAttempt[];
  currentSite: string | null;
  attemptStartTime: number | null;
  hasPeripheralAccess: boolean;
  hasCentralAccess: boolean;
}

// Timing constants (in milliseconds)
// Using accelerated timing for testing - still maintains realism feel
export const IV_TIMING = {
  FIRST_ATTEMPT: { min: 8000, max: 12000 },     // 8-12s for first try
  SECOND_ATTEMPT: { min: 6000, max: 10000 },    // 6-10s for second try
  FAILED_ANNOUNCEMENT: 2000,                     // 2s to announce failure
};

export const IO_TIMING = {
  PREPARATION: 5000,    // 5s to get kit
  DRILLING: 8000,       // 8s to drill
  CONFIRMATION: 5000,   // 5s to confirm placement
};

// Success rates for pediatric IV (5-year-old, stressed)
export const IV_SUCCESS_RATES = {
  FIRST_ATTEMPT: 0.65,      // 65% success on first try
  SECOND_ATTEMPT: 0.75,     // 75% success on second try (different site)
  DIFFICULT_PATIENT: 0.15,  // 15% chance of "difficult" (tiny veins)
};

/**
 * Roll for IV attempt outcome
 */
export function rollIVOutcome(attemptNumber: number): {
  success: boolean;
  difficult: boolean;
  reason?: 'blown_vein' | 'no_flash' | 'too_small';
} {
  const roll = Math.random();
  const successRate = attemptNumber === 1
    ? IV_SUCCESS_RATES.FIRST_ATTEMPT
    : IV_SUCCESS_RATES.SECOND_ATTEMPT;

  if (roll < successRate) {
    return { success: true, difficult: false };
  }

  // Check if difficult access
  if (roll < successRate + IV_SUCCESS_RATES.DIFFICULT_PATIENT) {
    return { success: false, difficult: true, reason: 'too_small' };
  }

  // Failed - random reason
  const reasons: ('blown_vein' | 'no_flash')[] = ['blown_vein', 'no_flash'];
  return {
    success: false,
    difficult: false,
    reason: reasons[Math.floor(Math.random() * reasons.length)]
  };
}

/**
 * Get IV attempt duration (randomized within range)
 */
export function getIVAttemptDuration(attemptNumber: number): number {
  const timing = attemptNumber === 1 ? IV_TIMING.FIRST_ATTEMPT : IV_TIMING.SECOND_ATTEMPT;
  return timing.min + Math.random() * (timing.max - timing.min);
}

/**
 * Get nurse dialogue for IV attempt stages
 */
export function getIVNurseDialogue(
  stage: 'starting' | 'working' | 'success' | 'failed' | 'difficult',
  attemptNumber: number,
  site: string,
  reason?: string
): string {
  switch (stage) {
    case 'starting':
      if (attemptNumber === 1) {
        return `Okay, going for the ${site}. Lily, you're going to feel a little pinch...`;
      }
      return `Let me try the ${site}. Hold still sweetie, almost done...`;

    case 'working':
      const workingPhrases = [
        "Looking for a good vein...",
        "Got a nice one here, advancing...",
        "Just threading the catheter...",
        "Almost there...",
      ];
      return workingPhrases[Math.floor(Math.random() * workingPhrases.length)];

    case 'success':
      return `Got it! 22 gauge in the ${site}. IV patent and flushing well.`;

    case 'failed':
      if (reason === 'blown_vein') {
        return `Darn, I blew that one. The vein rolled. Let me try the other arm.`;
      } else if (reason === 'no_flash') {
        return `No flash. Vein must have collapsed. Moving to another site.`;
      }
      return `Lost it. Let me try another site.`;

    case 'difficult':
      return `Doctor, her veins are really tiny and she's clamped down. I can keep trying, or we could go IO. Your call.`;
  }
}

/**
 * Get Lily's reaction to IV attempts
 */
export function getLilyIVReaction(
  stage: 'poke' | 'working' | 'success' | 'failed' | 'second_poke',
  fearLevel: number
): string {
  const reactions = {
    poke: [
      "OW! That hurts! *crying*",
      "No no no! I don't want a poke!",
      "*crying* Daddy make them stop!",
    ],
    working: [
      "*whimpering* Is it almost done?",
      "It hurts... it hurts...",
      "*crying quietly*",
    ],
    success: [
      "*sniffling* Is it over?",
      "That was so mean... *crying*",
      "*hiccuping* I was so brave...",
    ],
    failed: [
      "OW! You hurt me again!",
      "*screaming* NO MORE!",
      "I HATE THIS! *sobbing*",
    ],
    second_poke: [
      "NOT AGAIN! *screaming*",
      "DADDY HELP! They keep poking me!",
      "*hysterical crying* I CAN'T DO THIS!",
    ],
  };

  const options = reactions[stage];
  // Higher fear = more dramatic reactions (pick from end of array)
  const index = Math.min(
    Math.floor((fearLevel / 5) * options.length),
    options.length - 1
  );
  return options[index];
}

/**
 * Get Mark's reaction to IV attempts
 */
export function getMarkIVReaction(
  stage: 'watching' | 'failed' | 'difficult' | 'success',
  anxietyLevel: number
): string {
  const reactions = {
    watching: [
      "It's okay baby, just a little poke...",
      "Hold daddy's hand, squeeze as hard as you want.",
      "You're being so brave, princess.",
    ],
    failed: [
      "What happened? Why did you have to poke her again?!",
      "Can't someone else try? Someone more experienced?",
      "This is torture! How many times are you going to stab my daughter?!",
    ],
    difficult: [
      "What do you mean IO? What's that? Is it worse?",
      "Why can't you just get the IV? She's just a little kid!",
      "I can't watch this anymore... *turns away*",
    ],
    success: [
      "Oh thank god, it's in.",
      "Is it over? Is she okay?",
      "That was awful... *shaking*",
    ],
  };

  const options = reactions[stage];
  const index = Math.min(
    Math.floor((anxietyLevel / 5) * options.length),
    options.length - 1
  );
  return options[index];
}

// ============================================================================
// IO ACCESS
// ============================================================================

/**
 * Get nurse dialogue for IO insertion
 */
export function getIONurseDialogue(
  stage: 'preparing' | 'warning' | 'drilling' | 'confirming' | 'success'
): string {
  switch (stage) {
    case 'preparing':
      return "Getting the IO kit. This will be faster but it's going to hurt.";
    case 'warning':
      return "Lily, I'm sorry sweetie, this is going to hurt for just a second. Dad, you might want to step out.";
    case 'drilling':
      return "IO going in now... *drill sound* Got it!";
    case 'confirming':
      return "Checking placement... good flow, flushing well.";
    case 'success':
      return "IO confirmed in the proximal tibia. We have access.";
  }
}

/**
 * Get Lily's reaction to IO
 */
export function getLilyIOReaction(stage: 'warning' | 'drilling' | 'after'): string {
  switch (stage) {
    case 'warning':
      return "*crying* No more... please no more...";
    case 'drilling':
      return "*SCREAMING* AAAHHHH! STOP IT! STOOOOOP!";
    case 'after':
      return "*sobbing uncontrollably* ...daddy... *hiccup* ...it hurts so bad...";
  }
}

/**
 * Get Mark's reaction to IO
 */
export function getMarkIOReaction(
  stage: 'warning' | 'during' | 'after',
  staysInRoom: boolean
): string {
  if (!staysInRoom) {
    return "*steps out of room, visibly shaking*";
  }

  switch (stage) {
    case 'warning':
      return "What?! A drill?! In my daughter's leg?!";
    case 'during':
      return "*covering ears, face pale* Oh god... oh god...";
    case 'after':
      return "*crying* I'm so sorry baby... daddy's here... I'm so sorry...";
  }
}

// ============================================================================
// STATE HELPERS
// ============================================================================

/**
 * Create initial access state
 */
export function createInitialAccessState(): AccessState {
  return {
    ivState: 'NOT_ATTEMPTED',
    ioState: 'NOT_ATTEMPTED',
    ivAttempts: [],
    currentSite: null,
    attemptStartTime: null,
    hasPeripheralAccess: false,
    hasCentralAccess: false,
  };
}

/**
 * Get available IV sites based on previous attempts
 */
export function getAvailableSites(attempts: IVAttempt[]): string[] {
  const allSites = ['right_ac', 'left_ac', 'right_hand', 'left_hand'];
  const usedSites = attempts.map(a => a.site);
  return allSites.filter(s => !usedSites.includes(s as IVAttempt['site']));
}

/**
 * Format site name for display
 */
export function formatSiteName(site: string): string {
  const names: Record<string, string> = {
    'right_ac': 'right AC',
    'left_ac': 'left AC',
    'right_hand': 'right hand',
    'left_hand': 'left hand',
  };
  return names[site] || site;
}
