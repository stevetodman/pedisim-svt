/**
 * Calipers - SVG overlay for ECG interval measurements
 */

import { useRef, useEffect, useState } from 'react';
import { CaliperState, Measurement } from '../../kernel/ecg/types';
import { msToPixels, pixelsToMs } from '../../kernel/ecg/waveform';

interface CalipersProps {
  state: CaliperState;
  speed: 25 | 50;
  onDeleteMeasurement: (id: string) => void;
}

export function Calipers({ state, speed, onDeleteMeasurement }: CalipersProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 500 });

  // Measure container dimensions
  useEffect(() => {
    if (containerRef.current) {
      const updateDimensions = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setDimensions({ width: rect.width, height: rect.height });
        }
      };

      updateDimensions();

      const resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const { mode, startX, endX, measurements, marchInterval } = state;
  const { width, height } = dimensions;

  // Calculate current measurement if placing
  const currentIntervalMs = startX !== null && endX !== null
    ? Math.round(pixelsToMs(Math.abs(endX - startX), speed))
    : null;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute top-0 left-0"
      >
        {/* Marching calipers - render FIRST so measurements appear on top */}
        {mode === 'marching' && marchInterval !== null && measurements.length > 0 && (
          <MarchingCalipers
            baseX={measurements[measurements.length - 1].startX}
            intervalMs={marchInterval}
            speed={speed}
            containerWidth={width}
            containerHeight={height}
          />
        )}

        {/* Existing measurements */}
        {measurements.map(measurement => (
          <MeasurementOverlay
            key={measurement.id}
            measurement={measurement}
            containerHeight={height}
            onDelete={() => onDeleteMeasurement(measurement.id)}
          />
        ))}

        {/* Current measurement being placed */}
        {mode === 'placing' && startX !== null && (
          <>
            {/* First caliper line */}
            <line
              x1={startX}
              y1={0}
              x2={startX}
              y2={height}
              stroke="#ff0000"
              strokeWidth={2}
              strokeDasharray="4,4"
            />

            {/* Second caliper line (if dragging) */}
            {endX !== null && (
              <>
                <line
                  x1={endX}
                  y1={0}
                  x2={endX}
                  y2={height}
                  stroke="#ff0000"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                />

                {/* Connecting line */}
                <line
                  x1={startX}
                  y1={50}
                  x2={endX}
                  y2={50}
                  stroke="#ff0000"
                  strokeWidth={2}
                />

                {/* Measurement label */}
                <rect
                  x={(startX + endX) / 2 - 50}
                  y={30}
                  width={100}
                  height={24}
                  rx={4}
                  fill="#ff0000"
                />
                <text
                  x={(startX + endX) / 2}
                  y={46}
                  textAnchor="middle"
                  fill="white"
                  fontSize={12}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {currentIntervalMs} ms
                </text>
              </>
            )}
          </>
        )}
      </svg>

      {/* Measurement info panel */}
      {measurements.length > 0 && (
        <div className="absolute top-2 right-2 bg-black/80 text-white p-2 rounded text-xs font-mono pointer-events-auto">
          <div className="font-bold mb-1">Measurements:</div>
          {measurements.map((m, i) => (
            <div key={m.id} className="flex justify-between gap-4">
              <span>#{i + 1}:</span>
              <span>{m.intervalMs} ms</span>
              {m.calculatedHR && <span>({m.calculatedHR} bpm)</span>}
              <button
                onClick={() => onDeleteMeasurement(m.id)}
                className="text-red-400 hover:text-red-300 ml-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active mode indicator */}
      {mode !== 'inactive' && (
        <div className={`absolute bottom-2 left-2 px-3 py-1.5 rounded text-sm font-bold ${
          mode === 'marching' ? 'bg-orange-500 text-white' : 'bg-red-600 text-white'
        }`}>
          {mode === 'placing' ? '📏 Click on R waves to measure R-R interval' :
           mode === 'marching' ? '🔄 MARCHING - Lines show regular intervals' :
           mode === 'adjusting' ? 'ADJUSTING' : ''}
        </div>
      )}
    </div>
  );
}

/**
 * Single measurement overlay
 */
function MeasurementOverlay({
  measurement,
  containerHeight,
  onDelete,
}: {
  measurement: Measurement;
  containerHeight: number;
  onDelete: () => void;
}) {
  const { startX, endX, intervalMs, calculatedHR } = measurement;
  const midX = (startX + endX) / 2;

  return (
    <g className="pointer-events-auto cursor-pointer" onClick={onDelete}>
      {/* Start line */}
      <line
        x1={startX}
        y1={0}
        x2={startX}
        y2={containerHeight}
        stroke="#0066cc"
        strokeWidth={2}
      />

      {/* End line */}
      <line
        x1={endX}
        y1={0}
        x2={endX}
        y2={containerHeight}
        stroke="#0066cc"
        strokeWidth={2}
      />

      {/* Top connecting line with arrows */}
      <line
        x1={startX}
        y1={30}
        x2={endX}
        y2={30}
        stroke="#0066cc"
        strokeWidth={2}
      />

      {/* Arrow heads */}
      <polygon
        points={`${startX},30 ${startX + 8},25 ${startX + 8},35`}
        fill="#0066cc"
      />
      <polygon
        points={`${endX},30 ${endX - 8},25 ${endX - 8},35`}
        fill="#0066cc"
      />

      {/* Label background */}
      <rect
        x={midX - 55}
        y={8}
        width={110}
        height={18}
        rx={4}
        fill="#0066cc"
      />

      {/* Label text */}
      <text
        x={midX}
        y={21}
        textAnchor="middle"
        fill="white"
        fontSize={11}
        fontWeight="bold"
        fontFamily="monospace"
      >
        {intervalMs} ms {calculatedHR ? `(${calculatedHR} bpm)` : ''}
      </text>
    </g>
  );
}

/**
 * Marching calipers - repeats the interval across the strip
 */
function MarchingCalipers({
  baseX,
  intervalMs,
  speed,
  containerWidth,
  containerHeight,
}: {
  baseX: number;
  intervalMs: number;
  speed: 25 | 50;
  containerWidth: number;
  containerHeight: number;
}) {
  const intervalPx = msToPixels(intervalMs, speed);
  const lines: number[] = [];

  // Generate marching lines in both directions from the base
  // Forward
  let x = baseX;
  while (x < containerWidth + intervalPx) {
    lines.push(x);
    x += intervalPx;
  }

  // Backward (skip baseX since it's already added)
  x = baseX - intervalPx;
  while (x > -intervalPx) {
    lines.push(x);
    x -= intervalPx;
  }

  return (
    <g>
      {lines.map((lineX, i) => (
        <line
          key={i}
          x1={lineX}
          y1={0}
          x2={lineX}
          y2={containerHeight}
          stroke="#ff6600"
          strokeWidth={2}
          strokeDasharray="6,3"
        />
      ))}

      {/* Marching indicator label at top */}
      <rect
        x={10}
        y={10}
        width={180}
        height={28}
        rx={4}
        fill="#ff6600"
      />
      <text
        x={100}
        y={29}
        textAnchor="middle"
        fill="white"
        fontSize={13}
        fontWeight="bold"
        fontFamily="monospace"
      >
        🔄 MARCH: {intervalMs} ms
      </text>
    </g>
  );
}
