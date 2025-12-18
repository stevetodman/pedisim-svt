/**
 * ECG Waveform Generator
 *
 * Generates waveform data for rendering on canvas.
 * Uses Gaussian curves to approximate the shape of ECG waves.
 */

import { LeadName, Rhythm, LeadMorphology, ECGConfig, DEFAULT_ECG_CONFIG } from './types';
import { getLeadMorphology } from './morphology';

/**
 * Gaussian function for smooth wave shapes
 * Returns a value between 0 and 1 for the bell curve
 */
function gaussian(x: number, center: number, width: number): number {
  const sigma = width / 4;  // Width defines ~95% of the bell curve
  return Math.exp(-Math.pow(x - center, 2) / (2 * sigma * sigma));
}

/**
 * Calculate amplitude at a given time point within the cardiac cycle
 * using the morphology definition
 */
function calculateAmplitudeAtTime(
  morphology: LeadMorphology,
  timeInCycle: number  // ms from start of cardiac cycle
): number {
  let amplitude = 0;
  const { pWave, qWave, rWave, sPrime, sWave, tWave, stDeviation } = morphology;

  // P wave
  if (pWave && pWave.amplitude !== 0) {
    const center = pWave.onset + pWave.duration / 2;
    amplitude += pWave.amplitude * gaussian(timeInCycle, center, pWave.duration);
  }

  // Q wave
  if (qWave && qWave.amplitude !== 0) {
    const center = qWave.onset + qWave.duration / 2;
    amplitude += qWave.amplitude * gaussian(timeInCycle, center, qWave.duration);
  }

  // R wave
  if (rWave && rWave.amplitude !== 0) {
    const center = rWave.onset + rWave.duration / 2;
    amplitude += rWave.amplitude * gaussian(timeInCycle, center, rWave.duration);
  }

  // S' (S prime) wave - for rSR' pattern
  if (sPrime && sPrime.amplitude !== 0) {
    const center = sPrime.onset + sPrime.duration / 2;
    amplitude += sPrime.amplitude * gaussian(timeInCycle, center, sPrime.duration);
  }

  // S wave
  if (sWave && sWave.amplitude !== 0) {
    const center = sWave.onset + sWave.duration / 2;
    amplitude += sWave.amplitude * gaussian(timeInCycle, center, sWave.duration);
  }

  // T wave
  if (tWave && tWave.amplitude !== 0) {
    const center = tWave.onset + tWave.duration / 2;
    amplitude += tWave.amplitude * gaussian(timeInCycle, center, tWave.duration);
  }

  // ST segment deviation (constant offset between S and T)
  if (stDeviation !== 0) {
    // Apply ST deviation in the ST segment region
    const stStart = (sWave?.onset ?? rWave.onset + rWave.duration) + (sWave?.duration ?? 0);
    const stEnd = tWave.onset;
    if (timeInCycle > stStart && timeInCycle < stEnd) {
      amplitude += stDeviation;
    }
  }

  return amplitude;
}

/**
 * Generate waveform data for a single lead
 *
 * @param lead - The lead name (I, II, V1, etc.)
 * @param rhythm - The cardiac rhythm (SVT, SINUS, ASYSTOLE)
 * @param heartRate - Heart rate in BPM
 * @param config - ECG configuration (duration, samples per second)
 * @returns Float32Array of amplitude values in mV
 */
export function generateWaveformData(
  lead: LeadName,
  rhythm: Rhythm,
  heartRate: number,
  config: ECGConfig = DEFAULT_ECG_CONFIG
): Float32Array {
  const { duration, samplesPerSecond } = config;
  const totalSamples = Math.floor(duration * samplesPerSecond);
  const data = new Float32Array(totalSamples);

  // Handle asystole - flat line with minor baseline wander
  if (rhythm === 'ASYSTOLE') {
    for (let i = 0; i < totalSamples; i++) {
      // Add subtle baseline wander for realism
      const t = i / samplesPerSecond;
      data[i] = 0.02 * Math.sin(t * 0.5) + 0.01 * Math.sin(t * 1.3);
    }
    return data;
  }

  const morphology = getLeadMorphology(rhythm, lead);
  const cycleLength = 60000 / heartRate;  // ms per beat

  for (let i = 0; i < totalSamples; i++) {
    const timeMs = (i / samplesPerSecond) * 1000;
    const timeInCycle = timeMs % cycleLength;

    // Calculate amplitude from morphology
    data[i] = calculateAmplitudeAtTime(morphology, timeInCycle);

    // Add subtle noise for realism (very small random perturbation)
    data[i] += (Math.random() - 0.5) * 0.01;
  }

  return data;
}

/**
 * Generate waveform data for all 15 leads at once
 * More efficient for rendering the full ECG view
 */
export function generateAllLeadsWaveform(
  rhythm: Rhythm,
  heartRate: number,
  config: ECGConfig = DEFAULT_ECG_CONFIG
): Map<LeadName, Float32Array> {
  const leads: LeadName[] = [
    'I', 'II', 'III',
    'aVR', 'aVL', 'aVF',
    'V1', 'V2', 'V3', 'V4', 'V5', 'V6',
    'V3R', 'V4R', 'V7'
  ];

  const result = new Map<LeadName, Float32Array>();

  for (const lead of leads) {
    result.set(lead, generateWaveformData(lead, rhythm, heartRate, config));
  }

  return result;
}

/**
 * Generate extended rhythm strip data (typically 10 seconds of Lead II)
 */
export function generateRhythmStrip(
  rhythm: Rhythm,
  heartRate: number,
  durationSeconds: number = 10,
  samplesPerSecond: number = 500
): Float32Array {
  const config: ECGConfig = {
    ...DEFAULT_ECG_CONFIG,
    duration: durationSeconds,
    samplesPerSecond,
  };

  return generateWaveformData('II', rhythm, heartRate, config);
}

/**
 * Pixel scaling utilities
 */
export const PIXELS_PER_MM = 4;  // Base resolution at 96 DPI

export function getPixelScale(gain: 5 | 10 | 20, speed: 25 | 50) {
  return {
    pixelsPerMv: gain * PIXELS_PER_MM,       // Vertical scale (mm/mV * px/mm)
    pixelsPerSecond: speed * PIXELS_PER_MM,  // Horizontal scale (mm/s * px/mm)
    pixelsPerMs: (speed * PIXELS_PER_MM) / 1000,  // For caliper calculations
  };
}

/**
 * Convert waveform data to canvas coordinates
 *
 * @param data - Waveform amplitude data in mV
 * @param canvasHeight - Height of the canvas in pixels
 * @param gain - Gain setting (5, 10, or 20 mm/mV)
 * @returns Array of y-coordinates for the canvas (0 = top, canvasHeight = bottom)
 */
export function waveformToCanvasY(
  data: Float32Array,
  canvasHeight: number,
  gain: 5 | 10 | 20
): Float32Array {
  const { pixelsPerMv } = getPixelScale(gain, 25);
  const baseline = canvasHeight / 2;  // Baseline at vertical center
  const result = new Float32Array(data.length);

  for (let i = 0; i < data.length; i++) {
    // Negative because canvas Y increases downward, but positive ECG deflection is upward
    result[i] = baseline - (data[i] * pixelsPerMv);
  }

  return result;
}

/**
 * Get time duration represented by a pixel width
 */
export function pixelsToMs(pixels: number, speed: 25 | 50): number {
  const { pixelsPerMs } = getPixelScale(10, speed);
  return pixels / pixelsPerMs;
}

/**
 * Get pixel width for a time duration
 */
export function msToPixels(ms: number, speed: 25 | 50): number {
  const { pixelsPerMs } = getPixelScale(10, speed);
  return ms * pixelsPerMs;
}
