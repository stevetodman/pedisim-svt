/**
 * WaveformCanvas - Renders a single ECG lead waveform
 */

import { useRef, useEffect } from 'react';
import { LeadName } from '../../kernel/ecg/types';
import { waveformToCanvasY, getPixelScale } from '../../kernel/ecg/waveform';

interface WaveformCanvasProps {
  lead: LeadName;
  data: Float32Array;
  gain: 5 | 10 | 20;
  speed: 25 | 50;
  width: number;
  height: number;
  showLabel?: boolean;
}

export function WaveformCanvas({
  lead,
  data,
  gain,
  speed,
  width,
  height,
  showLabel = true,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw ECG grid background
    drawECGGrid(ctx, width, height, gain, speed);

    // Draw lead label
    if (showLabel) {
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#333';
      ctx.fillText(lead, 4, 14);
    }

    // Convert waveform data to canvas Y coordinates
    const yData = waveformToCanvasY(data, height, gain);

    // Calculate X scale based on speed and duration
    const { pixelsPerSecond } = getPixelScale(gain, speed);
    const samplesPerSecond = 500;  // From config
    const pixelsPerSample = pixelsPerSecond / samplesPerSecond;

    // Draw waveform
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = i * pixelsPerSample;
      const y = yData[i];

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      // Stop if we've exceeded canvas width
      if (x > width) break;
    }

    ctx.stroke();

  }, [lead, data, gain, speed, width, height, showLabel]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="block"
    />
  );
}

/**
 * Draw ECG grid paper background
 */
function drawECGGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _gain: 5 | 10 | 20,
  _speed: 25 | 50
) {
  // Grid is fixed at 4px per mm for consistent appearance
  // Small box size: 1mm = 0.1mV vertical, 40ms horizontal at standard settings
  const smallBoxPx = 4;
  const largeBoxPx = smallBoxPx * 5;  // 5mm = 5 small boxes

  // Draw small boxes (light pink)
  ctx.strokeStyle = '#ffdddd';
  ctx.lineWidth = 0.5;

  // Vertical lines (small)
  for (let x = 0; x <= width; x += smallBoxPx) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Horizontal lines (small)
  for (let y = 0; y <= height; y += smallBoxPx) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw large boxes (darker pink)
  ctx.strokeStyle = '#ffaaaa';
  ctx.lineWidth = 1;

  // Vertical lines (large)
  for (let x = 0; x <= width; x += largeBoxPx) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Horizontal lines (large)
  for (let y = 0; y <= height; y += largeBoxPx) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

/**
 * Extended rhythm strip canvas (for 10-second Lead II)
 */
interface RhythmStripCanvasProps {
  data: Float32Array;
  gain: 5 | 10 | 20;
  speed: 25 | 50;
  width: number;
  height: number;
}

export function RhythmStripCanvas({
  data,
  gain,
  speed,
  width,
  height,
}: RhythmStripCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear and draw grid
    ctx.clearRect(0, 0, width, height);
    drawECGGrid(ctx, width, height, gain, speed);

    // Draw label
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#333';
    ctx.fillText('II (Rhythm)', 4, 14);

    // Convert and draw waveform
    const yData = waveformToCanvasY(data, height, gain);
    const { pixelsPerSecond } = getPixelScale(gain, speed);
    const samplesPerSecond = 500;
    const pixelsPerSample = pixelsPerSecond / samplesPerSecond;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = i * pixelsPerSample;
      const y = yData[i];

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      if (x > width) break;
    }

    ctx.stroke();

  }, [data, gain, speed, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="block"
    />
  );
}
