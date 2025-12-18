// ============================================================================
// USE SIMULATION HOOK
// Main orchestration of simulation state, audio, characters, and tracking
// ============================================================================

import { useState, useRef, useCallback, useEffect } from 'react';
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

  // Access state
  const [ivAccess, setIvAccess] = useState(false);
  const [ioAccess, setIoAccess] = useState(false);

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
  }, []);

  // Convert to sinus
  const convertToSinus = useCallback((nurseComment: string) => {
    setTimeToConversion(elapsed);
    setPhase('CONVERTED');
    setRhythm('SINUS');
    const newHR = 85 + Math.floor(Math.random() * 15);
    setVitals({ hr: newHR, spo2: 99, bp: '98/62', rr: 22 });
    setMarkAnxiety(2);
    setLilyFear(2);
    
    audioRef.current?.stopAll();
    audioRef.current?.playSuccess();
    setTimeout(() => audioRef.current?.startHeartbeat(newHR, false), 500);
    
    addMessage('nurse', `Sinus rhythm at ${newHR}. ${nurseComment}`);
    setTimeout(() => addMessage('lily', "The drum stopped! I feel better daddy!"), 1500);
    setTimeout(() => addMessage('mark', "Oh thank god... is she okay now?"), 3000);
    
    if (timerRef.current) clearInterval(timerRef.current);
  }, [elapsed, addMessage]);

  // Execute adenosine
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

    setTimeout(() => addMessage('lily', "I feel weird... something's happening..."), 1500);

    setTimeout(() => {
      setPhase('ASYSTOLE');
      setRhythm('ASYSTOLE');
      setVitals(v => ({ ...v, hr: 0 }));
      audioRef.current?.startFlatline();
      setMarkAnxiety(5);
      setLilyFear(5);
      setAsystoleActive(true);

      setTimeout(() => addMessage('mark', "OH MY GOD! THE LINE IS FLAT! HER HEART STOPPED!!"), 300);
      setTimeout(() => addMessage('nurse', "Transient asystole - this is expected. Watching for conversion..."), 1700);

      const successRate = calcAdenosineSuccess(dose, isSecond, PATIENT.weight);
      const willConvert = Math.random() < successRate;
      const asystoleDuration = 3000 + Math.random() * 3000;

      setTimeout(() => {
        audioRef.current?.stopFlatline();
        setAsystoleActive(false);

        if (willConvert) {
          setActionLog(prev => prev.map((a, i) => 
            i === prev.length - 1 ? { ...a, result: 'success' as const } : a
          ));
          convertToSinus("Adenosine worked - nice!");
        } else {
          setActionLog(prev => prev.map((a, i) => 
            i === prev.length - 1 ? { ...a, result: 'failed' as const } : a
          ));
          setPhase('RUNNING');
          setRhythm('SVT');
          const newHR = 215 - Math.floor(Math.random() * 15);
          setVitals(v => ({ ...v, hr: newHR }));
          setMarkAnxiety(4);

          audioRef.current?.playError();
          setTimeout(() => {
            audioRef.current?.startHeartbeat(newHR, true);
            audioRef.current?.startAlarm();
          }, 200);

          addMessage('lily', "*crying* It still hurts! Make it stop!");
          setTimeout(() => addMessage('mark', "It didn't work?! What now?!"), 1000);
          setTimeout(() => {
            if (adenosineCount >= 2) {
              addMessage('nurse', `Back in SVT at ${newHR}. We've given two doses - PALS suggests cardioversion. Want me to get pads ready?`);
            } else {
              addMessage('nurse', `Back in SVT at ${newHR}. Second dose is 0.2mg/kg = 3.7mg. Your call, doctor.`);
            }
          }, 2500);
        }
      }, asystoleDuration);
    }, 2500);
  }, [adenosineCount, addMessage, convertToSinus, logAction]);

  // Execute cardioversion
  const executeCardioversion = useCallback((joules: number) => {
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
  const cardiovert = useCallback((joules: number) => {
    if (phase !== 'RUNNING') return;

    if (isNaN(joules) || joules <= 0) {
      addMessage('nurse', "Doctor, I need a valid energy setting. How many joules?");
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
    executeCardioversion(joules);
  }, [phase, cardioversionCount, rhythm, sedated, addMessage, logNurseCatch, executeCardioversion]);

  // Vagal maneuver
  const doVagal = useCallback(() => {
    if (phase !== 'RUNNING' || rhythm !== 'SVT') {
      if (rhythm !== 'SVT') addMessage('nurse', "She's not in SVT anymore, doctor.");
      return;
    }

    addMessage('nurse', "Applying ice pack to face...");
    logAction('vagal', { result: 'pending' });
    setLilyFear(f => Math.min(5, f + 1));

    setTimeout(() => addMessage('lily', "COLD!! That's so cold! I don't like it! *crying*"), 800);

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

  // Establish IV access
  const establishIV = useCallback(() => {
    if (phase !== 'RUNNING') return;

    if (ivAccess) {
      addMessage('nurse', "IV access already established, doctor.");
      return;
    }

    logAction('establish_iv', { result: 'success' });
    addMessage('nurse', "Establishing IV access... 22 gauge in the right AC. IV patent and flushing well.");
    setIvAccess(true);
  }, [phase, ivAccess, addMessage, logAction]);

  // Sedate
  const sedate = useCallback(() => {
    if (phase !== 'RUNNING' || sedated) return;

    if (!ivAccess && !ioAccess) {
      addMessage('nurse', "Doctor, I need IV access to give sedation.");
      return;
    }

    logAction('sedation', { result: 'success' });
    addMessage('nurse', "Pushing midazolam 1.8mg for sedation...");

    setTimeout(() => {
      setSedated(true);
      setLilyFear(f => Math.max(1, f - 1));
      addMessage('nurse', "Patient sedated. Ready for cardioversion if needed.");
      addMessage('lily', "*getting drowsy* Daddy... I'm sleepy...");
    }, 2000);
  }, [phase, sedated, ivAccess, ioAccess, addMessage, logAction]);

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
    speak,
    confirmPending,
    cancelPending,
    captureSnapshot,
    orderFollowUpECG,
  };
}
