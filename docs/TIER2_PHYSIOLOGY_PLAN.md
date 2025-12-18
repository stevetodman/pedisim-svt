# Tier 2 Physiologic Realism - Lily's SVT Case

> **Goal:** Transform "numbers on a screen" into clinical bedside assessment skills. Learners should recognize deterioration by *looking at the patient*, not just reading vitals.

## Clinical Story: What Actually Happens to Lily

### The Pathophysiology

Lily has WPW with orthodromic AVRT. At 220 bpm:

1. **Diastolic filling time** drops from ~400ms to ~100ms
   - Ventricles don't fill properly → stroke volume drops
   - Cardiac output = HR × SV → initially maintained, then falls

2. **Coronary perfusion** occurs in diastole
   - Shortened diastole → myocardial oxygen delivery compromised
   - Heart working harder but getting less oxygen

3. **Compensation cascade:**
   - Catecholamine surge → vasoconstriction → maintains BP initially
   - Increased respiratory rate → blows off CO2 → compensates for building lactate
   - As compensation fails → shock develops

### Lily's Clinical Trajectory

```
TIME        STAGE           WHAT YOU SEE
─────────────────────────────────────────────────────────────────
0-2 min     Compensated     Anxious, tachypneic, warm extremities
                            "My heart is beating really fast!"
                            WOB: Mild | Perfusion: Adequate

2-5 min     Early Stress    Working harder, hands getting cool
                            Nurse: "Her hands are getting cool"
                            WOB: Moderate | Perfusion: Delayed

5-8 min     Moderate        Retractions visible, irritable, mottled
                            Won't engage, just crying
                            WOB: Severe | Perfusion: Poor

8-12 min    Decompensating  Grunting, gray, barely responsive
                            Nurse: "Doctor, she's crashing"
                            WOB: Severe | Perfusion: Shock

>12 min     Critical        Pre-arrest, minimal response
                            WOB: Failing | Perfusion: Absent
```

---

## Tier 2 Components

### 1. Work of Breathing Assessment

**What changes with deterioration:**

| Stage | Retractions | Nasal Flaring | Grunting | Head Bob |
|-------|-------------|---------------|----------|----------|
| Compensated | None | No | No | No |
| Early Stress | Subcostal | No | No | No |
| Moderate | Subcostal + Intercostal | Yes | No | No |
| Decompensating | All (suprasternal) | Yes | Yes | No |
| Critical | Shallow/Failing | Yes | Yes | Yes |

**New Type:**
```typescript
interface WorkOfBreathing {
  retractions: 'none' | 'subcostal' | 'intercostal' | 'suprasternal';
  nasalFlaring: boolean;
  grunting: boolean;
  headBobbing: boolean;
  effort: 'normal' | 'increased' | 'labored' | 'severe' | 'failing';
}
```

**UI Display:** Visual indicator panel showing current respiratory status with human-readable descriptions.

---

### 2. Perfusion Assessment

**What changes with deterioration:**

| Stage | Pulse | Temp Gradient | Mottling | Cap Refill |
|-------|-------|---------------|----------|------------|
| Compensated | Strong | Warm | None | <2s |
| Early Stress | Normal | Cool hands | None | 2-3s |
| Moderate | Weak | Cool to wrists | Peripheral | 3-4s |
| Decompensating | Thready | Cool to elbows | Central | 4-5s |
| Critical | Barely palpable | Cold | Generalized | >5s |

**New Type:**
```typescript
interface PerfusionAssessment {
  pulseQuality: 'bounding' | 'strong' | 'normal' | 'weak' | 'thready' | 'absent';
  temperature: {
    hands: 'warm' | 'cool' | 'cold';
    wrists: 'warm' | 'cool' | 'cold';
    elbows: 'warm' | 'cool' | 'cold';
  };
  coolTo: 'normal' | 'hands' | 'wrists' | 'elbows' | 'knees';
  mottling: 'none' | 'peripheral' | 'central' | 'generalized';
  capRefill: number; // seconds (already exists)
}
```

---

### 3. ETCO2 Monitoring

**Why ETCO2 matters for SVT:**
- ETCO2 reflects cardiac output (CO2 must be delivered to lungs)
- During asystole: ETCO2 drops to near-zero (no cardiac output!)
- After conversion: ETCO2 immediately rises (powerful teaching moment)

**ETCO2 by state:**

| State | ETCO2 | Waveform | Why |
|-------|-------|----------|-----|
| Compensated | 30-38 | Normal | Hyperventilating from anxiety |
| Early Stress | 28-35 | Normal | Continued hyperventilation |
| Moderate | 25-32 | Lower amplitude | Falling cardiac output |
| Decompensating | 20-28 | Decreased | Poor perfusion |
| Asystole | 5-10 | Flat | No cardiac output |
| Post-conversion | 35-42 | Recovering | CO restored |

**UI:** Add ETCO2 number to vitals display with optional mini-waveform.

---

### 4. Procedural Physiologic Effects

**IV Insertion:**
```typescript
// During IV attempt (8-12 seconds):
{
  spO2: baseSpO2 - random(3, 8),     // Breath-holding from crying
  hrVariation: +5 to +15,            // Pain response (limited at 220)
  monitorArtifact: true,             // Motion from struggling
  lilyFear: +0.5,                    // Emotional effect (already tracked)
}
```

**IO Insertion:**
```typescript
// During IO drilling (~8 seconds):
{
  spO2: baseSpO2 - random(5, 12),    // Worse breath-holding, screaming
  monitorArtifact: 'severe',
  lilyFear: max (5),
  markAnxiety: +1,
}
```

**Sedation Onset:**
```typescript
// After sedation takes effect:
{
  respiratoryRate: baseRR - 4,       // Mild respiratory depression
  workOfBreathing: improve_one_level, // Anxiety component removed
  etco2: +3 to +5,                   // Less hyperventilation
}
```

**Adenosine Asystole:**
```typescript
// During asystole (3-7 seconds):
{
  etco2: drops to 5-10,              // No cardiac output!
  perfusion: 'absent',
  spO2: drops ~3%/second,            // Already implemented
}

// Immediately after conversion:
{
  etco2: rises to 35-40 within 5s,   // CO restored - teaching moment!
}
```

---

### 5. Nurse Clinical Observations

The nurse should comment on clinical changes (teachable moments):

```typescript
const CLINICAL_OBSERVATIONS = {
  wob_increasing: [
    "Doctor, she's starting to use her belly muscles to breathe.",
    "I'm seeing some subcostal retractions now.",
    "Her work of breathing is definitely increasing.",
  ],
  wob_severe: [
    "Doctor, she's really working hard. Look at those retractions.",
    "I'm seeing intercostal retractions now. She's tiring.",
  ],
  perfusion_declining: [
    "Her hands are getting cool.",
    "Cap refill is about 3 seconds now.",
    "I'm feeling a thready pulse.",
  ],
  perfusion_poor: [
    "Doctor, she's mottling. We need to move faster.",
    "I can barely feel her pulse anymore.",
  ],
  etco2_drop_asystole: [
    "ETCO2 is dropping... expected during the pause.",
  ],
  etco2_recovering: [
    "ETCO2 coming back up - good sign!",
  ],
};
```

---

## UI Design

### Current Vitals Monitor (keep)
```
┌─────────────────────────────────────────┐
│ [ECG trace]                             │
│ HR: 220    SpO2: 95                     │
│ BP: 88/56  RR: 34                       │
└─────────────────────────────────────────┘
```

### New: Enhanced Vitals Monitor
```
┌─────────────────────────────────────────┐
│ [ECG trace]                     II  SVT │
├─────────────────────────────────────────┤
│ ♥ 220      SpO2 95%     ETCO2 32       │
│ BP 88/56   RR 34        Cap 3s          │
├─────────────────────────────────────────┤
│ RESPIRATORY          │ PERFUSION        │
│ ▲▲△ Subcostal       │ Pulse: Weak      │
│ Effort: MODERATE     │ Cool to: Wrists  │
│                      │ Mottling: None   │
└─────────────────────────────────────────┘
```

**Collapsible:** Default shows summary row, click to expand details.

---

## Implementation Plan

### Phase 1: Core Types and Calculation (kernel)

**New file: `src/kernel/clinicalAssessment.ts`**
- `WorkOfBreathing` interface and calculation
- `PerfusionAssessment` interface and calculation
- `calculateClinicalAssessment(deteriorationStage, interventions)` function
- ETCO2 calculation based on state

**Modify: `src/kernel/deterioration.ts`**
- Add clinical assessment to `VitalSigns` or parallel structure
- Export assessment alongside vitals

### Phase 2: Procedural Effects (kernel)

**Modify: `src/kernel/procedures.ts`**
- Add physiologic effects during IV/IO attempts
- Return transient vital changes

**Modify: `src/hooks/useSimulation.ts`**
- Track clinical assessment state
- Apply procedural effects to vitals
- Trigger nurse observations at key moments

### Phase 3: UI Components

**New: `src/components/ClinicalAssessment.tsx`**
- Respiratory effort display (retractions indicator)
- Perfusion status display
- Compact and expanded views

**Modify: `src/App.tsx`**
- Add ETCO2 to vitals monitor
- Add ClinicalAssessment component below vitals
- Handle collapse/expand

### Phase 4: Nurse Integration

**Modify: `src/characters/index.ts` or new file**
- Add clinical observation triggers
- Nurse comments on WOB/perfusion changes

### Phase 5: Tests

**New: `tests/kernel/clinicalAssessment.test.ts`**
- Test WOB calculation by stage
- Test perfusion calculation by stage
- Test ETCO2 by state
- Test procedural effects

---

## Success Criteria

| Metric | Target |
|--------|--------|
| WOB visible change | Each deterioration stage shows different respiratory pattern |
| Perfusion visible change | Cool-to location progresses with deterioration |
| ETCO2 teaching moment | Drops during asystole, rises after conversion |
| Procedural realism | SpO2 dips during IV/IO, nurse comments |
| Nurse observations | At least 3 clinical comments per scenario |

---

## Teaching Value

**What learners will gain:**

1. **"Look at the patient, not just the monitor"**
   - WOB changes visible before numbers crash
   - Perfusion assessment as clinical skill

2. **"ETCO2 tells you about cardiac output"**
   - Dramatic drop during asystole → no perfusion
   - Rise after conversion → CO restored

3. **"Procedures have physiologic cost"**
   - IV insertion causes distress
   - Sedation has respiratory effects
   - Everything is a trade-off

4. **"Compensated shock looks okay until it doesn't"**
   - Numbers may be borderline
   - Clinical signs tell the real story

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/kernel/clinicalAssessment.ts` | Create | Assessment calculations |
| `src/kernel/deterioration.ts` | Modify | Include assessment in output |
| `src/kernel/procedures.ts` | Modify | Procedural physiologic effects |
| `src/hooks/useSimulation.ts` | Modify | Track assessment state |
| `src/components/ClinicalAssessment.tsx` | Create | UI component |
| `src/App.tsx` | Modify | Integrate new displays |
| `src/characters/index.ts` | Modify | Clinical observations |
| `tests/kernel/clinicalAssessment.test.ts` | Create | Test coverage |
