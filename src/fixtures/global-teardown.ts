import { env, hasApiToken } from '../config/env';
import { ApiClient } from '../api/ApiClient';
import { HardwareApi } from '../api/HardwareApi';
import { runTagPrefix } from '../utils/testData';
import { logger } from '../utils/logger';

/**
 * Safety-net sweeper. Per-test fixtures already delete what they create; this removes anything
 * left behind by crashed workers. It ONLY touches assets whose tag starts with
 * "<TEST_PREFIX>-<RUN_ID>-", so it never affects other users' or other runs' data.
 */
export default async function globalTeardown(): Promise<void> {
  if (!env.cleanup) {
    logger.info('CLEANUP=false — leaving test data in place.');
    return;
  }
  if (!hasApiToken()) {
    logger.info('No API token — sweeper skipped (UI fixtures handle per-test cleanup).');
    return;
  }
  const api = await ApiClient.create();
  const hardware = new HardwareApi(api);
  const prefix = runTagPrefix();
  try {
    const res = await hardware.list({ search: prefix, limit: 200 });
    const leftovers = (res.body?.rows ?? []).filter((r) => r.asset_tag.startsWith(prefix));
    for (const asset of leftovers) {
      if (asset.assigned_to) await hardware.checkin(asset.id, 'teardown sweep');
      const del = await hardware.remove(asset.id);
      logger.warn(
        `Swept leftover asset ${asset.asset_tag} (id ${asset.id}) -> ${del.body?.status ?? del.status}`,
      );
    }
    if (leftovers.length === 0) logger.info(`Sweeper: no leftovers for ${prefix}`);
  } catch (e) {
    logger.error('Sweeper failed (non-fatal)', String(e));
  } finally {
    await api.dispose();
  }
}
