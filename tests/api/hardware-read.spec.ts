import { apiTest as test, expect, requireToken } from '../../src/fixtures/apiTest';
import { expectAssetSchema, expectListSchema } from '../../src/api/schemas/asset.schema';

test.describe('API read — hardware', () => {
  test.beforeEach(() => requireToken());

  test(
    'GET /hardware?limit=5 returns a paged list with valid row schema',
    { tag: ['@smoke'] },
    async ({ hardware }) => {
      const res = await hardware.list({ limit: 5 });

      expect(res.status).toBe(200);
      expect(res.response.headers()['content-type']).toContain('application/json');
      expectListSchema(res.body);
      expect(res.body.rows.length).toBeLessThanOrEqual(5);
      expect(res.body.total).toBeGreaterThanOrEqual(res.body.rows.length);
      for (const row of res.body.rows) expectAssetSchema(row);
    },
  );

  test(
    'GET /hardware/{id} returns the asset with expected fields',
    { tag: ['@smoke'] },
    async ({ hardware, apiAsset, apiLookups }) => {
      const res = await hardware.get(apiAsset.id);

      expect(res.status).toBe(200);
      expectAssetSchema(res.body);
      expect(res.body).toMatchObject({
        id: apiAsset.id,
        asset_tag: apiAsset.assetTag,
        name: apiAsset.name,
        serial: apiAsset.serial,
        notes: apiAsset.notes,
        model: { id: apiLookups.modelId },
        status_label: { id: apiLookups.statusId },
        assigned_to: null,
      });
    },
  );

  test(
    'GET /hardware/bytag/{tag} and search both find the asset',
    { tag: ['@regression'] },
    async ({ hardware, apiAsset }) => {
      const byTag = await hardware.getByTag(apiAsset.assetTag);
      expect(byTag.status).toBe(200);
      expect(byTag.body).toMatchObject({ id: apiAsset.id, asset_tag: apiAsset.assetTag });

      const search = await hardware.list({ search: apiAsset.assetTag });
      expect(search.status).toBe(200);
      expect(search.body.rows.filter((r) => r.asset_tag === apiAsset.assetTag)).toHaveLength(1);
    },
  );

  test(
    'GET /hardware/{id} for a non-existent id returns an error, not data',
    { tag: ['@regression'] },
    async ({ hardware }) => {
      const res = await hardware.get(2_147_000_000);
      // Snipe-IT may answer 404 or 200 + {status:"error"}; either way no asset is returned.
      expect([200, 404]).toContain(res.status);
      expect(JSON.stringify(res.body)).toMatch(/not found|does not exist|error/i);
      expect(res.body).not.toHaveProperty('asset_tag');
    },
  );
});
