import { HybridType, WorkMode } from './attendance-config';

/**
 * An staffMember's permanent working arrangement behind `/api/StaffWorkArrangement/*` — work mode,
 * governing attendance policy, primary location, and the hybrid day quotas.
 *
 * ASSUMED CONTRACT — swagger publishes the request DTOs and query params but no response schema, so
 * the row, the envelope, and the `staffMemberName` / `attendancePolicyName` /
 * `primaryCampusName` display fields are assumed from the house convention. Templates guard
 * them with `?? '-'`.
 *
 * An staffMember holds **at most one current active arrangement**, and creating another does not
 * replace the existing one — the backend rejects it. Deleting one is rejected while
 * `StaffMemberWorkPattern` or `StaffMemberWorkModeOverride` children exist.
 */

/** Fields shared by the create and update DTOs and echoed back on reads. */
export interface StaffMemberWorkArrangementFields {
  staffMemberId: string;
  policyVersionId: number;
  primaryCampusId: number | null;
  workMode: WorkMode;
  hybridType: HybridType | null;
  minimumOfficeDaysPerWeek: number | null;
  minimumOfficeDaysPerMonth: number | null;
  maximumWFHDaysPerMonth: number | null;
  /** `yyyy-MM-dd` */
  effectiveFrom: string;
  /** `yyyy-MM-dd` */
  effectiveTo: string | null;
  isActive: boolean;
}

export interface StaffMemberWorkArrangementRow extends StaffMemberWorkArrangementFields {
  id: number;
  staffMemberName?: string | null;
  staffMemberCode?: string | null;
  attendancePolicyName?: string | null;
  primaryCampusName?: string | null;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isUpdatingStatus?: boolean; // NG
  isDeleting?: boolean; // NG
}

/** Query params are PascalCase on this controller. It exposes no `Search`. */
export interface GetStaffMemberWorkArrangementsReq {
  StaffMemberId?: string | null;
  PolicyVersionId?: number | null;
  PrimaryCampusId?: number | null;
  WorkMode?: WorkMode | null;
  IsActive?: boolean | null;
  PageNumber?: number | null;
  PageSize?: number | null;
}

export interface GetStaffMemberWorkArrangementsRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: StaffMemberWorkArrangementRow[];
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface GetStaffMemberWorkArrangementRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: StaffMemberWorkArrangementRow | null;
}

export type CreateStaffMemberWorkArrangementReq = StaffMemberWorkArrangementFields;

/** `/update` carries the id in the body and replaces the record, so every field has to be resent. */
export type UpdateStaffMemberWorkArrangementReq = CreateStaffMemberWorkArrangementReq & { id: number };

/**
 * `GET /attendance-policy-options` — the arrangement form's policy dropdown. Needs no
 * `ModuleId` / `OperationId`. The UI sends `EffectiveOn`: each policy comes back as its highest
 * Published version whose window contains that date.
 */
export interface GetAttendancePolicyOptionsReq {
  /** `yyyy-MM-dd` */
  EffectiveOn: string;
  Search?: string | null;
}

/**
 * The exact Published policy version is persisted by Work Arrangement create/update.
 */
export interface AttendancePolicyOption {
  policyId: number;
  policyVersionId: number;
  policyCode: string;
  policyName: string;
  policyTypeId: number;
  policyTypeCode: string;
  policyTypeName: string;
  versionNumber?: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  displayName: string;
}

export interface GetAttendancePolicyOptionsRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: AttendancePolicyOption[] | null;
}

export interface UpdateStaffMemberWorkArrangementStatusReq {
  id: number;
  isActive: boolean;
}

