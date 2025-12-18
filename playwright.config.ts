import { defineConfig, devices } from '@playwright/test';

/**
 * PediSim SVT - Playwright E2E Test Configuration
 *
 * Tests the full simulation workflow including:
 * - Basic simulation flow (start, interventions, conversion)
 * - Physiologic realism (deterioration, sedation timing, adenosine phases)
 * - Defibrillator workflow
 * - ECG viewer
 * - Debrief system
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,  // Run tests sequentially for simulation state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,  // Single worker for simulation testing
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },

  // Global timeout for each test
  timeout: 120000,  // 2 minutes per test (simulations can take time)

  // Expect timeout
  expect: {
    timeout: 10000,
  },
});
