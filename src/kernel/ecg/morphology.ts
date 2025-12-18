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
 *
 * At 220 bpm: cycle length = 273ms
 * Timing must fit within 273ms cycle:
 * - QRS starts at 20ms, duration 70ms, ends at 90ms
 * - T wave starts at 100ms, duration 80ms, ends at 180ms
 * - Gap of ~93ms before next cycle (isoelectric)
 */
export const SVT_MORPHOLOGY: RhythmMorphologies = {
  // Limb leads
  'I': {
    pWave: null,  // Hidden in SVT
    qWave: null,
    rWave: wave(0.9, 35, 20),   // Tall R, narrow QRS
    sPrime: null,
    sWave: wave(-0.15, 25, 55),
    tWave: wave(0.35, 80, 100),
    stDeviation: 0,
  },
  'II': {
    pWave: null,
    qWave: null,
    rWave: wave(1.4, 35, 20),   // Tallest in limb leads
    sPrime: null,
    sWave: wave(-0.2, 25, 55),
    tWave: wave(0.5, 80, 100),
    stDeviation: 0,
  },
  'III': {
    pWave: null,
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
    qWave: wave(-0.4, 20, 15),
    rWave: wave(-1.0, 35, 30),  // Negative QRS in aVR
    sPrime: null,
    sWave: null,
    tWave: wave(-0.35, 80, 100),  // Negative T in aVR
    stDeviation: 0,
  },
  'aVL': {
    pWave: null,
    qWave: wave(-0.1, 15, 15),
    rWave: wave(0.6, 35, 25),
    sPrime: null,
    sWave: wave(-0.2, 25, 60),
    tWave: wave(0.3, 80, 100),
    stDeviation: 0,
  },
  'aVF': {
    pWave: null,
    qWave: null,
    rWave: wave(1.1, 35, 20),
    sPrime: null,
    sWave: wave(-0.15, 25, 55),
    tWave: wave(0.4, 80, 100),
    stDeviation: 0,
  },

  // Precordial leads - Higher voltages for pediatric
  'V1': {
    pWave: null,
    qWave: null,
    rWave: wave(0.4, 25, 20),   // Small r
    sPrime: null,
    sWave: wave(-1.2, 35, 45),  // Deep S (pediatric RV dominance pattern)
    tWave: wave(-0.25, 80, 100), // T inversion normal in V1 for children
    stDeviation: 0,
  },
  'V2': {
    pWave: null,
    qWave: null,
    rWave: wave(0.8, 30, 20),
    sPrime: null,
    sWave: wave(-0.9, 30, 50),
    tWave: wave(0.4, 80, 100),
    stDeviation: 0,
  },
  'V3': {
    pWave: null,
    qWave: null,
    rWave: wave(1.2, 35, 20),
    sPrime: null,
    sWave: wave(-0.5, 25, 55),
    tWave: wave(0.5, 80, 100),
    stDeviation: 0,
  },
  'V4': {
    pWave: null,
    qWave: null,
    rWave: wave(1.8, 35, 20),   // Tall R in V4 (pediatric)
    sPrime: null,
    sWave: wave(-0.25, 20, 55),
    tWave: wave(0.6, 80, 100),
    stDeviation: 0,
  },
  'V5': {
    pWave: null,
    qWave: wave(-0.15, 15, 15),
    rWave: wave(1.6, 35, 25),   // Tall R
    sPrime: null,
    sWave: wave(-0.1, 15, 60),
    tWave: wave(0.55, 80, 100),
    stDeviation: 0,
  },
  'V6': {
    pWave: null,
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
    qWave: null,
    rWave: wave(0.35, 25, 20),
    sPrime: null,
    sWave: wave(-1.0, 35, 45),  // Deep S right-sided
    tWave: wave(0.2, 80, 100),
    stDeviation: 0,
  },
  'V4R': {
    pWave: null,
    qWave: null,
    rWave: wave(0.3, 25, 20),
    sPrime: null,
    sWave: wave(-0.9, 35, 45),
    tWave: wave(0.15, 80, 100),
    stDeviation: 0,
  },
  'V7': {
    pWave: null,
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
    pWave: wave(0.15, 80, 0),   // Upright P in lead I
    qWave: null,
    rWave: wave(0.9, 45, 140),  // QRS starts after PR interval
    sPrime: null,
    sWave: wave(-0.15, 25, 185),
    tWave: wave(0.4, 120, 250),
    stDeviation: 0,
  },
  'II': {
    pWave: wave(0.2, 80, 0),    // Tallest P in lead II (normal sinus)
    qWave: null,
    rWave: wave(1.4, 45, 140),
    sPrime: null,
    sWave: wave(-0.2, 25, 185),
    tWave: wave(0.55, 120, 250),
    stDeviation: 0,
  },
  'III': {
    pWave: wave(0.1, 80, 0),
    qWave: wave(-0.1, 20, 130),
    rWave: wave(0.5, 40, 145),
    sPrime: null,
    sWave: wave(-0.25, 25, 185),
    tWave: wave(0.3, 120, 250),
    stDeviation: 0,
  },

  // Augmented leads
  'aVR': {
    pWave: wave(-0.15, 80, 0),  // Inverted P in aVR
    qWave: wave(-0.4, 25, 130),
    rWave: wave(-1.0, 45, 150), // Negative QRS
    sPrime: null,
    sWave: null,
    tWave: wave(-0.4, 120, 250), // Negative T
    stDeviation: 0,
  },
  'aVL': {
    pWave: wave(0.08, 80, 0),
    qWave: wave(-0.1, 20, 130),
    rWave: wave(0.55, 45, 145),
    sPrime: null,
    sWave: wave(-0.2, 25, 190),
    tWave: wave(0.35, 120, 250),
    stDeviation: 0,
  },
  'aVF': {
    pWave: wave(0.15, 80, 0),   // Upright P in aVF (normal axis)
    qWave: null,
    rWave: wave(1.1, 45, 140),
    sPrime: null,
    sWave: wave(-0.15, 25, 185),
    tWave: wave(0.45, 120, 250),
    stDeviation: 0,
  },

  // Precordial leads - Pediatric higher voltages
  'V1': {
    pWave: wave(0.1, 80, 0),
    qWave: null,
    rWave: wave(0.4, 30, 140),
    sPrime: null,
    sWave: wave(-1.2, 35, 170), // Deep S normal in pediatric V1
    tWave: wave(-0.2, 120, 250), // T inversion normal in V1
    stDeviation: 0,
  },
  'V2': {
    pWave: wave(0.12, 80, 0),
    qWave: null,
    rWave: wave(0.7, 35, 140),
    sPrime: null,
    sWave: wave(-0.9, 35, 175),
    tWave: wave(0.5, 120, 250),
    stDeviation: 0,
  },
  'V3': {
    pWave: wave(0.12, 80, 0),
    qWave: null,
    rWave: wave(1.1, 40, 140),
    sPrime: null,
    sWave: wave(-0.5, 30, 180),
    tWave: wave(0.55, 120, 250),
    stDeviation: 0,
  },
  'V4': {
    pWave: wave(0.12, 80, 0),
    qWave: null,
    rWave: wave(1.8, 40, 140),  // Tall R in V4 pediatric
    sPrime: null,
    sWave: wave(-0.3, 25, 180),
    tWave: wave(0.6, 120, 250),
    stDeviation: 0,
  },
  'V5': {
    pWave: wave(0.1, 80, 0),
    qWave: wave(-0.15, 20, 130),
    rWave: wave(1.6, 40, 145),
    sPrime: null,
    sWave: wave(-0.1, 20, 185),
    tWave: wave(0.55, 120, 250),
    stDeviation: 0,
  },
  'V6': {
    pWave: wave(0.1, 80, 0),
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
    qWave: null,
    rWave: wave(0.35, 30, 140),
    sPrime: null,
    sWave: wave(-1.0, 35, 170),
    tWave: wave(0.2, 120, 250),
    stDeviation: 0,
  },
  'V4R': {
    pWave: wave(0.1, 80, 0),
    qWave: null,
    rWave: wave(0.3, 30, 140),
    sPrime: null,
    sWave: wave(-0.9, 35, 170),
    tWave: wave(0.15, 120, 250),
    stDeviation: 0,
  },
  'V7': {
    pWave: wave(0.08, 80, 0),
    qWave: wave(-0.1, 20, 130),
    rWave: wave(0.8, 40, 145),
    sPrime: null,
    sWave: wave(-0.05, 20, 185),
    tWave: wave(0.45, 120, 250),
    stDeviation: 0,
  },
};

/**
 * Asystole Morphology - Flat line with minor baseline wander
 */
const ASYSTOLE_LEAD: LeadMorphology = {
  pWave: null,
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
