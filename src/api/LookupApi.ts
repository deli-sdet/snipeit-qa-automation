import { env } from '../config/env';
import type { ApiClient } from './ApiClient';
import type { Lookups } from './types';

interface Row {
  id: number;
  name: string;
  username?: string;
  type?: string;
}
interface List {
  total: number;
  rows: Row[];
}

/**
 * Resolves reference data by NAME at runtime (the demo resets, so IDs are never hard-coded).
 */
export class LookupApi {
  constructor(private readonly api: ApiClient) {}

  private async search(path: string, search: string): Promise<Row[]> {
    const res = await this.api.get<List>(path, search ? { search, limit: 50 } : { limit: 50 });
    if (res.status !== 200 || !Array.isArray(res.body?.rows)) {
      throw new Error(`Lookup ${path}?search=${search} failed: HTTP ${res.status} ${JSON.stringify(res.body)}`);
    }
    return res.body.rows;
  }

  async model(name: string): Promise<Row> {
    const rows = await this.search('models', name);
    const row = name ? rows.find((r) => r.name.toLowerCase().includes(name.toLowerCase())) : rows[0];
    if (!row) throw new Error(`No asset model matching "${name}". Set DEFAULT_MODEL_NAME.`);
    return row;
  }

  async deployableStatus(name: string): Promise<Row> {
    const rows = await this.search('statuslabels', '');
    const row =
      rows.find((r) => r.name.toLowerCase() === name.toLowerCase()) ?? rows.find((r) => r.type === 'deployable');
    if (!row) throw new Error(`No status label "${name}" and no deployable status found.`);
    return row;
  }

  async checkoutUser(name: string): Promise<Row> {
    const rows = await this.search('users', name);
    const row = rows.find((r) => r.username !== env.username) ?? rows[0];
    if (!row) throw new Error(`No user matching "${name}" for checkout. Set CHECKOUT_USER_NAME.`);
    return row;
  }

  async resolveDefaults(): Promise<Lookups> {
    const [model, status, user] = await Promise.all([
      this.model(env.defaultModelName),
      this.deployableStatus(env.defaultStatusName),
      this.checkoutUser(env.checkoutUserName),
    ]);
    return {
      modelId: model.id,
      modelName: model.name,
      statusId: status.id,
      statusName: status.name,
      userId: user.id,
      username: user.username,
    };
  }
}
