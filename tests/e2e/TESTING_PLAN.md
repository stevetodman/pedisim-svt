# PediSim SVT - Comprehensive E2E Testing Plan

## Overview

This document outlines the comprehensive end-to-end testing strategy for PediSim SVT, covering all user workflows, physiologic realism features, and edge cases.

## Test Categories

### 1. Basic Simulation Flow Tests

#### 1.1 Simulation Lifecycle
- [ ] Start simulation from IDLE state
- [ ] Verify initial vitals displayed (HR 220, SpO2 97, BP 92/64, RR 26)
- [ ] Verify initial messages appear (nurse, Lily, Mark)
- [ ] Verify timer starts counting
- [ ] Verify RUNNING phase indicator
- [ ] Reset simulation mid-flow
- [ ] Restart after reset

#### 1.2 IV Access
- [ ] Establish IV access
- [ ] Verify IV access button shows checkmark after
- [ ] Verify nurse confirmation message
- [ ] Attempt action requiring IV without access (should fail gracefully)

#### 1.3 Vagal Maneuver
- [ ] Perform vagal maneuver
- [ ] Verify Lily's reaction (cold complaint)
- [ ] Verify nurse status message
- [ ] Handle vagal success (25% chance - test with multiple runs)
- [ ] Handle vagal failure and continuation

### 2. Physiologic Realism Tests

#### 2.1 Deterioration Progression
- [ ] Verify starts in COMPENSATED stage
- [ ] Wait 2+ minutes - verify transition to EARLY_STRESS
- [ ] Verify nurse warning message at 2 min
- [ ] Verify vitals change (SpO2 dropping, BP dropping, RR rising)
- [ ] Wait 5+ minutes - verify MODERATE_STRESS
- [ ] Wait 8+ minutes - verify DECOMPENSATING
- [ ] Wait 12+ minutes - verify CRITICAL
- [ ] Verify stage badge updates in UI

#### 2.2 Dynamic Vitals Display
- [ ] Verify HR displays correctly for each phase
- [ ] Verify SpO2 color changes (green -> yellow -> red)
- [ ] Verify BP color changes based on systolic
- [ ] Verify RR displays and changes color
- [ ] Verify vitals update every 500ms during SVT

### 3. Sedation Tests

#### 3.1 Sedation Timing (45-second onset)
- [ ] Order sedation
- [ ] Verify button shows "Ordered..."
- [ ] Verify "Drawing..." phase (~8 seconds)
- [ ] Verify nurse message "Drawing up midazolam..."
- [ ] Verify "Pushing..." phase (~3 seconds)
- [ ] Verify "Onset (~45s)..." phase
- [ ] Verify Lily's "floaty" message during onset
- [ ] Verify Lily's "sleepy" message at 30% progress
- [ ] Verify nurse "drowsy" message at 60% progress
- [ ] Verify "Sedated ✓" after full onset
- [ ] Verify sedation required before cardioversion

#### 3.2 Sedation Edge Cases
- [ ] Cannot order sedation without IV access
- [ ] Cannot re-order sedation during onset
- [ ] Cannot re-order sedation when already sedated

### 4. Adenosine Tests

#### 4.1 Adenosine Pharmacokinetics
- [ ] Order adenosine (1.85mg first dose)
- [ ] Verify nurse confirms order
- [ ] Verify "Drawing adenosine and preparing flush..." message
- [ ] Verify "Ready with adenosine and 10mL flush" message
- [ ] Verify "Adenosine IN... FLUSH!" message
- [ ] Verify Lily's "warm... weird" side effect
- [ ] Verify Lily's "chest tight... can't breathe" message
- [ ] Verify transition to ASYSTOLE phase
- [ ] Verify Mark's panic response
- [ ] Verify nurse's "transient asystole" reassurance
- [ ] Verify outcome (success or failure)

#### 4.2 Adenosine Success Path
- [ ] Verify conversion to SINUS rhythm on success
- [ ] Verify recovery HR progression (50 -> 70 -> 90)
- [ ] Verify nurse "Converting... there's sinus!" message
- [ ] Verify Lily relief message
- [ ] Verify Mark relief message
- [ ] Verify vitals normalize during recovery

#### 4.3 Adenosine Failure Path
- [ ] Verify return to SVT on failure
- [ ] Verify nurse suggests second dose
- [ ] Verify can give second dose (3.7mg)
- [ ] Verify nurse suggests cardioversion after 2 doses

#### 4.4 Adenosine Edge Cases
- [ ] Cannot give adenosine without IV access
- [ ] Nurse catches overdose (>6mg first, >12mg second)
- [ ] Nurse catches underdose (<50% of recommended)

### 5. Defibrillator Tests

#### 5.1 Defibrillator Workflow
- [ ] Click Cardiovert button opens defibrillator panel
- [ ] Verify pad placement selection (A-P vs A-L)
- [ ] Verify "PADS NOT ATTACHED" initial state
- [ ] Select pad position and confirm
- [ ] Verify rhythm analysis (4 seconds)
- [ ] Verify "SHOCKABLE - SVT DETECTED" message
- [ ] Verify energy selection (arrows change energy)
- [ ] Verify recommended energy displayed
- [ ] Verify SYNC mode toggle
- [ ] Verify charging animation and sound
- [ ] Verify "STAND CLEAR" confirmation
- [ ] Verify hold-to-shock mechanism
- [ ] Verify shock delivery and outcome

#### 5.2 Defibrillator Nurse Integration
- [ ] Verify nurse warning if SYNC off for SVT
- [ ] Verify nurse warning if patient not sedated
- [ ] Verify nurse warning if energy too high

### 6. ECG Viewer Tests

#### 6.1 ECG Viewer Basic
- [ ] Open ECG viewer (Get 15-Lead ECG button)
- [ ] Verify 15-lead layout displays
- [ ] Verify SVT morphology during SVT phase
- [ ] Close ECG viewer (Escape or close button)

#### 6.2 ECG Calipers
- [ ] Activate calipers (C key or button)
- [ ] Place caliper measurement
- [ ] Verify measurement displays in ms
- [ ] Toggle marching calipers (M key)
- [ ] Clear calipers (Escape)

#### 6.3 WPW Follow-up ECG
- [ ] Verify "Get Follow-up ECG" appears after conversion
- [ ] Click follow-up ECG button
- [ ] Verify WPW pattern revealed
- [ ] Verify interpretation shows WPW diagnosis

### 7. Communication Tests

#### 7.1 Doctor Speaking
- [ ] Type message and send
- [ ] Verify doctor message appears
- [ ] Verify character responses (Lily, Mark)
- [ ] Verify pending action confirmation ("yes"/"no")

#### 7.2 Pending Actions
- [ ] Verify confirmation prompt for borderline doses
- [ ] Confirm with "yes" - action proceeds
- [ ] Cancel with "no" - action cancelled

### 8. Debrief Tests

#### 8.1 Debrief Generation
- [ ] Complete simulation (conversion)
- [ ] Verify debrief button appears
- [ ] Click debrief button
- [ ] Verify loading state
- [ ] Verify quick summary appears
- [ ] Click to view full debrief

#### 8.2 Debrief Content
- [ ] Verify timeline shows events
- [ ] Verify pivot points detected
- [ ] Verify character perspectives
- [ ] Verify replay button works

### 9. Edge Cases & Error Handling

#### 9.1 Invalid Actions
- [ ] Attempt intervention during IDLE phase
- [ ] Attempt intervention during ASYSTOLE phase
- [ ] Attempt intervention during CONVERTED phase
- [ ] Enter invalid dose (0, negative, non-numeric)

#### 9.2 Rapid Actions
- [ ] Click same button rapidly
- [ ] Order multiple interventions in quick succession
- [ ] Verify no duplicate messages

#### 9.3 Browser Interactions
- [ ] Keyboard shortcuts work (C, M, G, S, Escape)
- [ ] Modal closes on Escape
- [ ] Tab navigation works

### 10. Performance Tests

#### 10.1 Timing Accuracy
- [ ] Verify deterioration stages occur at correct times
- [ ] Verify sedation onset takes ~45 seconds
- [ ] Verify adenosine phases progress correctly
- [ ] Verify recovery curve takes ~30 seconds

#### 10.2 UI Responsiveness
- [ ] Vitals update smoothly (no flickering)
- [ ] ECG animation is smooth
- [ ] No message spam (duplicate messages)

---

## Test Scenarios (User Journeys)

### Scenario A: Perfect PALS Protocol
1. Start simulation
2. Establish IV
3. Attempt vagal (fails)
4. Give adenosine 1.85mg (success)
5. Observe recovery
6. Order follow-up ECG (WPW revealed)
7. View debrief

### Scenario B: Adenosine Failure -> Cardioversion
1. Start simulation
2. Establish IV
3. Give adenosine 1.85mg (fails)
4. Give adenosine 3.7mg (fails)
5. Order sedation (wait 45 seconds)
6. Open defibrillator
7. Set pads, charge, shock (success)
8. View debrief

### Scenario C: Decompensation Under Pressure
1. Start simulation
2. Wait 3+ minutes (early stress)
3. Establish IV
4. Give adenosine (fails)
5. Wait for moderate stress
6. Emergency cardioversion

### Scenario D: Communication Focus
1. Start simulation
2. Speak to family before intervention
3. Warn about asystole before adenosine
4. Reassure during asystole
5. Explain WPW after conversion
6. Check debrief communication score

---

## Test Data

### Expected Timings
| Event | Expected Time |
|-------|---------------|
| Compensated → Early Stress | 2:00 |
| Early Stress → Moderate Stress | 5:00 |
| Moderate Stress → Decompensating | 8:00 |
| Decompensating → Critical | 12:00 |
| Sedation Drawing | 8 seconds |
| Sedation Pushing | 3 seconds |
| Sedation Onset | 45 seconds |
| Adenosine Drawing | 12 seconds |
| Adenosine Ready | 2 seconds |
| Adenosine Push | 2 seconds |
| Adenosine Circulating | 1.5 seconds |
| Adenosine Effect | 5 seconds |
| Recovery to stable | 30 seconds |

### Expected Vitals by Stage
| Stage | HR | SpO2 | BP | RR |
|-------|-----|------|-----|-----|
| Compensated | 220 | 97% | 95/60 | 26 |
| Early Stress | 220 | 95% | 88/56 | 30 |
| Moderate Stress | 220 | 93% | 82/52 | 34 |
| Decompensating | 220 | 90% | 72/45 | 40 |
| Critical | 220 | 85% | 60/35 | 45 |

---

## Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/simulation.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui

# Run with headed browser (see browser)
npx playwright test --headed

# Generate HTML report
npx playwright show-report
```
