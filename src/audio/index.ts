// ============================================================================
// AUDIO ENGINE
// Web Audio API for procedural medical sound generation
// ============================================================================

export interface AudioEngineConfig {
  masterVolume: number;
  heartBeepVolume: number;
  alarmVolume: number;
  procedureVolume: number;
  patientVolume: number;
  spO2ToneEnabled: boolean;
}

const DEFAULT_CONFIG: AudioEngineConfig = {
  masterVolume: 1.0,
  heartBeepVolume: 0.3,
  alarmVolume: 0.15,
  procedureVolume: 0.25,
  patientVolume: 0.2,
  spO2ToneEnabled: true,
};

// SpO2 to frequency mapping (pitch drops with desaturation)
// 100% = 880Hz (bright), 80% = 440Hz (ominous)
function spO2ToFrequency(spO2: number): number {
  const normalizedSpO2 = Math.max(80, Math.min(100, spO2));
  // Logarithmic scaling for more dramatic drop at low values
  const t = (normalizedSpO2 - 80) / 20; // 0 to 1
  return 440 + (440 * Math.pow(t, 0.7)); // 440-880Hz
}

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

  // SpO2 and alarm state
  private currentSpO2: number = 100;
  private spO2AlarmOsc: OscillatorNode | null = null;
  private spO2AlarmGain: GainNode | null = null;
  private spO2AlarmInterval: ReturnType<typeof setInterval> | null = null;
  private silencedAlarms: Map<string, number> = new Map();
  private readonly SILENCE_DURATION = 60000; // 1 minute

  // Procedural sounds state
  private ioDrillOsc: OscillatorNode | null = null;
  private ioDrillGain: GainNode | null = null;
  private ioDrillLFO: OscillatorNode | null = null;

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
  // SPO2-AWARE HEART BEEP (pitch changes with oxygen saturation)
  // ============================================================================

  /**
   * Start SpO2-modulated heart beep
   * Pitch drops as SpO2 falls (clinical monitor behavior)
   */
  startSpO2Beep(heartRate: number, spO2: number, options: {
    isSVT?: boolean;
    volume?: number;
  } = {}): void {
    this.stopHeartBeep();

    if (heartRate === 0) return;

    this.currentSpO2 = spO2;
    const { isSVT = false, volume } = options;
    const msPerBeat = 60000 / heartRate;

    // Use SpO2-modulated frequency if enabled, else standard
    const frequency = this.config.spO2ToneEnabled
      ? spO2ToFrequency(spO2)
      : (isSVT ? 932 : 880);

    const beepVolume = volume ?? this.config.heartBeepVolume;

    // Play initial beep
    this.playBeep({ frequency, volume: beepVolume });

    // Start interval with current SpO2 frequency
    this.heartBeepInterval = setInterval(() => {
      const currentFreq = this.config.spO2ToneEnabled
        ? spO2ToFrequency(this.currentSpO2)
        : (isSVT ? 932 : 880);
      this.playBeep({ frequency: currentFreq, volume: beepVolume });
    }, msPerBeat);
  }

  /**
   * Update SpO2 value for pitch modulation
   */
  updateSpO2(spO2: number): void {
    this.currentSpO2 = spO2;

    // Check if SpO2 alarm should trigger
    if (spO2 < 90 && !this.isAlarmSilenced('spo2_low')) {
      this.startSpO2Alarm(spO2 < 85 ? 'critical' : 'low');
    } else if (spO2 >= 90) {
      this.stopSpO2Alarm();
    }
  }

  /**
   * Toggle SpO2 tone feature
   */
  setSpO2ToneEnabled(enabled: boolean): void {
    this.config.spO2ToneEnabled = enabled;
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

  /**
   * Start SpO2 low alarm
   * Low: tri-tone descending | Critical: rapid beeping
   */
  startSpO2Alarm(severity: 'low' | 'critical'): void {
    this.stopSpO2Alarm();

    if (!this.ctx || !this.masterGain) return;
    if (this.isAlarmSilenced('spo2_low')) return;

    if (severity === 'critical') {
      // Rapid high-pitched beeping for critical SpO2
      this.spO2AlarmInterval = setInterval(() => {
        this.playBeep({ frequency: 1200, duration: 0.08, volume: this.config.alarmVolume });
      }, 200);
    } else {
      // Tri-tone descending pattern for low SpO2
      const playTriTone = () => {
        this.playBeep({ frequency: 880, duration: 0.15, volume: this.config.alarmVolume });
        setTimeout(() => {
          this.playBeep({ frequency: 660, duration: 0.15, volume: this.config.alarmVolume });
        }, 180);
        setTimeout(() => {
          this.playBeep({ frequency: 440, duration: 0.2, volume: this.config.alarmVolume });
        }, 360);
      };
      playTriTone();
      this.spO2AlarmInterval = setInterval(playTriTone, 2000);
    }
  }

  /**
   * Stop SpO2 alarm
   */
  stopSpO2Alarm(): void {
    if (this.spO2AlarmInterval) {
      clearInterval(this.spO2AlarmInterval);
      this.spO2AlarmInterval = null;
    }
    if (this.spO2AlarmOsc) {
      try { this.spO2AlarmOsc.stop(); } catch {}
      this.spO2AlarmOsc.disconnect();
      this.spO2AlarmOsc = null;
    }
    if (this.spO2AlarmGain) {
      this.spO2AlarmGain.disconnect();
      this.spO2AlarmGain = null;
    }
  }

  /**
   * Check if an alarm is silenced
   */
  isAlarmSilenced(alarmType: string): boolean {
    const silencedAt = this.silencedAlarms.get(alarmType);
    if (!silencedAt) return false;
    if (Date.now() - silencedAt > this.SILENCE_DURATION) {
      this.silencedAlarms.delete(alarmType);
      return false;
    }
    return true;
  }

  /**
   * Silence an alarm for SILENCE_DURATION
   */
  silenceAlarm(alarmType: string): void {
    this.silencedAlarms.set(alarmType, Date.now());
    if (alarmType === 'spo2_low') {
      this.stopSpO2Alarm();
    } else if (alarmType === 'tachy') {
      this.stopTachyAlarm();
    }
  }

  /**
   * Silence all alarms
   */
  silenceAllAlarms(): void {
    this.silenceAlarm('spo2_low');
    this.silenceAlarm('tachy');
    this.stopSpO2Alarm();
    this.stopTachyAlarm();
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
  // PROCEDURAL SOUNDS
  // ============================================================================

  /**
   * Play IV insertion sound sequence
   * Alcohol swab → tourniquet → needle insertion → tape
   */
  async playIVInsertionSound(success: boolean): Promise<void> {
    if (!this.ctx || !this.masterGain) return;

    const volume = this.config.procedureVolume;

    // Alcohol swab (soft noise swish)
    await this.playNoiseSwish(0.3, volume * 0.5);
    await this.sleep(300);

    // Tourniquet snap
    this.playBeep({ frequency: 150, duration: 0.05, volume: volume * 0.8, type: 'square' });
    await this.sleep(500);

    // Needle insertion (subtle click)
    this.playBeep({ frequency: 2000, duration: 0.02, volume: volume * 0.3 });
    await this.sleep(100);

    if (success) {
      // Tape sounds
      await this.playNoiseSwish(0.2, volume * 0.3);
    } else {
      // Brief cry (synthesized whimper)
      await this.playCrySound('short');
    }
  }

  /**
   * Play IO insertion sound sequence
   * The distinctive EZ-IO drill sound
   */
  async playIOInsertionSound(): Promise<void> {
    if (!this.ctx || !this.masterGain) return;

    // Skin prep
    await this.playNoiseSwish(0.2, this.config.procedureVolume * 0.3);
    await this.sleep(500);

    // Start IO drill sound
    await this.playIODrillSound(3000); // 3 seconds of drilling

    // Pop sound (cortex breach)
    this.playBeep({ frequency: 100, duration: 0.08, volume: this.config.procedureVolume * 0.6, type: 'square' });

    // Child scream (brief)
    await this.playCrySound('scream');
  }

  /**
   * Play IO drill sound (motorized whir)
   */
  private async playIODrillSound(durationMs: number): Promise<void> {
    if (!this.ctx || !this.masterGain) return;

    const volume = this.config.procedureVolume;

    // Main drill oscillator (800Hz with vibrato)
    this.ioDrillOsc = this.ctx.createOscillator();
    this.ioDrillGain = this.ctx.createGain();

    // LFO for vibrato
    this.ioDrillLFO = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    this.ioDrillLFO.connect(lfoGain);
    lfoGain.connect(this.ioDrillOsc.frequency);

    this.ioDrillOsc.connect(this.ioDrillGain);
    this.ioDrillGain.connect(this.masterGain);

    this.ioDrillOsc.type = 'sawtooth';
    this.ioDrillOsc.frequency.value = 800;
    this.ioDrillGain.gain.value = volume * 0.4;

    this.ioDrillLFO.type = 'sine';
    this.ioDrillLFO.frequency.value = 15; // 15Hz vibrato
    lfoGain.gain.value = 50; // ±50Hz modulation

    this.ioDrillOsc.start();
    this.ioDrillLFO.start();

    // Gradually increase pitch (resistance increasing)
    const now = this.ctx.currentTime;
    this.ioDrillOsc.frequency.setValueAtTime(800, now);
    this.ioDrillOsc.frequency.linearRampToValueAtTime(1200, now + durationMs / 1000);

    await this.sleep(durationMs);

    // Stop drill
    try { this.ioDrillOsc?.stop(); } catch {}
    try { this.ioDrillLFO?.stop(); } catch {}
    this.ioDrillOsc?.disconnect();
    this.ioDrillGain?.disconnect();
    this.ioDrillLFO?.disconnect();
    this.ioDrillOsc = null;
    this.ioDrillGain = null;
    this.ioDrillLFO = null;
  }

  /**
   * Play sedation push sound
   * Syringe aspiration → slow push → flush
   */
  async playSedationSound(): Promise<void> {
    if (!this.ctx || !this.masterGain) return;

    const volume = this.config.procedureVolume * 0.5;

    // Syringe aspiration (soft hydraulic)
    await this.playNoiseSwish(0.3, volume);
    await this.sleep(500);

    // Slow push (gentle flowing)
    await this.playNoiseSwish(1.0, volume * 0.7);
    await this.sleep(200);

    // Flush (faster flow)
    await this.playNoiseSwish(0.5, volume * 0.8);
  }

  /**
   * Play crying/distress sound
   */
  async playCrySound(intensity: 'whimper' | 'short' | 'cry' | 'scream'): Promise<void> {
    if (!this.ctx || !this.masterGain) return;

    const volume = this.config.patientVolume;
    const baseFreq = 350; // Child voice fundamental

    const durationMap = {
      whimper: 200,
      short: 400,
      cry: 800,
      scream: 600,
    };

    const volumeMap = {
      whimper: 0.3,
      short: 0.5,
      cry: 0.7,
      scream: 1.0,
    };

    const duration = durationMap[intensity] / 1000;
    const vol = volume * volumeMap[intensity];

    // Create modulated tone for crying sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'sine';
    osc.frequency.value = baseFreq;

    lfo.type = 'sine';
    lfo.frequency.value = intensity === 'scream' ? 8 : 5; // Faster modulation for scream
    lfoGain.gain.value = intensity === 'scream' ? 100 : 50;

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // Pitch contour (rises then falls for natural cry)
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.3, now + duration * 0.3);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.8, now + duration);

    osc.start();
    lfo.start();
    osc.stop(now + duration);
    lfo.stop(now + duration);

    await this.sleep(durationMap[intensity]);
  }

  /**
   * Play filtered noise swish (for swab, tape sounds)
   */
  private async playNoiseSwish(durationSec: number, volume: number): Promise<void> {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * durationSec;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate filtered noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // Low-pass filter for softer sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.05);
    gain.gain.setValueAtTime(volume, now + durationSec - 0.1);
    gain.gain.linearRampToValueAtTime(0, now + durationSec);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start();
    await this.sleep(durationSec * 1000);
  }

  /**
   * Play monitor artifact sound (motion interference)
   */
  playArtifactSound(): void {
    if (!this.ctx || !this.masterGain) return;

    // Short burst of noise
    const duration = 0.1;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.2;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.1;

    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  /**
   * Helper: sleep for ms
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    this.stopSpO2Alarm();
    this.stopFlatline();
    this.stopRealisticCharging();
    this.stopReadyTone();
    // Stop IO drill if running
    try { this.ioDrillOsc?.stop(); } catch {}
    try { this.ioDrillLFO?.stop(); } catch {}
    this.ioDrillOsc?.disconnect();
    this.ioDrillGain?.disconnect();
    this.ioDrillLFO?.disconnect();
    this.ioDrillOsc = null;
    this.ioDrillGain = null;
    this.ioDrillLFO = null;
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
