/**
 * ECG Morphology - Lead-specific PQRST morphologies per rhythm
 *
 * This file defines the characteristic waveform shapes for each lead
 * in different cardiac rhythms. Values are in mV for amplitude and ms for timing.
 *
 * Positive amplitude = upward deflection (toward positive electrode)
 * Negative amplitude = downward deflection (toward negative electrode)
 *
 * PEDIATRIC CONSIDERATIONS (5-year-old):
 * - QRS duration: 60-90ms (narrower than adults)
 * - Higher precordial voltages (thinner chest wall)
 * - T wave inversion V1-V3 can be normal
 * - Right axis deviation normal up to age 8
 */

import { LeadMorphology, RhythmMorphologies, Rhythm, LeadName } from './types';

/**
 * Helper to create a wave component
 */
function wave(amplitude: number, duration: number, onset: number) {
  return { amplitude, duration, onset };
}

/**
 * SVT (Supraventricular Tachycardia) Morphology - PEDIATRIC 5yo
 *
 * Characteristics:
 * - No visible P waves (hidden in QRS or T wave)
 * - Narrow QRS complex (70ms for pediatric)
 * - Fast rate (220 bpm)
 * - Regular R-R intervals
 * - NO delta wave visible (orthodromic AVRT - accessory pathway conducts retrograde only)
 *
 * At 220 bpm: cycle length = 273ms
 */
export const SVT_MORPHOLOGY: RhythmMorphologies = {
  // Limb leads
  'I': {
    pWave: null,
    deltaWave: null,  // No delta during SVT
    qWave: null,
    rWave: wave(0.9, 35, 20),
    sPrime: null,
    sWave: wave(-0.15, 25, 55),
    tWave: wave(0.35, 80, 100),
    stDeviation: 0,
  },
  'II': {
    pWave: null,
    deltaWave: null,
    qWave: null,
    rWave: wave(1.4, 35, 20),
    sPrime: null,
    sWave: wave(-0.2, 25, 55),
    tWave: wave(0.5, 80, 100),
    stDeviation: 0,
  },
  'III': {
    pWave: null,
    deltaWave: null,
    qWave: wave(-0.15, 15, 15),
    rWave: wave(0.5, 30, 25),
    sPrime: null,
    sWave: wave(-0.25, 25, 55),
    tWave: wave(0.25, 80, 100),
    stDeviation: 0,
  },

  // Augmented leads
  'aVR': {
    pWave: null,
    deltaWave: null,
    qWave: wave(-0.4, 20, 15),
    rWave: wave(-1.0, 35, 30),
    sPrime: null,
    sWave: null,
    tWave: wave(-0.35, 80, 100),
    stDeviation: 0,
  },
  'aVL': {
    pWave: null,
    deltaWave: null,
    qWave: wave(-0.1, 15, 15),
    rWave: wave(0.6, 35, 25),
    sPrime: null,
    sWave: wave(-0.2, 25, 60),
    tWave: wave(0.3, 80, 100),
    stDeviation: 0,
  },
  'aVF': {
    pWave: null,
    deltaWave: null,
    qWave: null,
    rWave: wave(1.1, 35, 20),
    sPrime: null,
    sWave: wave(-0.15, 25, 55),
    tWave: wave(0.4, 80, 100),
    stDeviation: 0,
  },

  // Precordial leads
  'V1': {
    pWave: null,
    deltaWave: null,
    qWave: null,
    rWave: wave(0.4, 25, 20),
    sPrime: null,
    sWave: wave(-1.2, 35, 45),
    tWave: wave(-0.25, 80, 100),
    stDeviation: 0,
  },
  'V2': {
    pWave: null,
    deltaWave: null,
    qWave: null,
    rWave: wave(0.8, 30, 20),
    sPrime: null,
    sWave: wave(-0.9, 30, 50),
    tWave: wave(0.4, 80, 100),
    stDeviation: 0,
  },
  'V3': {
    pWave: null,
    deltaWave: null,
    qWave: null,
    rWave: wave(1.2, 35, 20),
    sPrime: null,
    sWave: wave(-0.5, 25, 55),
    tWave: wave(0.5, 80, 100),
    stDeviation: 0,
  },
  'V4': {
    pWave: null,
    deltaWave: null,
    qWave: null,
    rWave: wave(1.8, 35, 20),
    sPrime: null,
    sWave: wave(-0.25, 20, 55),
    tWave: wave(0.6, 80, 100),
    stDeviation: 0,
  },
  'V5': {
    pWave: null,
    deltaWave: null,
    qWave: wave(-0.15, 15, 15),
    rWave: wave(1.6, 35, 25),
    sPrime: null,
    sWave: wave(-0.1, 15, 60),
    tWave: wave(0.55, 80, 100),
    stDeviation: 0,
  },
  'V6': {
    pWave: null,
    deltaWave: null,
    qWave: wave(-0.2, 15, 15),
    rWave: wave(1.3, 35, 25),
    sPrime: null,
    sWave: null,
    tWave: wave(0.5, 80, 100),
    stDeviation: 0,
  },

  // Pediatric right-sided and posterior leads
  'V3R': {
    pWave: null,
    deltaWave: null,
    qWave: null,
    rWave: wave(0.35, 25, 20),
    sPrime: null,
    sWave: wave(-1.0, 35, 45),
    tWave: wave(0.2, 80, 100),
    stDeviation: 0,
  },
  'V4R': {
    pWave: null,
    deltaWave: null,
    qWave: null,
    rWave: wave(0.3, 25, 20),
    sPrime: null,
    sWave: wave(-0.9, 35, 45),
    tWave: wave(0.15, 80, 100),
    stDeviation: 0,
  },
  'V7': {
    pWave: null,
    deltaWave: null,
    qWave: wave(-0.1, 15, 15),
    rWave: wave(0.8, 35, 25),
    sPrime: null,
    sWave: wave(-0.05, 15, 60),
    tWave: wave(0.4, 80, 100),
    stDeviation: 0,
  },
};

/**
 * Normal Sinus Rhythm Morphology - PEDIATRIC 5yo
 *
 * Characteristics:
 * - Visible P waves before each QRS
 * - Normal PR interval (120-180ms for 5yo)
 * - Narrow QRS complex (60-80ms)
 * - Normal rate (85-100 bpm post-conversion)
 *
 * At 90 bpm: cycle length = 667ms
 */
export const SINUS_MORPHOLOGY: RhythmMorphologies = {
  // Limb leads
  'I': {
    pWave: wave(0.15, 80, 0),
    deltaWave: null,
    qWave: null,
    rWave: wave(0.9, 45, 140),
    sPrime: null,
    sWave: wave(-0.15, 25, 185),
    tWave: wave(0.4, 120, 250),
    stDeviation: 0,
  },
  'II': {
    pWave: wave(0.2, 80, 0),
    deltaWave: null,
    qWave: null,
    rWave: wave(1.4, 45, 140),
    sPrime: null,
    sWave: wave(-0.2, 25, 185),
    tWave: wave(0.55, 120, 250),
    stDeviation: 0,
  },
  'III': {
    pWave: wave(0.1, 80, 0),
    deltaWave: null,
    qWave: wave(-0.1, 20, 130),
    rWave: wave(0.5, 40, 145),
    sPrime: null,
    sWave: wave(-0.25, 25, 185),
    tWave: wave(0.3, 120, 250),
    stDeviation: 0,
  },

  // Augmented leads
  'aVR': {
    pWave: wave(-0.15, 80, 0),
    deltaWave: null,
    qWave: wave(-0.4, 25, 130),
    rWave: wave(-1.0, 45, 150),
    sPrime: null,
    sWave: null,
    tWave: wave(-0.4, 120, 250),
    stDeviation: 0,
  },
  'aVL': {
    pWave: wave(0.08, 80, 0),
    deltaWave: null,
    qWave: wave(-0.1, 20, 130),
    rWave: wave(0.55, 45, 145),
    sPrime: null,
    sWave: wave(-0.2, 25, 190),
    tWave: wave(0.35, 120, 250),
    stDeviation: 0,
  },
  'aVF': {
    pWave: wave(0.15, 80, 0),
    deltaWave: null,
    qWave: null,
    rWave: wave(1.1, 45, 140),
    sPrime: null,
    sWave: wave(-0.15, 25, 185),
    tWave: wave(0.45, 120, 250),
    stDeviation: 0,
  },

  // Precordial leads
  'V1': {
    pWave: wave(0.1, 80, 0),
    deltaWave: null,
    qWave: null,
    rWave: wave(0.4, 30, 140),
    sPrime: null,
    sWave: wave(-1.2, 35, 170),
    tWave: wave(-0.2, 120, 250),
    stDeviation: 0,
  },
  'V2': {
    pWave: wave(0.12, 80, 0),
    deltaWave: null,
    qWave: null,
    rWave: wave(0.7, 35, 140),
    sPrime: null,
    sWave: wave(-0.9, 35, 175),
    tWave: wave(0.5, 120, 250),
    stDeviation: 0,
  },
  'V3': {
    pWave: wave(0.12, 80, 0),
    deltaWave: null,
    qWave: null,
    rWave: wave(1.1, 40, 140),
    sPrime: null,
    sWave: wave(-0.5, 30, 180),
    tWave: wave(0.55, 120, 250),
    stDeviation: 0,
  },
  'V4': {
    pWave: wave(0.12, 80, 0),
    deltaWave: null,
    qWave: null,
    rWave: wave(1.8, 40, 140),
    sPrime: null,
    sWave: wave(-0.3, 25, 180),
    tWave: wave(0.6, 120, 250),
    stDeviation: 0,
  },
  'V5': {
    pWave: wave(0.1, 80, 0),
    deltaWave: null,
    qWave: wave(-0.15, 20, 130),
    rWave: wave(1.6, 40, 145),
    sPrime: null,
    sWave: wave(-0.1, 20, 185),
    tWave: wave(0.55, 120, 250),
    stDeviation: 0,
  },
  'V6': {
    pWave: wave(0.1, 80, 0),
    deltaWave: null,
    qWave: wave(-0.2, 20, 130),
    rWave: wave(1.3, 40, 145),
    sPrime: null,
    sWave: null,
    tWave: wave(0.5, 120, 250),
    stDeviation: 0,
  },

  // Pediatric right-sided and posterior leads
  'V3R': {
    pWave: wave(0.1, 80, 0),
    deltaWave: null,
    qWave: null,
    rWave: wave(0.35, 30, 140),
    sPrime: null,
    sWave: wave(-1.0, 35, 170),
    tWave: wave(0.2, 120, 250),
    stDeviation: 0,
  },
  'V4R': {
    pWave: wave(0.1, 80, 0),
    deltaWave: null,
    qWave: null,
    rWave: wave(0.3, 30, 140),
    sPrime: null,
    sWave: wave(-0.9, 35, 170),
    tWave: wave(0.15, 120, 250),
    stDeviation: 0,
  },
  'V7': {
    pWave: wave(0.08, 80, 0),
    deltaWave: null,
    qWave: wave(-0.1, 20, 130),
    rWave: wave(0.8, 40, 145),
    sPrime: null,
    sWave: wave(-0.05, 20, 185),
    tWave: wave(0.45, 120, 250),
    stDeviation: 0,
  },
};

/**
 * WPW (Wolff-Parkinson-White) Type A in Sinus Rhythm - PEDIATRIC 5yo
 *
 * This is the UNDERLYING SUBSTRATE revealed after SVT conversion.
 * During SVT (orthodromic AVRT), the accessory pathway conducts retrograde only,
 * so no delta wave is visible. Only in sinus rhythm does pre-excitation appear.
 *
 * Type A (Left Lateral Pathway) characteristics:
 * - Short PR interval (~80ms vs normal 120-180ms)
 * - Delta wave: slurred upstroke of QRS (~40ms)
 * - Wide QRS: ~110ms (normal 60-90ms) due to pre-excitation
 * - Positive delta wave in V1 (differentiates Type A from Type B)
 * - Secondary ST-T changes (discordant to QRS)
 *
 * At 90 bpm: cycle length = 667ms
 */
export const WPW_SINUS_MORPHOLOGY: RhythmMorphologies = {
  // Limb leads
  'I': {
    pWave: wave(0.15, 80, 0),           // Normal P wave
    deltaWave: wave(0.35, 40, 80),      // Positive delta (left lateral pathway)
    qWave: null,                         // Delta replaces initial q
    rWave: wave(0.6, 35, 120),          // R follows delta
    sPrime: null,
    sWave: wave(-0.1, 20, 155),
    tWave: wave(-0.25, 100, 200),       // Discordant T (secondary changes)
    stDeviation: -0.05,
  },
  'II': {
    pWave: wave(0.2, 80, 0),
    deltaWave: wave(0.4, 40, 80),
    qWave: null,
    rWave: wave(1.0, 35, 120),
    sPrime: null,
    sWave: wave(-0.15, 20, 155),
    tWave: wave(-0.3, 100, 200),
    stDeviation: -0.05,
  },
  'III': {
    pWave: wave(0.1, 80, 0),
    deltaWave: wave(0.25, 40, 80),
    qWave: null,
    rWave: wave(0.4, 35, 120),
    sPrime: null,
    sWave: wave(-0.2, 25, 155),
    tWave: wave(-0.15, 100, 200),
    stDeviation: 0,
  },

  // Augmented leads
  'aVR': {
    pWave: wave(-0.15, 80, 0),
    deltaWave: wave(-0.35, 40, 80),     // Negative delta in aVR
    qWave: null,
    rWave: wave(-0.7, 35, 120),
    sPrime: null,
    sWave: null,
    tWave: wave(0.25, 100, 200),        // Positive T (discordant)
    stDeviation: 0.05,
  },
  'aVL': {
    pWave: wave(0.08, 80, 0),
    deltaWave: wave(0.3, 40, 80),
    qWave: null,
    rWave: wave(0.45, 35, 120),
    sPrime: null,
    sWave: wave(-0.15, 20, 155),
    tWave: wave(-0.2, 100, 200),
    stDeviation: -0.05,
  },
  'aVF': {
    pWave: wave(0.15, 80, 0),
    deltaWave: wave(0.35, 40, 80),
    qWave: null,
    rWave: wave(0.8, 35, 120),
    sPrime: null,
    sWave: wave(-0.1, 20, 155),
    tWave: wave(-0.25, 100, 200),
    stDeviation: -0.05,
  },

  // Precordial leads - Type A has POSITIVE delta in V1
  'V1': {
    pWave: wave(0.1, 80, 0),
    deltaWave: wave(0.5, 40, 80),       // KEY: Positive delta = Type A
    qWave: null,
    rWave: wave(0.7, 40, 120),          // Dominant R (mimics RVH)
    sPrime: null,
    sWave: wave(-0.3, 25, 160),
    tWave: wave(-0.35, 100, 200),       // Inverted T
    stDeviation: -0.1,
  },
  'V2': {
    pWave: wave(0.12, 80, 0),
    deltaWave: wave(0.45, 40, 80),
    qWave: null,
    rWave: wave(0.8, 40, 120),
    sPrime: null,
    sWave: wave(-0.4, 30, 160),
    tWave: wave(-0.3, 100, 200),
    stDeviation: -0.1,
  },
  'V3': {
    pWave: wave(0.12, 80, 0),
    deltaWave: wave(0.4, 40, 80),
    qWave: null,
    rWave: wave(1.0, 40, 120),
    sPrime: null,
    sWave: wave(-0.3, 25, 160),
    tWave: wave(-0.2, 100, 200),
    stDeviation: -0.05,
  },
  'V4': {
    pWave: wave(0.12, 80, 0),
    deltaWave: wave(0.35, 40, 80),
    qWave: null,
    rWave: wave(1.4, 40, 120),
    sPrime: null,
    sWave: wave(-0.2, 20, 160),
    tWave: wave(-0.15, 100, 200),
    stDeviation: 0,
  },
  'V5': {
    pWave: wave(0.1, 80, 0),
    deltaWave: wave(0.3, 40, 80),
    qWave: null,
    rWave: wave(1.3, 40, 120),
    sPrime: null,
    sWave: wave(-0.1, 15, 160),
    tWave: wave(-0.1, 100, 200),
    stDeviation: 0,
  },
  'V6': {
    pWave: wave(0.1, 80, 0),
    deltaWave: wave(0.25, 40, 80),
    qWave: null,
    rWave: wave(1.1, 40, 120),
    sPrime: null,
    sWave: null,
    tWave: wave(0.1, 100, 200),         // T may be upright in V6
    stDeviation: 0,
  },

  // Pediatric right-sided and posterior leads
  'V3R': {
    pWave: wave(0.1, 80, 0),
    deltaWave: wave(0.45, 40, 80),
    qWave: null,
    rWave: wave(0.6, 40, 120),
    sPrime: null,
    sWave: wave(-0.4, 30, 160),
    tWave: wave(-0.25, 100, 200),
    stDeviation: -0.05,
  },
  'V4R': {
    pWave: wave(0.1, 80, 0),
    deltaWave: wave(0.4, 40, 80),
    qWave: null,
    rWave: wave(0.5, 40, 120),
    sPrime: null,
    sWave: wave(-0.5, 30, 160),
    tWave: wave(-0.2, 100, 200),
    stDeviation: -0.05,
  },
  'V7': {
    pWave: wave(0.08, 80, 0),
    deltaWave: wave(0.2, 40, 80),
    qWave: null,
    rWave: wave(0.7, 40, 120),
    sPrime: null,
    sWave: wave(-0.05, 15, 160),
    tWave: wave(0.15, 100, 200),
    stDeviation: 0,
  },
};

/**
 * Asystole Morphology - Flat line with minor baseline wander
 */
const ASYSTOLE_LEAD: LeadMorphology = {
  pWave: null,
  deltaWave: null,
  qWave: null,
  rWave: { amplitude: 0, duration: 0, onset: 0 },
  sPrime: null,
  sWave: null,
  tWave: { amplitude: 0, duration: 0, onset: 0 },
  stDeviation: 0,
};

export const ASYSTOLE_MORPHOLOGY: RhythmMorphologies = Object.fromEntries(
  ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V3R', 'V4R', 'V7']
    .map(lead => [lead, { ...ASYSTOLE_LEAD }])
) as RhythmMorphologies;

/**
 * Get morphology for a specific rhythm
 */
export function getMorphology(rhythm: Rhythm): RhythmMorphologies {
  switch (rhythm) {
    case 'SVT':
      return SVT_MORPHOLOGY;
    case 'SINUS':
      return SINUS_MORPHOLOGY;
    case 'WPW_SINUS':
      return WPW_SINUS_MORPHOLOGY;
    case 'ASYSTOLE':
      return ASYSTOLE_MORPHOLOGY;
    default:
      return SINUS_MORPHOLOGY;
  }
}

/**
 * Get morphology for a specific lead in a rhythm
 */
export function getLeadMorphology(rhythm: Rhythm, lead: LeadName): LeadMorphology {
  return getMorphology(rhythm)[lead];
}
