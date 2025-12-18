// ============================================================================
// EMOTIONAL CHART COMPONENT
// Visual representation of emotional trajectories over time
// ============================================================================

import React, { useRef, useEffect } from 'react';
import { TimelineEvent } from '../../kernel/evaluation/types';

interface EmotionalChartProps {
  timeline: TimelineEvent[];
  height?: number;
}

const EmotionalChart: React.FC<EmotionalChartProps> = ({
  timeline,
  height = 120
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || timeline.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const padding = { top: 20, bottom: 30, left: 40, right: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Get time range
    const times = timeline.map(e => e.timestamp);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime || 1;

    // Extract emotional data points
    const dadPoints: { x: number; y: number }[] = [];
    const lilyPoints: { x: number; y: number }[] = [];

    let lastDad = -1;
    let lastLily = -1;

    for (const event of timeline) {
      const x = padding.left + ((event.timestamp - minTime) / timeRange) * chartWidth;

      if (event.stateAfter.markAnxiety !== lastDad) {
        dadPoints.push({ x, y: padding.top + (1 - event.stateAfter.markAnxiety / 5) * chartHeight });
        lastDad = event.stateAfter.markAnxiety;
      }

      if (event.stateAfter.lilyFear !== lastLily) {
        lilyPoints.push({ x, y: padding.top + (1 - event.stateAfter.lilyFear / 5) * chartHeight });
        lastLily = event.stateAfter.lilyFear;
      }
    }

    // Draw grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    // Horizontal grid lines (anxiety/fear levels)
    for (let i = 1; i <= 5; i++) {
      const y = padding.top + (1 - i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Level labels
      ctx.fillStyle = '#475569';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(i.toString(), padding.left - 8, y + 3);
    }

    // Draw danger zone (level 5)
    const dangerY = padding.top;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.fillRect(padding.left, dangerY, chartWidth, chartHeight * 0.2);

    // Draw lines with gradient
    const drawLine = (points: { x: number; y: number }[], color: string) => {
      if (points.length < 2) return;

      // Line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      points.forEach((point, idx) => {
        if (idx === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          // Step line for clearer visualization
          ctx.lineTo(point.x, points[idx - 1].y);
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();

      // Points
      points.forEach((point, idx) => {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(point.x, point.y, idx === points.length - 1 ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();

        // Highlight peak
        const values = points.map(p => padding.top + chartHeight - p.y);
        const maxVal = Math.max(...values);
        if (padding.top + chartHeight - point.y === maxVal) {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    };

    // Draw dad's anxiety (amber)
    drawLine(dadPoints, '#f59e0b');

    // Draw lily's fear (pink)
    drawLine(lilyPoints, '#ec4899');

    // Legend
    ctx.font = 'bold 10px sans-serif';

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(padding.left, height - 15, 12, 3);
    ctx.fillText('Dad', padding.left + 16, height - 10);

    ctx.fillStyle = '#ec4899';
    ctx.fillRect(padding.left + 60, height - 15, 12, 3);
    ctx.fillText('Lily', padding.left + 76, height - 10);

    // Time labels
    ctx.fillStyle = '#475569';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';

    const formatTime = (ms: number) => {
      const s = Math.floor(ms / 1000);
      return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
    };

    ctx.fillText(formatTime(minTime), padding.left, height - 3);
    ctx.fillText(formatTime(maxTime), width - padding.right, height - 3);

    // Title
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('EMOTIONAL INTENSITY', padding.left, 12);

  }, [timeline, height]);

  if (timeline.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl p-4 text-center text-slate-500">
        No timeline data available
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-white/5 p-4">
      <canvas
        ref={canvasRef}
        width={400}
        height={height}
        className="w-full"
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
};

export default EmotionalChart;
