# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PediSim SVT is a web-based pediatric cardiology simulator for training medical professionals on Supraventricular Tachycardia (SVT) management using PALS (Pediatric Advanced Life Support) protocols. The simulation features a 5-year-old patient (Lily Henderson, 18.5kg) with AI-powered characters responding emotionally to clinical decisions.

## Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # TypeScript check + production build
npm run preview  # Preview production build
npm run test     # Run tests with Vitest
```

## Architecture

### Layered Design

```
UI Layer (React)
    └── useSimulation hook (state orchestration)
            └── Simulation Kernel (deterministic outcomes)
                    ├── physiology.ts  (clinical outcome calculations)
                    ├── doses.ts       (PALS weight-based dosing)
                    └── nurse.ts       (safety validation layer)
```

### Core Design Principles

1. **Deterministic Physiology**: Clinical outcomes in `kernel/physiology.ts` are never influenced by AI dialogue or character responses. Adenosine success rates, cardioversion outcomes, and deterioration are calculated purely from dose accuracy and timing.

2. **Nurse Safety Layer**: All medication orders pass through `kernel/nurse.ts` before execution. The nurse can `confirm`, `question`, `warn`, `cap` (reduce overdose to max safe), or `refuse` orders. This models real clinical practice where nurses catch errors.

3. **Separation of Concerns**: The kernel is purely deterministic and auditable. The UI hook (`useSimulation.ts`) orchestrates state, audio, and AI responses separately from clinical logic.

### Key Files

- `src/hooks/useSimulation.ts` - Central state orchestration (80+ state variables), all user actions
- `src/kernel/physiology.ts` - Intervention processors: vagal (25% success), adenosine (60-80%), cardioversion (92%)
- `src/kernel/nurse.ts` - Dose validation with `evaluateAdenosineOrder()` and `evaluateCardioversionOrder()`
- `src/kernel/doses.ts` - PALS 2020 protocols: adenosine 0.1/0.2 mg/kg, cardioversion 0.5-2 J/kg
- `src/kernel/random.ts` - Seeded random utility for reproducible test outcomes
- `src/api/aiConfig.ts` - Environment-based AI configuration
- `src/api/characterAI.ts` - Unified character response API with scripted fallback
- `src/audio/index.ts` - Web Audio API procedural sounds (no audio files)
- `src/App.tsx` - Main UI with inline ECGTrace, VitalsMonitor, DebriefPanel components

### Prerequisites System

The simulation enforces realistic clinical prerequisites:

- **IV/IO Access**: Must be established before adenosine or sedation can be given
- **Sedation**: Required before synchronized cardioversion
- User must click "Establish IV" button before medication administration

### Simulation Flow

```
IDLE → RUNNING (SVT @ 220 BPM)
         │
         ├─ Vagal (25%) ─────┐
         ├─ Adenosine (60-80%) → ASYSTOLE (3-7s transient) ─┐
         └─ Cardioversion (92%) ────────────────────────────┤
                                                            ↓
                                              CONVERTED (Sinus @ 85-100 BPM)
```

### AI Character System

Characters (Lily, Mark/father, Nurse) respond emotionally to clinical decisions. Each has emotional state tracking (lilyFear 0-5, markAnxiety 1-5) that influences responses. Character responses are cosmetic and never affect clinical outcomes.

**Two modes of operation:**

1. **Scripted Mode (default)**: Context-aware scripted responses from `src/characters/index.ts`. Works without any API key.

2. **AI Mode (optional)**: When `VITE_ANTHROPIC_API_KEY` is set in `.env`, uses Claude Sonnet via Vite proxy for dynamic responses. Falls back to scripted on API errors.

```
src/api/
├── aiConfig.ts      # Environment detection, API config
└── characterAI.ts   # Unified API: getCharacterResponse()
```

### PALS Reference Values (18.5kg patient)

- Adenosine 1st: 1.85mg (0.1 mg/kg, max 6mg)
- Adenosine 2nd: 3.7mg (0.2 mg/kg, max 12mg)
- Cardioversion: 9-37J (0.5-2 J/kg)

## Environment Setup

Copy `.env.example` to `.env` for optional AI-powered character responses:

```bash
cp .env.example .env
# Edit .env and add your Anthropic API key (optional)
```

Without an API key, characters use scripted fallback responses (fully functional).

## Testing

**63 tests** covering the simulation kernel. Run with:

```bash
npm run test        # Watch mode
npx vitest run      # Single run
```

### Test Structure

```
tests/
├── setup.ts                        # Fixtures, seeded random helpers
└── kernel/
    ├── doses.test.ts               # PALS dosing calculations (16 tests)
    ├── nurse.test.ts               # Safety validation layer (21 tests)
    ├── physiology.test.ts          # Intervention outcomes (20 tests)
    └── evaluation/
        └── causal.test.ts          # Causal chain verification (6 tests)
```

### Reproducible Random

The kernel uses seeded random (`src/kernel/random.ts`) for deterministic test outcomes:

```typescript
import { setRandomSeed, resetRandom } from '../src/kernel/random';

beforeEach(() => setRandomSeed(12345));  // Reproducible
afterEach(() => resetRandom());           // Back to Math.random
```

## Debrief System

See `docs/DEBRIEF_DESIGN.md` for philosophy and `docs/IMPLEMENTATION_PLAN.md` for architecture details.

**Core principle:** Learning through insight, not scores. The debrief traces causal chains ("Dad screamed because you didn't warn him → Lily heard → Lily traumatized") rather than assigning rubric scores.

### Implemented Components

**Evaluation Engine (`src/kernel/evaluation/`):**
- `types.ts` - Core type definitions (StateSnapshot, TimelineEvent, PivotPoint, CausalChain, Counterfactual)
- `timeline.ts` - Timeline reconstruction with 5 communication window definitions
- `pivots.ts` - 8 pivot detection rules (no_warning_before_asystole, silence_during_asystole, skipped_vagal, etc.)
- `causal.ts` - 4 causal chain templates (asystole_trauma_cascade, dose_error_chain, etc.)
- `counterfactual.ts` - "What if" analysis engine
- `index.ts` - Main `runEvaluation()` export

**Narrative Engine (`src/kernel/narrative/`):**
- `mark.ts` - Dad's first-person perspective generator
- `lily.ts` - Age-appropriate 5-year-old's voice
- `nurse.ts` - Professional assessment with ratings
- `types.ts` / `index.ts` - Types and exports

**Debrief UI (`src/components/debrief/`):**
- `DebriefView.tsx` - Main container with 5 tabs (Summary, Decision Points, Perspectives, Reflect, Timeline)
- `Timeline.tsx` - Visual timeline with event markers
- `PivotCard.tsx` - Expandable decision point display
- `CausalChainView.tsx` - Cause-effect cascade visualization
- `NarrativePanel.tsx` - Character perspective display
- `DialogueHook.tsx` - Interactive reflection questions
- `EmotionalChart.tsx` - Canvas-based emotional trajectory chart
- `CounterfactualCompare.tsx` - Side-by-side actual vs alternative comparison
- `QuickSummary.tsx` - Preview card before full debrief
- `LoadingState.tsx` - Animated loading screen

**Orchestration Hook (`src/hooks/useDebrief.ts`):**
- Coordinates evaluation engine + narrative generation
- Manages debrief state and loading flow
