import { apiTest as test, expect, requireToken } from '../../src/fixtures/apiTest';
import { expectApiSuccess, expectApiValidationError } from '../../src/api/HardwareApi';
import type { HardwareAsset } from '../../src/api/types';
import { buildAsset, repeatChar } from '../../src/utils/testData';
import boundary from '../../test-data/boundary-values.json';

test.describe('API write — hardware', () => {
  test.beforeEach(() => requireToken());

  test('POST /hardware creates an asset; GET returns the same values', { tag: ['@smoke'] }, async ({
    hardware,
    apiLookups,
    apiCleanup,
  }) => {
    const data = buildAsset();
    const res = await hardware.create({
      asset_tag: data.assetTag,
      model_id: apiLookups.modelId,
      status_id: apiLookups.statusId,
      name: data.name,
      serial: data.serial,
      notes: data.notes,
    });
    const created = expectApiSuccess<HardwareAsset>(res, 'create');
    apiCleanup.track({ id: created.id, assetTag: data.assetTag });

    const read = await hardware.get(created.id);
    expect(read.body).toMatchObject({ asset_tag: data.assetTag, name: data.name, serial: data.serial });
  });

  test('PATCH /hardware/{id} updates notes; updated_at does not go backwards', { tag: ['@smoke'] }, async ({
    hardware,
    apiAsset,
  }) => {
    const before = await hardware.get(apiAsset.id);
    const notes = `API patch ${Date.now()}`;

    expectApiSuccess(await hardware.update(apiAsset.id, { notes }), 'patch');

    const after = await hardware.get(apiAsset.id);
    expect(after.body.notes).toBe(notes);
    expect(after.body.name).toBe(apiAsset.name); // untouched field unchanged
    // updated_at has second precision and server-local format, so compare as non-decreasing.
    expect(after.body.updated_at!.datetime >= before.body.updated_at!.datetime).toBe(true);
  });

  test('TC-06 duplicate asset_tag -> body.status=error with asset_tag message', { tag: ['@regression'] }, async ({
    hardware,
    apiAsset,
    apiLookups,
    apiCleanup,
  }) => {
    const res = await hardware.create({
      asset_tag: apiAsset.assetTag,
      model_id: apiLookups.modelId,
      status_id: apiLookups.statusId,
    });
    if (res.body?.status === 'success' && res.body.payload) {
      apiCleanup.track({ id: res.body.payload.id, assetTag: apiAsset.assetTag });
    }
    const httpStatus = expectApiValidationError(res, 'asset_tag');
    test.info().annotations.push({ type: 'contract', description: `validation error HTTP status = ${httpStatus}` });
    expect(await hardware.countByExactTag(apiAsset.assetTag)).toBe(1);
  });

  test('TC-05 (API) missing model_id -> validation error, nothing created', { tag: ['@regression'] }, async ({
    hardware,
    apiLookups,
    apiCleanup,
  }) => {
    const data = buildAsset();
    const res = await hardware.create({
      asset_tag: data.assetTag,
      status_id: apiLookups.statusId,
    } as unknown as Parameters<typeof hardware.create>[0]);
    if (res.body?.status === 'success' && res.body.payload) {
      apiCleanup.track({ id: res.body.payload.id, assetTag: data.assetTag });
    }
    expectApiValidationError(res, 'model_id');
    expect(await hardware.countByExactTag(data.assetTag)).toBe(0);
  });

  test.describe('TC-07 name boundary and special characters', () => {
    const max = boundary.name.maxLength;

    test(`name of ${max} chars is accepted`, { tag: ['@regression'] }, async ({ hardware, apiLookups, apiCleanup }) => {
      const data = buildAsset({ name: repeatChar(max) });
      const res = await hardware.create({
        asset_tag: data.assetTag,
        model_id: apiLookups.modelId,
        status_id: apiLookups.statusId,
        name: data.name,
      });
      const created = expectApiSuccess<HardwareAsset>(res, 'create max-length');
      apiCleanup.track({ id: created.id, assetTag: data.assetTag });
      expect((await hardware.get(created.id)).body.name).toHaveLength(max);
    });

    test(`name of ${max + 1} chars is rejected`, { tag: ['@regression'] }, async ({ hardware, apiLookups, apiCleanup }) => {
      const data = buildAsset({ name: repeatChar(max + 1) });
      const res = await hardware.create({
        asset_tag: data.assetTag,
        model_id: apiLookups.modelId,
        status_id: apiLookups.statusId,
        name: data.name,
      });
      if (res.body?.status === 'success' && res.body.payload) {
        apiCleanup.track({ id: res.body.payload.id, assetTag: data.assetTag });
      }
      expectApiValidationError(res, 'name');
      expect(await hardware.countByExactTag(data.assetTag)).toBe(0);
    });

    for (const key of ['unicode', 'html'] as const) {
      test(`name with ${key} characters is stored exactly`, { tag: ['@regression'] }, async ({
        hardware,
        apiLookups,
        apiCleanup,
      }) => {
        const value = boundary.name[key].value;
        const data = buildAsset({ name: value });
        const res = await hardware.create({
          asset_tag: data.assetTag,
          model_id: apiLookups.modelId,
          status_id: apiLookups.statusId,
          name: value,
        });
        const created = expectApiSuccess<HardwareAsset>(res, `create ${key}`);
        apiCleanup.track({ id: created.id, assetTag: data.assetTag });
        // API may HTML-encode on output; accept raw or entity-encoded, but never altered content.
        const stored = (await hardware.get(created.id)).body.name ?? '';
        const decoded = stored
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#0?39;/g, "'")
          .replace(/&amp;/g, '&');
        expect(decoded).toBe(value);
      });
    }
  });

  test('TC-08 (API) checkout to user then checkin', { tag: ['@regression'] }, async ({
    hardware,
    apiAsset,
    apiLookups,
  }) => {
    test.skip(!apiLookups.userId, 'No checkout user found (set CHECKOUT_USER_NAME)');

    expectApiSuccess(
      await hardware.checkout(apiAsset.id, {
        checkout_to_type: 'user',
        assigned_user: apiLookups.userId,
        note: 'API checkout',
      }),
      'checkout',
    );
    const out = await hardware.get(apiAsset.id);
    expect(out.body.assigned_to).toMatchObject({ id: apiLookups.userId, type: 'user' });

    expectApiSuccess(await hardware.checkin(apiAsset.id, 'API checkin'), 'checkin');
    const back = await hardware.get(apiAsset.id);
    expect(back.body.assigned_to).toBeNull();
  });
});
