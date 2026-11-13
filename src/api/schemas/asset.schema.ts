import { expect } from '@playwright/test';

/**
 * Response-schema assertions for a hardware asset object (GET hardware/{id} and list rows).
 * Dependency-free: uses Playwright asymmetric matchers so failures show a readable diff.
 */
export function expectAssetSchema(asset: unknown): void {
  expect(asset).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      asset_tag: expect.any(String),
      model: expect.objectContaining({ id: expect.any(Number), name: expect.any(String) }),
      status_label: expect.objectContaining({ id: expect.any(Number), name: expect.any(String) }),
      created_at: expect.objectContaining({ datetime: expect.any(String) }),
      updated_at: expect.objectContaining({ datetime: expect.any(String) }),
    }),
  );
  const a = asset as Record<string, unknown>;
  expect(a.name === null || typeof a.name === 'string', 'name is string|null').toBe(true);
  expect(a.serial === null || typeof a.serial === 'string', 'serial is string|null').toBe(true);
  expect(a.assigned_to === null || typeof a.assigned_to === 'object', 'assigned_to is object|null').toBe(
    true,
  );
  expect(Number.isNaN(Date.parse((a.updated_at as { datetime: string }).datetime)), 'updated_at parses').toBe(
    false,
  );
}

export function expectListSchema(body: unknown): void {
  expect(body).toEqual(expect.objectContaining({ total: expect.any(Number), rows: expect.any(Array) }));
}
