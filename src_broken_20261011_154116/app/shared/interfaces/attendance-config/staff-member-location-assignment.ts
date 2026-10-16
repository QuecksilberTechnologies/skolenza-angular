import { ModuleOperationIdFields } from '../module-operation-ids';

/**
 * Which institution locations an staffMember may work from, behind `/api/StaffCampusAssignment/*`.
 * One assignment may be flagged primary; the rest are additional allowed sites.
 *
 * ASSUMED CONTRACT — swagger publishes the request DTOs and query params but no response schema, so
 * the row, the envelope, and the `staffMemberName` / `institutionLocationName` display fields are assumed
 * from the house convention. Templates guard them with `?? '-'`.
 */

/** Fields shared by the create and update DTOs and echoed back on reads. */
export interface StaffMemberLocationAssignmentFields {
  staffMemberId: string;
  institutionLocationId: number;
  isPrimary: boolean;
  isAttendanceAllowed: boolean;
  /** `yyyy-MM-dd` */
  effectiveFrom: string;
  /** `yyyy-MM-dd` */
  effectiveTo: string | null;
  isActive: boolean;
}

export interface StaffMemberLocationAssignmentRow extends StaffMemberLocationAssignmentFields {
  id: number;
  staffMemberName?: string | null;
  staffMemberCode?: string | null;
  institutionLocationName?: string | null;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isUpdatingStatus?: boolean; // NG
  isDeleting?: boolean; // NG
}

/** Query params are PascalCase on this controller. It exposes no `Search`. */
export interface GetStaffMemberLocationAssignmentsReq {
  StaffMemberId?: string | null;
  InstitutionLocationId?: number | null;
  IsPrimary?: boolean | null;
  IsActive?: boolean | null;
  PageNumber?: number | null;
  PageSize?: number | null;
}

export interface GetStaffMemberLocationAssignmentsRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: StaffMemberLocationAssignmentRow[];
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface GetStaffMemberLocationAssignmentRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: StaffMemberLocationAssignmentRow | null;
}

export type CreateStaffMemberLocationAssignmentReq = StaffMemberLocationAssignmentFields &
  ModuleOperationIdFields;

/** `/update` carries the id in the body and replaces the record, so every field has to be resent. */
export type UpdateStaffMemberLocationAssignmentReq = CreateStaffMemberLocationAssignmentReq & {
  id: number;
};

export interface UpdateStaffMemberLocationAssignmentStatusReq extends ModuleOperationIdFields {
  id: number;
  isActive: boolean;
}

