import { ModuleOperationIdFields, ModuleOperationIds } from '../module-operation-ids';
import { CampusType } from './attendance-config';

/**
 * Institution work sites behind `/api/Campus/*` — head offices, branches, plants, client sites.
 * Parent of `InstitutionDevice`, `StaffMemberLocationAssignment`, `StaffMemberWorkArrangement`,
 * `StaffMemberWorkPattern` and `StaffMemberWorkModeOverride`, so nothing here cascade-deletes.
 *
 * Swagger publishes the request DTOs and query params but no response schema; the row below is
 * taken from a live `get-all` response. It carries no `institutionId` and no audit fields, and
 * `stateName` is always `null` — see `docs/backend-tickets/campus-response-gaps.md`.
 *
 * The list endpoint now declares a `InstitutionId` filter, which the host institution-device screens send —
 * a institution session leaves it off and the token scopes the call. Whether it also lifts the
 * `401 "Inactive user."` a host token gets from this controller is recorded in
 * `docs/api-coverage/api-issues-for-backend.md` Issue 1; until that is settled the two host screens
 * keep narrowing the result client-side on `institutionId` as well.
 */

/** Fields shared by the create and update DTOs and echoed back on reads. */
export interface CampusFields {
  locationCode: string | null;
  locationName: string | null;
  locationType: CampusType;
  countryId: number;
  stateId: number | null;
  districtId: number | null;
  localityId: number | null;
  address: string | null;
  landmark: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  geoFenceRadiusMeters: number | null;
  timeZoneId: string | null;
  isHeadOffice: boolean;
  isGeoFenceEnabled: boolean;
  isAttendanceAllowed: boolean;
  isBiometricEnabled: boolean;
  isActive: boolean;
}

/**
 * Every field past `id` is optional: the host institution-device dropdown only ever reads `id`,
 * `locationName`, `locationCode`, `institutionId` and `isActive` off this row.
 */
export interface CampusRow extends Partial<CampusFields> {
  id: number;
  locationName: string | null;
  isActive: boolean;
  /** Not part of the create DTO — the backend derives it from the calling institution. */
  institutionId?: string | null;
  /** Backend's PascalCase label; the grid renders `GetCampusTypePipe` instead. */
  locationTypeName?: string | null;
  countryName?: string | null;
  /** Comes back `null` even when `stateId` is set — resolve it off the states lookup. */
  stateName?: string | null;
  districtName?: string | null;
  localityName?: string | null;
  isUpdatingStatus?: boolean; // NG
  isDeleting?: boolean; // NG
}

/** Query params are PascalCase on this controller. */
export interface GetCampusesReq extends ModuleOperationIds {
  Search?: string | null;
  CountryId?: number | null;
  StateId?: number | null;
  DistrictId?: number | null;
  LocalityId?: number | null;
  LocationType?: CampusType | null;
  IsActive?: boolean | null;
  PageNumber?: number | null;
  PageSize?: number | null;
  /** Host-only: a institution session omits it and the token scopes the call. */
  InstitutionId?: string | null;
}

export interface GetCampusesRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: CampusRow[];
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface GetCampusRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: CampusRow | null;
}

export type CreateCampusReq = CampusFields & ModuleOperationIdFields;

/** `/update` carries the id in the body and replaces the record, so every field has to be resent. */
export type UpdateCampusReq = CreateCampusReq & { id: number };

export interface UpdateCampusStatusReq extends ModuleOperationIdFields {
  id: number;
  isActive: boolean;
}

