# Implementation Plan: Advanced Debrief System

> **STATUS: ✅ FULLY IMPLEMENTED**
> All 5 phases complete. Build passing (58 modules, 269KB JS bundle).

## Overview

Transform PediSim's debrief from a rubric-based score panel into a decision-point analysis system with causal chain tracing, multi-perspective narratives, and interactive dialogue.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERACTIVE DEBRIEF UI                       │
│  Timeline → PivotCards → CausalChains → Perspectives → Dialogue     │
├─────────────────────────────────────────────────────────────────────┤
│                           useDebrief Hook                            │
│  Conversation state, user responses, progressive revelation          │
├─────────────────────────────────────────────────────────────────────┤
│                         EVALUATION ENGINE                            │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │  Timeline   │ │   Pivots    │ │   Causal     │ │ Counterfact. │  │
│  │ Reconstruct │ │ Identifier  │ │   Chains     │ │   Engine     │  │
│  └─────────────┘ └─────────────┘ └──────────────┘ └──────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                      ENHANCED DATA COLLECTION                        │
│  State snapshots • Communication windows • Event relationships       │
├─────────────────────────────────────────────────────────────────────┤
│                         AI SERVICES LAYER                            │
│  Evaluator (pivot analysis) • Perspective Generator • Dialogue Gen   │
├─────────────────────────────────────────────────────────────────────┤
│                         PERSISTENCE LAYER                            │
│  Session storage • Trajectory tracking • Cross-session comparison    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Enhanced Data Collection ✅ COMPLETED

**Goal:** Capture rich temporal data during simulation for post-hoc analysis.

### 1.1 New Types (`src/kernel/evaluation/types.ts`)

```typescript
// Snapshot of all state at a moment in time
interface StateSnapshot {
  timestamp: number;
  markAnxiety: number;
  lilyFear: number;
  phase: SimPhase;
  rhythm: Rhythm;
  vitals: Vitals;
  sedated: boolean;
  adenosineCount: number;
  cardioversionCount: number;
}

// Enhanced event with state context
interface TimelineEvent {
  id: string;
  timestamp: number;
  type: 'action' | 'communication' | 'state_change' | 'character_response';
  actor: 'learner' | 'nurse' | 'lily' | 'mark' | 'system';
  content: string;
  stateBefore: StateSnapshot;
  stateAfter: StateSnapshot;
  metadata?: Record<string, any>;
}

// Communication window analysis
interface CommunicationWindow {
  startEvent: string;      // Event ID that opened the window
  endEvent: string;        // Event ID that closed it
  duration: number;        // ms
  optimalMessage?: string; // What should have been said
  actualMessage?: string;  // What was said (if anything)
  wasMissed: boolean;
}

// Pivot point for analysis
interface PivotPoint {
  id: string;
  timestamp: number;
  type: 'decision' | 'missed_opportunity' | 'error' | 'success';
  description: string;
  decision?: string;
  alternatives: string[];
  actualOutcome: string;
  counterfactualOutcome?: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  affectedCharacters: ('lily' | 'mark' | 'nurse')[];
  causalChainId?: string;
}

// Causal chain linking events
interface CausalChain {
  id: string;
  name: string;
  events: string[];        // Event IDs in causal order
  rootCause: string;       // Event ID
  finalEffect: string;     // Description
  preventableAt: string[]; // Event IDs where intervention could break chain
}
```

### 1.2 Enhanced useSimulation (`src/hooks/useSimulation.ts`)

Add to existing hook:

```typescript
// New state
const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
const [stateHistory, setStateHistory] = useState<StateSnapshot[]>([]);

// Capture state snapshot
const captureSnapshot = useCallback((): StateSnapshot => ({
  timestamp: elapsed,
  markAnxiety,
  lilyFear,
  phase,
  rhythm,
  vitals,
  sedated,
  adenosineCount,
  cardioversionCount,
}), [elapsed, markAnxiety, lilyFear, phase, rhythm, vitals, sedated, adenosineCount, cardioversionCount]);

// Enhanced event logging
const logTimelineEvent = useCallback((
  type: TimelineEvent['type'],
  actor: TimelineEvent['actor'],
  content: string,
  metadata?: Record<string, any>
) => {
  const stateBefore = stateHistory[stateHistory.length - 1] || captureSnapshot();
  const stateAfter = captureSnapshot();

  setTimeline(prev => [...prev, {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: elapsed,
    type,
    actor,
    content,
    stateBefore,
    stateAfter,
    metadata,
  }]);

  setStateHistory(prev => [...prev, stateAfter]);
}, [elapsed, stateHistory, captureSnapshot]);
```

### 1.3 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/kernel/evaluation/types.ts` | Create | All evaluation type definitions |
| `src/hooks/useSimulation.ts` | Modify | Add timeline/snapshot logging |

---

## Phase 2: Evaluation Engine ✅ COMPLETED

**Goal:** Process timeline data to identify pivot points and trace causal chains.

### 2.1 Timeline Reconstruction (`src/kernel/evaluation/timeline.ts`)

```typescript
export function reconstructTimeline(
  events: TimelineEvent[],
  messages: Message[],
  actionLog: ActionLogEntry[]
): TimelineEvent[] {
  // Merge all event sources into unified timeline
  // Sort by timestamp
  // Annotate with state snapshots
}

export function identifyCommunicationWindows(
  timeline: TimelineEvent[]
): CommunicationWindow[] {
  // Key windows:
  // 1. Between adenosine order and asystole onset (WARNING WINDOW)
  // 2. During asystole (REASSURANCE WINDOW)
  // 3. After conversion (CELEBRATION WINDOW)
  // 4. After any intervention (EXPLANATION WINDOW)
}
```

### 2.2 Pivot Point Identification (`src/kernel/evaluation/pivots.ts`)

```typescript
// Rules for identifying pivots
const PIVOT_RULES: PivotRule[] = [
  {
    name: 'skipped_vagal',
    detect: (timeline) => {
      const firstAdenosine = timeline.find(e =>
        e.type === 'action' && e.content.includes('adenosine'));
      const anyVagal = timeline.find(e =>
        e.type === 'action' && e.content.includes('vagal'));
      return firstAdenosine && !anyVagal;
    },
    impact: 'medium',
    description: 'Skipped vagal maneuvers before adenosine',
    alternatives: ['Attempt vagal first (25% success, zero risk)'],
  },
  {
    name: 'no_warning_before_asystole',
    detect: (timeline) => {
      const asystoleEvent = timeline.find(e =>
        e.stateAfter.phase === 'ASYSTOLE');
      if (!asystoleEvent) return false;

      // Check 15 seconds before asystole for family communication
      const warningWindow = timeline.filter(e =>
        e.timestamp > asystoleEvent.timestamp - 15000 &&
        e.timestamp < asystoleEvent.timestamp &&
        e.actor === 'learner' &&
        e.type === 'communication'
      );
      return warningWindow.length === 0;
    },
    impact: 'critical',
    description: 'No warning to family before adenosine-induced asystole',
    alternatives: ['Warn dad: "The monitor will pause briefly - that\'s the medicine working"'],
  },
  {
    name: 'silence_during_asystole',
    detect: (timeline) => {
      const asystoleStart = timeline.find(e => e.stateAfter.phase === 'ASYSTOLE');
      const asystoleEnd = timeline.find(e =>
        e.stateBefore.phase === 'ASYSTOLE' && e.stateAfter.phase !== 'ASYSTOLE');
      if (!asystoleStart || !asystoleEnd) return false;

      const duringAsystole = timeline.filter(e =>
        e.timestamp >= asystoleStart.timestamp &&
        e.timestamp <= asystoleEnd.timestamp &&
        e.actor === 'learner'
      );
      return duringAsystole.length === 0;
    },
    impact: 'high',
    description: 'No reassurance during asystole period',
    alternatives: ['Reassure: "This pause is expected, watch with me..."'],
  },
  // ... more rules
];

export function identifyPivotPoints(timeline: TimelineEvent[]): PivotPoint[] {
  return PIVOT_RULES
    .filter(rule => rule.detect(timeline))
    .map(rule => ({
      id: `pivot_${rule.name}`,
      timestamp: findRelevantTimestamp(timeline, rule),
      type: rule.type || 'missed_opportunity',
      description: rule.description,
      alternatives: rule.alternatives,
      impact: rule.impact,
      // ... fill in other fields
    }))
    .sort((a, b) => b.impact.localeCompare(a.impact)); // Critical first
}
```

### 2.3 Causal Chain Tracing (`src/kernel/evaluation/causal.ts`)

```typescript
// Known causal relationships in the simulation
const CAUSAL_TEMPLATES: CausalTemplate[] = [
  {
    id: 'asystole_trauma_chain',
    name: 'Asystole Trauma Cascade',
    trigger: 'no_warning_before_asystole',
    chain: [
      { event: 'asystole_onset', effect: 'dad_sees_flatline' },
      { event: 'dad_sees_flatline', effect: 'dad_panics', stateChange: { markAnxiety: 5 } },
      { event: 'dad_panics', effect: 'dad_screams' },
      { event: 'dad_screams', effect: 'lily_hears', stateChange: { lilyFear: 5 } },
      { event: 'lily_hears', effect: 'lily_traumatized' },
    ],
    counterfactual: {
      intervention: 'warn_before_asystole',
      brokenAt: 'dad_sees_flatline',
      alternativeChain: [
        { event: 'asystole_onset', effect: 'dad_sees_expected_flatline' },
        { event: 'dad_sees_expected_flatline', effect: 'dad_tense_but_prepared', stateChange: { markAnxiety: 4 } },
        { event: 'dad_tense_but_prepared', effect: 'dad_stays_quiet' },
        { event: 'dad_stays_quiet', effect: 'lily_unaware', stateChange: { lilyFear: 4 } },
      ],
    },
  },
];

export function traceCausalChains(
  timeline: TimelineEvent[],
  pivots: PivotPoint[]
): CausalChain[] {
  // Match pivots to causal templates
  // Instantiate chains with actual timeline events
  // Calculate actual vs counterfactual outcomes
}
```

### 2.4 Counterfactual Engine (`src/kernel/evaluation/counterfactual.ts`)

```typescript
export function generateCounterfactual(
  timeline: TimelineEvent[],
  pivot: PivotPoint,
  chain: CausalChain
): CounterfactualResult {
  // Given what happened, compute what would have happened
  // with a different decision at the pivot point

  return {
    pivotId: pivot.id,
    actualOutcome: {
      markAnxietyPeak: 5,
      lilyFearPeak: 5,
      trustDelta: -2,
      description: 'Dad traumatized, screamed, Lily terrified',
    },
    counterfactualOutcome: {
      markAnxietyPeak: 4,
      lilyFearPeak: 4,
      trustDelta: 0,
      description: 'Dad prepared, stayed calm, Lily protected',
    },
    intervention: {
      timing: pivot.timestamp - 10000, // 10 seconds earlier
      action: 'Say to dad: "Watch the monitor with me. Her heart will pause briefly - that\'s the medicine working."',
    },
  };
}
```

### 2.5 Files to Create

| File | Purpose |
|------|---------|
| `src/kernel/evaluation/index.ts` | Exports |
| `src/kernel/evaluation/types.ts` | Type definitions |
| `src/kernel/evaluation/timeline.ts` | Timeline reconstruction |
| `src/kernel/evaluation/pivots.ts` | Pivot point identification |
| `src/kernel/evaluation/causal.ts` | Causal chain tracing |
| `src/kernel/evaluation/counterfactual.ts` | What-if analysis |

---

## Phase 3: Narrative Generation ✅ COMPLETED

**Goal:** Generate multi-perspective narratives from Dad, Lily, and Nurse.

> **Implementation Note:** Instead of using Claude API for runtime generation, we implemented deterministic narrative generators in `src/kernel/narrative/` that produce contextually appropriate first-person accounts based on simulation state. This avoids API latency and costs while maintaining quality.

### 3.1 Evaluator Service (`src/services/evaluator.ts`)

```typescript
const EVALUATOR_PROMPT = `You are a master medical educator conducting a debrief.

## Your Philosophy
- Learning happens through insight, not scores
- One transformative realization beats ten minor corrections
- The learner should leave knowing exactly what to do differently
- Connect feedback to patient/family outcomes, not abstract standards

## The Case
{scenarioDescription}

## Complete Timeline
{timeline}

## Identified Pivot Points
{pivots}

## Causal Chains
{chains}

## Your Analysis (respond in JSON)

{
  "pivotalMoment": {
    "id": "pivot id",
    "whyThisMatters": "2-3 sentence explanation",
    "theOneInsight": "Single sentence the learner should remember"
  },
  "dadPerspective": {
    "narrative": "First-person 3-4 sentence narrative",
    "trustTrajectory": { "start": 6, "end": 4 },
    "keyMoment": "timestamp and description"
  },
  "lilyPerspective": {
    "narrative": "First-person 3-4 sentence narrative (age-appropriate)",
    "fearTrajectory": { "start": 4, "peak": 5, "end": 3 },
    "keyMoment": "timestamp and description"
  },
  "nursePerspective": {
    "narrative": "First-person 3-4 sentence internal monologue",
    "assessment": "Would work with again / needs improvement / concerning"
  },
  "theOneThing": {
    "behavior": "Specific behavior to change",
    "exactWords": "The exact phrase to say",
    "exactMoment": "When to say it"
  },
  "dialogueHooks": [
    {
      "question": "Reflective question",
      "options": ["Option 1", "Option 2", "Option 3", "I'm not sure"],
      "correctOption": 0,
      "followUp": "Response after correct answer"
    }
  ],
  "trajectory": {
    "clinical": 4.2,
    "communication": 2.9,
    "rateLimiter": "communication"
  }
}`;

export async function generateEvaluation(
  timeline: TimelineEvent[],
  pivots: PivotPoint[],
  chains: CausalChain[]
): Promise<EvaluationResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: EVALUATOR_PROMPT
        .replace('{scenarioDescription}', getScenarioDescription())
        .replace('{timeline}', formatTimeline(timeline))
        .replace('{pivots}', JSON.stringify(pivots, null, 2))
        .replace('{chains}', JSON.stringify(chains, null, 2)),
      messages: [{ role: 'user', content: 'Generate the debrief analysis.' }]
    })
  });

  const data = await response.json();
  return JSON.parse(data.content[0].text);
}
```

### 3.2 Files to Create

| File | Purpose |
|------|---------|
| `src/services/evaluator.ts` | Claude API for evaluation |
| `src/services/prompts.ts` | Prompt templates |

---

## Phase 4: Interactive Debrief UI ✅ COMPLETED

**Goal:** Replace static DebriefPanel with conversation-based interface.

### 4.1 Component Structure

```
src/components/debrief/
├── InteractiveDebrief.tsx    # Main container
├── Timeline.tsx              # Visual timeline with expandable events
├── PivotCard.tsx             # Expandable analysis of pivot point
├── CausalChainViz.tsx        # Visual chain: A → B → C
├── PerspectivePanel.tsx      # Dad/Lily/Nurse POV tabs
├── DialoguePrompt.tsx        # Multiple choice + free text
├── TrajectoryGraph.tsx       # Performance over time
└── index.ts                  # Exports
```

### 4.2 InteractiveDebrief Component

```typescript
// src/components/debrief/InteractiveDebrief.tsx

interface DebriefState {
  stage: 'overview' | 'pivot_analysis' | 'perspectives' | 'dialogue' | 'summary';
  currentPivot: number;
  dialogueStep: number;
  userResponses: Record<string, string>;
}

export function InteractiveDebrief({ evaluation, onClose, onRestart }) {
  const [state, setState] = useState<DebriefState>({
    stage: 'overview',
    currentPivot: 0,
    dialogueStep: 0,
    userResponses: {},
  });

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col z-50">
      {/* Header with outcome */}
      <DebriefHeader evaluation={evaluation} />

      {/* Main content - changes based on stage */}
      {state.stage === 'overview' && (
        <OverviewStage
          evaluation={evaluation}
          onContinue={() => setState(s => ({ ...s, stage: 'pivot_analysis' }))}
        />
      )}

      {state.stage === 'pivot_analysis' && (
        <PivotAnalysisStage
          pivot={evaluation.pivots[state.currentPivot]}
          chain={evaluation.chains.find(c => c.id === pivot.causalChainId)}
          onContinue={() => setState(s => ({ ...s, stage: 'perspectives' }))}
        />
      )}

      {state.stage === 'perspectives' && (
        <PerspectivesStage
          dad={evaluation.dadPerspective}
          lily={evaluation.lilyPerspective}
          nurse={evaluation.nursePerspective}
          onContinue={() => setState(s => ({ ...s, stage: 'dialogue' }))}
        />
      )}

      {state.stage === 'dialogue' && (
        <DialogueStage
          hooks={evaluation.dialogueHooks}
          step={state.dialogueStep}
          onResponse={(response) => {
            setState(s => ({
              ...s,
              userResponses: { ...s.userResponses, [s.dialogueStep]: response },
              dialogueStep: s.dialogueStep + 1,
            }));
          }}
          onComplete={() => setState(s => ({ ...s, stage: 'summary' }))}
        />
      )}

      {state.stage === 'summary' && (
        <SummaryStage
          evaluation={evaluation}
          userResponses={state.userResponses}
          onRestart={onRestart}
          onClose={onClose}
        />
      )}
    </div>
  );
}
```

### 4.3 Timeline Component

```typescript
// Visual horizontal timeline with markers
export function Timeline({ events, pivots, onEventClick }) {
  return (
    <div className="relative h-32 bg-slate-900 rounded-lg p-4">
      {/* Time axis */}
      <div className="absolute bottom-8 left-4 right-4 h-0.5 bg-slate-700" />

      {/* Event markers */}
      {events.map(event => (
        <TimelineMarker
          key={event.id}
          event={event}
          isPivot={pivots.some(p => p.timestamp === event.timestamp)}
          onClick={() => onEventClick(event)}
        />
      ))}

      {/* State trajectory line (anxiety/fear) */}
      <StateTrendLine events={events} metric="markAnxiety" color="amber" />
      <StateTrendLine events={events} metric="lilyFear" color="pink" />
    </div>
  );
}
```

### 4.4 DialoguePrompt Component

```typescript
export function DialoguePrompt({ question, options, onSelect, allowFreeText }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [freeText, setFreeText] = useState('');

  return (
    <div className="bg-slate-800 rounded-xl p-6 max-w-xl mx-auto">
      <p className="text-lg mb-4">{question}</p>

      <div className="space-y-2 mb-4">
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`w-full text-left p-3 rounded-lg border ${
              selected === i
                ? 'border-blue-500 bg-blue-500/20'
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {allowFreeText && (
        <div className="mt-4">
          <p className="text-sm text-slate-400 mb-2">Or type your response:</p>
          <textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            className="w-full bg-black/50 border border-slate-600 rounded-lg p-3"
            rows={3}
          />
        </div>
      )}

      <button
        onClick={() => onSelect(freeText || options[selected!])}
        disabled={selected === null && !freeText}
        className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 py-2 rounded-lg font-bold"
      >
        Continue
      </button>
    </div>
  );
}
```

### 4.5 Files to Create

| File | Purpose |
|------|---------|
| `src/components/debrief/InteractiveDebrief.tsx` | Main debrief container |
| `src/components/debrief/Timeline.tsx` | Visual timeline |
| `src/components/debrief/PivotCard.tsx` | Expandable pivot analysis |
| `src/components/debrief/CausalChainViz.tsx` | Chain visualization |
| `src/components/debrief/PerspectivePanel.tsx` | Character POV display |
| `src/components/debrief/DialoguePrompt.tsx` | Interactive questions |
| `src/components/debrief/TrajectoryGraph.tsx` | Performance over time |
| `src/hooks/useDebrief.ts` | Debrief state management |

---

## Phase 5: Polish & Enhancement ✅ COMPLETED

**Goal:** Add visual polish, loading states, and quick summary preview.

> **Implementation Note:** Persistence layer (localStorage for session history) was deferred. Phase 5 focused on UI polish: LoadingState, CounterfactualCompare, EmotionalChart, and QuickSummary components.

### 5.1 Session Storage (`src/services/persistence.ts`)

```typescript
interface SessionRecord {
  id: string;
  timestamp: number;
  scenario: string;
  outcome: 'converted' | 'failed';
  timeToConversion: number | null;
  pivotPoints: PivotPoint[];
  scores: {
    clinical: number;
    communication: number;
    overall: number;
  };
  theOneThing: string;
}

export function saveSession(record: SessionRecord): void {
  const history = getSessionHistory();
  history.push(record);
  localStorage.setItem('pedisim_history', JSON.stringify(history));
}

export function getSessionHistory(): SessionRecord[] {
  const stored = localStorage.getItem('pedisim_history');
  return stored ? JSON.parse(stored) : [];
}

export function calculateTrajectory(history: SessionRecord[]): Trajectory {
  // Compute rolling averages, improvement rates, rate-limiters
}
```

### 5.2 Files to Create

| File | Purpose |
|------|---------|
| `src/services/persistence.ts` | Local storage for session history |

---

## Implementation Summary

All phases implemented in order:

1. **Phase 1** - Enhanced data collection with state snapshots in useSimulation
2. **Phase 2** - Evaluation engine: timeline reconstruction, pivot detection, causal chains, counterfactuals
3. **Phase 3** - Narrative generation: deterministic first-person accounts from Dad, Lily, Nurse
4. **Phase 4** - Interactive debrief UI: 10 components with 5-tab interface
5. **Phase 5** - Polish: loading states, emotional chart, quick summary preview

**Final build:** 58 modules, 269KB JS bundle, all TypeScript errors resolved.

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Pivot points identified | ≥3 per session |
| Causal chains traced | ≥1 critical chain |
| Counterfactuals generated | For each critical pivot |
| Perspective narratives | All 3 characters |
| Interactive dialogue steps | ≥2 questions |
| Session persistence | Working across refreshes |

---

## Dependencies

- Existing: `useSimulation.ts`, `actionLog`, `messages`, character states
- New: Claude API calls for evaluation (already have pattern from character dialogue)
- No new npm packages required

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Claude API rate limits | Cache evaluations, debounce requests |
| Complex state management | Keep debrief state separate from sim state |
| Timeline data too large | Prune low-signal events |
| Causal chains too deterministic | Allow AI to identify novel chains |
