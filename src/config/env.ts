import 'dotenv/config';

/**
 * Typed, validated environment configuration.
 * Every environment-specific value used by tests comes from here — never from specs.
 * See docs/05-test-data-and-environment.md for the full catalogue.
 */

type TestEnv = 'demo' | 'local' | 'staging';

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(
    d.getUTCMinutes(),
  )}${p(d.getUTCSeconds())}`;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes'].includes(v.toLowerCase());
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Env var ${name} must be a number, got "${v}"`);
  return n;
}

function required(name: string, fallback?: string): string {
  const v = process.env[name] || fallback;
  if (!v) throw new Error(`Missing required env var ${name}. Copy .env.example to .env and fill it in.`);
  return v;
}

const testEnv = (process.env.TEST_ENV || 'demo') as TestEnv;
if (!['demo', 'local', 'staging'].includes(testEnv)) {
  throw new Error(`TEST_ENV must be demo | local | staging, got "${testEnv}"`);
}

const defaultBaseUrl: Record<TestEnv, string | undefined> = {
  demo: 'https://demo.snipeitapp.com',
  local: 'http://localhost:8000',
  staging: undefined,
};

// RUN_ID must be identical in the main process and in every worker so cleanup can find
// this run's data. Setting it on process.env before workers spawn makes them inherit it.
if (!process.env.RUN_ID) {
  process.env.RUN_ID = process.env.CI_PIPELINE_ID || timestamp();
}

const isCI = bool('CI', false);
const baseUrl = required('BASE_URL', defaultBaseUrl[testEnv]).replace(/\/+$/, '');

export const env = {
  testEnv,
  isCI,
  baseUrl,
  apiBaseUrl: (process.env.API_BASE_URL || `${baseUrl}/api/v1`).replace(/\/+$/, ''),

  username: required('SNIPEIT_USERNAME', testEnv === 'demo' ? 'admin' : undefined),
  password: required('SNIPEIT_PASSWORD', testEnv === 'demo' ? 'password' : undefined),
  apiToken: process.env.SNIPEIT_API_TOKEN || '',
  limitedUsername: process.env.LIMITED_USERNAME || '',
  limitedPassword: process.env.LIMITED_PASSWORD || '',

  testPrefix: process.env.TEST_PREFIX || 'QA-TA',
  runId: process.env.RUN_ID as string,

  defaultModelName: process.env.DEFAULT_MODEL_NAME ?? 'Macbook Pro 13',
  defaultStatusName: process.env.DEFAULT_STATUS_NAME || 'Ready to Deploy',
  checkoutUserName: process.env.CHECKOUT_USER_NAME || '',
  defaultLocationName: process.env.DEFAULT_LOCATION_NAME || '',

  cleanup: bool('CLEANUP', true),
  workers: num('WORKERS', 2),
  retries: num('RETRIES', isCI ? 2 : 0),
  headless: bool('HEADLESS', true),

  db: {
    host: process.env.DB_HOST || '',
    port: num('DB_PORT', 3306),
    name: process.env.DB_NAME || 'snipeit',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
  },
} as const;

export const hasApiToken = (): boolean => env.apiToken.length > 0;
export const NO_TOKEN_REASON =
  'SNIPEIT_API_TOKEN not set — API write/integration tests skipped. See docs/07-api-testing.md (token limitation).';
