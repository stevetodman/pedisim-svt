// ============================================================================
// useAudio Hook - React integration for AudioEngine
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAudioEngine, type AudioEngineConfig } from './index';

interface AudioState {
  initialized: boolean;
  muted: boolean;
  spO2ToneEnabled: boolean;
}

interface UseAudioReturn {
  // State
  state: AudioState;

  // Initialization
  init: () => Promise<void>;

  // Heart/Monitor sounds
  startHeartbeat: (hr: number, spO2: number, isSVT?: boolean) => void;
  stopHeartbeat: () => void;
  updateVitals: (hr: number, spO2: number, isSVT?: boolean) => void;

  // Alarms
  silenceAlarms: () => void;

  // Procedural sounds
  playIVSound: (success: boolean) => Promise<void>;
  playIOSound: () => Promise<void>;
  playSedationSound: () => Promise<void>;
  playCry: (intensity: 'whimper' | 'short' | 'cry' | 'scream') => Promise<void>;
  playArtifact: () => void;

  // Special sequences
  playAdenosineSequence: (asystoleDurationMs: number, willConvert: boolean, newHR?: number) => Promise<void>;
  playCardioversionSequence: (willConvert: boolean, newHR?: number) => Promise<void>;
  startFlatline: () => void;
  stopFlatline: () => void;
  playSuccess: () => void;
  playError: () => void;

  // Settings
  setMuted: (muted: boolean) => void;
  setSpO2ToneEnabled: (enabled: boolean) => void;
  setVolume: (category: keyof AudioEngineConfig, volume: number) => void;

  // Cleanup
  stopAll: () => void;
}

export function useAudio(): UseAudioReturn {
  const [state, setState] = useState<AudioState>({
    initialized: false,
    muted: false,
    spO2ToneEnabled: true,
  });

  const lastHR = useRef<number>(0);
  const lastSpO2 = useRef<number>(100);
  const lastIsSVT = useRef<boolean>(false);

  const engine = getAudioEngine();

  // Initialize audio (call after user interaction)
  const init = useCallback(async () => {
    await engine.init();
    setState(prev => ({ ...prev, initialized: engine.isInitialized() }));
  }, [engine]);

  // Start heartbeat with SpO2-modulated pitch
  const startHeartbeat = useCallback((hr: number, spO2: number, isSVT: boolean = false) => {
    if (!engine.isInitialized() || state.muted) return;

    lastHR.current = hr;
    lastSpO2.current = spO2;
    lastIsSVT.current = isSVT;

    engine.startSpO2Beep(hr, spO2, { isSVT });

    // Start tachycardia alarm if needed
    if (isSVT && hr > 180) {
      engine.startTachyAlarm();
    }
  }, [engine, state.muted]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    engine.stopHeartBeep();
    engine.stopTachyAlarm();
    engine.stopSpO2Alarm();
  }, [engine]);

  // Update vitals (call when HR or SpO2 changes)
  const updateVitals = useCallback((hr: number, spO2: number, isSVT: boolean = false) => {
    if (!engine.isInitialized() || state.muted) return;

    // Update SpO2 (handles alarm triggering)
    engine.updateSpO2(spO2);

    // Only restart heartbeat if HR changed significantly
    if (Math.abs(hr - lastHR.current) > 5 || isSVT !== lastIsSVT.current) {
      lastHR.current = hr;
      lastIsSVT.current = isSVT;
      engine.startSpO2Beep(hr, spO2, { isSVT });
    }

    lastSpO2.current = spO2;
  }, [engine, state.muted]);

  // Silence all alarms
  const silenceAlarms = useCallback(() => {
    engine.silenceAllAlarms();
  }, [engine]);

  // Procedural sounds
  const playIVSound = useCallback(async (success: boolean) => {
    if (!engine.isInitialized() || state.muted) return;
    await engine.playIVInsertionSound(success);
  }, [engine, state.muted]);

  const playIOSound = useCallback(async () => {
    if (!engine.isInitialized() || state.muted) return;
    await engine.playIOInsertionSound();
  }, [engine, state.muted]);

  const playSedationSound = useCallback(async () => {
    if (!engine.isInitialized() || state.muted) return;
    await engine.playSedationSound();
  }, [engine, state.muted]);

  const playCry = useCallback(async (intensity: 'whimper' | 'short' | 'cry' | 'scream') => {
    if (!engine.isInitialized() || state.muted) return;
    await engine.playCrySound(intensity);
  }, [engine, state.muted]);

  const playArtifact = useCallback(() => {
    if (!engine.isInitialized() || state.muted) return;
    engine.playArtifactSound();
  }, [engine, state.muted]);

  // Special sequences
  const playAdenosineSequence = useCallback(async (
    asystoleDurationMs: number,
    willConvert: boolean,
    newHR?: number
  ) => {
    if (!engine.isInitialized() || state.muted) return;
    await engine.playAdenosineSequence(asystoleDurationMs, willConvert, newHR);
  }, [engine, state.muted]);

  const playCardioversionSequence = useCallback(async (
    willConvert: boolean,
    newHR?: number
  ) => {
    if (!engine.isInitialized() || state.muted) return;
    await engine.playCardioversionSequence(willConvert, newHR);
  }, [engine, state.muted]);

  const startFlatline = useCallback(() => {
    if (!engine.isInitialized() || state.muted) return;
    engine.startFlatline();
  }, [engine, state.muted]);

  const stopFlatline = useCallback(() => {
    engine.stopFlatline();
  }, [engine]);

  const playSuccess = useCallback(() => {
    if (!engine.isInitialized() || state.muted) return;
    engine.playSuccessChime();
  }, [engine, state.muted]);

  const playError = useCallback(() => {
    if (!engine.isInitialized() || state.muted) return;
    engine.playErrorTone();
  }, [engine, state.muted]);

  // Settings
  const setMuted = useCallback((muted: boolean) => {
    setState(prev => ({ ...prev, muted }));
    if (muted) {
      engine.stopAll();
    }
  }, [engine]);

  const setSpO2ToneEnabled = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, spO2ToneEnabled: enabled }));
    engine.setSpO2ToneEnabled(enabled);
  }, [engine]);

  const setVolume = useCallback((category: keyof AudioEngineConfig, volume: number) => {
    if (category === 'masterVolume') {
      engine.setMasterVolume(volume);
    }
    // Other categories would need to be added to AudioEngine
  }, [engine]);

  // Stop all sounds
  const stopAll = useCallback(() => {
    engine.stopAll();
  }, [engine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engine.stopAll();
    };
  }, [engine]);

  return {
    state,
    init,
    startHeartbeat,
    stopHeartbeat,
    updateVitals,
    silenceAlarms,
    playIVSound,
    playIOSound,
    playSedationSound,
    playCry,
    playArtifact,
    playAdenosineSequence,
    playCardioversionSequence,
    startFlatline,
    stopFlatline,
    playSuccess,
    playError,
    setMuted,
    setSpO2ToneEnabled,
    setVolume,
    stopAll,
  };
}

export default useAudio;
