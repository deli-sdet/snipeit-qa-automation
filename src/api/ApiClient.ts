import { request, type APIRequestContext, type APIResponse } from '@playwright/test';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface ApiResult<T = unknown> {
  status: number;
  body: T;
  response: APIResponse;
  durationMs: number;
}

type Params = Record<string, string | number | boolean>;

/**
 * Thin wrapper over Playwright's APIRequestContext.
 * - Auth: Authorization: Bearer <token> (omitted when token is null — for negative auth tests)
 * - Paths are RELATIVE (no leading slash) so they resolve under <API_BASE_URL>/
 * - Never throws on non-2xx: tests assert status + body explicitly.
 */
export class ApiClient {
  constructor(private readonly ctx: APIRequestContext) {}

  static async create(token: string | null = env.apiToken): Promise<ApiClient> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const ctx = await request.newContext({
      baseURL: `${env.apiBaseUrl}/`,
      extraHTTPHeaders: headers,
      ignoreHTTPSErrors: env.testEnv === 'local',
    });
    return new ApiClient(ctx);
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }

  get<T>(path: string, params?: Params): Promise<ApiResult<T>> {
    return this.send<T>('GET', path, { params });
  }

  post<T>(path: string, data?: unknown): Promise<ApiResult<T>> {
    return this.send<T>('POST', path, { data });
  }

  patch<T>(path: string, data?: unknown): Promise<ApiResult<T>> {
    return this.send<T>('PATCH', path, { data });
  }

  delete<T>(path: string): Promise<ApiResult<T>> {
    return this.send<T>('DELETE', path, {});
  }

  private async send<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    opts: { params?: Params; data?: unknown },
  ): Promise<ApiResult<T>> {
    if (path.startsWith('/')) throw new Error(`Use relative API paths (got "${path}")`);
    const started = Date.now();
    const response = await this.ctx.fetch(path, { method, params: opts.params, data: opts.data });
    const durationMs = Date.now() - started;
    const text = await response.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON body (e.g. HTML error page) is returned as text */
    }
    logger.debug(`${method} ${path} -> ${response.status()} (${durationMs}ms)`);
    return { status: response.status(), body: body as T, response, durationMs };
  }
}
