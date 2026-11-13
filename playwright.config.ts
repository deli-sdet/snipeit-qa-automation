import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

export const AUTH_FILE = '.auth/admin.json';
const jobSlug = (process.env.CI_JOB_NAME ?? 'run').replace(/\W+/g, '-');

/**
 * Projects
 *  - setup        logs in once and saves storageState (cookies/session) for UI projects
 *  - ui           page-level UI tests (reuse admin session)
 *  - e2e          full workflow, performs a real login (fresh session)
 *  - api          REST API tests (Bearer token; auth negatives run without one)
 *  - integration  cross-layer API <-> UI checks (token + session)
 *  - ui-firefox / ui-webkit  opt-in via ALL_BROWSERS=true
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: env.isCI,
  retries: env.retries,
  workers: env.workers,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: require.resolve('./src/fixtures/global-setup'),
  globalTeardown: require.resolve('./src/fixtures/global-teardown'),
  reporter: env.isCI
    ? [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['junit', { outputFile: `results/junit-${jobSlug}.xml` }],
        ['json', { outputFile: `results/results-${jobSlug}.json` }],
      ]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: env.baseUrl,
    headless: env.headless,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
  },
  projects: [
    {
      name: 'setup',
      testDir: './src/fixtures',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api',
      testDir: './tests/api',
    },
    {
      name: 'integration',
      testDir: './tests/integration',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
    },
    ...(process.env.ALL_BROWSERS === 'true'
      ? [
          {
            name: 'ui-firefox',
            testDir: './tests/ui',
            dependencies: ['setup'],
            use: { ...devices['Desktop Firefox'], storageState: AUTH_FILE },
          },
          {
            name: 'ui-webkit',
            testDir: './tests/ui',
            dependencies: ['setup'],
            use: { ...devices['Desktop Safari'], storageState: AUTH_FILE },
          },
        ]
      : []),
  ],
});
