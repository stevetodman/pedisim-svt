// ============================================================================
// MARK (DAD) PERSPECTIVE GENERATOR
// First-person narrative from the anxious father's point of view
// ============================================================================

import {
  CharacterNarrative,
  NarrativeContext,
  NarrativeMoment,
  EmotionalBeat,
} from './types';

// ============================================================================
// NARRATIVE FRAGMENTS
// ============================================================================

const OPENING_LINES = {
  calm_start: "When I brought Lily to the ER, I was scared but holding it together.",
  panicked_start: "I've never been so terrified in my life as I was tonight.",
  relieved_end: "By the end, I was just grateful she was okay.",
  traumatized_end: "I don't think I'll ever forget what I saw.",
};

const ASYSTOLE_REACTIONS = {
  warned: `When the flatline appeared, my heart stopped - but then I remembered what the doctor said.
"This is expected," I kept telling myself. "This is the medicine working."
It was still terrifying, but I knew it was supposed to happen.`,

  not_warned: `Then the line went flat.

I screamed. I couldn't help it. "HER HEART STOPPED!"

Nobody had told me this would happen. I thought I was watching my daughter die.`,

  not_warned_with_narration: `When I saw the flatline, I panicked. But the doctor immediately said "This is expected" -
and those words saved me. I was still scared, but at least I knew they weren't surprised.`,
};

// ============================================================================
// MOMENT GENERATORS
// ============================================================================

function generateAsystoleMoment(ctx: NarrativeContext): NarrativeMoment {
  if (ctx.dadWarned) {
    return {
      timestamp: ctx.asystoleTimestamp || 0,
      description: "The monitor flatlined - but I was ready for it",
      emotionalState: { emotion: 'controlled_fear', intensity: 4 },
      thought: "This is the medicine working. This is expected. Stay calm for Lily.",
      significance: 'turning_point',
    };
  } else {
    return {
      timestamp: ctx.asystoleTimestamp || 0,
      description: "The monitor flatlined with no warning",
      emotionalState: { emotion: 'terror', intensity: 5 },
      thought: "She's dying. My baby is dying right in front of me.",
      significance: 'trauma',
    };
  }
}

function generateConversionMoment(ctx: NarrativeContext): NarrativeMoment {
  return {
    timestamp: ctx.conversionTimestamp || 0,
    description: "Her heartbeat came back",
    emotionalState: { emotion: 'overwhelming_relief', intensity: 5 },
    thought: ctx.dadWarned
      ? "It worked. Just like they said it would."
      : "She's alive. Oh God, she's alive.",
    significance: 'relief',
  };
}

// ============================================================================
// EMOTIONAL ARC GENERATOR
// ============================================================================

function generateEmotionalArc(ctx: NarrativeContext): CharacterNarrative['emotionalArc'] {
  const startBeat: EmotionalBeat = {
    timestamp: 0,
    emotion: 'worried',
    intensity: 3,
    trigger: "Brought Lily to ER with racing heart",
    internalMonologue: "Please let it be nothing serious.",
  };

  let peakBeat: EmotionalBeat;
  if (ctx.dadWarned) {
    peakBeat = {
      timestamp: ctx.asystoleTimestamp || 0,
      emotion: 'controlled_fear',
      intensity: 4,
      trigger: "Saw expected asystole on monitor",
      internalMonologue: "Stay calm. This is what they said would happen.",
    };
  } else {
    peakBeat = {
      timestamp: ctx.asystoleTimestamp || 0,
      emotion: 'terror',
      intensity: 5,
      trigger: "Saw flatline with no warning",
      internalMonologue: "NO! Her heart stopped! She's dying!",
    };
  }

  const endBeat: EmotionalBeat = {
    timestamp: ctx.conversionTimestamp || 0,
    emotion: ctx.dadWarned ? 'relieved' : 'shaken_relief',
    intensity: ctx.dadWarned ? 2 : 3,
    trigger: "Lily's heart rhythm normalized",
    internalMonologue: ctx.dadWarned
      ? "Thank God. They knew what they were doing."
      : "She's okay... but I'll never forget that flatline.",
  };

  return { start: startBeat, peak: peakBeat, end: endBeat };
}

// ============================================================================
// MAIN NARRATIVE GENERATOR
// ============================================================================

export function generateMarkNarrative(ctx: NarrativeContext): CharacterNarrative {
  const keyMoments: NarrativeMoment[] = [];

  // Add asystole moment if it occurred
  if (ctx.asystoleOccurred) {
    keyMoments.push(generateAsystoleMoment(ctx));
  }

  // Add conversion moment if successful
  if (ctx.conversionSuccessful) {
    keyMoments.push(generateConversionMoment(ctx));
  }

  // Build the main narrative
  let narrative = '';

  // Opening
  if (ctx.markPeakAnxiety >= 5) {
    narrative += OPENING_LINES.panicked_start + '\n\n';
  } else {
    narrative += OPENING_LINES.calm_start + '\n\n';
  }

  // The journey
  narrative += `Lily's heart was racing - 220 beats per minute, they said. Too fast. Way too fast. `;
  narrative += `I held her hand and tried to look calm for her, but inside I was falling apart.\n\n`;

  // The intervention
  if (ctx.asystoleOccurred) {
    narrative += `The doctor said they were going to give her medicine to reset her heart. `;

    if (ctx.dadWarned) {
      narrative += `"Watch the monitor with me," the doctor said. "Her heart will pause briefly - that's the medicine working."\n\n`;
      narrative += ASYSTOLE_REACTIONS.warned + '\n\n';
    } else {
      narrative += `Then they pushed the medication.\n\n`;
      narrative += ASYSTOLE_REACTIONS.not_warned + '\n\n';
    }
  }

  // The resolution
  if (ctx.conversionSuccessful) {
    narrative += `And then - the beeping came back. Normal. Steady. 95 beats per minute.\n\n`;

    if (ctx.dadWarned) {
      narrative += `"It worked," the doctor said. And I believed them, because they'd told me the truth the whole time.`;
    } else {
      narrative += `Lily was okay. But I'm not sure I am.`;
    }
  }

  // Build wish statement
  let wishStatement: string | undefined;
  if (!ctx.dadWarned && ctx.asystoleOccurred) {
    wishStatement = "I wish someone had told me her heart would stop. Just ten seconds of warning would have changed everything.";
  }

  // Closing reflection
  let closingReflection: string;
  if (ctx.dadWarned) {
    closingReflection = "The doctor kept me informed the whole time. Even when it was scary, I felt like we were on the same team.";
  } else if (ctx.markPeakAnxiety >= 5) {
    closingReflection = "I know they saved her life. But I'll be seeing that flatline in my nightmares for a long time.";
  } else {
    closingReflection = "It's over now, and Lily's fine. That's what matters.";
  }

  return {
    character: 'mark',
    displayName: 'Mark Henderson (Father)',
    openingLine: ctx.markPeakAnxiety >= 5
      ? OPENING_LINES.panicked_start
      : OPENING_LINES.calm_start,
    narrative,
    closingReflection,
    emotionalArc: generateEmotionalArc(ctx),
    keyMoments,
    wishStatement,
  };
}
