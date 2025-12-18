// ============================================================================
// AUDIO ENGINE
// Web Audio API for procedural medical sound generation
// ============================================================================

export interface AudioEngineConfig {
  masterVolume: number;
  heartBeepVolume: number;
  alarmVolume: number;
}

const DEFAULT_CONFIG: AudioEngineConfig = {
  masterVolume: 1.0,
  heartBeepVolume: 0.3,
  alarmVolume: 0.15,
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private config: AudioEngineConfig;
  private initialized = false;

  // Active sound sources
  private heartBeepInterval: ReturnType<typeof setInterval> | null = null;
  private flatlineOsc: OscillatorNode | null = null;
  private flatlineGain: GainNode | null = null;
  private alarmOsc: OscillatorNode | null = null;
  private alarmGain: GainNode | null = null;
  private alarmPulseInterval: ReturnType<typeof setInterval> | null = null;

  // Defibrillator-specific
  private chargingOsc: OscillatorNode | null = null;
  private chargingGain: GainNode | null = null;
  private chargingHarmonicOsc: OscillatorNode | null = null;
  private readyToneInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<AudioEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.config.masterVolume;
    this.masterGain.connect(this.ctx.destination);
    
    // Resume if suspended (autoplay policy)
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.initialized = true;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.config.masterVolume;
    }
  }

  // ============================================================================
  // HEART BEEP SOUNDS
  // ============================================================================

  /**
   * Play a single cardiac beep
   */
  playBeep(options: {
    frequency?: number;
    duration?: number;
    volume?: number;
    type?: OscillatorType;
  } = {}): void {
    if (!this.ctx || !this.masterGain) return;

    const {
      frequency = 880,
      duration = 0.08,
      volume = this.config.heartBeepVolume,
      type = 'sine'
    } = options;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.frequency.value = frequency;
    osc.type = type;

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  /**
   * Start continuous heart rate beeping
   */
  startHeartBeep(heartRate: number, options: {
    isSVT?: boolean;
    volume?: number;
  } = {}): void {
    this.stopHeartBeep();

    if (heartRate === 0) return;

    const { isSVT = false, volume } = options;
    const msPerBeat = 60000 / heartRate;
    const frequency = isSVT ? 932 : 880;  // Higher pitch for SVT
    const beepVolume = volume ?? (isSVT ? 0.25 : this.config.heartBeepVolume);

    // Play initial beep
    this.playBeep({ frequency, volume: beepVolume });

    // Start interval
    this.heartBeepInterval = setInterval(() => {
      this.playBeep({ frequency, volume: beepVolume });
    }, msPerBeat);
  }

  /**
   * Stop heart rate beeping
   */
  stopHeartBeep(): void {
    if (this.heartBeepInterval) {
      clearInterval(this.heartBeepInterval);
      this.heartBeepInterval = null;
    }
  }

  /**
   * Update heart rate beep frequency
   */
  updateHeartRate(heartRate: number, isSVT: boolean = false): void {
    const wasPlaying = this.heartBeepInterval !== null;
    if (wasPlaying) {
      this.startHeartBeep(heartRate, { isSVT });
    }
  }

  // ============================================================================
  // ALARM SOUNDS
  // ============================================================================

  /**
   * Start tachycardia alarm (pulsing dual-tone)
   */
  startTachyAlarm(): void {
    this.stopTachyAlarm();

    if (!this.ctx || !this.masterGain) return;

    this.alarmOsc = this.ctx.createOscillator();
    this.alarmGain = this.ctx.createGain();

    this.alarmOsc.connect(this.alarmGain);
    this.alarmGain.connect(this.masterGain);

    this.alarmOsc.type = 'square';
    this.alarmOsc.frequency.value = 660;
    this.alarmGain.gain.value = this.config.alarmVolume;

    this.alarmOsc.start();

    // Pulse between two tones
    this.alarmPulseInterval = setInterval(() => {
      if (this.alarmOsc) {
        this.alarmOsc.frequency.value = 
          this.alarmOsc.frequency.value === 660 ? 550 : 660;
      }
    }, 400);
  }

  /**
   * Stop tachycardia alarm
   */
  stopTachyAlarm(): void {
    if (this.alarmOsc) {
      this.alarmOsc.stop();
      this.alarmOsc.disconnect();
      this.alarmOsc = null;
    }
    if (this.alarmGain) {
      this.alarmGain.disconnect();
      this.alarmGain = null;
    }
    if (this.alarmPulseInterval) {
      clearInterval(this.alarmPulseInterval);
      this.alarmPulseInterval = null;
    }
  }

  // ============================================================================
  // FLATLINE / ASYSTOLE
  // ============================================================================

  /**
   * Start flatline tone (continuous, ominous)
   */
  startFlatline(): void {
    this.stopHeartBeep();
    this.stopTachyAlarm();
    this.stopFlatline();

    if (!this.ctx || !this.masterGain) return;

    this.flatlineOsc = this.ctx.createOscillator();
    this.flatlineGain = this.ctx.createGain();

    this.flatlineOsc.connect(this.flatlineGain);
    this.flatlineGain.connect(this.masterGain);

    this.flatlineOsc.frequency.value = 440;
    this.flatlineOsc.type = 'sine';
    this.flatlineGain.gain.value = 0.2;

    this.flatlineOsc.start();
  }

  /**
   * Stop flatline tone
   */
  stopFlatline(): void {
    if (this.flatlineOsc) {
      this.flatlineOsc.stop();
      this.flatlineOsc.disconnect();
      this.flatlineOsc = null;
    }
    if (this.flatlineGain) {
      this.flatlineGain.disconnect();
      this.flatlineGain = null;
    }
  }

  // ============================================================================
  // SPECIAL EFFECTS
  // ============================================================================

  /**
   * Play defibrillator charge whine
   */
  async playChargeSound(durationMs: number = 2000): Promise<void> {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'sawtooth';
    
    const startTime = this.ctx.currentTime;
    const endTime = startTime + durationMs / 1000;

    osc.frequency.setValueAtTime(200, startTime);
    osc.frequency.exponentialRampToValueAtTime(2000, endTime);

    gain.gain.setValueAtTime(0.1, startTime);
    gain.gain.setValueAtTime(0.1, endTime - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, endTime);

    osc.start();
    osc.stop(endTime);

    return new Promise(resolve => setTimeout(resolve, durationMs));
  }

  /**
   * Play defibrillator shock sound
   */
  playShockSound(): void {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'sawtooth';
    osc.frequency.value = 100;

    const startTime = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.5, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

    osc.start();
    osc.stop(startTime + 0.15);
  }

  /**
   * Play success chime (conversion)
   */
  playSuccessChime(): void {
    const notes = [523, 659, 784];  // C5, E5, G5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playBeep({ frequency: freq, duration: 0.2, volume: 0.2 });
      }, i * 150);
    });
  }

  /**
   * Play error/warning tone
   */
  playErrorTone(): void {
    this.playBeep({ frequency: 200, duration: 0.3, volume: 0.3, type: 'square' });
  }

  // ============================================================================
  // REALISTIC DEFIBRILLATOR SOUNDS
  // ============================================================================

  /**
   * Start realistic charging whine with progress callback
   * Frequency sweep from 200Hz to 2500Hz with harmonic overtone
   */
  startRealisticCharging(
    targetEnergy: number,
    onProgress: (percent: number) => void
  ): Promise<void> {
    if (!this.ctx || !this.masterGain) return Promise.resolve();

    this.stopRealisticCharging();

    // Calculate charge time based on energy (1.5s to 4s)
    const duration = 1500 + (targetEnergy / 200) * 2500;
    const durationSec = duration / 1000;

    // Main charging oscillator
    this.chargingOsc = this.ctx.createOscillator();
    this.chargingGain = this.ctx.createGain();

    this.chargingOsc.connect(this.chargingGain);
    this.chargingGain.connect(this.masterGain);

    this.chargingOsc.type = 'sawtooth';
    const startTime = this.ctx.currentTime;
    const endTime = startTime + durationSec;

    // Frequency sweep 200Hz → 2500Hz
    this.chargingOsc.frequency.setValueAtTime(200, startTime);
    this.chargingOsc.frequency.exponentialRampToValueAtTime(2500, endTime);

    // Volume ramp 0.08 → 0.15
    this.chargingGain.gain.setValueAtTime(0.08, startTime);
    this.chargingGain.gain.linearRampToValueAtTime(0.15, endTime);

    // Harmonic overtone (octave up, 30% mix)
    this.chargingHarmonicOsc = this.ctx.createOscillator();
    const harmonicGain = this.ctx.createGain();

    this.chargingHarmonicOsc.connect(harmonicGain);
    harmonicGain.connect(this.masterGain);

    this.chargingHarmonicOsc.type = 'sawtooth';
    this.chargingHarmonicOsc.frequency.setValueAtTime(400, startTime);
    this.chargingHarmonicOsc.frequency.exponentialRampToValueAtTime(5000, endTime);
    harmonicGain.gain.value = 0.03;

    this.chargingOsc.start();
    this.chargingHarmonicOsc.start();

    // Progress tracking
    const progressStart = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - progressStart;
      const percent = Math.min(100, (elapsed / duration) * 100);
      onProgress(percent);
      if (percent >= 100) {
        clearInterval(progressInterval);
      }
    }, 50);

    return new Promise(resolve => {
      setTimeout(() => {
        this.stopRealisticCharging();
        resolve();
      }, duration);
    });
  }

  /**
   * Stop charging sound
   */
  stopRealisticCharging(): void {
    if (this.chargingOsc) {
      try { this.chargingOsc.stop(); } catch {}
      this.chargingOsc.disconnect();
      this.chargingOsc = null;
    }
    if (this.chargingGain) {
      this.chargingGain.disconnect();
      this.chargingGain = null;
    }
    if (this.chargingHarmonicOsc) {
      try { this.chargingHarmonicOsc.stop(); } catch {}
      this.chargingHarmonicOsc.disconnect();
      this.chargingHarmonicOsc = null;
    }
  }

  /**
   * Start ready tone (pulsing 880Hz beep when charged)
   */
  startReadyTone(): void {
    this.stopReadyTone();

    this.readyToneInterval = setInterval(() => {
      this.playBeep({ frequency: 880, duration: 0.15, volume: 0.2 });
    }, 300);
  }

  /**
   * Stop ready tone
   */
  stopReadyTone(): void {
    if (this.readyToneInterval) {
      clearInterval(this.readyToneInterval);
      this.readyToneInterval = null;
    }
  }

  /**
   * Play realistic shock discharge sound
   * Combines white noise click + low frequency thump + body artifact
   */
  playRealisticShock(): void {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // 1. White noise click (10ms)
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.01, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseGain = this.ctx.createGain();
    noiseSource.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
    noiseSource.start(now);
    noiseSource.stop(now + 0.01);

    // 2. Low frequency thump (80Hz, 100ms decay)
    const thumpOsc = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.masterGain);
    thumpOsc.type = 'sine';
    thumpOsc.frequency.value = 80;
    thumpGain.gain.setValueAtTime(0.5, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.15);

    // 3. Body artifact rumble (30Hz, 50ms)
    const rumbleOsc = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    rumbleOsc.type = 'sine';
    rumbleOsc.frequency.value = 30;
    rumbleGain.gain.setValueAtTime(0.2, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    rumbleOsc.start(now);
    rumbleOsc.stop(now + 0.05);
  }

  /**
   * Play sync marker beep (quick beep on R-wave detection)
   */
  playSyncMarker(): void {
    this.playBeep({ frequency: 1000, duration: 0.03, volume: 0.1 });
  }

  /**
   * Play analyzing rhythm sound (beeps while analyzing)
   */
  async playAnalyzingSequence(durationMs: number = 4000): Promise<void> {
    const intervalId = setInterval(() => {
      this.playBeep({ frequency: 600, duration: 0.1, volume: 0.15 });
    }, 800);

    return new Promise(resolve => {
      setTimeout(() => {
        clearInterval(intervalId);
        resolve();
      }, durationMs);
    });
  }

  // ============================================================================
  // COMPLEX SEQUENCES
  // ============================================================================

  /**
   * Play the full adenosine sequence
   */
  async playAdenosineSequence(
    asystoleDurationMs: number,
    willConvert: boolean,
    newHeartRate?: number
  ): Promise<void> {
    // Stop current sounds
    this.stopHeartBeep();
    this.stopTachyAlarm();

    // Start flatline
    this.startFlatline();

    // Wait for asystole duration
    await new Promise(resolve => setTimeout(resolve, asystoleDurationMs));

    // Stop flatline
    this.stopFlatline();

    if (willConvert) {
      // Success!
      this.playSuccessChime();
      await new Promise(resolve => setTimeout(resolve, 500));
      this.startHeartBeep(newHeartRate || 88, { isSVT: false });
    } else {
      // Back to SVT
      this.playErrorTone();
      await new Promise(resolve => setTimeout(resolve, 200));
      this.startHeartBeep(newHeartRate || 218, { isSVT: true });
      this.startTachyAlarm();
    }
  }

  /**
   * Play cardioversion sequence
   */
  async playCardioversionSequence(willConvert: boolean, newHeartRate?: number): Promise<void> {
    this.stopHeartBeep();
    this.stopTachyAlarm();

    // Charge whine
    await this.playChargeSound(2000);

    // Shock
    this.playShockSound();

    // Brief pause
    await new Promise(resolve => setTimeout(resolve, 500));

    if (willConvert) {
      this.playSuccessChime();
      await new Promise(resolve => setTimeout(resolve, 500));
      this.startHeartBeep(newHeartRate || 85, { isSVT: false });
    } else {
      this.playErrorTone();
      await new Promise(resolve => setTimeout(resolve, 200));
      this.startHeartBeep(newHeartRate || 220, { isSVT: true });
      this.startTachyAlarm();
    }
  }

  // ============================================================================
  // ALIASES (for compatibility with hooks)
  // ============================================================================

  startHeartbeat(hr: number, isSVT: boolean = false): void {
    this.startHeartBeep(hr, { isSVT });
  }

  stopHeartbeat(): void {
    this.stopHeartBeep();
  }

  startAlarm(): void {
    this.startTachyAlarm();
  }

  stopAlarm(): void {
    this.stopTachyAlarm();
  }

  playSuccess(): void {
    this.playSuccessChime();
  }

  playError(): void {
    this.playErrorTone();
  }

  playCharge(): void {
    this.playChargeSound(1500);
  }

  playShock(): void {
    this.playShockSound();
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Stop all sounds
   */
  stopAll(): void {
    this.stopHeartBeep();
    this.stopTachyAlarm();
    this.stopFlatline();
    this.stopRealisticCharging();
    this.stopReadyTone();
  }

  /**
   * Cleanup and close audio context
   */
  destroy(): void {
    this.stopAll();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}

// Export singleton instance
let audioEngineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine();
  }
  return audioEngineInstance;
}

export function resetAudioEngine(): void {
  if (audioEngineInstance) {
    audioEngineInstance.destroy();
    audioEngineInstance = null;
  }
}
