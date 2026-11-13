/** Shapes from the Snipe-IT API v1 reference (only the fields the tests rely on). */

export interface Timestamp {
  datetime: string;
  formatted: string;
}

export interface NamedRef {
  id: number;
  name: string;
}

export interface AssignedTo {
  id: number;
  username?: string;
  name?: string;
  type: 'user' | 'asset' | 'location' | string;
}

export interface HardwareAsset {
  id: number;
  name: string | null;
  asset_tag: string;
  serial: string | null;
  notes: string | null;
  model: NamedRef | null;
  status_label: (NamedRef & { status_type?: string; status_meta?: string }) | null;
  assigned_to: AssignedTo | null;
  location?: NamedRef | null;
  rtd_location?: NamedRef | null;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  available_actions?: Record<string, boolean>;
}

export interface HardwareListResponse {
  total: number;
  rows: HardwareAsset[];
}

/** Write endpoints wrap results in this envelope. Validation errors may arrive with HTTP 200. */
export interface SnipeEnvelope<T = unknown> {
  status: 'success' | 'error';
  messages: string | Record<string, string[]>;
  payload: T | null;
}

export interface CreateAssetBody {
  asset_tag: string;
  model_id: number;
  status_id: number;
  name?: string;
  serial?: string;
  notes?: string;
  rtd_location_id?: number;
}

export type UpdateAssetBody = Partial<Omit<CreateAssetBody, 'asset_tag'>> & { asset_tag?: string };

export interface CheckoutBody {
  checkout_to_type: 'user' | 'asset' | 'location';
  assigned_user?: number;
  assigned_asset?: number;
  assigned_location?: number;
  note?: string;
  expected_checkin?: string;
}

export interface Lookups {
  modelId: number;
  modelName: string;
  statusId: number;
  statusName: string;
  userId?: number;
  username?: string;
}
