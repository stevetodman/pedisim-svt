// ============================================================================
// NURSE PERSPECTIVE GENERATOR
// First-person narrative from the experienced ER nurse's point of view
// Provides professional assessment alongside emotional observations
// ============================================================================

import {
  CharacterNarrative,
  NarrativeContext,
  NarrativeMoment,
  EmotionalBeat,
} from './types';

// ============================================================================
// NURSE CHARACTER VOICE
// ============================================================================

const OPENING_LINES = {
  routine_svt: "Peds SVT. I've seen dozens of these. Usually straightforward.",
  complicated: "I could tell from the start this one was going to be tricky.",
  good_team: "The doctor had good instincts. I could work with this.",
  concerning: "I've worked with a lot of residents. This one needed some guidance.",
};

const OBSERVATIONS = {
  // Dad observations
  dad_spiraling: "Dad was already spiraling when they came in. Classic anxious parent - needed extra management.",
  dad_managed: "The doctor kept Dad in the loop. Smart. Anxious parents who feel informed cause fewer problems.",
  dad_blindsided: "When the asystole hit, Dad lost it. I saw it coming - nobody had prepared him.",
  dad_scream: "His scream echoed through the department. Heads turned. Not ideal.",

  // Clinical observations
  good_dosing: "Dosing was spot-on. That's not always a given with residents.",
  dose_catch: "I caught the dose error before it went in. That's why we double-check everything.",
  skipped_vagal: "Went straight to adenosine. Not wrong, but vagal's worth a try. No risk, 25% success.",
  good_vagal: "Started with vagal. Good instinct - it doesn't always work but it's worth the attempt.",

  // Communication observations
  good_communication: "Clear communication throughout. I didn't have to fill in the gaps.",
  poor_communication: "I ended up doing most of the family communication. Doctor was focused on the clinical.",
  no_warning: "No warning before the adenosine took effect. I winced internally.",
  good_warning: "Warned dad before the flatline. That's experience talking - or good training.",
};

const PROFESSIONAL_ASSESSMENTS = {
  excellent: {
    summary: "Textbook management with excellent family communication.",
    rating: 'excellent' as const,
    wouldMentorSay: "This is exactly how it should be done. Clinical precision with human awareness.",
  },
  good: {
    summary: "Solid clinical skills. Communication could use some polish.",
    rating: 'good' as const,
    wouldMentorSay: "Good fundamentals. Work on anticipatory guidance for families.",
  },
  needs_improvement: {
    summary: "Clinical management was adequate. Family communication needs significant work.",
    rating: 'needs_improvement' as const,
    wouldMentorSay: "You got the medicine right. Now learn to get the people right.",
  },
  concerning: {
    summary: "Both clinical and communication skills need development.",
    rating: 'concerning' as const,
    wouldMentorSay: "We need to debrief. There are some fundamentals to review.",
  },
};

// ============================================================================
// MOMENT GENERATORS
// ============================================================================

function generateAsystoleMoment(ctx: NarrativeContext): NarrativeMoment {
  if (ctx.dadWarned) {
    return {
      timestamp: ctx.asystoleTimestamp || 0,
      description: "Asystole - family prepared",
      emotionalState: { emotion: 'calm_professional', intensity: 2 },
      thought: "Dad's holding it together. Good prep work by the doctor.",
      significance: 'normal',
    };
  } else {
    return {
      timestamp: ctx.asystoleTimestamp || 0,
      description: "Asystole - family not prepared",
      emotionalState: { emotion: 'internal_wince', intensity: 3 },
      thought: "Here it comes. Dad's going to lose it. Could've been prevented.",
      significance: 'turning_point',
    };
  }
}

function generateDoseCatchMoment(ctx: NarrativeContext): NarrativeMoment | null {
  const doseError = ctx.pivots.find(p => p.id.includes('dose_error_caught'));
  if (!doseError) return null;

  return {
    timestamp: doseError.timestamp,
    description: "Caught dose error before administration",
    emotionalState: { emotion: 'professional_concern', intensity: 3 },
    thought: "That's why we verify. This is exactly what the double-check is for.",
    significance: 'turning_point',
  };
}

function generateDadScreamMoment(ctx: NarrativeContext): NarrativeMoment | null {
  if (!ctx.dadPanicked) return null;

  return {
    timestamp: ctx.dadScreamTimestamp || ctx.asystoleTimestamp || 0,
    description: "Dad screamed during asystole",
    emotionalState: { emotion: 'managed_frustration', intensity: 3 },
    thought: "And there it is. Preventable. Ten seconds of warning would've changed this.",
    significance: 'escalation',
  };
}

// ============================================================================
// EMOTIONAL ARC GENERATOR
// ============================================================================

function generateEmotionalArc(ctx: NarrativeContext): CharacterNarrative['emotionalArc'] {
  const startBeat: EmotionalBeat = {
    timestamp: 0,
    emotion: 'professional_focus',
    intensity: 2,
    trigger: "Peds SVT case arriving",
    internalMonologue: "Standard SVT. Let's see how the doctor handles it.",
  };

  let peakBeat: EmotionalBeat;
  if (ctx.dadPanicked && !ctx.dadWarned) {
    peakBeat = {
      timestamp: ctx.dadScreamTimestamp || ctx.asystoleTimestamp || 0,
      emotion: 'controlled_frustration',
      intensity: 3,
      trigger: "Preventable family panic",
      internalMonologue: "This didn't have to happen. A simple warning would've changed everything.",
    };
  } else if (ctx.pivots.some(p => p.id.includes('dose_error'))) {
    peakBeat = {
      timestamp: ctx.pivots.find(p => p.id.includes('dose_error'))?.timestamp || 0,
      emotion: 'heightened_vigilance',
      intensity: 3,
      trigger: "Dose verification prevented error",
      internalMonologue: "Good thing I checked. That's why we have protocols.",
    };
  } else {
    peakBeat = {
      timestamp: ctx.asystoleTimestamp || 0,
      emotion: 'focused_attention',
      intensity: 2,
      trigger: "Critical intervention moment",
      internalMonologue: "Watching the monitor. Ready to assist if needed.",
    };
  }

  const endBeat: EmotionalBeat = {
    timestamp: ctx.conversionTimestamp || 0,
    emotion: ctx.dadPanicked ? 'relieved_but_reflective' : 'satisfied',
    intensity: 2,
    trigger: "Successful conversion",
    internalMonologue: ctx.dadPanicked
      ? "Patient's fine. Family's traumatized. Could've gone better."
      : "Clean case. Good outcome. This is how it should go.",
  };

  return { start: startBeat, peak: peakBeat, end: endBeat };
}

// ============================================================================
// PROFESSIONAL ASSESSMENT GENERATOR
// ============================================================================

interface ProfessionalAssessment {
  rating: 'excellent' | 'good' | 'needs_improvement' | 'concerning';
  summary: string;
  wouldMentorSay: string;
}

function generateAssessment(ctx: NarrativeContext): ProfessionalAssessment {
  // Score based on key factors
  let score = 10;

  // Clinical factors
  if (ctx.pivots.some(p => p.id.includes('dose_error_caught'))) score -= 2;
  if (ctx.pivots.some(p => p.id.includes('underdose'))) score -= 2;
  if (ctx.pivots.some(p => p.id === 'pivot_skipped_vagal')) score -= 1;

  // Communication factors (weighted more heavily)
  if (!ctx.dadWarned && ctx.asystoleOccurred) score -= 3;
  if (ctx.dadPanicked) score -= 2;
  if (ctx.lilyPeakFear >= 5) score -= 1;

  // Positive factors
  if (ctx.dadWarned) score += 1;
  if (ctx.pivots.some(p => p.id === 'pivot_good_warning_given')) score += 2;

  // Map to assessment
  if (score >= 9) return PROFESSIONAL_ASSESSMENTS.excellent;
  if (score >= 6) return PROFESSIONAL_ASSESSMENTS.good;
  if (score >= 3) return PROFESSIONAL_ASSESSMENTS.needs_improvement;
  return PROFESSIONAL_ASSESSMENTS.concerning;
}

// ============================================================================
// MAIN NARRATIVE GENERATOR
// ============================================================================

export function generateNurseNarrative(ctx: NarrativeContext): CharacterNarrative {
  const keyMoments: NarrativeMoment[] = [];

  // Add dose catch moment if applicable
  const doseCatchMoment = generateDoseCatchMoment(ctx);
  if (doseCatchMoment) {
    keyMoments.push(doseCatchMoment);
  }

  // Add asystole moment
  if (ctx.asystoleOccurred) {
    keyMoments.push(generateAsystoleMoment(ctx));
  }

  // Add dad scream moment if applicable
  const dadScreamMoment = generateDadScreamMoment(ctx);
  if (dadScreamMoment) {
    keyMoments.push(dadScreamMoment);
  }

  // Build the main narrative
  let narrative = '';

  // Opening - nurse's initial assessment
  const assessment = generateAssessment(ctx);
  if (assessment.rating === 'excellent' || assessment.rating === 'good') {
    narrative += OPENING_LINES.good_team + '\n\n';
  } else {
    narrative += OPENING_LINES.concerning + '\n\n';
  }

  // Dad management
  if (ctx.dadWarned) {
    narrative += OBSERVATIONS.dad_managed + ' ';
  } else {
    narrative += OBSERVATIONS.dad_spiraling + ' ';
  }

  // Clinical observations
  if (ctx.pivots.some(p => p.id.includes('dose_error_caught'))) {
    narrative += OBSERVATIONS.dose_catch + '\n\n';
  } else if (ctx.pivots.some(p => p.id === 'pivot_skipped_vagal')) {
    narrative += OBSERVATIONS.skipped_vagal + '\n\n';
  } else {
    narrative += OBSERVATIONS.good_dosing + '\n\n';
  }

  // The asystole moment
  if (ctx.asystoleOccurred) {
    if (ctx.dadWarned) {
      narrative += OBSERVATIONS.good_warning + ' ';
    } else {
      narrative += OBSERVATIONS.no_warning + ' ';
    }

    if (ctx.dadPanicked) {
      narrative += OBSERVATIONS.dad_scream + '\n\n';
    } else {
      narrative += '\n\n';
    }
  }

  // Overall communication assessment
  if (assessment.rating === 'excellent' || assessment.rating === 'good') {
    narrative += OBSERVATIONS.good_communication;
  } else {
    narrative += OBSERVATIONS.poor_communication;
  }

  // Opening line
  let openingLine: string;
  if (assessment.rating === 'excellent') {
    openingLine = OPENING_LINES.routine_svt;
  } else if (assessment.rating === 'good') {
    openingLine = OPENING_LINES.good_team;
  } else {
    openingLine = OPENING_LINES.concerning;
  }

  // Closing reflection - professional summary
  let closingReflection: string;
  if (assessment.rating === 'excellent') {
    closingReflection = "Clean case. Good communication. The family left feeling cared for, not just treated.";
  } else if (assessment.rating === 'good') {
    closingReflection = "Patient outcome was good. Some room for improvement on family management.";
  } else if (assessment.rating === 'needs_improvement') {
    closingReflection = "The clinical was fine. But that family's going to remember the fear, not the save.";
  } else {
    closingReflection = "We got the patient through it. But there are some things to review.";
  }

  return {
    character: 'nurse',
    displayName: 'Sarah Chen, RN (ER Nurse, 12 years)',
    openingLine,
    narrative,
    closingReflection,
    emotionalArc: generateEmotionalArc(ctx),
    keyMoments,
    professionalAssessment: assessment,
  };
}
