/**
 * ECG Measurements
 *
 * Auto-calculation of ECG intervals and axis.
 * Generates interpretation based on rhythm and measurements.
 */

import {
  ECGMeasurements,
  ECGInterpretation,
  Rhythm,
  PEDIATRIC_NORMALS_5YO,
} from './types';
import { SVT_MORPHOLOGY, SINUS_MORPHOLOGY } from './morphology';

/**
 * Calculate ECG measurements for a given rhythm and heart rate
 *
 * These are the "true" values based on the morphology definitions.
 * Used for comparison with user caliper measurements and for display.
 */
export function calculateMeasurements(
  rhythm: Rhythm,
  heartRate: number
): ECGMeasurements {
  const rrInterval = 60000 / heartRate;  // ms

  if (rhythm === 'ASYSTOLE') {
    return {
      heartRate: 0,
      rrInterval: 0,
      prInterval: null,
      qrsDuration: 0,
      qtInterval: 0,
      qtcBazett: 0,
      axis: 0,
    };
  }

  const morphology = rhythm === 'SVT' ? SVT_MORPHOLOGY : SINUS_MORPHOLOGY;
  const leadII = morphology['II'];

  // Calculate intervals from Lead II morphology
  let prInterval: number | null = null;
  let qrsDuration: number;
  let qtInterval: number;

  if (rhythm === 'SINUS' && leadII.pWave) {
    // PR interval = start of P to start of QRS
    const pStart = leadII.pWave.onset;
    const qrsStart = leadII.qWave?.onset ?? leadII.rWave.onset;
    prInterval = qrsStart - pStart;
  }

  // QRS duration from Lead II
  const qrsStart = leadII.qWave?.onset ?? leadII.rWave.onset;
  const qrsEnd = leadII.sWave
    ? leadII.sWave.onset + leadII.sWave.duration
    : leadII.rWave.onset + leadII.rWave.duration;
  qrsDuration = qrsEnd - qrsStart;

  // QT interval = start of QRS to end of T wave
  const tEnd = leadII.tWave.onset + leadII.tWave.duration;
  qtInterval = tEnd - qrsStart;

  // QTc (Bazett formula) = QT / sqrt(RR in seconds)
  const rrSeconds = rrInterval / 1000;
  const qtcBazett = qtInterval / Math.sqrt(rrSeconds);

  // Calculate frontal plane axis from leads I and aVF
  // Simplified: use R wave amplitudes
  const leadI = morphology['I'];
  const leadAVF = morphology['aVF'];
  const rI = leadI.rWave.amplitude + (leadI.qWave?.amplitude ?? 0);
  const rAVF = leadAVF.rWave.amplitude + (leadAVF.qWave?.amplitude ?? 0);

  // Calculate axis using atan2 (simplified approach)
  // Normal axis: 0 to +90 degrees
  let axis = Math.atan2(rAVF, rI) * (180 / Math.PI);
  // Adjust to standard ECG axis convention
  axis = Math.round(axis);

  return {
    heartRate,
    rrInterval: Math.round(rrInterval),
    prInterval: prInterval ? Math.round(prInterval) : null,
    qrsDuration: Math.round(qrsDuration),
    qtInterval: Math.round(qtInterval),
    qtcBazett: Math.round(qtcBazett),
    axis,
  };
}

/**
 * Generate auto-interpretation for the ECG
 */
export function generateInterpretation(
  rhythm: Rhythm,
  heartRate: number,
  measurements: ECGMeasurements
): ECGInterpretation {
  // Rhythm interpretation
  let rhythmText: string;
  let rateText: string;
  let intervalsText: string;
  let axisText: string;
  let summary: string;

  switch (rhythm) {
    case 'SVT':
      rhythmText = 'SUPRAVENTRICULAR TACHYCARDIA';
      rateText = `Ventricular rate ${heartRate} bpm`;
      intervalsText = `PR: --- | QRS: ${measurements.qrsDuration}ms (narrow) | QT/QTc: ${measurements.qtInterval}/${measurements.qtcBazett}ms`;
      axisText = `Axis: ${measurements.axis}°`;
      summary = `⚡ ${rhythmText} - Rate ${heartRate}, Narrow QRS (${measurements.qrsDuration}ms), No visible P waves`;
      break;

    case 'SINUS':
      // Check if rate is normal for age
      const { heartRate: hrNormals } = PEDIATRIC_NORMALS_5YO;
      const isTachy = heartRate > hrNormals.max;
      const isBrady = heartRate < hrNormals.min;

      if (isTachy) {
        rhythmText = 'SINUS TACHYCARDIA';
      } else if (isBrady) {
        rhythmText = 'SINUS BRADYCARDIA';
      } else {
        rhythmText = 'NORMAL SINUS RHYTHM';
      }

      rateText = `Ventricular rate ${heartRate} bpm`;
      intervalsText = `PR: ${measurements.prInterval}ms | QRS: ${measurements.qrsDuration}ms | QT/QTc: ${measurements.qtInterval}/${measurements.qtcBazett}ms`;
      axisText = `Axis: ${measurements.axis}°`;

      // Check intervals against normals
      const prNormal = measurements.prInterval !== null &&
        measurements.prInterval >= PEDIATRIC_NORMALS_5YO.prInterval.min &&
        measurements.prInterval <= PEDIATRIC_NORMALS_5YO.prInterval.max;
      const qrsNormal = measurements.qrsDuration <= PEDIATRIC_NORMALS_5YO.qrsDuration.max;
      const qtcNormal = measurements.qtcBazett <= PEDIATRIC_NORMALS_5YO.qtc.max;

      const abnormalities: string[] = [];
      if (!prNormal && measurements.prInterval !== null) {
        abnormalities.push(measurements.prInterval > PEDIATRIC_NORMALS_5YO.prInterval.max ? 'Prolonged PR' : 'Short PR');
      }
      if (!qrsNormal) {
        abnormalities.push('Wide QRS');
      }
      if (!qtcNormal) {
        abnormalities.push('Prolonged QTc');
      }

      if (abnormalities.length > 0) {
        summary = `${rhythmText} - Rate ${heartRate}, ${abnormalities.join(', ')}`;
      } else {
        summary = `✓ ${rhythmText} - Rate ${heartRate}, Normal intervals`;
      }
      break;

    case 'ASYSTOLE':
      rhythmText = 'ASYSTOLE';
      rateText = 'No ventricular activity';
      intervalsText = 'PR: --- | QRS: --- | QT/QTc: ---';
      axisText = 'Axis: ---';
      summary = '⚠️ ASYSTOLE - No cardiac electrical activity detected';
      break;

    default:
      rhythmText = 'UNKNOWN';
      rateText = `Rate ${heartRate} bpm`;
      intervalsText = '';
      axisText = '';
      summary = 'Unable to interpret';
  }

  return {
    rhythm: rhythmText,
    rate: rateText,
    intervals: intervalsText,
    axis: axisText,
    summary,
  };
}

/**
 * Check if a user's caliper measurement is accurate
 * Returns feedback for "Measure to Learn" mode
 */
export function checkMeasurementAccuracy(
  userMeasurement: number,
  actualValue: number,
  tolerancePercent: number = 10
): {
  accurate: boolean;
  difference: number;
  feedback: string;
} {
  const difference = Math.abs(userMeasurement - actualValue);
  const percentDiff = (difference / actualValue) * 100;
  const accurate = percentDiff <= tolerancePercent;

  let feedback: string;
  if (accurate) {
    feedback = `✓ Correct! Your measurement: ${userMeasurement}ms | Actual: ${actualValue}ms`;
  } else if (percentDiff <= 20) {
    feedback = `Close! Your measurement: ${userMeasurement}ms | Actual: ${actualValue}ms (${Math.round(percentDiff)}% off)`;
  } else {
    feedback = `Try again. Your measurement: ${userMeasurement}ms | Actual: ${actualValue}ms`;
  }

  return { accurate, difference, feedback };
}

/**
 * Calculate heart rate from R-R interval
 */
export function rrToHeartRate(rrIntervalMs: number): number {
  if (rrIntervalMs <= 0) return 0;
  return Math.round(60000 / rrIntervalMs);
}

/**
 * Format measurement for display
 */
export function formatMeasurement(
  value: number | null,
  unit: string = 'ms'
): string {
  if (value === null) return '---';
  return `${value}${unit}`;
}
