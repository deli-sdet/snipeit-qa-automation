import { apiTest as test, expect } from '../../src/fixtures/apiTest';

/**
 * Authorization negatives — need NO valid token, so they run on the public demo regardless.
 * Request:  GET {API_BASE_URL}/hardware   Accept: application/json
 * Expected: 401, no asset data leaked.
 */
test.describe('API auth — hardware', () => {
  test('TC-09b GET /hardware without Authorization header -> 401', { tag: ['@smoke'] }, async ({ anonApi }) => {
    const res = await anonApi.get<Record<string, unknown>>('hardware', { limit: 1 });
    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('rows');
    expect(JSON.stringify(res.body)).toMatch(/unauthenticated/i);
  });

  test('TC-09c GET /hardware with invalid Bearer token -> 401', { tag: ['@smoke'] }, async ({ badTokenApi }) => {
    const res = await badTokenApi.get<Record<string, unknown>>('hardware', { limit: 1 });
    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('rows');
  });

  test('POST /hardware without token is rejected and creates nothing', { tag: ['@regression'] }, async ({
    anonApi,
  }) => {
    const res = await anonApi.post<Record<string, unknown>>('hardware', {
      asset_tag: `QA-TA-ANON-${Date.now()}`,
      model_id: 1,
      status_id: 1,
    });
    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('payload.id');
  });
});
