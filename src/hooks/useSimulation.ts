// ============================================================================
// USE SIMULATION HOOK
// Main orchestration of simulation state, audio, characters, and tracking
// ============================================================================

import { useState, useRef, useCallback, useEffect } from 'react';

// Vagal maneuver technique types
export type VagalTechnique = 'valsalva' | 'blow_thumb' | 'bearing_down' | 'gag';
import { AudioEngine } from '../audio';
import {
  evaluateAdenosineOrder,
  evaluateCardioversionOrder,
  calcAdenosineSuccess,
  calcCardioversionSuccess,
} from '../kernel/nurse';
import { StateSnapshot } from '../kernel/evaluation/types';
import { ReconstructionInput } from '../kernel/evaluation/timeline';
import { getCharacterResponse, DialogueRequest } from '../api/characterAI';
import { CharacterState } from '../characters';
import {
  calculateSVTVitals,
  calculateAsystoleVitals,
  calculateRecoveryVitals,
  getDeteriorationStage,
  formatBP,
  type DeteriorationState,
} from '../kernel/deterioration';
import {
  type SedationState,
  type AdenosinePhase,
  getNextSedationState,
  getSedationPhaseDuration,
  getAdenosinePhaseDuration,
} from '../kernel/pharmacokinetics';
import {
  type IVAccessState,
  type IOAccessState,
  type IVAttempt,
  rollIVOutcome,
  getIVAttemptDuration,
  getIVNurseDialogue,
  getLilyIVReaction,
  getMarkIVReaction,
  getIONurseDialogue,
  getLilyIOReaction,
  getMarkIOReaction,
  getAvailableSites,
  formatSiteName,
  IO_TIMING,
} from '../kernel/procedures';

// Types
export type SimPhase = 'IDLE' | 'RUNNING' | 'ASYSTOLE' | 'CONVERTED';
export type Rhythm = 'SVT' | 'SINUS' | 'ASYSTOLE';

export interface Vitals {
  hr: number;
  spo2: number;
  bp: string;
  rr: number;
}

export interface Message {
  who: 'lily' | 'mark' | 'nurse' | 'doctor' | 'system';
  text: string;
  time: number;
}

export interface ActionLogEntry {
  type: string;
  time: number;
  executed: boolean;
  given?: number;
  correct?: number;
  unit?: string;
  attemptNum?: number;
  result?: 'pending' | 'success' | 'failed';
}

export interface NurseCatch {
  drug: string;
  attempted: number;
  unit: string;
  reason: string;
  time: number;
}

export interface CommLog {
  toFamily: number;
  duringCrisis: number;
  explanations: number;
}

export interface PendingAction {
  type: 'adenosine' | 'cardioversion';
  dose?: number;
  joules?: number;
}

// Patient data
const PATIENT = { name: 'Lily Henderson', age: 5, weight: 18.5 };

export function useSimulation() {
  // Core state
  const [phase, setPhase] = useState<SimPhase>('IDLE');
  const [rhythm, setRhythm] = useState<Rhythm>('SVT');
  const [vitals, setVitals] = useState<Vitals>({ hr: 220, spo2: 97, bp: '92/64', rr: 26 });
  const [messages, setMessages] = useState<Message[]>([]);
  const [elapsed, setElapsed] = useState(0);

  // Treatment state
  const [adenosineCount, setAdenosineCount] = useState(0);
  const [cardioversionCount, setCardioversionCount] = useState(0);
  const [sedated, setSedated] = useState(false);

  // Access state - simple flags for whether access exists
  const [ivAccess, setIvAccess] = useState(false);
  const [ioAccess, setIoAccess] = useState(false);

  // IV/IO procedure state machine
  const [ivAccessState, setIvAccessState] = useState<IVAccessState>('NOT_ATTEMPTED');
  const [ioAccessState, setIoAccessState] = useState<IOAccessState>('NOT_ATTEMPTED');
  const [ivAttempts, setIvAttempts] = useState<IVAttempt[]>([]);
  const [currentIVSite, setCurrentIVSite] = useState<string | null>(null);
  const [ivAttemptStart, setIvAttemptStart] = useState<number | null>(null);
  const [ivAttemptDuration, setIvAttemptDuration] = useState<number>(0);
  const [pendingIVOutcome, setPendingIVOutcome] = useState<{
    success: boolean;
    difficult: boolean;
    reason?: string;
  } | null>(null);
  const [showIOChoice, setShowIOChoice] = useState(false);

  // Character state
  const [markAnxiety, setMarkAnxiety] = useState(3);
  const [lilyFear, setLilyFear] = useState(4);

  // Debrief tracking
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [nurseCatches, setNurseCatches] = useState<NurseCatch[]>([]);
  const [commLog, setCommLog] = useState<CommLog>({ toFamily: 0, duringCrisis: 0, explanations: 0 });
  const [timeToConversion, setTimeToConversion] = useState<number | null>(null);

  // UI state
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [asystoleActive, setAsystoleActive] = useState(false);

  // WPW follow-up ECG state
  // After conversion, ordering a follow-up ECG reveals the underlying WPW pattern
  const [wpwRevealed, setWpwRevealed] = useState(false);

  // Physiologic realism state
  const [deteriorationStage, setDeteriorationStage] = useState<DeteriorationState['stage']>('compensated');
  const [conversionTime, setConversionTime] = useState<number | null>(null);  // When conversion happened

  // Sedation state machine
  const [sedationState, setSedationState] = useState<SedationState>('NONE');
  const [sedationPhaseStart, setSedationPhaseStart] = useState<number>(0);
  const sedationMessagesShownRef = useRef<Set<string>>(new Set());

  // Adenosine state machine
  const [adenosinePhase, setAdenosinePhase] = useState<AdenosinePhase>('NONE');
  const [adenosinePhaseStart, setAdenosinePhaseStart] = useState<number>(0);
  const [currentAdenosineDose, setCurrentAdenosineDose] = useState<number>(0);

  // State snapshots for evaluation
  const [stateSnapshots, setStateSnapshots] = useState<StateSnapshot[]>([]);
  const startTimeRef = useRef<number>(0);

  // Refs
  const audioRef = useRef<AudioEngine | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize audio
  const initAudio = useCallback(async () => {
    if (!audioRef.current) {
      audioRef.current = new AudioEngine();
      await audioRef.current.init();
    }
  }, []);

  // Capture state snapshot for evaluation
  const captureSnapshot = useCallback(() => {
    const snapshot: StateSnapshot = {
      timestamp: elapsed,
      phase,
      rhythm,
      vitals,
      sedated,
      adenosineCount,
      cardioversionCount,
      markAnxiety,
      lilyFear,
      inCrisis: phase === 'ASYSTOLE' || vitals.hr === 0,
    };
    setStateSnapshots(prev => [...prev, snapshot]);
    return snapshot;
  }, [elapsed, phase, rhythm, vitals, sedated, adenosineCount, cardioversionCount, markAnxiety, lilyFear]);

  // Add message
  const addMessage = useCallback((who: Message['who'], text: string) => {
    setMessages(prev => [...prev, { who, text, time: Date.now() }]);
  }, []);

  // Log action
  const logAction = useCallback((type: string, details: Partial<ActionLogEntry>) => {
    setActionLog(prev => [...prev, { type, time: elapsed, executed: true, ...details }]);
  }, [elapsed]);

  // Log nurse catch
  const logNurseCatch = useCallback((drug: string, attempted: number, unit: string, reason: string) => {
    setNurseCatches(prev => [...prev, { drug, attempted, unit, reason, time: elapsed }]);
  }, [elapsed]);

  // Generate AI response using unified character AI API
  const generateResponse = useCallback(async (character: 'mark' | 'lily', doctorMessage: string) => {
    // Build character state for the API
    const characterState: CharacterState = {
      lily: {
        painLevel: phase === 'ASYSTOLE' ? 3 : 5,
        fearLevel: lilyFear * 2, // Convert 0-5 to 0-10 scale
        cooperation: 7,
        lastSpoke: 0,
        symptoms: phase === 'ASYSTOLE'
          ? ['feeling weird', 'feeling funny']
          : ['chest feels like a drum', 'heart beating fast'],
      },
      mark: {
        anxietyLevel: markAnxiety,
        trustInDoctor: 3,
        informedLevel: 1,
        questionsAsked: 0,
        lastSpoke: 0,
      },
      nurse: {
        awaitingOrders: true,
        lastOrder: null,
        tasksPending: [],
        lastSpoke: 0,
      },
    };

    // Build patient state for the API
    const patientState = {
      profile: {
        name: PATIENT.name,
        age: PATIENT.age,
        weight: PATIENT.weight,
        gender: 'female' as const,
        chiefComplaint: 'SVT, heart racing',
        history: 'Was playing tag when symptoms started',
      },
      rhythm: (rhythm === 'SVT' ? 'SVT' : rhythm === 'SINUS' ? 'SINUS' : 'ASYSTOLE') as 'SVT' | 'SINUS' | 'ASYSTOLE',
      vitals: {
        heartRate: vitals.hr,
        systolicBP: parseInt(vitals.bp.split('/')[0]) || 92,
        diastolicBP: parseInt(vitals.bp.split('/')[1]) || 64,
        spO2: vitals.spo2,
        respiratoryRate: vitals.rr,
        temperature: 98.6,
        capillaryRefill: 2,
      },
      stability: 'compensated' as const,
      mentalStatus: 'alert' as const,
      perfusion: 'adequate' as const,
      ivAccess,
      ioAccess,
      sedated,
      intubated: false,
      deteriorationStage: 0,
      timeInCurrentRhythm: elapsed,
      transientState: null,
    };

    const request: DialogueRequest = {
      character,
      characterState,
      patientState,
      recentEvents: [], // Not tracking events at this level
      learnerMessage: doctorMessage,
      trigger: 'learner_message',
    };

    try {
      const response = await getCharacterResponse(request);
      return response.text || null;
    } catch (e) {
      console.error('Character AI error:', e);
      return null;
    }
  }, [phase, rhythm, vitals, markAnxiety, lilyFear, ivAccess, ioAccess, sedated, elapsed]);

  // Start simulation
  const start = useCallback(async () => {
    await initAudio();

    // Reset all state
    setPhase('RUNNING');
    setRhythm('SVT');
    setVitals({ hr: 220, spo2: 97, bp: '92/64', rr: 26 });
    setMessages([]);
    setElapsed(0);
    setAdenosineCount(0);
    setCardioversionCount(0);
    setSedated(false);
    setIvAccess(false);
    setIoAccess(false);
    setMarkAnxiety(3);
    setLilyFear(4);
    setPendingAction(null);
    setActionLog([]);
    setNurseCatches([]);
    setCommLog({ toFamily: 0, duringCrisis: 0, explanations: 0 });
    setTimeToConversion(null);
    setAsystoleActive(false);
    setStateSnapshots([]);
    setWpwRevealed(false);

    // Reset physiologic realism state
    setDeteriorationStage('compensated');
    setConversionTime(null);
    setSedationState('NONE');
    setSedationPhaseStart(0);
    sedationMessagesShownRef.current = new Set();
    setAdenosinePhase('NONE');
    setAdenosinePhaseStart(0);
    setCurrentAdenosineDose(0);

    // Record start time
    startTimeRef.current = Date.now();

    // Capture initial snapshot
    const initialSnapshot: StateSnapshot = {
      timestamp: 0,
      phase: 'RUNNING',
      rhythm: 'SVT',
      vitals: { hr: 220, spo2: 97, bp: '92/64', rr: 26 },
      sedated: false,
      adenosineCount: 0,
      cardioversionCount: 0,
      markAnxiety: 3,
      lilyFear: 4,
      inCrisis: false,
    };
    setStateSnapshots([initialSnapshot]);

    audioRef.current?.startHeartbeat(220, true);
    audioRef.current?.startAlarm();

    timerRef.current = setInterval(() => setElapsed(e => e + 100), 100);

    // Initial messages
    addMessage('nurse', "Doctor, 5-year-old female, 18.5kg, SVT at 220. I can get IV access whenever you're ready. What would you like to do?");
    setTimeout(() => addMessage('lily', "Daddy my chest feels like a drum beating really fast!"), 1500);
    setTimeout(() => addMessage('mark', "Doctor, she was just playing tag! Is she having a heart attack?!"), 3500);
  }, [initAudio, addMessage]);

  // Reset simulation
  const reset = useCallback(() => {
    audioRef.current?.stopAll();
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('IDLE');
    setMessages([]);
    setPendingAction(null);

    // Reset IV/IO state
    setIvAccessState('NOT_ATTEMPTED');
    setIoAccessState('NOT_ATTEMPTED');
    setIvAttempts([]);
    setCurrentIVSite(null);
    setIvAttemptStart(null);
    setIvAttemptDuration(0);
    setPendingIVOutcome(null);
    setShowIOChoice(false);
  }, []);

  // Convert to sinus - now uses recovery curve for realistic HR normalization
  const convertToSinus = useCallback((nurseComment: string) => {
    setTimeToConversion(elapsed);
    setConversionTime(elapsed);  // Start recovery curve
    setPhase('CONVERTED');
    setRhythm('SINUS');

    // Initial vitals will be set by the recovery curve in the useEffect
    // Start with junctional escape values
    setVitals({ hr: 50, spo2: 94, bp: '85/52', rr: 28 });
    setMarkAnxiety(2);
    setLilyFear(2);

    audioRef.current?.stopAll();
    audioRef.current?.playSuccess();

    // Start heartbeat at a low rate initially, will increase with recovery
    setTimeout(() => audioRef.current?.startHeartbeat(60, false), 500);
    // Update to normal rate after recovery
    setTimeout(() => audioRef.current?.startHeartbeat(90, false), 10000);

    addMessage('nurse', `Converting... ${nurseComment}`);
    setTimeout(() => addMessage('nurse', "Junctional escape... now sinus bradycardia... rate coming up nicely."), 3000);
    setTimeout(() => addMessage('lily', "The drum stopped... I feel tired but... better..."), 5000);
    setTimeout(() => addMessage('mark', "Oh thank god... is she okay now? Why is her heart still slow?"), 7000);
    setTimeout(() => addMessage('nurse', "Her heart rate is normalizing. This is a normal recovery pattern. She's doing great."), 9000);

    // Don't stop the timer - we need it for the recovery curve vitals
    // Timer will continue running to update the recovery vitals
  }, [elapsed, addMessage]);

  // Execute adenosine - now uses phase-based state machine for realistic timing
  const executeAdenosine = useCallback((dose: number) => {
    const isSecond = adenosineCount > 0;
    const correctDose = isSecond ? PATIENT.weight * 0.2 : PATIENT.weight * 0.1;

    logAction('adenosine', {
      given: dose,
      correct: parseFloat(correctDose.toFixed(2)),
      unit: 'mg',
      attemptNum: adenosineCount + 1,
      result: 'pending'
    });
    setAdenosineCount(c => c + 1);

    // Store the dose for later use in phase progression
    setCurrentAdenosineDose(dose);

    // Start the adenosine phase state machine
    setAdenosinePhase('ORDERED');
    setAdenosinePhaseStart(elapsed);

    addMessage('nurse', `Adenosine ${dose}mg ordered. Preparing with rapid flush...`);
  }, [adenosineCount, logAction, elapsed]);

  // Execute cardioversion
  // fromDefibPanel: if true, skip audio and timing (defib panel already handled it)
  const executeCardioversion = useCallback((joules: number, fromDefibPanel = false) => {
    const attemptNum = cardioversionCount + 1;
    const correctJ = attemptNum === 1 ? PATIENT.weight * 0.5 : PATIENT.weight * 1.0;

    logAction('cardioversion', {
      given: joules,
      correct: parseFloat(correctJ.toFixed(0)),
      unit: 'J',
      attemptNum,
      result: 'pending'
    });

    setMarkAnxiety(5);

    // If from defib panel, execute immediately (panel already did audio/animation)
    if (fromDefibPanel) {
      addMessage('system', "⚡ SHOCK DELIVERED");
      setCardioversionCount(c => c + 1);

      const successRate = calcCardioversionSuccess(joules, attemptNum, PATIENT.weight);

      // Small delay for outcome
      setTimeout(() => {
        if (Math.random() < successRate) {
          setActionLog(prev => prev.map((a, i) =>
            i === prev.length - 1 ? { ...a, result: 'success' as const } : a
          ));
          convertToSinus("Cardioversion successful! Converting to sinus rhythm.");
        } else {
          setActionLog(prev => prev.map((a, i) =>
            i === prev.length - 1 ? { ...a, result: 'failed' as const } : a
          ));
          const newHR = 212 - Math.floor(Math.random() * 10);
          setVitals(v => ({ ...v, hr: newHR }));
          addMessage('nurse', `Still in SVT at ${newHR}. May need to increase energy - try ${Math.round(PATIENT.weight * 1.0)}J or higher.`);
          addMessage('mark', "You shocked her and nothing happened?!");
        }
      }, 500);
      return;
    }

    // Legacy flow with audio (for non-defib panel use)
    audioRef.current?.playCharge();

    setTimeout(() => {
      audioRef.current?.playShock();
      addMessage('system', "⚡ SHOCK DELIVERED");
      setCardioversionCount(c => c + 1);

      const successRate = calcCardioversionSuccess(joules, attemptNum, PATIENT.weight);

      setTimeout(() => {
        if (Math.random() < successRate) {
          setActionLog(prev => prev.map((a, i) =>
            i === prev.length - 1 ? { ...a, result: 'success' as const } : a
          ));
          convertToSinus("Cardioversion successful.");
        } else {
          setActionLog(prev => prev.map((a, i) =>
            i === prev.length - 1 ? { ...a, result: 'failed' as const } : a
          ));
          const newHR = 212 - Math.floor(Math.random() * 10);
          setVitals(v => ({ ...v, hr: newHR }));
          addMessage('nurse', `Still in SVT at ${newHR}. May need to increase energy - try ${Math.round(PATIENT.weight * 1.0)}J or higher.`);
          addMessage('mark', "You shocked her and nothing happened?!");
        }
      }, 500);
    }, 1800);
  }, [cardioversionCount, addMessage, convertToSinus, logAction]);

  // Handle adenosine order
  const giveAdenosine = useCallback((dose: number) => {
    if (phase !== 'RUNNING') return;

    if (!ivAccess && !ioAccess) {
      addMessage('nurse', "Doctor, we need IV or IO access before we can push adenosine. Want me to establish a line?");
      return;
    }

    if (isNaN(dose) || dose <= 0) {
      addMessage('nurse', "Doctor, I need a valid dose. How many milligrams?");
      return;
    }

    const evaluation = evaluateAdenosineOrder(dose, adenosineCount, PATIENT.weight);

    if (!evaluation.allow) {
      addMessage('nurse', evaluation.message);
      logNurseCatch('Adenosine', dose, 'mg', evaluation.reason || 'refused');
      return;
    }

    if (evaluation.needsConfirmation) {
      addMessage('nurse', evaluation.message);
      setPendingAction({ type: 'adenosine', dose: evaluation.actualDose || dose });
      return;
    }

    addMessage('nurse', evaluation.message);
    executeAdenosine(evaluation.actualDose || dose);
  }, [phase, ivAccess, ioAccess, adenosineCount, addMessage, logNurseCatch, executeAdenosine]);

  // Handle cardioversion order
  // fromDefibPanel: if true, skip validation/audio (defib panel already handled it)
  const cardiovert = useCallback((joules: number, fromDefibPanel = false) => {
    if (phase !== 'RUNNING') return;

    if (isNaN(joules) || joules <= 0) {
      addMessage('nurse', "Doctor, I need a valid energy setting. How many joules?");
      return;
    }

    // When called from defib panel, skip nurse evaluation (already done in panel)
    if (fromDefibPanel) {
      executeCardioversion(joules, true);
      return;
    }

    const evaluation = evaluateCardioversionOrder(
      joules,
      cardioversionCount + 1,
      PATIENT.weight,
      rhythm,
      sedated
    );

    if (!evaluation.allow) {
      addMessage('nurse', evaluation.message);
      logNurseCatch('Cardioversion', joules, 'J', evaluation.reason || 'refused');
      return;
    }

    if (evaluation.needsConfirmation) {
      addMessage('nurse', evaluation.message);
      setPendingAction({ type: 'cardioversion', joules });
      return;
    }

    addMessage('nurse', evaluation.message);
    executeCardioversion(joules, false);
  }, [phase, cardioversionCount, rhythm, sedated, addMessage, logNurseCatch, executeCardioversion]);

  // Vagal maneuver with technique selection
  const doVagal = useCallback((technique: VagalTechnique = 'valsalva') => {
    if (phase !== 'RUNNING' || rhythm !== 'SVT') {
      if (rhythm !== 'SVT') addMessage('nurse', "She's not in SVT anymore, doctor.");
      return;
    }

    // Technique-specific nurse dialogue and Lily responses
    const techniqueDetails: Record<VagalTechnique, {
      nurseAction: string;
      lilyResponse: string;
      lilyDelay: number;
      fearIncrease: number;
    }> = {
      valsalva: {
        nurseAction: "Okay Lily, I need you to blow through this straw as hard as you can and keep blowing... that's it, keep going!",
        lilyResponse: "*blowing hard* My... face... feels... funny...",
        lilyDelay: 800,
        fearIncrease: 0.5
      },
      blow_thumb: {
        nurseAction: "Lily, can you blow on your thumb like you're blowing up a balloon? Make it really big!",
        lilyResponse: "*puffing cheeks* Like this? It's hard!",
        lilyDelay: 600,
        fearIncrease: 0.5
      },
      bearing_down: {
        nurseAction: "Lily, I need you to push down really hard like you're going potty. Can you do that for me?",
        lilyResponse: "*straining* This is weird... *grunt*",
        lilyDelay: 700,
        fearIncrease: 0.5
      },
      gag: {
        nurseAction: "I'm going to touch the back of her throat with this tongue depressor... I know it's uncomfortable, sweetie.",
        lilyResponse: "*gagging* STOP! I don't like that! *crying*",
        lilyDelay: 500,
        fearIncrease: 1.5
      }
    };

    const details = techniqueDetails[technique];

    addMessage('nurse', details.nurseAction);
    logAction('vagal', { result: 'pending' });
    setLilyFear(f => Math.min(5, f + details.fearIncrease));

    setTimeout(() => addMessage('lily', details.lilyResponse), details.lilyDelay);

    setTimeout(() => {
      if (Math.random() < 0.25) {
        setActionLog(prev => prev.map((a, i) =>
          i === prev.length - 1 ? { ...a, result: 'success' as const } : a
        ));
        convertToSinus("Vagal maneuver worked!");
      } else {
        setActionLog(prev => prev.map((a, i) =>
          i === prev.length - 1 ? { ...a, result: 'failed' as const } : a
        ));
        addMessage('nurse', "No change. Still in SVT at 220.");
        setMarkAnxiety(a => Math.min(5, a + 0.5));
        setTimeout(() => addMessage('mark', "Why isn't it working?!"), 800);
      }
    }, 2000);
  }, [phase, rhythm, addMessage, logAction, convertToSinus]);

  // Establish IV access - now uses realistic state machine
  const establishIV = useCallback(() => {
    if (phase !== 'RUNNING') return;

    if (ivAccess || ioAccess) {
      addMessage('nurse', ivAccess
        ? "IV access already established, doctor."
        : "We have IO access, doctor. That should work.");
      return;
    }

    // Can't start new attempt if one is in progress
    if (ivAccessState === 'ATTEMPTING' || ivAccessState === 'ATTEMPTING_SECOND') {
      addMessage('nurse', "I'm working on it, doctor. Give me a moment.");
      return;
    }

    // Get available sites
    const availableSites = getAvailableSites(ivAttempts);
    if (availableSites.length === 0) {
      addMessage('nurse', "Doctor, I've tried all the peripheral sites. We need to go IO.");
      setShowIOChoice(true);
      return;
    }

    // Start IV attempt
    const attemptNum = ivAttempts.length + 1;
    const site = availableSites[0];
    const duration = getIVAttemptDuration(attemptNum);

    // Roll outcome now (will be revealed after duration)
    const outcome = rollIVOutcome(attemptNum);

    setCurrentIVSite(site);
    setIvAttemptStart(elapsed);
    setIvAttemptDuration(duration);
    setPendingIVOutcome(outcome);
    setIvAccessState(attemptNum === 1 ? 'ATTEMPTING' : 'ATTEMPTING_SECOND');

    // Starting dialogue
    const formattedSite = formatSiteName(site);
    addMessage('nurse', getIVNurseDialogue('starting', attemptNum, formattedSite));
    logAction('establish_iv', { result: 'pending' });

    // Lily's initial reaction
    setTimeout(() => {
      const reaction = attemptNum === 1
        ? getLilyIVReaction('poke', lilyFear)
        : getLilyIVReaction('second_poke', lilyFear);
      addMessage('lily', reaction);
      setLilyFear(f => Math.min(5, f + 0.5));
    }, 500);

    // Mark watching
    setTimeout(() => {
      addMessage('mark', getMarkIVReaction('watching', markAnxiety));
    }, 1500);

  }, [phase, ivAccess, ioAccess, ivAccessState, ivAttempts, elapsed, lilyFear, markAnxiety, addMessage, logAction]);

  // Establish IO access
  const establishIO = useCallback(() => {
    if (phase !== 'RUNNING') return;

    if (ivAccess || ioAccess) {
      addMessage('nurse', ioAccess
        ? "IO already established, doctor."
        : "We already have IV access, doctor.");
      return;
    }

    if (ioAccessState !== 'NOT_ATTEMPTED') {
      addMessage('nurse', "IO is in progress, doctor.");
      return;
    }

    setShowIOChoice(false);
    setIoAccessState('PREPARING');
    logAction('establish_io', { result: 'pending' });

    // Preparation phase
    addMessage('nurse', getIONurseDialogue('preparing'));

    setTimeout(() => {
      addMessage('nurse', getIONurseDialogue('warning'));
      addMessage('lily', getLilyIOReaction('warning'));
      setLilyFear(5); // Max fear for IO
    }, IO_TIMING.PREPARATION);

    // Drilling phase
    setTimeout(() => {
      setIoAccessState('DRILLING');
      addMessage('nurse', getIONurseDialogue('drilling'));
      addMessage('lily', getLilyIOReaction('drilling'));

      // Mark's reaction (random if stays or leaves)
      const staysInRoom = Math.random() > 0.4; // 60% chance to stay
      addMessage('mark', getMarkIOReaction('during', staysInRoom));
      setMarkAnxiety(5); // Max anxiety
    }, IO_TIMING.PREPARATION + 2000);

    // Confirmation phase
    setTimeout(() => {
      setIoAccessState('CONFIRMING');
      addMessage('nurse', getIONurseDialogue('confirming'));
    }, IO_TIMING.PREPARATION + IO_TIMING.DRILLING);

    // Success
    setTimeout(() => {
      setIoAccessState('SUCCESS');
      setIoAccess(true);
      setActionLog(prev => prev.map((a, i) =>
        i === prev.length - 1 && a.type === 'establish_io'
          ? { ...a, result: 'success' as const }
          : a
      ));
      addMessage('nurse', getIONurseDialogue('success'));
      addMessage('lily', getLilyIOReaction('after'));
      addMessage('mark', getMarkIOReaction('after', true));
    }, IO_TIMING.PREPARATION + IO_TIMING.DRILLING + IO_TIMING.CONFIRMATION);

  }, [phase, ivAccess, ioAccess, ioAccessState, addMessage, logAction]);

  // Continue IV (user chose to keep trying instead of IO)
  const continueIV = useCallback(() => {
    setShowIOChoice(false);
    establishIV();
  }, [establishIV]);

  // Cancel IV choice dialog
  const cancelIOChoice = useCallback(() => {
    setShowIOChoice(false);
  }, []);

  // Sedate - now uses state machine for realistic timing
  const sedate = useCallback(() => {
    if (phase !== 'RUNNING') return;

    // Already sedated or sedation in progress
    if (sedated || sedationState !== 'NONE') {
      if (sedated) {
        addMessage('nurse', "She's already sedated, doctor.");
      } else {
        addMessage('nurse', "Sedation is in progress, doctor. She'll be ready soon.");
      }
      return;
    }

    if (!ivAccess && !ioAccess) {
      addMessage('nurse', "Doctor, I need IV access to give sedation.");
      return;
    }

    logAction('sedation', { result: 'pending' });
    addMessage('nurse', "Starting sedation - midazolam 0.1mg/kg = 1.8mg. This will take about 45 seconds to take full effect.");

    // Start sedation state machine
    setSedationState('ORDERED');
    setSedationPhaseStart(elapsed);
  }, [phase, sedated, sedationState, ivAccess, ioAccess, addMessage, logAction, elapsed]);

  // Confirm pending action
  const confirmPending = useCallback(() => {
    if (!pendingAction) return;

    if (pendingAction.type === 'adenosine' && pendingAction.dose) {
      executeAdenosine(pendingAction.dose);
    } else if (pendingAction.type === 'cardioversion' && pendingAction.joules) {
      executeCardioversion(pendingAction.joules);
    }
    setPendingAction(null);
  }, [pendingAction, executeAdenosine, executeCardioversion]);

  // Cancel pending action
  const cancelPending = useCallback(() => {
    addMessage('nurse', "Okay, holding on that. What would you like instead?");
    setPendingAction(null);
  }, [addMessage]);

  // Doctor speaks to family
  const speak = useCallback(async (text: string) => {
    if (!text.trim() || isGenerating) return;

    // Track communication
    setCommLog(prev => ({
      ...prev,
      toFamily: prev.toFamily + 1,
      duringCrisis: asystoleActive ? prev.duringCrisis + 1 : prev.duringCrisis,
      explanations: /because|going to|will |this is|expected|normal|medicine|heart|help/i.test(text) 
        ? prev.explanations + 1 
        : prev.explanations
    }));

    // Check for confirmation response
    if (pendingAction) {
      const lower = text.toLowerCase();
      if (/yes|confirm|do it|go ahead|correct/i.test(lower)) {
        addMessage('doctor', text);
        confirmPending();
        return;
      } else if (/no|cancel|stop|different|wait/i.test(lower)) {
        addMessage('doctor', text);
        cancelPending();
        return;
      }
    }

    addMessage('doctor', text);
    setIsGenerating(true);

    const addressingLily = /lily|sweetie|honey|sweetheart|little|kiddo/i.test(text);

    try {
      if (addressingLily) {
        const lilyResponse = await generateResponse('lily', text);
        if (lilyResponse) setTimeout(() => addMessage('lily', lilyResponse), 800);
        if (Math.random() > 0.5) {
          const markResponse = await generateResponse('mark', text);
          if (markResponse) setTimeout(() => addMessage('mark', markResponse), 2500);
        }
      } else {
        const markResponse = await generateResponse('mark', text);
        if (markResponse) setTimeout(() => addMessage('mark', markResponse), 1000);
      }
    } catch (e) {
      console.error('Error:', e);
    }

    setIsGenerating(false);
  }, [isGenerating, asystoleActive, pendingAction, addMessage, generateResponse, confirmPending, cancelPending]);

  // Calculate protocol score
  const calcProtocolScore = useCallback(() => {
    let score = 50;
    const executed = actionLog.filter(a => a.executed);

    if (executed.some(a => a.type === 'vagal')) score += 10;
    if (executed.some(a => a.type === 'adenosine')) score += 10;
    if (timeToConversion && timeToConversion < 180000) score += 15;
    else if (timeToConversion && timeToConversion < 300000) score += 10;
    if (commLog.toFamily >= 2) score += 10;
    if (commLog.duringCrisis >= 1) score += 5;

    // Deduct for nurse catches
    score -= nurseCatches.length * 10;

    // Bonus/penalty for dose accuracy
    const doseActions = executed.filter(a => a.given !== undefined && a.correct !== undefined);
    doseActions.forEach(a => {
      const r = a.given! / a.correct!;
      if (r >= 0.9 && r <= 1.1) score += 5;
      else if (r < 0.5 || r > 2) score -= 5;
    });

    return Math.max(0, Math.min(100, score));
  }, [actionLog, timeToConversion, commLog, nurseCatches]);

  // Order follow-up ECG - reveals underlying WPW after conversion
  const orderFollowUpECG = useCallback(() => {
    if (phase !== 'CONVERTED') return;
    if (wpwRevealed) return; // Already ordered

    setWpwRevealed(true);
    logAction('followup_ecg', {});
    addMessage('nurse', "Doctor, look at this follow-up ECG - there's a delta wave. This looks like WPW syndrome. That explains the SVT.");
  }, [phase, wpwRevealed, logAction, addMessage]);

  // Get evaluation input data for debrief analysis
  const getEvaluationInput = useCallback((): ReconstructionInput => {
    return {
      messages,
      actionLog,
      nurseCatches,
      stateSnapshots,
      startTime: startTimeRef.current,
    };
  }, [messages, actionLog, nurseCatches, stateSnapshots]);

  // Capture snapshots on significant state changes
  useEffect(() => {
    // Only capture during active simulation
    if (phase === 'IDLE') return;

    // Capture snapshot on phase, anxiety, or fear changes
    const snapshot: StateSnapshot = {
      timestamp: elapsed,
      phase,
      rhythm,
      vitals,
      sedated,
      adenosineCount,
      cardioversionCount,
      markAnxiety,
      lilyFear,
      inCrisis: phase === 'ASYSTOLE' || vitals.hr === 0,
    };

    setStateSnapshots(prev => {
      // Avoid duplicate snapshots at same timestamp
      if (prev.length > 0 && prev[prev.length - 1].timestamp === elapsed) {
        return [...prev.slice(0, -1), snapshot];
      }
      return [...prev, snapshot];
    });
  }, [phase, rhythm, markAnxiety, lilyFear, sedated, adenosineCount, cardioversionCount]); // Capture all significant state changes

  // Dynamic vitals update based on physiologic state
  useEffect(() => {
    if (phase === 'IDLE') return;

    // Update vitals based on current state
    if (phase === 'RUNNING' && rhythm === 'SVT') {
      // Calculate time in SVT directly from elapsed (no state update loop)
      const timeInSVT = elapsed;  // elapsed tracks total time, which equals SVT time during RUNNING
      const newStage = getDeteriorationStage(timeInSVT);

      // Only fire stage change messages once per stage
      if (newStage !== deteriorationStage) {
        setDeteriorationStage(newStage);
        // Notify about deterioration
        if (newStage === 'early_stress') {
          addMessage('nurse', "Doctor, her perfusion is starting to look a little worse. BP trending down.");
        } else if (newStage === 'moderate_stress') {
          addMessage('nurse', "She's getting tachypneic and her cap refill is delayed. We should move faster.");
        } else if (newStage === 'decompensating') {
          addMessage('nurse', "Doctor, she's decompensating. BP is dropping, she's getting mottled. We need to convert her NOW.");
          addMessage('mark', "Why is she looking so pale?! What's happening?!");
        } else if (newStage === 'critical') {
          addMessage('nurse', "CRITICAL - altered mental status, severe hypotension. Consider immediate cardioversion!");
        }
      }

      // Calculate and set new vitals (only every 500ms to reduce updates)
      if (elapsed % 500 === 0) {
        const newVitals = calculateSVTVitals(timeInSVT);
        setVitals({
          hr: newVitals.hr,
          spo2: newVitals.spo2,
          bp: formatBP(newVitals.systolic, newVitals.diastolic),
          rr: newVitals.rr,
        });
      }
    } else if (phase === 'ASYSTOLE') {
      // Calculate asystole vitals
      const asystoleTime = elapsed - (adenosinePhaseStart || elapsed);
      const newVitals = calculateAsystoleVitals(asystoleTime);
      setVitals({
        hr: 0,
        spo2: newVitals.spo2,
        bp: '--/--',
        rr: 0,
      });
    } else if (phase === 'CONVERTED' && conversionTime !== null) {
      // Recovery curve after conversion (update every 500ms)
      if (elapsed % 500 === 0) {
        const timeSinceConversion = elapsed - conversionTime;
        const recoveryVitals = calculateRecoveryVitals(timeSinceConversion);
        setVitals({
          hr: recoveryVitals.hr,
          spo2: recoveryVitals.spo2,
          bp: formatBP(recoveryVitals.systolic, recoveryVitals.diastolic),
          rr: recoveryVitals.rr,
        });
      }
    }
  }, [elapsed, phase, rhythm, deteriorationStage, conversionTime, adenosinePhaseStart]);

  // Sedation state machine progression
  useEffect(() => {
    if (sedationState === 'NONE' || sedationState === 'SEDATED') return;

    const phaseDuration = getSedationPhaseDuration(sedationState);
    const timeInPhase = elapsed - sedationPhaseStart;

    if (timeInPhase >= phaseDuration) {
      const nextState = getNextSedationState(sedationState);
      setSedationState(nextState);
      setSedationPhaseStart(elapsed);

      // Phase transition messages
      if (nextState === 'DRAWING') {
        addMessage('nurse', "Drawing up midazolam 1.8mg...");
      } else if (nextState === 'ADMINISTERING') {
        addMessage('nurse', "Pushing sedation now...");
      } else if (nextState === 'ONSET') {
        addMessage('lily', "Daddy... I feel... floaty...");
      } else if (nextState === 'SEDATED') {
        setSedated(true);
        setLilyFear(f => Math.max(1, f - 2));
        addMessage('nurse', "She's adequately sedated now. Ready for cardioversion if needed.");
        addMessage('lily', "*eyes closed, breathing steadily*");
      }
    } else if (sedationState === 'ONSET') {
      // During onset, show progressive sedation based on time
      const progress = timeInPhase / phaseDuration;

      // Use ref pattern to track shown messages (avoid re-render loops)
      if (progress > 0.3 && !sedationMessagesShownRef.current.has('drowsy1')) {
        sedationMessagesShownRef.current.add('drowsy1');
        addMessage('lily', "I'm... sleepy... daddy...");
      }
      if (progress > 0.6 && !sedationMessagesShownRef.current.has('drowsy2')) {
        sedationMessagesShownRef.current.add('drowsy2');
        addMessage('nurse', "She's getting drowsy, almost there...");
      }
    }
  }, [elapsed, sedationState, sedationPhaseStart, addMessage]);

  // Adenosine phase progression
  useEffect(() => {
    if (adenosinePhase === 'NONE' || adenosinePhase === 'COMPLETE') return;

    const phaseDuration = getAdenosinePhaseDuration(adenosinePhase);
    const timeInPhase = elapsed - adenosinePhaseStart;

    if (timeInPhase >= phaseDuration) {
      // Progress to next phase
      const phases: AdenosinePhase[] = ['ORDERED', 'DRAWING', 'READY', 'PUSHED', 'CIRCULATING', 'EFFECT', 'CLEARING', 'COMPLETE'];
      const currentIdx = phases.indexOf(adenosinePhase);
      if (currentIdx < phases.length - 1) {
        const nextPhase = phases[currentIdx + 1];
        setAdenosinePhase(nextPhase);
        setAdenosinePhaseStart(elapsed);

        // Phase-specific actions
        if (nextPhase === 'DRAWING') {
          addMessage('nurse', "Drawing adenosine and preparing flush...");
        } else if (nextPhase === 'READY') {
          addMessage('nurse', "Ready with adenosine and 10mL flush. Stopcock positioned.");
        } else if (nextPhase === 'PUSHED') {
          addMessage('nurse', "Adenosine IN... FLUSH!");
          setTimeout(() => addMessage('lily', "That feels warm... weird..."), 500);
        } else if (nextPhase === 'CIRCULATING') {
          addMessage('lily', "My chest... feels tight... I can't breathe!");
        } else if (nextPhase === 'EFFECT') {
          // Asystole begins
          setPhase('ASYSTOLE');
          setRhythm('ASYSTOLE');
          audioRef.current?.startFlatline();
          setMarkAnxiety(5);
          setLilyFear(5);
          setAsystoleActive(true);
          addMessage('mark', "OH MY GOD! THE LINE IS FLAT! HER HEART STOPPED!!");
          setTimeout(() => addMessage('nurse', "Transient asystole - this is expected with adenosine. Watching..."), 1500);
        } else if (nextPhase === 'CLEARING') {
          // Asystole ending, check for success
          audioRef.current?.stopFlatline();
          setAsystoleActive(false);

          const isSecond = adenosineCount > 1;
          const successRate = calcAdenosineSuccess(currentAdenosineDose, isSecond, PATIENT.weight);
          const willConvert = Math.random() < successRate;

          if (willConvert) {
            setActionLog(prev => prev.map((a, i) =>
              i === prev.length - 1 ? { ...a, result: 'success' as const } : a
            ));
            // Start recovery
            setConversionTime(elapsed);
            setTimeToConversion(elapsed);
            setPhase('CONVERTED');
            setRhythm('SINUS');
            setMarkAnxiety(2);
            setLilyFear(2);
            audioRef.current?.playSuccess();
            addMessage('nurse', "Converting... there's sinus! Adenosine worked!");
            setTimeout(() => addMessage('lily', "The drum stopped! I feel... tired but better..."), 2000);
            setTimeout(() => addMessage('mark', "Oh thank god... is she okay now?"), 3500);
            if (timerRef.current) clearInterval(timerRef.current);
          } else {
            setActionLog(prev => prev.map((a, i) =>
              i === prev.length - 1 ? { ...a, result: 'failed' as const } : a
            ));
            // Back to SVT
            setPhase('RUNNING');
            setRhythm('SVT');
            setMarkAnxiety(4);
            audioRef.current?.playError();
            setTimeout(() => {
              audioRef.current?.startHeartbeat(215, true);
              audioRef.current?.startAlarm();
            }, 200);
            addMessage('lily', "*crying* It still hurts! Make it stop!");
            setTimeout(() => addMessage('mark', "It didn't work?! What now?!"), 1000);
            setTimeout(() => {
              if (adenosineCount >= 2) {
                addMessage('nurse', "Back in SVT. We've given two doses - PALS suggests cardioversion. Want me to get pads ready?");
              } else {
                addMessage('nurse', "Back in SVT. Second dose is 0.2mg/kg = 3.7mg. Your call, doctor.");
              }
            }, 2500);
          }
        } else if (nextPhase === 'COMPLETE') {
          setAdenosinePhase('NONE');
        }
      }
    }
  }, [elapsed, adenosinePhase, adenosinePhaseStart, adenosineCount, currentAdenosineDose]);

  // IV attempt timing and outcome
  useEffect(() => {
    if (ivAccessState !== 'ATTEMPTING' && ivAccessState !== 'ATTEMPTING_SECOND') return;
    // Use explicit null checks - 0 is a valid elapsed time!
    if (ivAttemptStart === null || pendingIVOutcome === null || currentIVSite === null) return;

    const timeInAttempt = elapsed - ivAttemptStart;

    // Show working dialogue at 1/3 and 2/3 through
    if (timeInAttempt > ivAttemptDuration * 0.33 && timeInAttempt < ivAttemptDuration * 0.4) {
      // Working dialogue (once per attempt)
    }

    // Reveal outcome when attempt duration complete
    if (timeInAttempt >= ivAttemptDuration) {
      const attemptNum = ivAttempts.length + 1;
      const formattedSite = formatSiteName(currentIVSite);

      // Record the attempt
      const attempt: IVAttempt = {
        site: currentIVSite as IVAttempt['site'],
        success: pendingIVOutcome.success,
        reason: pendingIVOutcome.reason as IVAttempt['reason'],
        duration: ivAttemptDuration,
      };
      setIvAttempts(prev => [...prev, attempt]);

      if (pendingIVOutcome.success) {
        // SUCCESS!
        setIvAccessState('SUCCESS');
        setIvAccess(true);
        setActionLog(prev => prev.map((a, i) =>
          i === prev.length - 1 && a.type === 'establish_iv'
            ? { ...a, result: 'success' as const }
            : a
        ));
        addMessage('nurse', getIVNurseDialogue('success', attemptNum, formattedSite));
        addMessage('lily', getLilyIVReaction('success', lilyFear));
        setTimeout(() => {
          addMessage('mark', getMarkIVReaction('success', markAnxiety));
        }, 800);

      } else if (pendingIVOutcome.difficult) {
        // Difficult access - offer IO choice
        setIvAccessState('DIFFICULT');
        setActionLog(prev => prev.map((a, i) =>
          i === prev.length - 1 && a.type === 'establish_iv'
            ? { ...a, result: 'failed' as const }
            : a
        ));
        addMessage('nurse', getIVNurseDialogue('difficult', attemptNum, formattedSite, pendingIVOutcome.reason));
        addMessage('lily', getLilyIVReaction('failed', lilyFear));
        setLilyFear(f => Math.min(5, f + 0.5));
        setTimeout(() => {
          addMessage('mark', getMarkIVReaction('difficult', markAnxiety));
          setMarkAnxiety(a => Math.min(5, a + 0.5));
          setShowIOChoice(true);
        }, 1000);

      } else {
        // Failed but can retry
        const availableSites = getAvailableSites([...ivAttempts, attempt]);

        if (availableSites.length === 0) {
          // No more sites - must go IO
          setIvAccessState('FAILED_ALL');
          addMessage('nurse', "Doctor, I've tried all the peripheral sites. We need to go IO.");
          setShowIOChoice(true);
        } else {
          setIvAccessState('FAILED_FIRST');
          setActionLog(prev => prev.map((a, i) =>
            i === prev.length - 1 && a.type === 'establish_iv'
              ? { ...a, result: 'failed' as const }
              : a
          ));
          addMessage('nurse', getIVNurseDialogue('failed', attemptNum, formattedSite, pendingIVOutcome.reason));
          addMessage('lily', getLilyIVReaction('failed', lilyFear));
          setLilyFear(f => Math.min(5, f + 0.5));
          setTimeout(() => {
            addMessage('mark', getMarkIVReaction('failed', markAnxiety));
            setMarkAnxiety(a => Math.min(5, a + 0.5));
          }, 800);
        }
      }

      // Clear attempt state
      setPendingIVOutcome(null);
      setCurrentIVSite(null);
      setIvAttemptStart(null);
    }
  }, [elapsed, ivAccessState, ivAttemptStart, ivAttemptDuration, pendingIVOutcome, currentIVSite, ivAttempts, lilyFear, markAnxiety, addMessage]);

  // Cleanup
  useEffect(() => {
    return () => {
      audioRef.current?.stopAll();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    // State
    phase,
    rhythm,
    vitals,
    messages,
    elapsed,
    adenosineCount,
    cardioversionCount,
    sedated,
    ivAccess,
    ioAccess,
    markAnxiety,
    lilyFear,
    pendingAction,
    isGenerating,
    wpwRevealed,
    patient: PATIENT,

    // Physiologic realism state
    deteriorationStage,
    sedationState,
    adenosinePhase,

    // IV/IO procedure state
    ivAccessState,
    ioAccessState,
    ivAttempts,
    showIOChoice,

    // Debrief data
    actionLog,
    nurseCatches,
    commLog,
    timeToConversion,
    protocolScore: calcProtocolScore(),

    // Evaluation data
    stateSnapshots,
    getEvaluationInput,

    // Actions
    start,
    reset,
    doVagal,
    giveAdenosine,
    cardiovert,
    sedate,
    establishIV,
    establishIO,
    continueIV,
    cancelIOChoice,
    speak,
    confirmPending,
    cancelPending,
    captureSnapshot,
    orderFollowUpECG,
    addMessage,
  };
}
