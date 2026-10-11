import { DeviceCommunicationType } from './device';

/**
 * Connection settings for a institution device, behind `/api/InstitutionDeviceConfiguration/*`.
 *
 * A device row (`InstitutionDevice`) carries the same connection fields inline; this controller keeps a
 * separate, replaceable configuration record per device so the connection can be re-pointed without
 * touching the device's identity, purchase and warranty data.
 *
 * Swagger publishes the request DTOs only; the row and the envelope below are transcribed from a
 * live `get-all` response. The read model carries the device's own name and model alongside the
 * connection telemetry, and each row's own `institutionId` but no institution name.
 */

/** Fields shared by the create and update DTOs and echoed back on reads. */
export interface InstitutionDeviceConfigurationFields {
  institutionId: string;
  /** Opaque token, not the numeric database id — see `InstitutionDeviceRow.id`. */
  institutionDeviceId: string;
  ipAddress: string | null;
  macAddress: string | null;
  devicePort: number | null;
  communicationType: DeviceCommunicationType;
  serverHost: string | null;
  serverPort: number | null;
  serverPath: string | null;
  serverUrl: string | null;
  pushMode: string | null;
  heartbeatIntervalSeconds: number | null;
  timeZoneId: string | null;
  configuration: string | null;
  isEnrollmentEnabled: boolean;
  isAttendancePushEnabled: boolean;
  isAutoSyncEnabled: boolean;
}

export interface InstitutionDeviceConfigurationRow extends InstitutionDeviceConfigurationFields {
  id: number;
  /** Device identity, joined in by `get-all` — the create/update DTOs never carry these. */
  deviceName?: string | null;
  deviceCode?: string | null;
  deviceMasterName?: string | null;
  deviceMasterSNo?: string | null;
  /** Connection telemetry, written by the device rather than the form. */
  lastHeartbeatDateTime?: string | null;
  lastSyncDateTime?: string | null;
  lastAttendanceReceivedDateTime?: string | null;
  lastSuccessfulConnectionDateTime?: string | null;
  lastFailedConnectionDateTime?: string | null;
  lastConnectionError?: string | null;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isDeleting?: boolean; // NG
}

/** Query params are PascalCase on this controller. */
export interface GetInstitutionDeviceConfigurationsReq {
  Search?: string | null;
  InstitutionDeviceId?: string | null;
  CommunicationType?: DeviceCommunicationType | null;
  IsEnrollmentEnabled?: boolean | null;
  PageNumber?: number | null;
  PageSize?: number | null;
  /** Optional filter - omitting it lists every institution's configurations. */
  InstitutionId?: string | null;
}

export interface GetInstitutionDeviceConfigurationsRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: InstitutionDeviceConfigurationRow[];
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface GetInstitutionDeviceConfigurationRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: InstitutionDeviceConfigurationRow | null;
}

export type CreateInstitutionDeviceConfigurationReq = InstitutionDeviceConfigurationFields;

/** `/update` carries the id in the body and replaces the record, so every field has to be resent. */
export type UpdateInstitutionDeviceConfigurationReq = CreateInstitutionDeviceConfigurationReq & {
  id: number;
};

/**
 * `POST /issue-bootstrap-url` - the one-time credential an unconfigured device needs before it can
 * reach Skolenza at all.
 *
 * The Host issues it and transcribes the URL into the hardware by hand; the device never calls this
 * endpoint, and the API will not return the URL a second time.
 */
export interface IssueBootstrapUrlReq {
  /** `DeviceMaster.id` - the physical unit, carried on every `InstitutionDeviceRow`. */
  deviceMasterId: number;
  lifetimeMinutes: number;
}

export interface BootstrapUrlData {
  /** `DeviceMaster.sNo`, joined in by the issuing endpoint. */
  deviceSerialNumber: string | null;
  /** Carries the secret. Shown once, never persisted and never logged. */
  initialGatewayUrl: string | null;
  heartbeatIntervalSeconds: number | null;
  /** Full ISO date-time. */
  expiresDateTime: string | null;
}

export interface IssueBootstrapUrlRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: BootstrapUrlData | null;
}

/**
 * `POST /rotate-https-ingress-token` - reissues the gateway URL's bearer token when it may have
 * leaked, ownership changes, or policy requires rotation. Host identifies the target by
 * `institutionDeviceConfigurationId`; Institution may identify by either field, whichever it already has on
 * hand. The API will not reissue the same URL again.
 */
export interface RotateHttpsIngressTokenReq {
  institutionDeviceConfigurationId: number | null;
  institutionDeviceId: string | null;
}

export interface RotateHttpsIngressTokenData {
  /** Carries the secret. Shown once, never persisted and never logged. */
  gatewayUrl: string | null;
}

export interface RotateHttpsIngressTokenRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: RotateHttpsIngressTokenData | null;
}

/**
 * `GET /InstitutionDeviceConfiguration/gateway-address/{institutionDeviceId}` - safe metadata only.
 *
 * Deliberately never carries the active gateway URL or its trailing bearer token: the token is
 * stored only as a hash. `isReplacementPending` with `replacementExpiresDateTime` is what a screen
 * shows while a remote replacement waits for the device's first poll on the new address.
 */
export interface DeviceGatewayAddress {
  institutionDeviceId: string;
  serverUrl: string | null;
  serverPath: string | null;
  serverPort: number | null;
  hasActiveGatewayUrl: boolean;
  isReplacementPending: boolean;
  replacementExpiresDateTime: string | null;
}

export interface GetDeviceGatewayAddressRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: DeviceGatewayAddress | null;
}
