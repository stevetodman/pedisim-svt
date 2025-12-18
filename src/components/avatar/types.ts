/**
 * Avatar Types - Defines visual states for Lily's avatar
 */

export type Posture = 'sitting' | 'leaning' | 'lying' | 'limp';
export type Expression = 'neutral' | 'worried' | 'scared' | 'distressed' | 'exhausted' | 'relief' | 'sleepy';
export type SkinTone = 'pink' | 'pale' | 'mottled' | 'gray' | 'cyanotic';
export type EyeState = 'open' | 'wide' | 'squinting' | 'half-closed' | 'closed';
export type RespiratoryEffort = 'normal' | 'increased' | 'labored' | 'shallow' | 'none';

export interface AvatarState {
  // Core state
  posture: Posture;
  expression: Expression;

  // Skin
  skinTone: SkinTone;

  // Eyes
  eyeState: EyeState;
  hasTears: boolean;

  // Breathing
  respiratoryRate: number;
  respiratoryEffort: RespiratoryEffort;
  hasRetractions: boolean;
  hasNasalFlaring: boolean;

  // Procedural overlays
  isReceivingIV: boolean;
  isReceivingIO: boolean;
  isFlinching: boolean;
  isSedated: boolean;
}

// Default avatar state (healthy, calm)
export const DEFAULT_AVATAR_STATE: AvatarState = {
  posture: 'sitting',
  expression: 'neutral',
  skinTone: 'pink',
  eyeState: 'open',
  hasTears: false,
  respiratoryRate: 20,
  respiratoryEffort: 'normal',
  hasRetractions: false,
  hasNasalFlaring: false,
  isReceivingIV: false,
  isReceivingIO: false,
  isFlinching: false,
  isSedated: false,
};

// Skin tone hex colors
export const SKIN_COLORS: Record<SkinTone, string> = {
  pink: '#ffdbac',      // Healthy warm tone
  pale: '#f5e6d3',      // Slightly pale
  mottled: '#e8dcd0',   // Mottled/dusky
  gray: '#d0c8c0',      // Poor perfusion
  cyanotic: '#b8c4d0',  // Blue-gray tint
};

// Lip colors based on skin tone
export const LIP_COLORS: Record<SkinTone, string> = {
  pink: '#e8a0a0',      // Healthy pink
  pale: '#d8a0a0',      // Slightly pale
  mottled: '#c09090',   // Dusky
  gray: '#a08888',      // Poor perfusion
  cyanotic: '#8888a0',  // Cyanotic
};
