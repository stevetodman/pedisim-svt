// ============================================================================
// CHARACTER AI SYSTEM
// Manages AI-generated dialogue for Lily, Mark, and Nurse Sarah
// Characters respond emotionally to events but do NOT control clinical outcomes
// ============================================================================

import { PatientState, SimulationEvent } from '../kernel/types';

// ============================================================================
// CHARACTER STATE TYPES
// ============================================================================

export interface CharacterState {
  lily: LilyState;
  mark: MarkState;
  nurse: NurseState;
}

export interface LilyState {
  painLevel: number;        // 0-10
  fearLevel: number;        // 0-10
  cooperation: number;      // 0-10 (higher = more cooperative)
  lastSpoke: number;        // timestamp
  symptoms: string[];       // current symptoms she's experiencing
}

export interface MarkState {
  anxietyLevel: number;     // 1-5
  trustInDoctor: number;    // 1-5
  informedLevel: number;    // How much has been explained to him
  questionsAsked: number;
  lastSpoke: number;
}

export interface NurseState {
  awaitingOrders: boolean;
  lastOrder: string | null;
  tasksPending: string[];
  lastSpoke: number;
}

// ============================================================================
// CHARACTER PROMPTS
// ============================================================================

export const CHARACTER_PROMPTS = {
  lily: `You are Lily, a 5-year-old girl in the emergency room. 

CURRENT STATE (provided each turn):
- Pain level: {painLevel}/10
- Fear level: {fearLevel}/10
- Symptoms: {symptoms}

YOUR PERSONALITY:
- You're scared and don't understand what's happening
- You want your daddy close by
- You use simple 5-year-old language
- You might cry when scared or in pain
- You call your heart feeling "a drum beating super fast"
- Medical things are scary and confusing to you
- You don't know words like "tachycardia" or "adenosine"

BEHAVIORS BY FEAR LEVEL:
1-3: Nervous but manageable, might ask questions
4-6: Crying, clingy to dad, harder to cooperate
7-8: Very upset, might resist procedures
9-10: Inconsolable, screaming

WHEN RESPONDING:
- Keep responses short (1-2 sentences typical for a 5-year-old)
- Use simple words
- Express physical sensations concretely ("my chest hurts", "that's cold!")
- React to what just happened, don't anticipate
- You can ask innocent questions ("Am I going to be okay?", "Will it hurt?")
- Show emotional responses appropriate to your fear level

NEVER:
- Use medical terminology
- Decide if treatments work (that's not your role)
- Give responses longer than 2-3 short sentences
- Act mature beyond your age`,

  mark: `You are Mark Henderson, father of 5-year-old Lily who is in the ER with a heart arrhythmia.

CURRENT STATE (provided each turn):
- Anxiety level: {anxietyLevel}/5
- Trust in doctor: {trustInDoctor}/5  
- How informed you feel: {informedLevel}/5

YOUR PERSONALITY:
- You're terrified but trying to stay calm for Lily
- You don't have medical training
- You blame yourself a little ("She was just playing...")
- You want to help but don't know how
- You need reassurance and explanations

BEHAVIORS BY ANXIETY LEVEL:
1: Calm, cooperative, asking appropriate questions
2: Worried but managing, some nervous habits
3: Visibly anxious, asking more questions, might interrupt
4: Struggling to stay calm, voice shaking, might challenge decisions
5: PANICKING - might yell, interfere with care, need to be managed

THINGS THAT INCREASE ANXIETY:
- Time passing without explanation (+0.5 per minute)
- Scary events (alarms, Lily crying) (+1)
- Asystole on monitor (+2 immediately)
- Seeing procedures without explanation (+1)
- Lily in distress (+0.5)

THINGS THAT DECREASE ANXIETY:
- Doctor explaining what's happening (-0.5)
- Doctor acknowledging your fear (-0.5)
- Lily seeming better (-1)
- Successful treatment (-2)

WHEN RESPONDING:
- React to what just happened
- Ask questions a worried parent would ask
- Your tone should match your anxiety level
- At high anxiety, you might not process information well
- You might ask the same question multiple times when panicked

SPECIFIC PHRASES BY ANXIETY:
Level 1-2: "Is she going to be okay?" "What's happening to her heart?"
Level 3: "Why isn't it working?" "What do you mean her heart stopped?!"
Level 4: "DO SOMETHING!" "I can't lose her!"
Level 5: "OH GOD! HER HEART! SHE'S DYING!" "*trying to push past to reach Lily*"

NEVER:
- Understand medical terminology without explanation
- Stay calm during asystole (that's terrifying for a parent)
- Decide clinical outcomes
- Be unrealistically calm or unrealistically hysterical (match anxiety level)`,

  nurse: `You are Sarah, an experienced pediatric ED nurse working with the doctor on this SVT case.

CURRENT STATE (provided each turn):
- Awaiting orders: {awaitingOrders}
- Last order given: {lastOrder}
- Tasks pending: {tasksPending}

YOUR PERSONALITY:
- Professional, calm, experienced
- You've seen this many times before
- You know PALS protocols
- You support the doctor's leadership
- You model good closed-loop communication

YOUR ROLES:
1. CONFIRM ORDERS: Readback every order
   "Adenosine 1.85mg IV push, confirmed. Ready when you are."
   
2. CLARIFY UNCLEAR ORDERS: 
   "What dose would you like?"
   "Did you want that IV or IO?"
   
3. PROMPT WHEN STUCK: (if doctor seems uncertain for >30 sec)
   "Her BP is dropping, doctor. What would you like to do?"
   "We've been in SVT for 10 minutes now."
   
4. PREPARE ANTICIPATED NEEDS:
   "I'll get the adenosine drawn up."
   "Should I get the defib pads on?"
   
5. REPORT OBSERVATIONS:
   "Asystole on the monitor."
   "She's converting... sinus rhythm at 88."
   "Back in SVT at 218."

6. MODEL CALM FOR FAMILY:
   "This is expected, dad. Just a few more seconds."
   "She's doing well. The medicine is working."

CLOSED-LOOP COMMUNICATION:
- Always repeat back orders
- Confirm when tasks complete: "Adenosine in. Flush going."
- State observations clearly

GENTLE CORRECTIONS (if doctor orders something wrong):
- "1.85mg? Just confirming the dose for 18.5kg."
- "She's not sedated yet - want me to draw up some midazolam first?"

NEVER:
- Make clinical decisions for the doctor
- Administer medications without orders
- Panic (you're the calm presence)
- Give long explanations (keep it brief and professional)
- Decide if treatments work (just report what you observe)`
};

// ============================================================================
// CHARACTER STATE MANAGEMENT
// ============================================================================

export function createInitialCharacterState(): CharacterState {
  return {
    lily: {
      painLevel: 5,
      fearLevel: 4,
      cooperation: 7,
      lastSpoke: 0,
      symptoms: ['chest feels like a drum', 'heart beating fast'],
    },
    mark: {
      anxietyLevel: 3,
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
}

/**
 * Update character states based on patient state and events
 */
export function updateCharacterStates(
  characters: CharacterState,
  patientState: PatientState,
  event: SimulationEvent | null,
  elapsedMs: number
): CharacterState {
  const updated = { ...characters };

  // Update Lily based on patient state
  updated.lily = updateLilyState(characters.lily, patientState, event);
  
  // Update Mark based on patient state and events
  updated.mark = updateMarkState(characters.mark, patientState, event, elapsedMs);
  
  // Update Nurse based on context
  updated.nurse = updateNurseState(characters.nurse, patientState, event);

  return updated;
}

function updateLilyState(
  lily: LilyState,
  patient: PatientState,
  event: SimulationEvent | null
): LilyState {
  const updated = { ...lily };

  // Pain correlates with heart rate and stability
  if (patient.rhythm === 'SVT') {
    updated.painLevel = Math.min(10, 4 + (patient.vitals.heartRate - 180) / 20);
    updated.symptoms = ['chest feels like a drum', 'heart going super fast'];
  } else if (patient.rhythm === 'ASYSTOLE') {
    updated.painLevel = 3;  // Weird feeling, not pain
    updated.symptoms = ['feeling weird', 'feeling funny'];
    updated.fearLevel = Math.min(10, updated.fearLevel + 2);
  } else if (patient.rhythm === 'SINUS') {
    updated.painLevel = 1;
    updated.symptoms = ['feeling better'];
    updated.fearLevel = Math.max(1, updated.fearLevel - 3);
  }

  // Fear increases with interventions
  if (event?.type === 'INTERVENTION_EXECUTED') {
    if (event.data.intervention === 'VAGAL_ICE') {
      updated.fearLevel = Math.min(10, updated.fearLevel + 2);
    }
    if (event.data.intervention === 'ADENOSINE') {
      updated.fearLevel = Math.min(10, updated.fearLevel + 1);
    }
  }

  return updated;
}

function updateMarkState(
  mark: MarkState,
  patient: PatientState,
  event: SimulationEvent | null,
  elapsedMs: number
): MarkState {
  const updated = { ...mark };

  // Anxiety increases with time (0.5 per minute of SVT)
  if (patient.rhythm === 'SVT') {
    updated.anxietyLevel = Math.min(5, mark.anxietyLevel + (elapsedMs / 120000));
  }

  // Event-based anxiety changes
  if (event) {
    switch (event.type) {
      case 'RHYTHM_CHANGE':
        if (event.data.to === 'ASYSTOLE') {
          updated.anxietyLevel = 5;  // INSTANT PANIC
        } else if (event.data.to === 'SINUS') {
          updated.anxietyLevel = Math.max(1, mark.anxietyLevel - 2);
        }
        break;
      
      case 'TRANSIENT_START':
        if (event.data.type === 'ADENOSINE_EFFECT') {
          updated.anxietyLevel = 5;  // Heart stopping = max panic
        }
        break;
      
      case 'TRANSIENT_END':
        if (event.data.converted) {
          updated.anxietyLevel = 2;  // Relief but still shaken
        } else {
          updated.anxietyLevel = 4;  // It didn't work!
        }
        break;

      case 'DETERIORATION':
        updated.anxietyLevel = Math.min(5, mark.anxietyLevel + 1);
        break;
    }
  }

  // Conversion brings relief
  if (patient.rhythm === 'SINUS') {
    updated.anxietyLevel = Math.max(1, Math.min(updated.anxietyLevel, 2));
  }

  return updated;
}

function updateNurseState(
  nurse: NurseState,
  _patient: PatientState,
  event: SimulationEvent | null
): NurseState {
  const updated = { ...nurse };

  // Track what nurse should be doing
  if (event?.type === 'INTERVENTION_ATTEMPTED' && event.data.blocked) {
    if (event.data.blocked === 'NO_ACCESS') {
      updated.tasksPending = [...nurse.tasksPending, 'establish_access'];
    }
    if (event.data.blocked === 'NOT_SEDATED') {
      updated.tasksPending = [...nurse.tasksPending, 'prepare_sedation'];
    }
  }

  return updated;
}

// ============================================================================
// PROMPT BUILDER
// ============================================================================

/**
 * Build the prompt for a character given their current state
 */
export function buildCharacterPrompt(
  character: 'lily' | 'mark' | 'nurse',
  state: CharacterState,
  patientState: PatientState,
  recentEvents: SimulationEvent[],
  learnerMessage?: string
): string {
  const basePrompt = CHARACTER_PROMPTS[character];
  
  let stateSection = '';
  let contextSection = '';

  switch (character) {
    case 'lily':
      stateSection = basePrompt
        .replace('{painLevel}', state.lily.painLevel.toFixed(0))
        .replace('{fearLevel}', state.lily.fearLevel.toFixed(0))
        .replace('{symptoms}', state.lily.symptoms.join(', '));
      break;
    
    case 'mark':
      stateSection = basePrompt
        .replace('{anxietyLevel}', state.mark.anxietyLevel.toFixed(0))
        .replace('{trustInDoctor}', state.mark.trustInDoctor.toFixed(0))
        .replace('{informedLevel}', state.mark.informedLevel.toFixed(0));
      break;
    
    case 'nurse':
      stateSection = basePrompt
        .replace('{awaitingOrders}', state.nurse.awaitingOrders.toString())
        .replace('{lastOrder}', state.nurse.lastOrder || 'none')
        .replace('{tasksPending}', state.nurse.tasksPending.join(', ') || 'none');
      break;
  }

  // Add recent context
  if (recentEvents.length > 0) {
    const eventDescriptions = recentEvents.slice(-3).map(e => {
      switch (e.type) {
        case 'TRANSIENT_START':
          return 'The monitor just showed asystole (flatline)';
        case 'TRANSIENT_END':
          return e.data.converted 
            ? 'The heart rhythm just converted to normal'
            : 'The heart went back to fast rhythm after flatline';
        case 'RHYTHM_CHANGE':
          return `Rhythm changed from ${e.data.from} to ${e.data.to}`;
        case 'INTERVENTION_EXECUTED':
          return `${e.data.intervention} was just given`;
        case 'DETERIORATION':
          return `Patient is getting worse (stage ${e.data.stage})`;
        default:
          return '';
      }
    }).filter(Boolean);

    if (eventDescriptions.length > 0) {
      contextSection = `\n\nWHAT JUST HAPPENED:\n${eventDescriptions.join('\n')}`;
    }
  }

  // Add current patient status
  contextSection += `\n\nCURRENT SITUATION:
- Heart rhythm: ${patientState.rhythm}
- Heart rate: ${patientState.vitals.heartRate}
- Patient stability: ${patientState.stability}`;

  if (learnerMessage) {
    contextSection += `\n\nTHE DOCTOR JUST SAID: "${learnerMessage}"`;
  }

  contextSection += '\n\nRespond in character with 1-2 sentences.';

  return stateSection + contextSection;
}

// ============================================================================
// DIALOGUE GENERATION (stub for Claude API integration)
// ============================================================================

export interface DialogueRequest {
  character: 'lily' | 'mark' | 'nurse';
  characterState: CharacterState;
  patientState: PatientState;
  recentEvents: SimulationEvent[];
  learnerMessage?: string;
  trigger: 'event' | 'time' | 'learner_message';
}

export interface DialogueResponse {
  character: 'lily' | 'mark' | 'nurse';
  text: string;
  emotion: string;
  timestamp: number;
}

/**
 * Generate dialogue for a character
 * This is a stub - will be replaced with actual Claude API call
 */
export async function generateDialogue(
  request: DialogueRequest,
  _apiKey?: string
): Promise<DialogueResponse> {
  // Build prompt for Claude API (currently unused as we use scripted responses)
  buildCharacterPrompt(
    request.character,
    request.characterState,
    request.patientState,
    request.recentEvents,
    request.learnerMessage
  );

  // TODO: Replace with actual Claude API call
  // For now, return scripted responses based on state
  return generateScriptedResponse(request);
}

/**
 * Scripted fallback responses when API not available
 * Exported for use by characterAI.ts when no API key is configured
 */
export function generateScriptedResponse(request: DialogueRequest): DialogueResponse {
  const { character, characterState, patientState, recentEvents } = request;
  const lastEvent = recentEvents[recentEvents.length - 1];

  let text = '';
  let emotion = 'normal';

  switch (character) {
    case 'lily':
      if (patientState.rhythm === 'ASYSTOLE') {
        text = "Daddy I feel... weird... something's wrong...";
        emotion = 'scared';
      } else if (patientState.rhythm === 'SINUS') {
        text = "The drum stopped! My chest doesn't hurt anymore daddy!";
        emotion = 'relieved';
      } else if (lastEvent?.data?.intervention === 'VAGAL_ICE') {
        text = "COLD!! That's so cold! I don't like it! *crying*";
        emotion = 'crying';
      } else if (characterState.lily.fearLevel >= 7) {
        text = "*crying* I want to go home! Make it stop!";
        emotion = 'crying';
      } else {
        text = "Daddy, my chest feels like a drum beating super fast...";
        emotion = 'scared';
      }
      break;

    case 'mark':
      if (patientState.rhythm === 'ASYSTOLE' || characterState.mark.anxietyLevel >= 5) {
        text = "OH MY GOD! Her heart stopped! The line is flat! DO SOMETHING!!";
        emotion = 'panicked';
      } else if (patientState.rhythm === 'SINUS') {
        text = "Is she... is she okay now? What just happened? Her heart stopped!";
        emotion = 'relieved';
      } else if (characterState.mark.anxietyLevel >= 4) {
        text = "Why isn't it working?! What's wrong with her heart?!";
        emotion = 'panicked';
      } else if (characterState.mark.anxietyLevel >= 3) {
        text = "Doctor, what's happening? Is she going to be okay?";
        emotion = 'scared';
      } else {
        text = "She was just playing tag... this happened so suddenly...";
        emotion = 'scared';
      }
      break;

    case 'nurse':
      if (patientState.rhythm === 'ASYSTOLE') {
        text = "Asystole on the monitor. This is expected with adenosine. Watching for conversion...";
        emotion = 'professional';
      } else if (patientState.rhythm === 'SINUS' && lastEvent?.type === 'TRANSIENT_END') {
        text = "She's converting... sinus rhythm at " + patientState.vitals.heartRate + ". Nice work, doctor.";
        emotion = 'professional';
      } else if (lastEvent?.data?.converted === false) {
        text = "Back in SVT at " + patientState.vitals.heartRate + ". Second dose is 0.2mg/kg - that's 3.7mg. Your call, doctor.";
        emotion = 'professional';
      } else if (!patientState.ivAccess) {
        text = "IV access established. 22 gauge in the right AC. What would you like to do, doctor?";
        emotion = 'professional';
      } else {
        text = "Standing by. What would you like to do?";
        emotion = 'professional';
      }
      break;
  }

  return {
    character,
    text,
    emotion,
    timestamp: Date.now(),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

// CHARACTER_PROMPTS already exported above
