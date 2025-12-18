/**
 * ECG Types - Type definitions for the 15-lead pediatric ECG viewer
 */

// Lead names for pediatric 15-lead ECG
export type LeadName =
  | 'I' | 'II' | 'III'           // Limb leads
  | 'aVR' | 'aVL' | 'aVF'        // Augmented leads
  | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6'  // Precordial leads
  | 'V3R' | 'V4R' | 'V7';        // Pediatric right-sided + posterior

export const ALL_LEADS: LeadName[] = [
  'I', 'II', 'III',
  'aVR', 'aVL', 'aVF',
  'V1', 'V2', 'V3', 'V4', 'V5', 'V6',
  'V3R', 'V4R', 'V7'
];

// Standard 12-lead grid arrangement (4 columns x 3 rows)
export const STANDARD_GRID: LeadName[][] = [
  ['I',   'aVR', 'V1', 'V4'],
  ['II',  'aVL', 'V2', 'V5'],
  ['III', 'aVF', 'V3', 'V6'],
];

// Pediatric right-sided leads (bottom row)
export const PEDIATRIC_LEADS: LeadName[] = ['V3R', 'V4R', 'V7'];

// Rhythm type (matches existing kernel/types.ts)
// WPW_SINUS = Sinus rhythm with Wolff-Parkinson-White pre-excitation pattern
export type Rhythm = 'SVT' | 'SINUS' | 'ASYSTOLE' | 'WPW_SINUS';

/**
 * Wave component - defines a single ECG wave (P, Q, R, S, or T)
 */
export interface WaveComponent {
  amplitude: number;      // mV (positive = upward deflection, negative = downward)
  duration: number;       // ms
  onset: number;          // ms from start of cardiac cycle
}

/**
 * Lead morphology - complete PQRST morphology for a single lead
 */
export interface LeadMorphology {
  pWave: WaveComponent | null;      // null = absent (e.g., in SVT)
  deltaWave: WaveComponent | null;  // Pre-excitation wave (WPW) - slurred QRS upstroke
  qWave: WaveComponent | null;
  rWave: WaveComponent;
  sPrime: WaveComponent | null;     // For rSR' pattern (e.g., V1 in SVT)
  sWave: WaveComponent | null;
  tWave: WaveComponent;
  stDeviation: number;              // mV, 0 = isoelectric
}

/**
 * Rhythm morphologies - complete morphology set for all leads in a rhythm
 */
export type RhythmMorphologies = Record<LeadName, LeadMorphology>;

/**
 * ECG measurements - auto-calculated intervals and axes
 */
export interface ECGMeasurements {
  heartRate: number;
  rrInterval: number;              // ms
  prInterval: number | null;       // null for rhythms without visible P waves
  qrsDuration: number;             // ms
  qtInterval: number;              // ms
  qtcBazett: number;               // ms, corrected QT = QT / sqrt(RR in sec)
  axis: number;                    // degrees, frontal plane (-180 to +180)
}

/**
 * Pediatric normal ranges by age
 */
export interface NormalRange {
  min: number;
  max: number;
}

export interface PediatricNormals {
  heartRate: NormalRange;
  prInterval: NormalRange;
  qrsDuration: NormalRange;
  qtc: { max: number };
}

// Normal ranges for 5-year-old (our simulation patient Lily)
export const PEDIATRIC_NORMALS_5YO: PediatricNormals = {
  heartRate: { min: 70, max: 120 },
  prInterval: { min: 120, max: 200 },
  qrsDuration: { min: 60, max: 100 },
  qtc: { max: 450 },
};

/**
 * ECG rendering configuration
 */
export interface ECGConfig {
  gain: 5 | 10 | 20;              // mm/mV
  speed: 25 | 50;                  // mm/s
  duration: number;                // seconds to display
  samplesPerSecond: number;        // typically 500
}

export const DEFAULT_ECG_CONFIG: ECGConfig = {
  gain: 10,
  speed: 25,
  duration: 2.5,                   // 2.5 seconds per lead strip
  samplesPerSecond: 500,
};

/**
 * Caliper measurement
 */
export interface Measurement {
  id: string;
  startX: number;                  // pixels from left
  endX: number;
  intervalMs: number;
  calculatedHR?: number;           // 60000 / intervalMs if R-R measurement
  label?: 'PR' | 'QRS' | 'QT' | 'RR';
}

/**
 * Caliper state machine
 */
export type CaliperMode = 'inactive' | 'placing' | 'adjusting' | 'marching';

export interface CaliperState {
  mode: CaliperMode;
  startX: number | null;
  endX: number | null;
  measurements: Measurement[];
  marchInterval: number | null;    // ms, for marching mode
}

export const INITIAL_CALIPER_STATE: CaliperState = {
  mode: 'inactive',
  startX: null,
  endX: null,
  measurements: [],
  marchInterval: null,
};

/**
 * Auto-interpretation result
 */
export interface ECGInterpretation {
  rhythm: string;
  rate: string;
  intervals: string;
  axis: string;
  summary: string;
  findings?: string[];           // Additional findings (e.g., "Delta wave present")
  isAbnormal?: boolean;          // Flags abnormal ECG
  requiresAction?: boolean;      // Needs cardiology referral
}
