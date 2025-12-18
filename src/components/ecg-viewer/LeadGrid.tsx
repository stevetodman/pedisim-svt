/**
 * LeadGrid - 15-lead ECG layout following MUSE standard arrangement
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { LeadName, Rhythm, STANDARD_GRID, PEDIATRIC_LEADS } from '../../kernel/ecg/types';
import { generateRhythmStrip } from '../../kernel/ecg/waveform';
import { WaveformCanvas, RhythmStripCanvas } from './WaveformCanvas';

interface LeadGridProps {
  waveformData: Map<LeadName, Float32Array>;
  gain: 5 | 10 | 20;
  speed: 25 | 50;
  rhythm: Rhythm;
  caliperMode: boolean;
  onCaliperClick: (x: number, containerWidth: number) => void;
  onCaliperDrag: (x: number) => void;
}

// Lead dimensions
const LEAD_WIDTH = 250;
const LEAD_HEIGHT = 80;
const RHYTHM_STRIP_HEIGHT = 100;

export function LeadGrid({
  waveformData,
  gain,
  speed,
  rhythm,
  caliperMode,
  onCaliperClick,
  onCaliperDrag,
}: LeadGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width for rhythm strip
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width - 32);  // Account for padding
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Generate rhythm strip data (10 seconds)
  const rhythmStripData = React.useMemo(() => {
    // Use a lower heart rate for rhythm strip to show more cycles
    const hrForStrip = rhythm === 'SVT' ? 220 : rhythm === 'SINUS' ? 90 : 0;
    return generateRhythmStrip(rhythm, hrForStrip, 10, 500);
  }, [rhythm]);

  // Handle mouse events for calipers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!caliperMode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onCaliperClick(x, containerWidth);
  }, [caliperMode, containerWidth, onCaliperClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!caliperMode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onCaliperDrag(x);
  }, [caliperMode, onCaliperDrag]);

  return (
    <div
      ref={containerRef}
      className={`p-4 select-none ${caliperMode ? 'cursor-crosshair' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
    >
      {/* Standard 12-lead grid (4 columns × 3 rows) */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        {STANDARD_GRID.flat().map(lead => {
          const data = waveformData.get(lead);
          if (!data) return null;

          return (
            <div key={lead} className="bg-[#fff8f0] rounded overflow-hidden">
              <WaveformCanvas
                lead={lead}
                data={data}
                gain={gain}
                speed={speed}
                width={LEAD_WIDTH}
                height={LEAD_HEIGHT}
              />
            </div>
          );
        })}
      </div>

      {/* Pediatric right-sided leads (V3R, V4R, V7) */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        {PEDIATRIC_LEADS.map(lead => {
          const data = waveformData.get(lead);
          if (!data) return null;

          return (
            <div key={lead} className="bg-[#fff8f0] rounded overflow-hidden">
              <WaveformCanvas
                lead={lead}
                data={data}
                gain={gain}
                speed={speed}
                width={LEAD_WIDTH}
                height={LEAD_HEIGHT}
              />
            </div>
          );
        })}
        {/* Empty cell for alignment */}
        <div className="bg-transparent" />
      </div>

      {/* Rhythm strip (10-second Lead II) */}
      <div className="bg-[#fff8f0] rounded overflow-hidden">
        {containerWidth > 0 && (
          <RhythmStripCanvas
            data={rhythmStripData}
            gain={gain}
            speed={speed}
            width={containerWidth}
            height={RHYTHM_STRIP_HEIGHT}
          />
        )}
      </div>
    </div>
  );
}
