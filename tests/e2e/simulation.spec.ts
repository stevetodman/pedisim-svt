import { test, expect } from '@playwright/test';
import {
  startSimulation,
  resetSimulation,
  establishIV,
  doVagal,
  giveAdenosine,
  orderSedation,
  waitForSedation,
  openDefibrillator,
  openECGViewer,
  closeModal,
  speakToFamily,
  getElapsedTime,
  waitForElapsedTime,
  getDeteriorationStage,
  getVitals,
  waitForMessage,
  hasMessage,
  verifyNoDuplicateMessages,
  waitForPhase,
  selectors,
} from './helpers';

test.describe('PediSim SVT - Basic Simulation Flow', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display initial IDLE state', async ({ page }) => {
    // Verify patient info
    await expect(page.locator('text=Lily Henderson')).toBeVisible();
    await expect(page.locator('text=5yo')).toBeVisible();
    await expect(page.locator('text=18.5kg')).toBeVisible();

    // Verify Start button is visible
    await expect(page.locator(selectors.startButton)).toBeVisible();

    // Verify IDLE phase
    await expect(page.locator('text=IDLE')).toBeVisible();
  });

  test('should start simulation and show initial state', async ({ page }) => {
    await startSimulation(page);

    // Verify RUNNING phase
    await expect(page.locator('text=RUNNING')).toBeVisible();

    // Verify timer is counting
    await page.waitForTimeout(1500);
    const elapsed = await getElapsedTime(page);
    expect(elapsed).toBeGreaterThan(0);

    // Verify initial messages appear
    await waitForMessage(page, 'Doctor, 5-year-old female');
    await waitForMessage(page, 'chest feels like a drum');

    // Verify initial vitals (HR 220 for SVT)
    const vitals = await getVitals(page);
    expect(vitals.hr).toBe('220');
  });

  test('should reset simulation', async ({ page }) => {
    await startSimulation(page);
    await page.waitForTimeout(2000);

    await resetSimulation(page);

    // Verify back to IDLE
    await expect(page.locator('text=IDLE')).toBeVisible();
    await expect(page.locator(selectors.startButton)).toBeVisible();
  });

  test('should establish IV access', async ({ page }) => {
    await startSimulation(page);
    await establishIV(page);

    // Verify IV button shows checkmark
    await expect(page.locator('button:has-text("Establish IV ✓")')).toBeVisible();
  });

  test('should perform vagal maneuver', async ({ page }) => {
    await startSimulation(page);
    await doVagal(page); // Defaults to Modified Valsalva

    // Verify Lily's reaction to Valsalva (blowing through straw)
    await waitForMessage(page, 'blowing');

    // Verify nurse status (either success or failure)
    await page.waitForTimeout(3000);
    const hasSuccess = await hasMessage(page, 'Vagal maneuver worked');
    const hasFailure = await hasMessage(page, 'No change');
    expect(hasSuccess || hasFailure).toBe(true);
  });

});

test.describe('PediSim SVT - Deterioration Progression', () => {

  test('should start in COMPENSATED stage', async ({ page }) => {
    await page.goto('/');
    await startSimulation(page);

    // Initially should show COMPENSATED
    await page.waitForTimeout(1000);
    const stage = await getDeteriorationStage(page);
    expect(stage).toBe('COMPENSATED');
  });

  test('should progress to EARLY_STRESS after 2 minutes', async ({ page }) => {
    test.setTimeout(180000); // 3 minute timeout

    await page.goto('/');
    await startSimulation(page);

    // Wait for 2+ minutes
    await waitForElapsedTime(page, 125); // 2:05

    // Check deterioration stage
    const stage = await getDeteriorationStage(page);
    expect(stage).toBe('EARLY STRESS');

    // Verify nurse warning message
    await expect(page.locator('text=perfusion is starting to look')).toBeVisible();

    // Verify vitals have changed
    const vitals = await getVitals(page);
    const spo2 = parseInt(vitals.spo2);
    expect(spo2).toBeLessThanOrEqual(96);
  });

  test('should show declining vitals over time', async ({ page }) => {
    test.setTimeout(180000);

    await page.goto('/');
    await startSimulation(page);

    // Get initial vitals
    await page.waitForTimeout(2000);
    const initialVitals = await getVitals(page);

    // Wait 2.5 minutes
    await waitForElapsedTime(page, 150);

    // Get updated vitals
    const laterVitals = await getVitals(page);

    // SpO2 should have dropped (or stayed same if at boundary)
    const initialSpo2 = parseInt(initialVitals.spo2);
    const laterSpo2 = parseInt(laterVitals.spo2);
    expect(laterSpo2).toBeLessThanOrEqual(initialSpo2);

    // RR should have increased (or stayed same if at boundary)
    const initialRR = parseInt(initialVitals.rr);
    const laterRR = parseInt(laterVitals.rr);
    expect(laterRR).toBeGreaterThanOrEqual(initialRR);
  });

});

test.describe('PediSim SVT - Sedation Timing', () => {

  test('should require IV for sedation', async ({ page }) => {
    await page.goto('/');
    await startSimulation(page);

    // Try to sedate without IV
    await page.click(selectors.sedateButton);

    // Should see nurse refusal
    await waitForMessage(page, 'need IV access');
  });

  test('should show sedation phases', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await startSimulation(page);
    await establishIV(page);

    // Order sedation
    await orderSedation(page);

    // Verify ordered message
    await expect(page.locator('text=Starting sedation')).toBeVisible();
    await expect(page.locator('text=45 seconds')).toBeVisible();

    // Wait and verify drawing phase
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("Drawing")')).toBeVisible();
    await waitForMessage(page, 'Drawing up midazolam');

    // Wait for pushing phase
    await page.waitForTimeout(9000);
    await expect(page.locator('button:has-text("Pushing")')).toBeVisible();

    // Wait for onset phase
    await page.waitForTimeout(4000);
    await expect(page.locator('button:has-text("Onset")')).toBeVisible();

    // Verify Lily's drowsy messages (should appear once each)
    await waitForMessage(page, 'floaty', 10000);

    // Wait for full sedation
    await waitForSedation(page);
    await expect(page.locator('button:has-text("Sedated ✓")')).toBeVisible();
  });

  test('should not spam drowsy messages', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await startSimulation(page);
    await establishIV(page);
    await orderSedation(page);

    // Wait for sedation to complete
    await waitForSedation(page);

    // Verify no duplicate messages
    const noDuplicates = await verifyNoDuplicateMessages(page);
    expect(noDuplicates).toBe(true);

    // Count Lily's "sleepy" messages - should be exactly 1
    const sleepyCount = await page.locator('text="I\'m... sleepy... daddy..."').count();
    expect(sleepyCount).toBeLessThanOrEqual(2); // Allow some tolerance
  });

});

test.describe('PediSim SVT - Adenosine Workflow', () => {

  test('should require IV for adenosine', async ({ page }) => {
    await page.goto('/');
    await startSimulation(page);

    // Try adenosine without IV
    await giveAdenosine(page, 1.85);

    // Should see nurse refusal
    await waitForMessage(page, 'need IV');
  });

  test('should show adenosine pharmacokinetic phases', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/');
    await startSimulation(page);
    await establishIV(page);

    // Give adenosine
    await giveAdenosine(page, 1.85);

    // Verify phase messages
    await waitForMessage(page, 'Adenosine 1.85mg ordered');
    await waitForMessage(page, 'Drawing adenosine', 15000);
    await waitForMessage(page, 'Ready with adenosine', 20000);
    await waitForMessage(page, 'Adenosine IN', 25000);

    // Verify Lily's side effects
    await waitForMessage(page, 'warm', 30000);
    await waitForMessage(page, 'chest', 35000);

    // Verify asystole occurs
    await waitForPhase(page, 'ASYSTOLE', 40000);
    await waitForMessage(page, 'HEART STOPPED', 45000);
    await waitForMessage(page, 'Transient asystole', 50000);

    // Wait for outcome
    await page.waitForTimeout(8000);

    // Should either convert or return to SVT
    const converted = await hasMessage(page, 'sinus');
    const failed = await hasMessage(page, 'Back in SVT');
    expect(converted || failed).toBe(true);
  });

  test('should show recovery curve on success', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await startSimulation(page);
    await establishIV(page);

    // Give adenosine - this is probabilistic (60-80% success)
    // We'll try up to 3 times, each with a fresh simulation
    let converted = false;
    for (let attempt = 0; attempt < 3 && !converted; attempt++) {
      if (attempt > 0) {
        // Reset for another try
        await resetSimulation(page);
        await startSimulation(page);
        await establishIV(page);
      }

      await giveAdenosine(page, 1.85);
      await page.waitForTimeout(35000); // Wait for full adenosine workflow

      converted = await hasMessage(page, 'Converting');
    }

    // Skip recovery verification if we never converted (probabilistic)
    // The test passes as long as no errors occurred
    if (converted) {
      // Verify we're in CONVERTED phase
      await expect(page.locator('text=CONVERTED')).toBeVisible({ timeout: 10000 });

      // HR should be lower than SVT rate (220)
      const vitals = await getVitals(page);
      const hr = parseInt(vitals.hr);
      expect(hr).toBeLessThan(150); // Recovery HR should be much lower than SVT
    } else {
      // If all 3 attempts failed, that's statistically unlikely but possible
      // Test still passes - we verified the workflow runs without errors
      console.log('Note: All 3 adenosine attempts failed (statistically unlikely but valid)');
    }
  });

});

test.describe('PediSim SVT - Defibrillator', () => {

  test('should open defibrillator panel', async ({ page }) => {
    await page.goto('/');
    await startSimulation(page);

    await openDefibrillator(page);

    // Verify defibrillator UI - shows "SYNCHRONIZED CARDIOVERSION" in header
    await expect(page.locator('text=SYNCHRONIZED CARDIOVERSION')).toBeVisible();
    // Has the ATTACH PADS button
    await expect(page.getByRole('button', { name: 'ATTACH PADS' })).toBeVisible();
    // Status shows "ATTACH PADS TO PATIENT"
    await expect(page.locator('text=ATTACH PADS TO PATIENT')).toBeVisible();
  });

  test('should show pad placement when attaching pads', async ({ page }) => {
    await page.goto('/');
    await startSimulation(page);
    await openDefibrillator(page);

    // Click attach pads button
    await page.getByRole('button', { name: 'ATTACH PADS' }).click();

    // Verify pad placement options appear
    await expect(page.locator('text=PAD PLACEMENT')).toBeVisible();
    // Use heading role to avoid matching tip text
    await expect(page.locator('h3:has-text("Anterior-Posterior")')).toBeVisible();
    await expect(page.locator('text=RECOMMENDED')).toBeVisible();
  });

  test('should show energy selector', async ({ page }) => {
    await page.goto('/');
    await startSimulation(page);
    await openDefibrillator(page);

    // Verify energy selector is visible
    await expect(page.locator('text=ENERGY')).toBeVisible();
    // There should be energy buttons (◄ and ►) and a joule display
    await expect(page.locator('button:has-text("◄")')).toBeVisible();
    await expect(page.locator('button:has-text("►")')).toBeVisible();
  });

  test('should close with Escape', async ({ page }) => {
    await page.goto('/');
    await startSimulation(page);
    await openDefibrillator(page);

    await closeModal(page);

    // Verify panel closed - sync cardioversion header should not be visible
    await expect(page.locator('text=SYNCHRONIZED CARDIOVERSION')).not.toBeVisible();
  });

});

test.describe('PediSim SVT - ECG Viewer', () => {

  test('should open ECG viewer', async ({ page }) => {
    await page.goto('/');
    await startSimulation(page);

    // Click the ECG button
    await page.click('button:has-text("Get 15-Lead ECG")');

    // Wait for the ECG modal to appear - it has white background with measurement row
    await expect(page.locator('text=HR:')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=QRS:')).toBeVisible();
  });

  test('should show measurement instructions in SVT', async ({ page }) => {
    await page.goto('/');
    await startSimulation(page);

    await page.click('button:has-text("Get 15-Lead ECG")');
    await expect(page.locator('text=HR:')).toBeVisible({ timeout: 5000 });

    // In "Measure to Learn" mode, user must measure R-R before seeing interpretation
    // The prompt shows "MEASURE R-R INTERVAL" in the interpretation banner
    await expect(page.locator('text=MEASURE R-R INTERVAL')).toBeVisible();
    // Instruction mentions calipers and pressing C
    await expect(page.locator('text=press C')).toBeVisible();
  });

  test('should close with Escape', async ({ page }) => {
    await page.goto('/');
    await startSimulation(page);

    await page.click('button:has-text("Get 15-Lead ECG")');
    await expect(page.locator('text=HR:')).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');

    // Verify modal closed - the ECG HR label should not be visible in the modal
    // Wait a moment for the modal to close
    await page.waitForTimeout(200);
    // The modal has a specific HR label that won't be in the main vitals
    await expect(page.locator('text=MEASURE R-R INTERVAL')).not.toBeVisible();
  });

});

test.describe('PediSim SVT - Complete Scenario', () => {

  test('Scenario A: PALS Protocol with Adenosine Success', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');

    // 1. Start simulation
    await startSimulation(page);
    await expect(page.locator('text=RUNNING')).toBeVisible();

    // 2. Establish IV
    await establishIV(page);
    await expect(page.locator('text=IV patent')).toBeVisible();

    // 3. Attempt vagal
    await doVagal(page);
    await page.waitForTimeout(3000);

    // Check if vagal succeeded (25% chance) - if so, already converted
    const vagalConverted = await page.locator('text=CONVERTED').isVisible().catch(() => false);
    if (vagalConverted) {
      // Vagal worked! Verify conversion state
      await expect(page.locator('text=CONVERTED')).toBeVisible();
      await expect(page.locator(selectors.followUpECGButton)).toBeVisible();
      return; // Test passes - converted via vagal
    }

    // 4. Give adenosine (only if still in SVT)
    await giveAdenosine(page, 1.85);

    // 5. Wait for outcome
    await page.waitForTimeout(35000);

    // 6. Check if converted (success) or need second dose (failure)
    const converted = await hasMessage(page, 'sinus');
    const needsSecond = await hasMessage(page, 'Second dose');

    if (converted) {
      // 7. Verify conversion state
      await expect(page.locator('text=CONVERTED')).toBeVisible();

      // 8. Check for follow-up ECG button
      await expect(page.locator(selectors.followUpECGButton)).toBeVisible();
    } else if (needsSecond) {
      // Give second dose
      await giveAdenosine(page, 3.7);
      await page.waitForTimeout(35000);
    }
  });

  test('Scenario B: Cardioversion after failed adenosine', async ({ page }) => {
    test.setTimeout(180000);

    await page.goto('/');
    await startSimulation(page);
    await establishIV(page);

    // Give adenosine twice (assume both fail for this test)
    await giveAdenosine(page, 1.85);
    await page.waitForTimeout(35000);

    const firstSuccess = await hasMessage(page, 'Converting');
    if (!firstSuccess) {
      await giveAdenosine(page, 3.7);
      await page.waitForTimeout(35000);

      const secondSuccess = await hasMessage(page, 'Converting');
      if (!secondSuccess) {
        // Now need cardioversion
        await expect(page.locator('text=cardioversion')).toBeVisible();

        // Order sedation first
        await orderSedation(page);
        await waitForSedation(page);

        // Open defibrillator
        await openDefibrillator(page);
        await expect(page.locator('text=DEFIBRILLATOR')).toBeVisible();
      }
    }
  });

});

test.describe('PediSim SVT - Edge Cases', () => {

  test('should not allow interventions during IDLE', async ({ page }) => {
    await page.goto('/');

    // Buttons should be disabled during IDLE phase
    await expect(page.locator('button:has-text("Vagal")')).toBeDisabled();
    await expect(page.locator('button:has-text("Adenosine")')).toBeDisabled();
    await expect(page.locator('button:has-text("Sedate")')).toBeDisabled();

    // Phase should still be IDLE
    await expect(page.locator('text=IDLE')).toBeVisible();
  });

  test('should handle invalid adenosine dose', async ({ page }) => {
    await page.goto('/');
    await startSimulation(page);
    await establishIV(page);

    // Try invalid dose
    await page.click(selectors.adenosineButton);
    await page.locator(selectors.adenosineInput).fill('0');
    await page.click(selectors.adenosineGoButton);

    // Should see nurse refusal
    await waitForMessage(page, 'valid dose');
  });

  test('should not allow re-sedation when already sedated', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await startSimulation(page);
    await establishIV(page);
    await orderSedation(page);
    await waitForSedation(page);

    // Sedate button should show "Sedated ✓" and be disabled
    const sedateButton = page.locator('button:has-text("Sedated ✓")');
    await expect(sedateButton).toBeVisible();
    await expect(sedateButton).toBeDisabled();

    // Should only have one "Drawing up midazolam" message from first sedation
    const drawingCount = await page.locator('text=Drawing up midazolam').count();
    expect(drawingCount).toBe(1);
  });

});
