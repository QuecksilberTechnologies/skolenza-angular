import { WorkMode, WorkModeOverrideApprovalStatus } from './attendance-config';

/**
 * Temporary work-mode exceptions behind `/api/StaffWorkModeOverride/*` — a date range where the
 * staffMember works differently without touching the permanent `StaffMemberWorkArrangement`.
 *
 * Note the controller is `StaffMemberWorkModeOverride`, not `StaffMemberWorkModeOverrideRequest` as the
 * spec document calls it.
 *
 * New requests are Pending until an authorised user approves or rejects them.
 */

/** Fields shared by the create and update DTOs and echoed back on reads. */
export interface StaffMemberWorkModeOverrideFields {
  staffMemberId: string;
  staffMemberWorkArrangementId: number | null;
  requestedWorkMode: WorkMode;
  /** `yyyy-MM-dd` */
  fromDate: string;
  /** `yyyy-MM-dd` */
  toDate: string;
  institutionLocationId: number | null;
  reason: string | null;
  isActive: boolean;
}

export interface StaffMemberWorkModeOverrideRow extends StaffMemberWorkModeOverrideFields {
  id: number;
  /** Server-owned — the update DTO cannot change it. */
  approvalStatus?: WorkModeOverrideApprovalStatus | null;
  approvedById?: number | null;
  approvedDateTime?: string | null;
  staffMemberName?: string | null;
  staffMemberCode?: string | null;
  institutionLocationName?: string | null;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isUpdatingStatus?: boolean; // NG
  isDeleting?: boolean; // NG
  isDeciding?: boolean; // NG
}

/** Query params are PascalCase on this controller. */
export interface GetStaffMemberWorkModeOverridesReq {
  Search?: string | null;
  StaffMemberId?: string | null;
  RequestedWorkMode?: WorkMode | null;
  ApprovalStatus?: WorkModeOverrideApprovalStatus | null;
  /** `yyyy-MM-dd` */
  FromDate?: string | null;
  /** `yyyy-MM-dd` */
  ToDate?: string | null;
  IsActive?: boolean | null;
  PageNumber?: number | null;
  PageSize?: number | null;
}

export interface GetStaffMemberWorkModeOverridesRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: StaffMemberWorkModeOverrideRow[];
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface GetStaffMemberWorkModeOverrideRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: StaffMemberWorkModeOverrideRow | null;
}

export type CreateStaffMemberWorkModeOverrideReq = StaffMemberWorkModeOverrideFields;

/** `/update` carries the id in the body and replaces the record, so every field has to be resent. */
export type UpdateStaffMemberWorkModeOverrideReq = CreateStaffMemberWorkModeOverrideReq & { id: number };

export interface UpdateStaffMemberWorkModeOverrideStatusReq {
  id: number;
  isActive: boolean;
}

export interface StaffMemberWorkModeOverrideDecisionReq {
  id: number;
  remark?: string | null;
}

