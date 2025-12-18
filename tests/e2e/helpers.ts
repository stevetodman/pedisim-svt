import { Page, expect } from '@playwright/test';

/**
 * PediSim SVT - E2E Test Helpers
 * Reusable utilities for interacting with the simulation
 */

// Selectors for common UI elements
export const selectors = {
  // Header
  startButton: 'button:has-text("Start")',
  resetButton: 'button:has-text("Reset")',
  debriefButton: 'button:has-text("Debrief")',
  phaseIndicator: '[class*="uppercase"]',
  timer: '[class*="font-mono"]',

  // Patient card
  patientName: 'text=Lily Henderson',
  deteriorationBadge: '[class*="text-\\[9px\\]"]',

  // Intervention buttons
  establishIVButton: 'button:has-text("Establish IV")',
  vagalButton: 'button:has-text("Vagal")',
  adenosineButton: 'button:has-text("Adenosine")',
  sedateButton: 'button:has-text("Sedate")',
  cardiovertButton: 'button:has-text("Cardiovert")',
  ecgButton: 'button:has-text("Get 15-Lead ECG")',
  followUpECGButton: 'button:has-text("Get Follow-up ECG")',

  // Adenosine input
  adenosineInput: 'input[type="number"]',
  adenosineGoButton: 'button:has-text("GO")',

  // Vitals monitor
  vitalsHR: 'text=/\\d{1,3}|---/',
  vitalsSpo2: 'text=/\\d{2}|--/',
  vitalsBP: 'text=/\\d{2,3}\\/\\d{2}|--\\/--/',
  vitalsRR: 'text=/\\d{2}|--/',

  // Dialogue
  dialogueInput: 'input[placeholder*="Talk"]',
  sayButton: 'button:has-text("Say")',
  messageContainer: '[class*="overflow-y-auto"]',

  // Modals
  ecgViewerModal: '[class*="fixed inset-0"]',
  defibPanel: '[class*="fixed inset-0"]',
  debriefPanel: '[class*="fixed inset-0"]',

  // Defibrillator
  defibSyncButton: 'button:has-text("SYNC")',
  defibChargeButton: 'button:has-text("CHARGE")',
  defibShockButton: 'button:has-text("SHOCK")',
  defibCloseButton: 'button:has-text("Close")',
  padAPButton: 'button:has-text("Anterior-Posterior")',
  padALButton: 'button:has-text("Anterior-Lateral")',
};

/**
 * Wait for simulation to be in a specific phase
 */
export async function waitForPhase(page: Page, phase: 'IDLE' | 'RUNNING' | 'ASYSTOLE' | 'CONVERTED', timeout = 30000) {
  await expect(page.locator(`text=${phase}`).first()).toBeVisible({ timeout });
}

/**
 * Start the simulation
 */
export async function startSimulation(page: Page) {
  await page.click(selectors.startButton);
  await waitForPhase(page, 'RUNNING');
}

/**
 * Reset the simulation
 */
export async function resetSimulation(page: Page) {
  await page.click(selectors.resetButton);
  await waitForPhase(page, 'IDLE');
}

/**
 * Establish IV access - now takes 8-12s due to realistic timing
 * May result in IO access if IV fails multiple times
 */
export async function establishIV(page: Page, maxWaitMs = 60000) {
  await page.click(selectors.establishIVButton);

  // Locators for success states
  const ivSuccessButton = page.getByRole('button', { name: 'IV Access ✓' });
  const ioSuccessButton = page.getByRole('button', { name: 'IO Access ✓' });
  const goIOButton = page.getByRole('button', { name: /Go IO/ });
  // Button shows "Establish IV (N failed)" after failed attempts and needs re-click
  const failedRetryButton = page.getByRole('button', { name: /Establish IV \(\d+ failed\)/ });

  // Wait for success or handle retries/IO choice
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    // Check for IV success
    if (await ivSuccessButton.isVisible().catch(() => false)) {
      return;
    }

    // Check for IO success
    if (await ioSuccessButton.isVisible().catch(() => false)) {
      return;
    }

    // Check for IO choice dialog - go IO when offered (faster for testing)
    // IMPORTANT: Check this BEFORE retry button to avoid clicking both
    const ioChoiceVisible = await goIOButton.isVisible().catch(() => false);
    if (ioChoiceVisible) {
      await goIOButton.click();
      // Wait for either IO or IV success (race condition in simulation may allow IV to succeed)
      await expect(ivSuccessButton.or(ioSuccessButton)).toBeVisible({ timeout: 30000 });
      return;
    }

    // Check if IV failed and button is ready for retry - click again
    // Only do this if IO choice is NOT visible (they share the same UI state)
    if (await failedRetryButton.isVisible().catch(() => false)) {
      await failedRetryButton.click();
    }

    // Wait a bit before checking again
    await page.waitForTimeout(500);
  }

  // Final check - use .or() to match either success state
  await expect(ivSuccessButton.or(ioSuccessButton)).toBeVisible({ timeout: 5000 });
}

/**
 * Perform vagal maneuver (selects Modified Valsalva by default)
 */
export async function doVagal(page: Page, technique: 'valsalva' | 'blow_thumb' | 'bearing_down' | 'gag' = 'valsalva') {
  // Click vagal button to show options
  await page.click(selectors.vagalButton);
  await expect(page.locator('text=Select technique')).toBeVisible({ timeout: 3000 });

  // Select the technique
  const techniqueLabels: Record<string, string> = {
    valsalva: 'Modified Valsalva',
    blow_thumb: 'Blow on Thumb',
    bearing_down: 'Bearing Down',
    gag: 'Gag Reflex',
  };
  await page.click(`button:has-text("${techniqueLabels[technique]}")`);

  // Wait for nurse to acknowledge the maneuver
  await expect(page.locator('text=blow').or(page.locator('text=push')).or(page.locator('text=throat'))).toBeVisible({ timeout: 5000 });
}

/**
 * Give adenosine with specified dose
 */
export async function giveAdenosine(page: Page, dose: number) {
  // Click adenosine button to show input
  await page.click(selectors.adenosineButton);

  // Wait for input to appear
  await expect(page.locator(selectors.adenosineInput)).toBeVisible();

  // Clear and enter dose
  await page.locator(selectors.adenosineInput).fill(dose.toString());

  // Click GO
  await page.click(selectors.adenosineGoButton);
}

/**
 * Order sedation
 */
export async function orderSedation(page: Page) {
  await page.click(selectors.sedateButton);
  await expect(page.locator('text=Starting sedation')).toBeVisible({ timeout: 5000 });
}

/**
 * Wait for sedation to complete
 */
export async function waitForSedation(page: Page, timeout = 70000) {
  // Sedation takes ~56 seconds total (8s draw + 3s push + 45s onset)
  await expect(page.locator('button:has-text("Sedated")')).toBeVisible({ timeout });
}

/**
 * Open defibrillator panel
 */
export async function openDefibrillator(page: Page) {
  await page.click(selectors.cardiovertButton);
  await expect(page.locator('text=SYNCHRONIZED CARDIOVERSION')).toBeVisible({ timeout: 5000 });
}

/**
 * Open ECG viewer
 */
export async function openECGViewer(page: Page) {
  await page.click(selectors.ecgButton);
  // ECG viewer shows patient name in header and has measurement controls
  await expect(page.locator('text=MEASURE R-R INTERVAL')).toBeVisible({ timeout: 5000 });
}

/**
 * Close any modal (press Escape)
 */
export async function closeModal(page: Page) {
  await page.keyboard.press('Escape');
}

/**
 * Send a message as the doctor
 */
export async function speakToFamily(page: Page, message: string) {
  await page.locator(selectors.dialogueInput).fill(message);
  await page.click(selectors.sayButton);
}

/**
 * Get the current elapsed time as a number (seconds)
 */
export async function getElapsedTime(page: Page): Promise<number> {
  const timerText = await page.locator('[class*="font-mono"][class*="text-amber"]').textContent();
  if (!timerText) return 0;

  const [min, sec] = timerText.split(':').map(Number);
  return min * 60 + sec;
}

/**
 * Wait for a specific elapsed time (in seconds)
 */
export async function waitForElapsedTime(page: Page, seconds: number, timeout = 180000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const elapsed = await getElapsedTime(page);
    if (elapsed >= seconds) return;
    await page.waitForTimeout(500);
  }

  throw new Error(`Timeout waiting for elapsed time ${seconds}s`);
}

/**
 * Get the current deterioration stage from the UI
 */
export async function getDeteriorationStage(page: Page): Promise<string | null> {
  // The deterioration badge contains text like "COMPENSATED", "EARLY STRESS", etc.
  // Use text matching to find the specific badge (not the AI badge)
  const stageTexts = ['COMPENSATED', 'EARLY STRESS', 'MODERATE STRESS', 'DECOMPENSATING', 'CRITICAL'];

  for (const stage of stageTexts) {
    const badge = page.locator(`text="${stage}"`);
    if (await badge.isVisible({ timeout: 500 }).catch(() => false)) {
      return stage;
    }
  }
  return null;
}

/**
 * Get current vitals from the monitor
 */
export async function getVitals(page: Page): Promise<{ hr: string; spo2: string; bp: string; rr: string }> {
  // The vitals monitor has a specific structure
  const hrElement = page.locator('[class*="text-2xl"][class*="font-mono"]').first();
  const spo2Element = page.locator('text=SpO2').locator('..').locator('[class*="font-mono"]');
  const bpElement = page.locator('text=BP').locator('..').locator('[class*="font-mono"]');
  const rrElement = page.locator('text=RR').locator('..').locator('[class*="font-mono"]');

  return {
    hr: await hrElement.textContent() || '---',
    spo2: await spo2Element.textContent() || '--',
    bp: await bpElement.textContent() || '--/--',
    rr: await rrElement.textContent() || '--',
  };
}

/**
 * Wait for a message containing specific text
 */
export async function waitForMessage(page: Page, text: string, timeout = 10000) {
  await expect(page.locator(`text=${text}`)).toBeVisible({ timeout });
}

/**
 * Check if a message exists in the dialogue
 */
export async function hasMessage(page: Page, text: string): Promise<boolean> {
  const messages = page.locator(selectors.messageContainer);
  return await messages.locator(`text=${text}`).isVisible();
}

/**
 * Count messages from a specific character
 */
export async function countMessagesFrom(page: Page, character: 'Nurse' | 'Lily' | 'Dad' | 'You'): Promise<number> {
  const label = character === 'Nurse' ? 'Nurse' :
                character === 'Lily' ? 'Lily' :
                character === 'Dad' ? 'Dad' : 'You';

  return await page.locator(`text=${label}`).count();
}

/**
 * Verify no duplicate consecutive messages
 */
export async function verifyNoDuplicateMessages(page: Page): Promise<boolean> {
  const messages = await page.locator('[class*="rounded-lg"][class*="px-2"]').allTextContents();

  for (let i = 1; i < messages.length; i++) {
    if (messages[i] === messages[i - 1]) {
      console.error(`Duplicate message found: "${messages[i]}"`);
      return false;
    }
  }
  return true;
}
