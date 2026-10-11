import { AttendanceLocationScope } from './attendance-config';

/**
 * Institution attendance rules behind `/api/AttendancePolicy/*` — which channels may mark attendance,
 * which location boundary applies, and what needs approval.
 *
 * ASSUMED CONTRACT — swagger publishes the request DTOs and query params but no response schema, so
 * the row, the envelope, and the `policyTypeName` display field are assumed from the house
 * convention. Templates guard them with `?? '-'`.
 *
 * Deactivating or deleting a policy is rejected while an active `StaffMemberWorkArrangement` uses it.
 */

/** Fields shared by the create and update DTOs and echoed back on reads. */
export interface AttendancePolicyFields {
  policyTypeId: number;
  policyName: string | null;
  description: string | null;
  remark: string | null;
  attendanceLocationScope: AttendanceLocationScope;
  allowBiometric: boolean;
  allowMobile: boolean;
  allowWeb: boolean;
  allowManualAttendance: boolean;
  allowWorkFromHome: boolean;
  requireGeoFenceForOffice: boolean;
  requireGpsForRemote: boolean;
  allowOutsideLocationWithApproval: boolean;
  isActive: boolean;
}

export interface AttendancePolicyRow extends AttendancePolicyFields {
  id: number;
  policyTypeName?: string | null;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isUpdatingStatus?: boolean; // NG
  isDeleting?: boolean; // NG
}

/** Query params are PascalCase on this controller. */
export interface GetAttendancePoliciesReq {
  Search?: string | null;
  PolicyTypeId?: number | null;
  IsActive?: boolean | null;
  PageNumber?: number | null;
  PageSize?: number | null;
}

export interface GetAttendancePoliciesRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: AttendancePolicyRow[];
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface GetAttendancePolicyRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: AttendancePolicyRow | null;
}

export type CreateAttendancePolicyReq = AttendancePolicyFields;

/** `/update` carries the id in the body and replaces the record, so every field has to be resent. */
export type UpdateAttendancePolicyReq = CreateAttendancePolicyReq & { id: number };

export interface UpdateAttendancePolicyStatusReq {
  id: number;
  isActive: boolean;
}
