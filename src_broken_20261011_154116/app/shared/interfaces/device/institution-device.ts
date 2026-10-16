/**
 * Physical devices assigned to a institution location, behind `/api/InstitutionDevice/*`.
 *
 * The request DTOs and query params below are transcribed from swagger; the row and the envelope
 * come from a live `get-all` response. Connection settings (IP, ports, server, sync flags) are NOT
 * part of this controller — they live on `InstitutionDeviceConfiguration`, one replaceable record per
 * device.
 */

/** Fields shared by the create and update DTOs and echoed back on reads. */
export interface InstitutionDeviceFields {
  institutionId: string;
  institutionLocationId: number;
  deviceMasterId: number;
  deviceCode: string | null;
  deviceName: string | null;
  /** Full ISO date-time. */
  installedDateTime: string | null;
  /**
   * StaffMember id (`int64`), not a name. No institution-scoped staffMember lookup exists for a host session,
   * so the form carries this through untouched rather than rendering an input.
   */
  installedBy: number | null;
  installationRemark: string | null;
  isAttendanceDevice: boolean;
  description: string | null;
  remark: string | null;
  isActive: boolean;
}

export interface InstitutionDeviceRow extends InstitutionDeviceFields {
  /** An opaque token (`"0EQY4NDX"`), not a number - see `IInstitution.id`. */
  id: string;
  /** Joined in by the read endpoints; the create/update DTOs never carry these. */
  institutionName?: string | null;
  institutionLocationName?: string | null;
  locationCode?: string | null;
  deviceMasterName?: string | null;
  deviceMasterModelNo?: string | null;
  /** Whether a `InstitutionDeviceConfiguration` record points at this device. */
  hasConfiguration?: boolean;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isUpdatingStatus?: boolean; // NG
  isDeleting?: boolean; // NG
}

/** Query params are PascalCase on this controller. */
export interface GetInstitutionDevicesReq {
  Search?: string | null;
  /** Optional filter - omitting it lists every institution's devices. */
  InstitutionId?: string | null;
  InstitutionLocationId?: number | null;
  DeviceMasterId?: number | null;
  IsAttendanceDevice?: boolean | null;
  IsActive?: boolean | null;
  PageNumber?: number | null;
  PageSize?: number | null;
}

export interface GetInstitutionDevicesRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: InstitutionDeviceRow[];
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface GetInstitutionDeviceRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: InstitutionDeviceRow | null;
}

export type CreateInstitutionDeviceReq = InstitutionDeviceFields;

/** `/update` carries the id in the body and replaces the record, so every field has to be resent. */
export type UpdateInstitutionDeviceReq = CreateInstitutionDeviceReq & { id: string };

export interface UpdateInstitutionDeviceStatusReq {
  id: string;
  isActive: boolean;
  /** Scopes the write the same way `get-by-id` and `delete` are scoped. */
  institutionId: string | null;
}

/**
 * `POST /InstitutionDevice/update-location`. Moves an assigned device to another Institution location and
 * nothing else - it cannot touch the Host inventory's `DeviceMaster` assignment.
 *
 * Existing staffMember enrollments are **not** moved, disabled or revalidated by the backend, so the
 * screen warns about them after a successful move
 * (`docs/specs/device-configuration/skolenza-device-angular-handoff.md`).
 */
export interface UpdateInstitutionDeviceLocationReq {
  institutionId: string;
  /** The opaque token, not the numeric row id. */
  institutionDeviceId: string;
  institutionLocationId: number;
}
