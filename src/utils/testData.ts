import { env } from '../config/env';

/** Data a test supplies when creating an asset. Lookups are by NAME, never hard-coded IDs. */
export interface AssetInput {
  assetTag: string;
  name: string;
  serial: string;
  notes: string;
  modelName: string;
  statusName: string;
}

/** An asset that exists in the AUT and was created by this run. */
export interface CreatedAsset extends AssetInput {
  id: number;
  createdVia: 'api' | 'ui';
}

let counter = 0;

/** Short unique suffix: per-process counter + random, safe across parallel workers. */
export function uniqueSuffix(): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${process.pid.toString(36).toUpperCase()}${counter}${rand}`;
}

/**
 * Builds unique, run-scoped asset data.
 * Tag pattern: <TEST_PREFIX>-<RUN_ID>-<suffix>   e.g. QA-TA-20261112210700-1A2B3C
 * The RUN_ID segment lets the global teardown sweep only THIS run's leftovers.
 */
export function buildAsset(overrides: Partial<AssetInput> = {}): AssetInput {
  const suffix = uniqueSuffix();
  return {
    assetTag: `${env.testPrefix}-${env.runId}-${suffix}`,
    name: `${env.testPrefix} Laptop ${env.runId}-${suffix}`,
    serial: `SN-${env.runId}-${suffix}`,
    notes: `Created by automation run ${env.runId}`,
    modelName: env.defaultModelName,
    statusName: env.defaultStatusName,
    ...overrides,
  };
}

/** Run-scoped search key used by the cleanup sweeper. */
export const runTagPrefix = (): string => `${env.testPrefix}-${env.runId}-`;

export const repeatChar = (length: number, ch = 'A'): string => ch.repeat(length);
