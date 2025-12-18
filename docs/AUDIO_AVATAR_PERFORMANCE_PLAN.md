# Audio Enhancement, Lily Avatar, and Performance Plan

> **Goal:** Transform the simulation from a clinical decision trainer into an immersive bedside experience. Learners should feel the urgency of a deteriorating child through sound, see Lily's distress, and have a smooth, responsive interface.

---

## Part 1: Audio Enhancement

### Current State Analysis

The existing `src/audio/index.ts` (665 lines) provides a solid Web Audio API foundation:
- ✅ Heart rate beeping (adjustable frequency)
- ✅ Tachycardia alarm (pulsing dual-tone)
- ✅ Flatline tone (continuous 440Hz)
- ✅ Defibrillator charging whine (200→2500Hz sweep)
- ✅ Shock discharge sound (white noise + thump)
- ✅ Success chime and error tone

### What's Missing

| Sound Category | Current | Needed |
|---------------|---------|--------|
| SpO2 pitch-changing tone | ❌ | Variable pitch tone that drops with SpO2 |
| SpO2 low alarm | ❌ | Distinct alarm when SpO2 <90% |
| Procedure sounds | ❌ | IV prep, IO drilling, sedation push |
| Patient crying/distress | ❌ | Age-appropriate audio feedback |
| Monitor artifact | ❌ | Static/noise during procedures |
| Alarm acknowledgment | ❌ | Silence button with timeout |

### Audio Architecture Enhancement

```
src/audio/
├── index.ts              # Core AudioEngine class (exists)
├── sounds/
│   ├── monitor.ts        # NEW: SpO2 tone, alarm management
│   ├── procedures.ts     # NEW: IV, IO, sedation sounds
│   └── patient.ts        # NEW: Crying, breathing sounds
└── hooks/
    └── useAudio.ts       # NEW: React integration hook
```

---

### 1.1 SpO2 Monitoring Audio

**Clinical Teaching Point:** Real monitors have a pitch-modulated tone that drops with SpO2. Experienced clinicians can "hear" desaturation without looking at the screen.

```typescript
// SpO2 tone mapping
// SpO2 100% → 880Hz (bright, high)
// SpO2 95%  → 750Hz
// SpO2 90%  → 620Hz (concerning)
// SpO2 85%  → 520Hz (alarm threshold)
// SpO2 80%  → 440Hz (deep, ominous)

interface SpO2ToneConfig {
  enabled: boolean;
  baseFrequency: number;    // 880Hz at 100%
  minFrequency: number;     // 440Hz at 80%
  volume: number;           // 0.1-0.3
  playOnHeartbeat: boolean; // Sync to HR beep
}
```

**Implementation:**
- Logarithmic frequency scaling (more dramatic drop at low values)
- Combine with heart rate beep (same oscillator, different pitch)
- Optional: separate SpO2 tone channel for users who want both

---

### 1.2 Alarm System Enhancement

**Current Alarms:**
- Tachycardia alarm (HR >180)

**New Alarms Needed:**

| Alarm | Trigger | Sound Profile | Priority |
|-------|---------|---------------|----------|
| SpO2 Low | <90% | Tri-tone descending (high→low→high) | High |
| SpO2 Critical | <85% | Rapid beeping + tone | Critical |
| Bradycardia | <60 | Slow double-beep | Medium |
| Asystole | HR=0 | Continuous tone (exists) | Critical |
| Artifact | Motion detected | White noise burst | Info |

**Alarm Management:**
```typescript
interface AlarmState {
  active: Set<AlarmType>;
  silenced: Map<AlarmType, number>;  // Timestamp when silenced
  silenceDurationMs: number;         // 60000 (1 minute)
}

// Nurse: "I'm silencing the alarm for a minute"
function silenceAlarm(type: AlarmType): void;
function silenceAll(): void;
```

---

### 1.3 Procedural Sounds

**IV Insertion Sequence:**
```
[0-2s]    Alcohol swab sound (soft swish)
[2-4s]    Tourniquet snap
[4-6s]    "Small pinch" → needle insertion (subtle click)
[6-8s]    Tape tear sounds
[If fail]  Child crying burst (0.5s)
```

**IO Insertion Sequence:**
```
[0-1s]    Skin prep swab
[1-8s]    EZ-IO drill sound (distinctive motorized whir)
          - 800Hz base frequency
          - Modulated with slight variation
          - Increases slightly in pitch as resistance changes
[8-9s]    Pop sound (cortex breach)
[9-10s]   Child scream (brief, intense)
```

**Sedation Push:**
```
[0-1s]    Syringe aspiration (soft hydraulic)
[1-3s]    Slow push sound (gentle flow)
[3-5s]    Flush sound (faster flow)
```

**Sound Design Principle:** All procedural sounds should be:
- Realistic enough to trigger recognition
- Not so realistic they're distressing
- Adjustable volume (some learners prefer minimal audio)

---

### 1.4 Patient Audio (Lily)

**Distress Levels:**

| Fear Level | Audio |
|------------|-------|
| 0-1 | Quiet, occasional sniffle |
| 2 | Soft whimpering, "I'm scared" |
| 3 | Crying, "It hurts" |
| 4 | Sobbing, hyperventilating |
| 5 | Screaming (during painful procedures) |

**Technical Approach:**
- Pre-recorded audio clips (ethically sourced/synthesized)
- OR: Synthesized crying using:
  - Modulated sine waves (200-400Hz fundamental)
  - Amplitude modulation for sobbing rhythm
  - Filtered noise for breath sounds

**Breathing Sounds:**
- Normal: Soft, rhythmic (barely audible)
- Tachypneic: Faster, more prominent
- Labored: Grunting, stridor-like (synthesized)
- Post-conversion: Deep breath of relief

---

### 1.5 Audio Settings UI

```typescript
interface AudioSettings {
  masterVolume: number;      // 0-1
  monitorEnabled: boolean;
  monitorVolume: number;
  alarmsEnabled: boolean;
  alarmVolume: number;
  proceduresEnabled: boolean;
  procedureVolume: number;
  patientEnabled: boolean;   // Lily's sounds
  patientVolume: number;
  spO2ToneEnabled: boolean;
}
```

**UI Component:** Slide-out audio panel with:
- Master mute toggle
- Individual category sliders
- Test buttons for each sound type
- Preset: "Realistic", "Training", "Quiet"

---

## Part 2: Lily's Visual Avatar

### Design Philosophy

> "A picture of a distressed child is worth a thousand vital signs"

The avatar serves multiple teaching purposes:
1. **Clinical assessment** - "Look at the patient"
2. **Emotional awareness** - Procedures have human cost
3. **Urgency communication** - Visual deterioration cues

### 2.1 Avatar States

**Base States (mapped to phase):**

| Phase | Posture | Expression | Skin | Eyes |
|-------|---------|------------|------|------|
| IDLE | Sitting up, alert | Neutral/curious | Pink | Open, bright |
| RUNNING (compensated) | Sitting, anxious | Worried | Pink | Wide, looking around |
| RUNNING (early_stress) | Leaning back | Scared | Pale | Wide, tears forming |
| RUNNING (moderate) | Lying back | Distressed | Pale | Squeezed, crying |
| RUNNING (decompensating) | Lying flat | Exhausted | Mottled | Half-closed |
| RUNNING (critical) | Limp | Unresponsive | Gray | Closed |
| ASYSTOLE | Completely limp | None | Gray/cyanotic | Closed |
| CONVERTED | Sitting up slowly | Relief | Pink returning | Opening |

**Overlay States (temporary):**

| Trigger | Animation |
|---------|-----------|
| IV attempt | Flinch, look at arm, cry |
| IO insertion | Scream pose, tears |
| Sedation onset | Eyes getting heavy, relaxing |
| Vagal maneuver | Bearing down expression |
| Cardioversion | Body jerk, then relief |
| Adenosine | Eyes roll back briefly |

### 2.2 Visual Components

```
┌─────────────────────────────────────┐
│         LILY'S AVATAR               │
│  ┌───────────────────────────────┐  │
│  │     ┌─────┐                   │  │
│  │     │ 😰  │  ← Expression     │  │
│  │     └──┬──┘                   │  │
│  │        │                      │  │
│  │     ┌──┴──┐  ← Body/Posture   │  │
│  │     │     │                   │  │
│  │     │ ∿∿∿ │  ← Chest movement │  │
│  │     │     │    (breathing)    │  │
│  │     └─────┘                   │  │
│  │    /       \  ← Arms (IV site)│  │
│  │   │         │                 │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 😟 Fear: ████░░░░░ (3/5)     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 2.3 Technical Implementation: SVG + CSS Animation

**Why SVG:**
- Scalable for any screen size
- Individual elements manipulable via CSS/JS
- Small file size
- Smooth animations with CSS transitions

**Avatar Structure:**

```typescript
// src/components/avatar/LilyAvatar.tsx

interface AvatarState {
  // Core state
  posture: 'sitting' | 'leaning' | 'lying' | 'limp';
  expression: 'neutral' | 'worried' | 'scared' | 'distressed' | 'exhausted' | 'relief';

  // Skin
  skinTone: 'pink' | 'pale' | 'mottled' | 'gray' | 'cyanotic';

  // Eyes
  eyeState: 'open' | 'wide' | 'squinting' | 'half-closed' | 'closed';
  hasTears: boolean;

  // Breathing
  respiratoryRate: number;
  respiratoryEffort: 'normal' | 'increased' | 'labored' | 'shallow';
  hasRetractions: boolean;
  hasNasalFlaring: boolean;

  // Procedural overlays
  isReceivingIV: boolean;
  isReceivingIO: boolean;
  isFlinching: boolean;
}
```

**SVG Layer Architecture:**

```
<svg>
  <!-- Background/bed -->
  <g id="background">...</g>

  <!-- Body layers (back to front) -->
  <g id="body-back">
    <path id="bed-sheet" />
    <path id="gown-back" />
  </g>

  <g id="body-main">
    <path id="torso" class="skin" />
    <path id="chest" class="breathing" />
    <path id="arm-left" />
    <path id="arm-right" />
    <g id="iv-site" class="hidden" />
  </g>

  <g id="head">
    <ellipse id="face" class="skin" />
    <g id="eyes">
      <ellipse id="eye-left" />
      <ellipse id="eye-right" />
      <g id="tears" class="hidden" />
    </g>
    <path id="mouth" />
    <g id="nose">
      <path id="nostril-left" class="flaring" />
      <path id="nostril-right" class="flaring" />
    </g>
  </g>

  <!-- Overlays -->
  <g id="monitor-leads" />
  <g id="nasal-cannula" />
</svg>
```

**CSS Animation Examples:**

```css
/* Breathing animation - chest rise/fall */
.breathing {
  animation: breathe var(--breath-duration) ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.03); }
}

/* Labored breathing - more dramatic */
.breathing.labored {
  animation: breathe-labored var(--breath-duration) ease-in-out infinite;
}

@keyframes breathe-labored {
  0%, 100% { transform: scaleY(1) translateY(0); }
  40% { transform: scaleY(1.08) translateY(-2px); }
  50% { transform: scaleY(1.06) translateY(-1px); }
}

/* Nasal flaring */
.flaring.active {
  animation: flare var(--breath-duration) ease-in-out infinite;
}

@keyframes flare {
  0%, 100% { transform: scaleX(1); }
  30% { transform: scaleX(1.3); }
}

/* Skin color transitions */
.skin {
  transition: fill 2s ease-in-out;
}

.skin.pink { fill: #ffdbac; }
.skin.pale { fill: #f5e6d3; }
.skin.mottled { fill: #e8dcd0; }
.skin.gray { fill: #d0c8c0; }
.skin.cyanotic { fill: #b8c4d0; }

/* Tears */
.tears {
  opacity: 0;
  transition: opacity 0.5s;
}

.tears.visible {
  opacity: 1;
  animation: tear-fall 1.5s ease-in infinite;
}

@keyframes tear-fall {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(20px); opacity: 0; }
}
```

### 2.4 State-to-Visual Mapping

```typescript
// src/components/avatar/stateMapper.ts

export function mapSimulationToAvatar(
  phase: SimPhase,
  deteriorationStage: DeteriorationStage,
  lilyFear: number,
  vitals: Vitals,
  procedures: { ivInProgress: boolean; ioInProgress: boolean }
): AvatarState {

  // Base posture from phase
  const posture = phase === 'IDLE' ? 'sitting' :
                  phase === 'ASYSTOLE' ? 'limp' :
                  phase === 'CONVERTED' ? 'sitting' :
                  deteriorationStage === 'compensated' ? 'sitting' :
                  deteriorationStage === 'early_stress' ? 'sitting' :
                  deteriorationStage === 'moderate_stress' ? 'leaning' :
                  'lying';

  // Expression from fear level
  const expression = lilyFear <= 1 ? 'neutral' :
                     lilyFear === 2 ? 'worried' :
                     lilyFear === 3 ? 'scared' :
                     lilyFear === 4 ? 'distressed' :
                     'exhausted';

  // Skin from perfusion/phase
  const skinTone = phase === 'ASYSTOLE' ? 'cyanotic' :
                   deteriorationStage === 'critical' ? 'gray' :
                   deteriorationStage === 'decompensating' ? 'mottled' :
                   deteriorationStage === 'moderate_stress' ? 'pale' :
                   deteriorationStage === 'early_stress' ? 'pale' :
                   'pink';

  // Breathing animation speed from RR
  const breathDuration = 60 / vitals.rr; // seconds per breath

  return {
    posture,
    expression,
    skinTone,
    eyeState: phase === 'ASYSTOLE' ? 'closed' :
              lilyFear >= 4 ? 'squinting' :
              lilyFear >= 2 ? 'wide' : 'open',
    hasTears: lilyFear >= 3,
    respiratoryRate: vitals.rr,
    respiratoryEffort: vitals.rr > 35 ? 'labored' :
                       vitals.rr > 28 ? 'increased' : 'normal',
    hasRetractions: deteriorationStage !== 'compensated',
    hasNasalFlaring: deteriorationStage === 'decompensating' ||
                     deteriorationStage === 'critical',
    isReceivingIV: procedures.ivInProgress,
    isReceivingIO: procedures.ioInProgress,
    isFlinching: procedures.ivInProgress || procedures.ioInProgress,
  };
}
```

### 2.5 Procedural Animations

**IV Insertion Animation Sequence:**

```typescript
async function playIVAnimation(avatarRef: SVGElement) {
  // 1. Anticipation - Lily sees the needle
  await setExpression('scared');
  await addTears();

  // 2. Insertion - flinch and cry
  await addClass('arm-right', 'flinch');
  await setExpression('distressed');
  await playSound('cry-short');

  // 3. Recovery - gradual calm
  await wait(2000);
  await removeClass('arm-right', 'flinch');
  await showIVSite();

  // 4. Return to base state (based on current fear level)
}
```

### 2.6 Component Architecture

```
src/components/avatar/
├── LilyAvatar.tsx        # Main SVG component
├── LilyAvatar.svg        # Base SVG artwork
├── stateMapper.ts        # Simulation → Avatar state
├── animations.css        # CSS keyframe animations
├── useAvatarAnimation.ts # Animation orchestration hook
└── index.ts              # Barrel export
```

---

## Part 3: Performance Polish

### Current Bundle Analysis

```
dist/assets/
├── index-*.js     370KB (107KB gzipped)
├── index-*.css     35KB (7KB gzipped)
└── Total:         405KB (114KB gzipped)
```

**Verdict:** 114KB gzipped is good, but there's room for improvement with code splitting.

### 3.1 Code Splitting Strategy

**Components to Lazy Load:**

| Component | Size Est. | Trigger |
|-----------|-----------|---------|
| ECGViewer | ~50KB | "Get 15-Lead ECG" button |
| DefibrillatorPanel | ~40KB | "Cardiovert" button |
| DebriefView | ~35KB | End of scenario |
| LilyAvatar | ~25KB | Simulation start (or eager) |

**Implementation:**

```typescript
// src/App.tsx

// Lazy load heavy components
const ECGViewer = React.lazy(() => import('./components/ecg-viewer'));
const DefibrillatorPanel = React.lazy(() => import('./components/defibrillator'));
const DebriefView = React.lazy(() => import('./components/debrief/DebriefView'));

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  {showECGViewer && <ECGViewer ... />}
</Suspense>
```

**Expected Result:**
- Initial bundle: ~250KB → ~70KB gzipped
- Lazy chunks loaded on demand

### 3.2 React Performance Optimizations

**Memoization Targets:**

```typescript
// 1. ECGTrace - renders every animation frame
// Memoize to prevent unnecessary re-renders from parent
const ECGTrace = React.memo(function ECGTrace({ heartRate, rhythm }) {
  // Canvas animation - doesn't need React re-renders
});

// 2. VitalsMonitor - updates every 500ms
// Memoize color calculation functions
const getSpo2Color = useMemo(() => {
  if (isAsystole) return 'text-red-500';
  if (vitals.spo2 >= 95) return 'text-cyan-400';
  // ...
}, [isAsystole, vitals.spo2]);

// 3. Message list - can get long
// Virtualize if >50 messages (react-window)
const MessageList = React.memo(function MessageList({ messages }) {
  // Only re-render when messages array changes
});

// 4. Action callbacks - recreated every render
// Use useCallback for handlers passed to children
const handleVagal = useCallback((technique: VagalTechnique) => {
  sim.doVagal(technique);
}, [sim.doVagal]);
```

### 3.3 Canvas Optimization

**ECG Trace Improvements:**

```typescript
// Current: Redraws entire canvas every frame
// Optimized: Use offscreen canvas for static elements

useEffect(() => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');

  // Create offscreen canvas for grid (static)
  const gridCanvas = new OffscreenCanvas(width, height);
  const gridCtx = gridCanvas.getContext('2d');
  drawGrid(gridCtx); // Draw once

  const draw = () => {
    // Clear only trace area, blit grid from offscreen
    ctx.drawImage(gridCanvas, 0, 0);

    // Draw only the trace (moving part)
    drawTrace(ctx, heartRate, rhythm);

    animationId = requestAnimationFrame(draw);
  };
}, []);
```

### 3.4 State Update Batching

**Current Issue:** Multiple setState calls can cause unnecessary re-renders.

```typescript
// Current (multiple renders)
setVitals(newVitals);
setPerfusion(newPerfusion);
addMessage('nurse', observation);

// Optimized (single render with React 18 automatic batching)
// Already handled by React 18, but ensure we're not breaking it
// with async boundaries or setTimeout
```

### 3.5 Throttling High-Frequency Updates

```typescript
// Vitals update every 500ms - already good
// ECG canvas at 60fps - necessary for smooth animation
// Heart rate beep - tied to HR, good

// New: Avatar breathing animation
// Don't recalculate every frame, use CSS animations with CSS custom properties
const avatarStyle = useMemo(() => ({
  '--breath-duration': `${60 / vitals.rr}s`,
}), [vitals.rr]);
```

### 3.6 Asset Optimization

**SVG Avatar:**
- Minify SVG (SVGO)
- Inline critical SVG, lazy load variations
- Use CSS variables for dynamic properties (not inline styles)

**No External Fonts:**
- Currently using system fonts - keep this way
- Tailwind handles font stack

### 3.7 Loading Experience

**Current:** Blank screen until JS loads

**Improved:**

```html
<!-- index.html -->
<body>
  <!-- Inline critical CSS for loading state -->
  <style>
    .loading-skeleton { ... }
  </style>

  <div id="root">
    <!-- Static skeleton shown immediately -->
    <div class="loading-skeleton">
      <div class="skeleton-header"></div>
      <div class="skeleton-vitals"></div>
      <div class="skeleton-actions"></div>
    </div>
  </div>

  <script type="module" src="/src/main.tsx"></script>
</body>
```

### 3.8 Performance Metrics Targets

| Metric | Current | Target |
|--------|---------|--------|
| Initial bundle | 107KB | <75KB |
| First Contentful Paint | ~1s | <0.5s |
| Time to Interactive | ~1.5s | <1s |
| ECG frame rate | 60fps | 60fps (maintain) |
| Memory usage | ~30MB | <40MB |

---

## Implementation Plan

### Phase 1: Audio Enhancement (3 components)

**1.1 SpO2 Tone System**
- Add SpO2 pitch calculation to AudioEngine
- Integrate with heart beep (combined tone)
- Add audio settings state

**1.2 Procedural Sounds**
- Create `sounds/procedures.ts` with IV, IO, sedation sounds
- Integrate with procedure state machine
- Add volume controls

**1.3 Alarm Management**
- Add SpO2 alarm triggers
- Implement alarm silencing
- Create alarm management UI

### Phase 2: Lily Avatar (4 components)

**2.1 Base SVG Creation**
- Design/create Lily SVG artwork
- Define layer structure for animation
- Create CSS animation keyframes

**2.2 State Mapping**
- Implement `stateMapper.ts`
- Connect to simulation state
- Add breathing animation timing

**2.3 Procedural Animations**
- IV insertion animation
- IO insertion animation
- Sedation onset animation

**2.4 Integration**
- Add LilyAvatar component to App
- Position in UI layout
- Connect to audio for synchronized feedback

### Phase 3: Performance (3 components)

**3.1 Code Splitting**
- Lazy load ECGViewer, DefibrillatorPanel, DebriefView
- Add loading fallbacks
- Verify bundle size reduction

**3.2 React Optimization**
- Memoize expensive components
- Add useCallback to handlers
- Profile and eliminate unnecessary renders

**3.3 Loading Experience**
- Add index.html skeleton
- Optimize initial paint
- Measure and validate improvements

---

## File Changes Summary

### New Files

```
src/audio/
├── sounds/
│   ├── monitor.ts        # SpO2 tone, alarm management
│   ├── procedures.ts     # IV, IO, sedation sounds
│   └── patient.ts        # Crying, breathing sounds
└── hooks/
    └── useAudio.ts       # React integration hook

src/components/avatar/
├── LilyAvatar.tsx        # Main SVG component
├── LilyAvatar.svg        # Base SVG artwork
├── stateMapper.ts        # Simulation → Avatar state
├── animations.css        # CSS keyframe animations
├── useAvatarAnimation.ts # Animation orchestration hook
└── index.ts

src/components/ui/
├── AudioSettings.tsx     # Audio control panel
└── LoadingSkeleton.tsx   # Initial loading state
```

### Modified Files

```
src/audio/index.ts        # Add SpO2 tone, enhanced alarms
src/App.tsx               # Add avatar, lazy loading, audio settings
src/hooks/useSimulation.ts # Expose procedure state for avatar
index.html                # Add loading skeleton
```

---

## Success Criteria

### Audio
- [ ] SpO2 tone pitch changes with oxygen saturation
- [ ] SpO2 alarm triggers at <90%
- [ ] IV/IO procedures have distinct audio
- [ ] Audio can be muted/adjusted per category
- [ ] No audio artifacts or clicks

### Avatar
- [ ] Lily's expression matches fear level
- [ ] Skin color changes with perfusion
- [ ] Breathing animation matches respiratory rate
- [ ] IV/IO procedures show flinch animation
- [ ] Smooth transitions between states

### Performance
- [ ] Initial bundle <75KB gzipped
- [ ] FCP <0.5s on 3G
- [ ] No jank in ECG animation
- [ ] Lazy loaded components work correctly
- [ ] Memory stable over 15-minute session

---

## Risk Considerations

1. **Audio autoplay policy** - Require user interaction before starting audio (already handled by init())

2. **Avatar accessibility** - Ensure avatar is decorative (aria-hidden) and not required for core functionality

3. **Performance on mobile** - Test avatar animations on low-end devices; provide "lite mode" if needed

4. **Emotional impact** - Lily's distress visuals may be intense; consider "clinical mode" that shows simplified avatar

5. **SVG complexity** - Keep avatar SVG under 50KB; use simple shapes over detailed illustration
