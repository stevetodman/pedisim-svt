// ============================================================================
// ECG TRACE COMPONENT
// Animated SVG ECG with rhythm-specific morphology
// ============================================================================

import React, { useEffect, useRef } from 'react';

interface ECGTraceProps {
  heartRate: number;
  rhythm: string;
  width?: number;
  height?: number;
  color?: string;
}

const ECGTrace: React.FC<ECGTraceProps> = ({
  heartRate,
  rhythm,
  width = 400,
  height = 120,
  color
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animationRef = useRef<number>();

  // Determine color based on rhythm
  const getColor = () => {
    if (color) return color;
    if (rhythm === 'ASYSTOLE') return '#ef4444';
    if (rhythm === 'SVT') return '#f59e0b';
    return '#22c55e';
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Clear
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // ECG trace
      const baseline = height / 2;
      const isAsystole = rhythm === 'ASYSTOLE';
      const isSVT = rhythm === 'SVT';
      const isSinus = rhythm === 'SINUS' || rhythm === 'SINUS_TACH' || rhythm === 'SINUS_BRADY';
      
      // Speed based on heart rate
      const speedScale = isAsystole ? 0 : (heartRate / 60) * 1.5;
      frameRef.current += speedScale;

      ctx.beginPath();
      ctx.strokeStyle = getColor();
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      const cycleLength = isSVT ? 30 : 50;

      for (let x = 0; x < width; x++) {
        const phase = (x + frameRef.current) % cycleLength;
        
        // Baseline noise
        let y = baseline + (Math.random() - 0.5) * 1;

        if (isAsystole) {
          // Just flat with noise
          y = baseline + (Math.random() - 0.5) * 1.5;
        } else if (isSVT) {
          // SVT: Narrow QRS, fast, retrograde P
          if (phase >= 12 && phase < 12.3) y += 3;
          if (phase >= 12.3 && phase < 13) y -= 35;
          if (phase >= 13 && phase < 13.7) y += 20;
          // Retrograde P after QRS
          if (phase >= 13.7 && phase < 14.5) {
            y += 6 * Math.sin((phase - 13.7) / 0.8 * Math.PI);
          }
          // T wave
          if (phase > 16 && phase < 22) {
            const tPhase = (phase - 16) / 6;
            y -= 8 * Math.sin(tPhase * Math.PI);
          }
        } else if (isSinus) {
          // Normal sinus rhythm
          // P wave
          if (phase > 5 && phase < 12) {
            const pPhase = (phase - 5) / 7;
            y -= 6 * Math.sin(pPhase * Math.PI);
          }
          // QRS complex
          if (phase >= 18 && phase < 19) y += 5;
          if (phase >= 19 && phase < 21) y -= 40;
          if (phase >= 21 && phase < 23) y += 25;
          // T wave
          if (phase > 28 && phase < 38) {
            const tPhase = (phase - 28) / 10;
            y -= 10 * Math.sin(tPhase * Math.PI);
          }
        }

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [heartRate, rhythm, width, height, color]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg"
    />
  );
};

export default ECGTrace;
