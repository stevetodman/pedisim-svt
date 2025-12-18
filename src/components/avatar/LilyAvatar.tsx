/**
 * LilyAvatar - Animated SVG avatar of Lily Henderson
 * Shows visual feedback of patient state during simulation
 */

import { useMemo } from 'react';
import type { AvatarState } from './types';
import { SKIN_COLORS, LIP_COLORS, DEFAULT_AVATAR_STATE } from './types';
import { getBreathDuration, getBreathingClass } from './stateMapper';
import './animations.css';

interface LilyAvatarProps {
  state?: AvatarState;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LilyAvatar({
  state = DEFAULT_AVATAR_STATE,
  className = '',
  size = 'md',
}: LilyAvatarProps) {
  const {
    posture,
    expression,
    skinTone,
    eyeState,
    hasTears,
    respiratoryRate,
    respiratoryEffort,
    hasNasalFlaring,
    isFlinching,
    isSedated,
  } = state;

  // Calculate breath duration for CSS variable
  const breathDuration = useMemo(() => getBreathDuration(respiratoryRate), [respiratoryRate]);
  const breathingClass = useMemo(() => getBreathingClass(respiratoryEffort), [respiratoryEffort]);

  // Size mapping
  const sizeMap = {
    sm: 120,
    md: 180,
    lg: 240,
  };
  const svgSize = sizeMap[size];

  // Posture transforms
  const postureTransform = useMemo(() => {
    switch (posture) {
      case 'sitting':
        return 'rotate(0)';
      case 'leaning':
        return 'rotate(15)';
      case 'lying':
        return 'rotate(30)';
      case 'limp':
        return 'rotate(35)';
      default:
        return 'rotate(0)';
    }
  }, [posture]);

  // Eye path based on state
  const eyePath = useMemo(() => {
    switch (eyeState) {
      case 'open':
        return { left: 'M24,45 Q27,41 30,45 Q27,49 24,45', right: 'M40,45 Q43,41 46,45 Q43,49 40,45' };
      case 'wide':
        return { left: 'M23,45 Q27,39 31,45 Q27,51 23,45', right: 'M39,45 Q43,39 47,45 Q43,51 39,45' };
      case 'squinting':
        return { left: 'M25,45 Q27,44 29,45', right: 'M41,45 Q43,44 45,45' };
      case 'half-closed':
        return { left: 'M25,45 Q27,44 29,45 Q27,46 25,45', right: 'M41,45 Q43,44 45,45 Q43,46 41,45' };
      case 'closed':
        return { left: 'M25,45 Q27,45 29,45', right: 'M41,45 Q43,45 45,45' };
      default:
        return { left: 'M24,45 Q27,41 30,45 Q27,49 24,45', right: 'M40,45 Q43,41 46,45 Q43,49 40,45' };
    }
  }, [eyeState]);

  // Mouth path based on expression
  const mouthPath = useMemo(() => {
    switch (expression) {
      case 'neutral':
        return 'M30,58 Q35,60 40,58';
      case 'worried':
        return 'M30,60 Q35,58 40,60';
      case 'scared':
        return 'M29,58 Q35,62 41,58';
      case 'distressed':
        return 'M28,58 Q35,65 42,58';
      case 'exhausted':
        return 'M31,59 Q35,59 39,59';
      case 'relief':
        return 'M30,58 Q35,62 40,58';
      case 'sleepy':
        return 'M31,59 Q35,58 39,59';
      default:
        return 'M30,58 Q35,60 40,58';
    }
  }, [expression]);

  // Eyebrow positions based on expression
  const eyebrowOffset = useMemo(() => {
    switch (expression) {
      case 'worried':
      case 'scared':
        return { left: 'translate(0, -2) rotate(10, 27, 38)', right: 'translate(0, -2) rotate(-10, 43, 38)' };
      case 'distressed':
        return { left: 'translate(0, -3) rotate(15, 27, 38)', right: 'translate(0, -3) rotate(-15, 43, 38)' };
      case 'exhausted':
        return { left: 'translate(0, 1)', right: 'translate(0, 1)' };
      default:
        return { left: '', right: '' };
    }
  }, [expression]);

  const skinColor = SKIN_COLORS[skinTone];
  const lipColor = LIP_COLORS[skinTone];

  return (
    <div
      className={`lily-avatar ${className}`}
      style={{
        '--breath-duration': `${breathDuration}s`,
      } as React.CSSProperties}
      aria-hidden="true"
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 70 90"
        className={`
          ${isFlinching ? 'avatar-flinch' : ''}
          ${isSedated ? 'avatar-sedated' : ''}
        `}
      >
        {/* Background - Hospital gown/pillow hint */}
        <defs>
          <linearGradient id="gownGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e0f0ff" />
            <stop offset="100%" stopColor="#c0d8f0" />
          </linearGradient>
          <linearGradient id="hairGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b4423" />
            <stop offset="100%" stopColor="#4a3015" />
          </linearGradient>
          {/* Tear gradient */}
          <linearGradient id="tearGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#88ccff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#88ccff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Main group with posture transform */}
        <g
          transform={`translate(35, 45) ${postureTransform} translate(-35, -45)`}
          className="avatar-body-group"
        >
          {/* Body/Gown */}
          <ellipse
            cx="35"
            cy="78"
            rx="18"
            ry="12"
            fill="url(#gownGradient)"
            className={`avatar-chest ${breathingClass}`}
          />

          {/* Neck */}
          <rect
            x="31"
            y="62"
            width="8"
            height="10"
            rx="2"
            fill={skinColor}
            className="avatar-skin"
          />

          {/* Head */}
          <g className="avatar-head">
            {/* Hair back layer */}
            <ellipse
              cx="35"
              cy="40"
              rx="22"
              ry="20"
              fill="url(#hairGradient)"
            />

            {/* Face */}
            <ellipse
              cx="35"
              cy="48"
              rx="18"
              ry="17"
              fill={skinColor}
              className="avatar-skin avatar-face"
            />

            {/* Hair front - bangs */}
            <path
              d="M18,40 Q20,30 35,28 Q50,30 52,40 Q48,35 35,33 Q22,35 18,40"
              fill="url(#hairGradient)"
            />

            {/* Hair sides - pigtails hint */}
            <ellipse cx="14" cy="48" rx="5" ry="8" fill="url(#hairGradient)" />
            <ellipse cx="56" cy="48" rx="5" ry="8" fill="url(#hairGradient)" />

            {/* Eyebrows */}
            <path
              d="M23,39 Q27,37 31,39"
              fill="none"
              stroke="#6b4423"
              strokeWidth="1.5"
              strokeLinecap="round"
              transform={eyebrowOffset.left}
              className="avatar-eyebrow-left"
            />
            <path
              d="M39,39 Q43,37 47,39"
              fill="none"
              stroke="#6b4423"
              strokeWidth="1.5"
              strokeLinecap="round"
              transform={eyebrowOffset.right}
              className="avatar-eyebrow-right"
            />

            {/* Eyes */}
            <g className="avatar-eyes">
              {/* Eye whites */}
              {eyeState !== 'closed' && (
                <>
                  <ellipse cx="27" cy="45" rx="5" ry="4" fill="white" />
                  <ellipse cx="43" cy="45" rx="5" ry="4" fill="white" />
                </>
              )}

              {/* Irises/Pupils */}
              {eyeState !== 'closed' && eyeState !== 'squinting' && (
                <>
                  <circle cx="27" cy="45" r="2.5" fill="#5a3825" />
                  <circle cx="43" cy="45" r="2.5" fill="#5a3825" />
                  <circle cx="27.5" cy="44.5" r="1" fill="black" />
                  <circle cx="43.5" cy="44.5" r="1" fill="black" />
                  {/* Eye highlights */}
                  <circle cx="26" cy="44" r="0.8" fill="white" opacity="0.8" />
                  <circle cx="42" cy="44" r="0.8" fill="white" opacity="0.8" />
                </>
              )}

              {/* Eyelids for different states */}
              <path
                d={eyePath.left}
                fill="none"
                stroke={skinTone === 'cyanotic' ? '#8888a0' : '#333'}
                strokeWidth="1"
                className="avatar-eyelid-left"
              />
              <path
                d={eyePath.right}
                fill="none"
                stroke={skinTone === 'cyanotic' ? '#8888a0' : '#333'}
                strokeWidth="1"
                className="avatar-eyelid-right"
              />
            </g>

            {/* Tears */}
            {hasTears && (
              <g className="avatar-tears">
                <ellipse
                  cx="23"
                  cy="50"
                  rx="2"
                  ry="4"
                  fill="url(#tearGradient)"
                  className="tear tear-left"
                />
                <ellipse
                  cx="47"
                  cy="50"
                  rx="2"
                  ry="4"
                  fill="url(#tearGradient)"
                  className="tear tear-right"
                />
              </g>
            )}

            {/* Nose */}
            <g className="avatar-nose">
              <path
                d="M35,50 L33,54 Q35,55 37,54 L35,50"
                fill={skinTone === 'pink' ? '#e8c0a0' : skinColor}
                stroke="none"
              />
              {/* Nostrils - animate for nasal flaring */}
              <ellipse
                cx="33"
                cy="54"
                rx="1.5"
                ry="1"
                fill={skinTone === 'pink' ? '#d0a080' : '#c0a090'}
                className={`nostril nostril-left ${hasNasalFlaring ? 'flaring' : ''}`}
              />
              <ellipse
                cx="37"
                cy="54"
                rx="1.5"
                ry="1"
                fill={skinTone === 'pink' ? '#d0a080' : '#c0a090'}
                className={`nostril nostril-right ${hasNasalFlaring ? 'flaring' : ''}`}
              />
            </g>

            {/* Mouth */}
            <path
              d={mouthPath}
              fill="none"
              stroke={lipColor}
              strokeWidth="2"
              strokeLinecap="round"
              className="avatar-mouth"
            />

            {/* Cheeks - blush for healthy, less for unwell */}
            {skinTone === 'pink' && (
              <>
                <circle cx="22" cy="52" r="4" fill="#ffb0b0" opacity="0.3" />
                <circle cx="48" cy="52" r="4" fill="#ffb0b0" opacity="0.3" />
              </>
            )}
          </g>

          {/* Arms */}
          <g className="avatar-arms">
            {/* Left arm */}
            <path
              d="M20,72 Q12,78 15,85"
              fill="none"
              stroke={skinColor}
              strokeWidth="6"
              strokeLinecap="round"
              className="avatar-skin avatar-arm-left"
            />
            {/* Right arm - IV site */}
            <path
              d="M50,72 Q58,78 55,85"
              fill="none"
              stroke={skinColor}
              strokeWidth="6"
              strokeLinecap="round"
              className={`avatar-skin avatar-arm-right ${isFlinching ? 'arm-flinch' : ''}`}
            />
          </g>

          {/* Monitor leads hint */}
          <g className="avatar-monitor-leads" opacity="0.5">
            <circle cx="28" cy="72" r="2" fill="#e0e0e0" stroke="#888" strokeWidth="0.5" />
            <circle cx="42" cy="72" r="2" fill="#e0e0e0" stroke="#888" strokeWidth="0.5" />
            <circle cx="35" cy="80" r="2" fill="#e0e0e0" stroke="#888" strokeWidth="0.5" />
          </g>
        </g>

        {/* Fear indicator overlay (optional) */}
        {expression === 'distressed' && (
          <g className="avatar-distress-indicator" opacity="0.3">
            <text x="5" y="15" fontSize="10" fill="#ff6666">!</text>
          </g>
        )}
      </svg>
    </div>
  );
}

export default LilyAvatar;
