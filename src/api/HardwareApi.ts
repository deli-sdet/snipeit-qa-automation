import { expect } from '@playwright/test';
import type { ApiClient, ApiResult } from './ApiClient';
import type {
  CheckoutBody,
  CreateAssetBody,
  HardwareAsset,
  HardwareListResponse,
  SnipeEnvelope,
  UpdateAssetBody,
} from './types';

/**
 * Snipe-IT hardware endpoints (verified against the published API reference):
 *   GET    hardware                 list / search
 *   GET    hardware/{id}            detail
 *   GET    hardware/bytag/{tag}     by asset tag
 *   POST   hardware                 create
 *   PATCH  hardware/{id}            partial update
 *   DELETE hardware/{id}            soft delete
 *   POST   hardware/{id}/checkout   checkout
 *   POST   hardware/{id}/checkin    checkin
 */
export class HardwareApi {
  constructor(private readonly api: ApiClient) {}

  list(
    params: { search?: string; limit?: number; offset?: number; sort?: string; order?: 'asc' | 'desc' } = {},
  ) {
    return this.api.get<HardwareListResponse>('hardware', { limit: 50, offset: 0, ...params });
  }

  get(id: number) {
    return this.api.get<HardwareAsset>(`hardware/${id}`);
  }

  getByTag(tag: string) {
    return this.api.get<HardwareAsset | SnipeEnvelope>(`hardware/bytag/${encodeURIComponent(tag)}`);
  }

  create(body: CreateAssetBody) {
    return this.api.post<SnipeEnvelope<HardwareAsset>>('hardware', body);
  }

  update(id: number, body: UpdateAssetBody) {
    return this.api.patch<SnipeEnvelope<HardwareAsset>>(`hardware/${id}`, body);
  }

  remove(id: number) {
    return this.api.delete<SnipeEnvelope>(`hardware/${id}`);
  }

  checkout(id: number, body: CheckoutBody) {
    return this.api.post<SnipeEnvelope>(`hardware/${id}/checkout`, body);
  }

  checkin(id: number, note?: string) {
    return this.api.post<SnipeEnvelope>(`hardware/${id}/checkin`, note ? { note } : {});
  }

  /** Count of non-deleted assets whose tag equals `tag` exactly (search is fuzzy). */
  async countByExactTag(tag: string): Promise<number> {
    const res = await this.list({ search: tag });
    expect(res.status).toBe(200);
    return res.body.rows.filter((r) => r.asset_tag === tag).length;
  }
}

/** Asserts a write call succeeded: HTTP 200 AND body.status === "success". Returns payload. */
export function expectApiSuccess<T>(res: ApiResult<SnipeEnvelope<T>>, context = ''): T {
  const dump = JSON.stringify(res.body).slice(0, 500);
  expect(res.status, `${context} HTTP status. Body: ${dump}`).toBe(200);
  expect(res.body.status, `${context} body.status. Body: ${dump}`).toBe('success');
  return res.body.payload as T;
}

/**
 * Asserts a validation failure. Snipe-IT documents a "200 validation error" response, so we accept
 * 200 or 422 for the HTTP code but ALWAYS require body.status === "error" and the field key.
 * The observed HTTP code is returned so tests can annotate the contract (see risk R2).
 */
export function expectApiValidationError(res: ApiResult<SnipeEnvelope>, field: string): number {
  const dump = JSON.stringify(res.body).slice(0, 500);
  expect([200, 400, 422], `validation HTTP status. Body: ${dump}`).toContain(res.status);
  expect(res.body.status, `body.status. Body: ${dump}`).toBe('error');
  expect(typeof res.body.messages, 'messages should be a field map').toBe('object');
  expect(Object.keys(res.body.messages as Record<string, string[]>)).toContain(field);
  return res.status;
}
