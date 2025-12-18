// ============================================================================
// PEDISIM KERNEL TYPES
// All clinical state and logic types - deterministic, auditable
// ============================================================================

// --- Patient Demographics ---
export interface PatientProfile {
  name: string;
  age: number;        // years
  weight: number;     // kg
  gender: 'male' | 'female';
  chiefComplaint: string;
  history: string;
}

// --- Rhythm Types ---
export type Rhythm = 
  | 'SINUS'
  | 'SINUS_TACH'
  | 'SINUS_BRADY'
  | 'SVT'
  | 'ATRIAL_FLUTTER'
  | 'ATRIAL_FIB'
  | 'VTACH_PULSE'
  | 'VTACH_PULSELESS'
  | 'VFIB'
  | 'ASYSTOLE'
  | 'PEA';

// --- Hemodynamic Stability ---
export type Stability = 'stable' | 'compensated' | 'decompensated' | 'shock';

// --- Mental Status ---
export type MentalStatus = 'alert' | 'verbal' | 'pain' | 'unresponsive'; // AVPU

// --- Perfusion ---
export type Perfusion = 'adequate' | 'delayed' | 'poor' | 'absent';

// --- Vital Signs ---
export interface Vitals {
  heartRate: number;
  systolicBP: number;
  diastolicBP: number;
  respiratoryRate: number;
  spO2: number;
  temperature: number;      // Fahrenheit
  capillaryRefill: number;  // seconds
}

// --- Full Patient State ---
export interface PatientState {
  // Identifiers
  profile: PatientProfile;
  
  // Current physiological state
  rhythm: Rhythm;
  vitals: Vitals;
  mentalStatus: MentalStatus;
  perfusion: Perfusion;
  stability: Stability;
  
  // Clinical flags
  ivAccess: boolean;
  ioAccess: boolean;
  sedated: boolean;
  intubated: boolean;
  
  // Deterioration tracking
  timeInCurrentRhythm: number;  // ms
  deteriorationStage: number;   // 0 = none, 1-3 = progressive
  
  // For transient states (e.g., adenosine effect)
  transientState: TransientState | null;
}

// --- Transient States (temporary physiological changes) ---
export interface TransientState {
  type: 'ADENOSINE_EFFECT' | 'POST_CARDIOVERSION' | 'VAGAL_RESPONSE';
  startTime: number;
  duration: number;
  previousRhythm: Rhythm;
  previousHR: number;
}

// --- Intervention Types ---
export type InterventionType =
  | 'VAGAL_ICE'
  | 'VAGAL_VALSALVA'
  | 'ADENOSINE'
  | 'ADENOSINE_2'
  | 'AMIODARONE'
  | 'PROCAINAMIDE'
  | 'CARDIOVERSION_SYNC'
  | 'DEFIBRILLATION'
  | 'EPINEPHRINE'
  | 'ATROPINE'
  | 'ESTABLISH_IV'
  | 'ESTABLISH_IO'
  | 'SEDATION'
  | 'INTUBATION'
  | 'START_CPR'
  | 'STOP_CPR';

// --- Intervention Request ---
export interface InterventionRequest {
  type: InterventionType;
  dose?: number;          // mg or J depending on intervention
  route?: 'IV' | 'IO' | 'ETT' | 'EXTERNAL';
  timestamp: number;      // ms from sim start
  verbalization?: string; // what the learner said
}

// --- Intervention Result ---
export interface InterventionResult {
  success: boolean;
  executed: boolean;
  reason?: string;
  
  // What happened
  outcome: InterventionOutcome;
  
  // State changes
  newState: Partial<PatientState>;
  
  // For display/audio
  events: SimulationEvent[];
}

export type InterventionOutcome =
  | 'CONVERTED'           // Rhythm converted to target
  | 'TRANSIENT_RESPONSE'  // Temporary change (e.g., asystole during adenosine)
  | 'NO_EFFECT'           // No change
  | 'PARTIAL_RESPONSE'    // Some improvement
  | 'ADVERSE_EFFECT'      // Got worse
  | 'PREREQUISITE_MISSING'// Couldn't execute (no IV, not sedated, etc.)
  | 'CONTRAINDICATED';    // Dangerous for this patient

// --- Simulation Events (for logging and audio/visual) ---
export interface SimulationEvent {
  timestamp: number;
  type: EventType;
  data: Record<string, any>;
}

export type EventType =
  | 'RHYTHM_CHANGE'
  | 'VITALS_CHANGE'
  | 'STABILITY_CHANGE'
  | 'INTERVENTION_ATTEMPTED'
  | 'INTERVENTION_EXECUTED'
  | 'TRANSIENT_START'
  | 'TRANSIENT_END'
  | 'DETERIORATION'
  | 'ALARM_TRIGGERED'
  | 'ALARM_RESOLVED';

// --- Dose Calculations ---
export interface DoseCalculation {
  drug: string;
  weightBasedDose: number;  // mg/kg or J/kg
  calculatedDose: number;   // actual dose for this patient
  maxDose: number;
  unit: string;
  route: string;
  notes?: string;
}

// --- PALS Protocol Reference ---
export interface ProtocolStep {
  id: string;
  description: string;
  interventions: InterventionType[];
  nextSteps: string[];
  timeout?: number;  // ms before auto-advancing
}

// --- Action Log Entry (for assessment) ---
export interface ActionLogEntry {
  timestamp: number;
  action: string;
  details: Record<string, any>;
  patientStateBefore: PatientState;
  patientStateAfter: PatientState;
  outcome: InterventionOutcome | null;
  doseAccuracy?: number;  // ratio of given/correct
  protocolAdherence?: boolean;
}

// --- Communication Log Entry ---
export interface CommunicationEntry {
  timestamp: number;
  speaker: 'learner' | 'lily' | 'mark' | 'nurse' | 'system';
  content: string;
  context: {
    patientState: PatientState;
    recentEvents: string[];
  };
  analysis?: {
    addressedParent: boolean;
    usedJargon: string[];
    closedLoop: boolean;
  };
}

// --- Session State ---
export interface SimulationSession {
  id: string;
  scenario: string;
  startTime: number;
  currentTime: number;
  state: PatientState;
  actionLog: ActionLogEntry[];
  communicationLog: CommunicationEntry[];
  events: SimulationEvent[];
  
  // Outcome tracking
  converted: boolean;
  timeToConversion?: number;
  interventionCount: number;
}

// --- Scenario Definition ---
export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  
  // Initial state
  initialState: PatientState;
  
  // Expected pathway
  expectedInterventions: InterventionType[];
  
  // Time limits
  idealTime: number;      // ms
  acceptableTime: number; // ms
  
  // Deterioration rules
  deteriorationEnabled: boolean;
  deteriorationDelay: number;  // ms before deterioration starts
  
  // Success criteria
  successCriteria: {
    mustConvert: boolean;
    maxTime?: number;
    requiredSteps?: InterventionType[];
  };
}
