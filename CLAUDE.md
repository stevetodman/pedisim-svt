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
- `src/kernel/ecg/` - ECG waveform generation kernel (morphology, measurements, waveform synthesis)
- `src/components/ecg-viewer/` - MUSE-style 15-lead ECG viewer with calipers

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

**157 tests** covering the simulation kernel. Run with:

```bash
npm run test        # Watch mode
npx vitest run      # Single run
```

### Test Structure

```
tests/
├── setup.ts                        # Fixtures, seeded random helpers
└── kernel/
    ├── doses.test.ts               # PALS dosing calculations (33 tests)
    ├── nurse.test.ts               # Safety validation layer (21 tests)
    ├── physiology.test.ts          # Intervention outcomes (20 tests)
    ├── integration.test.ts         # Full scenario integration (11 tests)
    └── evaluation/
        ├── causal.test.ts          # Causal chain verification (6 tests)
        ├── counterfactual.test.ts  # What-if analysis (21 tests)
        ├── pivots.test.ts          # Pivot point detection (18 tests)
        └── timeline.test.ts        # Timeline reconstruction (27 tests)
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

## ECG Viewer System

A MUSE-style 15-lead pediatric ECG viewer for teaching ECG interpretation. Access via "Get 15-Lead ECG" button during simulation.

### Architecture

```
src/kernel/ecg/                    # Deterministic waveform generation
├── types.ts                       # LeadName, WaveComponent, ECGMeasurements
├── morphology.ts                  # Per-lead PQRST morphologies (SVT, Sinus, Asystole)
├── waveform.ts                    # Gaussian waveform synthesis
└── measurements.ts                # Auto-calculate PR, QRS, QT, QTc, axis

src/components/ecg-viewer/         # UI presentation layer
├── ECGViewer.tsx                  # Main modal with "Measure to Learn" mode
├── LeadGrid.tsx                   # 15-lead layout (12 standard + V3R, V4R, V7)
├── WaveformCanvas.tsx             # Canvas renderer with ECG paper grid
├── Calipers.tsx                   # SVG measurement overlay with marching
└── Controls.tsx                   # Gain/speed/caliper toolbar
```

### Features

- **15-lead pediatric layout**: Standard 12 leads + right-sided V3R, V4R, V7
- **"Measure to Learn" mode**: HR, QRS, QT hidden until user measures with calipers
- **Interactive calipers**: Click twice to measure intervals, provides feedback
- **Marching calipers**: Verify rhythm regularity across the strip
- **Standardization controls**: Gain (5/10/20 mm/mV), Speed (25/50 mm/s)

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `C` | Toggle calipers |
| `M` | Toggle marching mode |
| `G` | Cycle gain |
| `S` | Cycle speed |
| `Esc` | Clear calipers / Close viewer |

### Pediatric SVT Morphology (5yo)

- **Rate**: 220 bpm (R-R = 273ms)
- **QRS**: Narrow (~70ms)
- **P waves**: Hidden (no visible P)
- **Precordial voltages**: Higher than adult (thinner chest wall)
- **T wave inversion**: Normal in V1 for children

### WPW Follow-Up ECG

After successful conversion from SVT, participants can order a follow-up ECG that reveals the underlying **Wolff-Parkinson-White (WPW) syndrome** - the clinical cause of Lily's SVT.

**Clinical Teaching Point**: WPW cannot be diagnosed during SVT because:
- During orthodromic AVRT, the accessory pathway conducts retrograde only
- No delta wave is visible during the tachycardia
- Only in sinus rhythm does the pre-excitation pattern appear
- **Follow-up ECG after SVT conversion is essential clinical practice**

**WPW Type A Morphology (Left Lateral Pathway)**:

| Finding | Value | Clinical Significance |
|---------|-------|----------------------|
| PR interval | ~80ms | Short (normal 120-180ms for 5yo) |
| Delta wave | 40ms duration | Slurred QRS upstroke |
| QRS duration | ~110ms | Wide (normal 60-90ms) |
| Delta in V1 | Positive | Type A = left-sided pathway |
| T waves | Discordant | Secondary repolarization changes |

**Implementation**:
- `WPW_SINUS` rhythm type in `types.ts`
- `WPW_SINUS_MORPHOLOGY` with delta waves for all 15 leads
- `deltaWaveShape()` function for characteristic slurred upstroke
- `orderFollowUpECG()` action in `useSimulation.ts`
- Amber "Get Follow-up ECG" button appears only after CONVERTED phase
- Interpretation: "WOLFF-PARKINSON-WHITE PATTERN - REFER TO PEDIATRIC CARDIOLOGY"
