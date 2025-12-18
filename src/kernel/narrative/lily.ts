// ============================================================================
// LILY PERSPECTIVE GENERATOR
// First-person narrative from the 5-year-old patient's point of view
// Written in age-appropriate language and perspective
// ============================================================================

import {
  CharacterNarrative,
  NarrativeContext,
  NarrativeMoment,
  EmotionalBeat,
} from './types';

// ============================================================================
// NARRATIVE FRAGMENTS - CHILD'S VOICE
// ============================================================================

const OPENING_LINES = {
  scared: "My heart was going really really fast, like a hummingbird.",
  very_scared: "I was so scared. My chest felt funny and everyone looked worried.",
  brave: "The doctor said I was very brave. I tried to be brave like Daddy said.",
};

const FEELINGS = {
  chest_racing: "My chest felt like there was a bunny inside trying to get out.",
  daddy_scared: "Daddy's face looked scared. That made me more scared.",
  daddy_calm: "Daddy held my hand and said it would be okay.",
  daddy_screamed: "Then Daddy yelled really loud. That was the scariest part.",
  needle_fear: "I don't like needles but the nurse was nice about it.",
  sleepy_medicine: "They gave me medicine that made me really sleepy.",
  waking_up: "When I woke up, Daddy was there and he was crying a little but smiling.",
};

const DOCTOR_INTERACTIONS = {
  kind_doctor: "The doctor talked to me, not just to Daddy. That was nice.",
  ignored: "The grown-ups kept talking but nobody told me what was happening.",
  explained: "The doctor said my heart was going too fast and they would help it slow down.",
  used_kid_words: "The doctor said my heart was like a race car going too fast, and they had special medicine to help it slow down.",
};

// ============================================================================
// MOMENT GENERATORS
// ============================================================================

function generateScaryMoment(ctx: NarrativeContext): NarrativeMoment | null {
  if (ctx.dadPanicked && ctx.lilyHeardScream) {
    return {
      timestamp: ctx.dadScreamTimestamp || ctx.asystoleTimestamp || 0,
      description: "Daddy screamed",
      emotionalState: { emotion: 'terror', intensity: 5 },
      thought: "Why is Daddy yelling? Am I going to be okay?",
      significance: 'trauma',
    };
  }
  return null;
}

function generateBraveMoment(ctx: NarrativeContext): NarrativeMoment {
  return {
    timestamp: ctx.conversionTimestamp || 0,
    description: "The doctors said I was brave",
    emotionalState: { emotion: 'proud', intensity: 3 },
    thought: "I was scared but I didn't cry too much.",
    significance: 'relief',
  };
}

function generateWakeUpMoment(ctx: NarrativeContext): NarrativeMoment | null {
  if (ctx.cardioversionUsed) {
    return {
      timestamp: (ctx.conversionTimestamp || 0) + 5000,
      description: "Waking up after the sleepy medicine",
      emotionalState: { emotion: 'confused_relief', intensity: 2 },
      thought: "I feel sleepy but Daddy is smiling so it must be okay now.",
      significance: 'relief',
    };
  }
  return null;
}

// ============================================================================
// EMOTIONAL ARC GENERATOR
// ============================================================================

function generateEmotionalArc(ctx: NarrativeContext): CharacterNarrative['emotionalArc'] {
  const startBeat: EmotionalBeat = {
    timestamp: 0,
    emotion: 'scared',
    intensity: 4,
    trigger: "Heart racing, strange hospital, worried adults",
    internalMonologue: "Why does my chest feel so funny?",
  };

  let peakBeat: EmotionalBeat;
  if (ctx.lilyHeardScream && ctx.dadPanicked) {
    peakBeat = {
      timestamp: ctx.dadScreamTimestamp || ctx.asystoleTimestamp || 0,
      emotion: 'terrified',
      intensity: 5,
      trigger: "Heard Daddy scream",
      internalMonologue: "Daddy is scared! Something really bad is happening!",
    };
  } else if (ctx.asystoleOccurred) {
    peakBeat = {
      timestamp: ctx.asystoleTimestamp || 0,
      emotion: 'worried',
      intensity: 4,
      trigger: "Adults rushing around, beeping sounds",
      internalMonologue: "Everyone is moving so fast. I want to go home.",
    };
  } else {
    peakBeat = {
      timestamp: 0,
      emotion: 'nervous',
      intensity: 3,
      trigger: "Being in the hospital",
      internalMonologue: "I don't like hospitals but Daddy is here.",
    };
  }

  const endBeat: EmotionalBeat = {
    timestamp: ctx.conversionTimestamp || 0,
    emotion: ctx.lilyPeakFear >= 5 ? 'tired_relief' : 'happy_relief',
    intensity: ctx.lilyPeakFear >= 5 ? 3 : 2,
    trigger: "Treatment complete, Daddy smiling",
    internalMonologue: ctx.lilyPeakFear >= 5
      ? "I'm so tired. I want to go home and see my toys."
      : "Daddy says I'm all better now!",
  };

  return { start: startBeat, peak: peakBeat, end: endBeat };
}

// ============================================================================
// MAIN NARRATIVE GENERATOR
// ============================================================================

export function generateLilyNarrative(ctx: NarrativeContext): CharacterNarrative {
  const keyMoments: NarrativeMoment[] = [];

  // Add scary moment if it occurred
  const scaryMoment = generateScaryMoment(ctx);
  if (scaryMoment) {
    keyMoments.push(scaryMoment);
  }

  // Add brave moment
  if (ctx.conversionSuccessful) {
    keyMoments.push(generateBraveMoment(ctx));
  }

  // Add wake up moment if cardioversion used
  const wakeUpMoment = generateWakeUpMoment(ctx);
  if (wakeUpMoment) {
    keyMoments.push(wakeUpMoment);
  }

  // Build the main narrative in a child's voice
  let narrative = '';

  // Opening - child's perspective on what's happening
  narrative += FEELINGS.chest_racing + ' ';
  narrative += `Daddy brought me to the hospital because my heart wouldn't slow down.\n\n`;

  // The hospital experience
  narrative += `There were so many machines with beeping sounds. `;

  // How adults communicated with her
  const doctorTalkedToLily = ctx.pivots.some(p =>
    p.id.includes('good_warning') || p.expertWouldSay?.toLowerCase().includes('lily')
  );

  if (doctorTalkedToLily) {
    narrative += DOCTOR_INTERACTIONS.kind_doctor + ' ';
    narrative += DOCTOR_INTERACTIONS.used_kid_words + '\n\n';
  } else {
    narrative += DOCTOR_INTERACTIONS.ignored + '\n\n';
  }

  // Daddy's reaction - this is crucial
  if (ctx.dadPanicked && ctx.lilyHeardScream) {
    narrative += FEELINGS.daddy_screamed + ' ';
    narrative += `I started crying because if Daddy is scared, something really bad must be happening.\n\n`;
  } else if (ctx.dadWarned) {
    narrative += FEELINGS.daddy_calm + ' ';
    narrative += `He squeezed my hand when the doctor gave me medicine.\n\n`;
  } else {
    narrative += FEELINGS.daddy_scared + '\n\n';
  }

  // The intervention
  if (ctx.cardioversionUsed) {
    narrative += FEELINGS.sleepy_medicine + ' ';
    narrative += FEELINGS.waking_up + '\n\n';
  } else if (ctx.asystoleOccurred) {
    narrative += `I felt a little weird for a second, like my heart did a hiccup. `;
    narrative += `Then everything was better.\n\n`;
  }

  // Closing - the resolution
  if (ctx.conversionSuccessful) {
    narrative += `The doctor said my heart is all better now. `;
    if (ctx.lilyPeakFear >= 5) {
      narrative += `I'm still a little scared of hospitals.`;
    } else {
      narrative += `Maybe hospitals aren't so bad. The nurse gave me a sticker!`;
    }
  }

  // Build wish statement (from a child's perspective)
  let wishStatement: string | undefined;
  if (ctx.lilyHeardScream && ctx.dadPanicked) {
    wishStatement = "I wish Daddy didn't yell. That was the scariest part.";
  } else if (ctx.lilyPeakFear >= 5) {
    wishStatement = "I wish someone told me what was going to happen.";
  }

  // Closing reflection
  let closingReflection: string;
  if (ctx.lilyPeakFear >= 5) {
    closingReflection = "I don't want to come back to the hospital. Can we go home now?";
  } else if (ctx.lilyPeakFear >= 4) {
    closingReflection = "I was really brave. Daddy said so.";
  } else {
    closingReflection = "The doctors made my heart all better! Can I have ice cream now?";
  }

  // Opening line based on fear level
  let openingLine: string;
  if (ctx.lilyPeakFear >= 5) {
    openingLine = OPENING_LINES.very_scared;
  } else if (ctx.lilyPeakFear >= 4) {
    openingLine = OPENING_LINES.scared;
  } else {
    openingLine = OPENING_LINES.brave;
  }

  return {
    character: 'lily',
    displayName: 'Lily Henderson (Patient, Age 5)',
    openingLine,
    narrative,
    closingReflection,
    emotionalArc: generateEmotionalArc(ctx),
    keyMoments,
    wishStatement,
  };
}
