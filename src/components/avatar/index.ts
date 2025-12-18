/**
 * Avatar Component Exports
 */

export { LilyAvatar, default } from './LilyAvatar';
export { mapSimulationToAvatar, getBreathDuration, getBreathingClass } from './stateMapper';
export type { SimulationStateForAvatar, SimPhase, DeteriorationStage } from './stateMapper';
export type {
  AvatarState,
  Posture,
  Expression,
  SkinTone,
  EyeState,
  RespiratoryEffort,
} from './types';
export { DEFAULT_AVATAR_STATE, SKIN_COLORS, LIP_COLORS } from './types';
