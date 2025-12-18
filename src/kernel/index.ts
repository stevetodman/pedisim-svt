// ============================================================================
// SIMULATION KERNEL
// Main orchestrator for the deterministic simulation engine
// ============================================================================

import {
  PatientState,
  PatientProfile,
  InterventionRequest,
  InterventionResult,
  SimulationEvent,
  ActionLogEntry,
  CommunicationEntry,
  SimulationSession,
  ScenarioDefinition,
  Rhythm,
} from './types';
import { processIntervention, calculateDeterioration, resolveTransientState } from './physiology';
import { getAllDoseCalculations } from './doses';

// ============================================================================
// SCENARIO DEFINITIONS
// ============================================================================

export const SCENARIOS: Record<string, ScenarioDefinition> = {
  SVT_STABLE: {
    id: 'SVT_STABLE',
    name: 'Stable SVT',
    description: '5-year-old with sudden onset palpitations during play. Hemodynamically stable SVT.',
    difficulty: 'beginner',
    initialState: createInitialState({
      name: 'Lily Henderson',
      age: 5,
      weight: 18.5,
      gender: 'female',
      chiefComplaint: 'Chest feels like a drum',
      history: 'Playing tag, sudden onset',
    }, {
      rhythm: 'SVT',
      hr: 220,
      bp: [92, 64],
      stable: true,
    }),
    expectedInterventions: ['VAGAL_ICE', 'ADENOSINE', 'ADENOSINE_2', 'CARDIOVERSION_SYNC'],
    idealTime: 180000,      // 3 min
    acceptableTime: 300000, // 5 min
    deteriorationEnabled: true,
    deteriorationDelay: 300000, // 5 min before deterioration starts
    successCriteria: {
      mustConvert: true,
      maxTime: 600000,
    },
  },

  SVT_UNSTABLE: {
    id: 'SVT_UNSTABLE',
    name: 'Unstable SVT',
    description: '5-year-old with SVT and signs of shock. Requires immediate cardioversion.',
    difficulty: 'intermediate',
    initialState: createInitialState({
      name: 'Lily Henderson',
      age: 5,
      weight: 18.5,
      gender: 'female',
      chiefComplaint: 'Chest hurts, feels dizzy',
      history: 'SVT for ~20 minutes before arrival',
    }, {
      rhythm: 'SVT',
      hr: 240,
      bp: [70, 45],
      stable: false,
      mentalStatus: 'verbal',
      perfusion: 'poor',
    }),
    expectedInterventions: ['SEDATION', 'CARDIOVERSION_SYNC'],
    idealTime: 120000,
    acceptableTime: 180000,
    deteriorationEnabled: true,
    deteriorationDelay: 60000,
    successCriteria: {
      mustConvert: true,
      maxTime: 300000,
    },
  },

  SVT_DETERIORATING: {
    id: 'SVT_DETERIORATING',
    name: 'Deteriorating SVT',
    description: 'Stable SVT that becomes unstable if not treated promptly.',
    difficulty: 'advanced',
    initialState: createInitialState({
      name: 'Lily Henderson',
      age: 5,
      weight: 18.5,
      gender: 'female',
      chiefComplaint: 'Heart racing',
      history: 'Noted tachycardia 10 minutes ago',
    }, {
      rhythm: 'SVT',
      hr: 225,
      bp: [88, 58],
      stable: true,
      deteriorationStage: 1, // Already slightly compromised
    }),
    expectedInterventions: ['VAGAL_ICE', 'ADENOSINE', 'CARDIOVERSION_SYNC'],
    idealTime: 240000,
    acceptableTime: 360000,
    deteriorationEnabled: true,
    deteriorationDelay: 120000, // Quick deterioration
    successCriteria: {
      mustConvert: true,
      maxTime: 480000,
    },
  },
};

// ============================================================================
// HELPER: Create Initial State
// ============================================================================

function createInitialState(
  profile: PatientProfile,
  params: {
    rhythm: Rhythm;
    hr: number;
    bp: [number, number];
    stable: boolean;
    mentalStatus?: 'alert' | 'verbal' | 'pain' | 'unresponsive';
    perfusion?: 'adequate' | 'delayed' | 'poor' | 'absent';
    deteriorationStage?: number;
  }
): PatientState {
  return {
    profile,
    rhythm: params.rhythm,
    vitals: {
      heartRate: params.hr,
      systolicBP: params.bp[0],
      diastolicBP: params.bp[1],
      respiratoryRate: 26,
      spO2: params.stable ? 97 : 93,
      temperature: 98.6,
      capillaryRefill: params.stable ? 2 : 4,
    },
    mentalStatus: params.mentalStatus || 'alert',
    perfusion: params.perfusion || 'adequate',
    stability: params.stable ? 'stable' : 'decompensated',
    ivAccess: false,
    ioAccess: false,
    sedated: false,
    intubated: false,
    timeInCurrentRhythm: 0,
    deteriorationStage: params.deteriorationStage || 0,
    transientState: null,
  };
}

// ============================================================================
// SIMULATION KERNEL CLASS
// ============================================================================

export class SimulationKernel {
  private session: SimulationSession;
  private scenario: ScenarioDefinition;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private pendingConversion: boolean = false;
  private transientEndTime: number = 0;

  // Callbacks for UI updates
  public onStateChange?: (state: PatientState) => void;
  public onEvent?: (event: SimulationEvent) => void;
  public onTransientStart?: (type: string, duration: number) => void;
  public onTransientEnd?: (converted: boolean) => void;

  constructor(scenarioId: string = 'SVT_STABLE') {
    this.scenario = SCENARIOS[scenarioId] || SCENARIOS.SVT_STABLE;
    this.session = this.createSession();
  }

  private createSession(): SimulationSession {
    return {
      id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scenario: this.scenario.id,
      startTime: 0,
      currentTime: 0,
      state: JSON.parse(JSON.stringify(this.scenario.initialState)),
      actionLog: [],
      communicationLog: [],
      events: [],
      converted: false,
      interventionCount: 0,
    };
  }

  // ---- Public API ----

  /**
   * Start the simulation
   */
  start(): void {
    this.session.startTime = Date.now();
    
    // Start tick loop for time-based updates
    this.tickInterval = setInterval(() => this.tick(100), 100);

    this.logEvent({
      timestamp: 0,
      type: 'INTERVENTION_EXECUTED',
      data: { action: 'SIMULATION_START', scenario: this.scenario.id }
    });
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Get current patient state
   */
  getState(): PatientState {
    return this.session.state;
  }

  /**
   * Get current session
   */
  getSession(): SimulationSession {
    return this.session;
  }

  /**
   * Get dose calculations for current patient
   */
  getDoseCalculations() {
    return getAllDoseCalculations(this.session.state.profile.weight);
  }

  /**
   * Get elapsed time in ms
   */
  getElapsedTime(): number {
    return this.session.currentTime;
  }

  /**
   * Process an intervention
   */
  processIntervention(request: InterventionRequest): InterventionResult {
    const stateBefore = JSON.parse(JSON.stringify(this.session.state));
    
    // Process through physiology engine
    const result = processIntervention(this.session.state, request);

    // Log the action
    const logEntry: ActionLogEntry = {
      timestamp: request.timestamp,
      action: request.type,
      details: {
        dose: request.dose,
        route: request.route,
        verbalization: request.verbalization,
      },
      patientStateBefore: stateBefore,
      patientStateAfter: this.session.state,
      outcome: result.outcome,
      doseAccuracy: (result as any)._doseAccuracy,
    };
    this.session.actionLog.push(logEntry);
    this.session.interventionCount++;

    // Apply state changes
    if (result.newState) {
      this.applyStateChange(result.newState);
    }

    // Log events
    result.events.forEach(e => this.logEvent(e));

    // Handle transient state (adenosine)
    if (result.outcome === 'TRANSIENT_RESPONSE' && this.session.state.transientState) {
      this.pendingConversion = (result as any)._pendingConversion || false;
      this.transientEndTime = this.session.currentTime + this.session.state.transientState.duration;
      
      if (this.onTransientStart) {
        this.onTransientStart(
          this.session.state.transientState.type,
          this.session.state.transientState.duration
        );
      }
    }

    // Check for conversion
    if (result.outcome === 'CONVERTED' && this.session.state.rhythm === 'SINUS') {
      this.session.converted = true;
      this.session.timeToConversion = this.session.currentTime;
    }

    // Notify UI
    if (this.onStateChange) {
      this.onStateChange(this.session.state);
    }

    return result;
  }

  /**
   * Log communication
   */
  logCommunication(entry: Omit<CommunicationEntry, 'context'>): void {
    this.session.communicationLog.push({
      ...entry,
      context: {
        patientState: JSON.parse(JSON.stringify(this.session.state)),
        recentEvents: this.session.events.slice(-5).map(e => e.type),
      }
    });
  }

  /**
   * Check if scenario is complete
   */
  isComplete(): boolean {
    if (this.session.converted) return true;
    if (this.scenario.successCriteria.maxTime && 
        this.session.currentTime > this.scenario.successCriteria.maxTime) {
      return true;
    }
    return false;
  }

  /**
   * Get assessment summary
   */
  getAssessment(): {
    success: boolean;
    timeToConversion: number | null;
    interventionCount: number;
    doseAccuracies: { intervention: string; accuracy: number }[];
    missedSteps: string[];
    communication: { total: number; parentAddressed: number };
  } {
    const doseAccuracies = this.session.actionLog
      .filter(a => a.doseAccuracy !== undefined)
      .map(a => ({ intervention: a.action, accuracy: a.doseAccuracy! }));

    const performedInterventions = new Set(this.session.actionLog.map(a => a.action));
    const missedSteps = this.scenario.expectedInterventions.filter(i => 
      !performedInterventions.has(i) && 
      // Only count as missed if it was needed (e.g., don't count cardioversion if adenosine worked)
      !(this.session.converted && ['CARDIOVERSION_SYNC', 'ADENOSINE_2'].includes(i))
    );

    const parentComms = this.session.communicationLog.filter(c => 
      c.speaker === 'learner' && c.analysis?.addressedParent
    );

    return {
      success: this.session.converted,
      timeToConversion: this.session.timeToConversion || null,
      interventionCount: this.session.interventionCount,
      doseAccuracies,
      missedSteps,
      communication: {
        total: this.session.communicationLog.filter(c => c.speaker === 'learner').length,
        parentAddressed: parentComms.length,
      }
    };
  }

  // ---- Private Methods ----

  private tick(deltaMs: number): void {
    this.session.currentTime += deltaMs;

    // Check for transient state resolution
    if (this.session.state.transientState && 
        this.session.currentTime >= this.transientEndTime) {
      const stateChange = resolveTransientState(this.session.state, this.pendingConversion);
      this.applyStateChange(stateChange);
      
      if (this.onTransientEnd) {
        this.onTransientEnd(this.pendingConversion);
      }

      if (this.pendingConversion) {
        this.session.converted = true;
        this.session.timeToConversion = this.session.currentTime;
      }

      this.pendingConversion = false;
      this.transientEndTime = 0;

      this.logEvent({
        timestamp: this.session.currentTime,
        type: 'TRANSIENT_END',
        data: { converted: this.session.converted }
      });
    }

    // Check for deterioration
    if (this.scenario.deteriorationEnabled && 
        this.session.currentTime > this.scenario.deteriorationDelay &&
        !this.session.converted) {
      const deterioration = calculateDeterioration(this.session.state, deltaMs);
      if (deterioration) {
        this.applyStateChange(deterioration);
        this.logEvent({
          timestamp: this.session.currentTime,
          type: 'DETERIORATION',
          data: { stage: deterioration.deteriorationStage, stability: deterioration.stability }
        });
      }
    }

    // Update time in rhythm
    this.session.state.timeInCurrentRhythm += deltaMs;
  }

  private applyStateChange(change: Partial<PatientState>): void {
    this.session.state = {
      ...this.session.state,
      ...change,
      vitals: {
        ...this.session.state.vitals,
        ...(change.vitals || {}),
      },
    };

    if (this.onStateChange) {
      this.onStateChange(this.session.state);
    }
  }

  private logEvent(event: SimulationEvent): void {
    this.session.events.push(event);
    if (this.onEvent) {
      this.onEvent(event);
    }
  }
}

// Export singleton factory
export function createKernel(scenarioId?: string): SimulationKernel {
  return new SimulationKernel(scenarioId);
}
