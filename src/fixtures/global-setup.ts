import { request, type FullConfig } from '@playwright/test';
import { env, hasApiToken } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Health check before any test: fail fast with one clear message when the AUT is down,
 * instead of dozens of locator timeouts that look like product bugs.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  logger.info(
    `Run ${env.runId} | env=${env.testEnv} | base=${env.baseUrl} | apiToken=${hasApiToken() ? 'yes' : 'no'}`,
  );
  const ctx = await request.newContext({ baseURL: env.baseUrl });
  try {
    const res = await ctx.get('/login', { timeout: 30_000 });
    if (!res.ok()) {
      throw new Error(`AUT health check failed: GET ${env.baseUrl}/login -> HTTP ${res.status()}`);
    }
  } finally {
    await ctx.dispose();
  }
}
