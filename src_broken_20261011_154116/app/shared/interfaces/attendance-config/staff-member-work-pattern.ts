import { WorkMode, WorkPatternDay } from './attendance-config';

/**
 * Weekday rows of a hybrid or fixed arrangement, behind `/api/StaffWorkPattern/*` — where and how
 * the staffMember works on each day of the week.
 *
 * The staffMember is inherited from the parent work arrangement. Read responses expose its public,
 * institution-salted identifier and display name so list rows do not need a second staffMember lookup.
 *
 * One row per weekday per arrangement — the backend rejects a duplicate day.
 */

/** Fields shared by the create and update DTOs and echoed back on reads. */
export interface StaffMemberWorkPatternFields {
  staffMemberWorkArrangementId: number;
  dayOfWeek: WorkPatternDay;
  workMode: WorkMode;
  institutionLocationId: number | null;
  isWorkingDay: boolean;
  isActive: boolean;
}

export interface StaffMemberWorkPatternRow extends StaffMemberWorkPatternFields {
  id: number;
  staffMemberId: string;
  staffMemberName: string;
  institutionLocationName?: string | null;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isUpdatingStatus?: boolean; // NG
  isDeleting?: boolean; // NG
}

/** Query params are PascalCase on this controller. It exposes no `Search`. */
export interface GetStaffMemberWorkPatternsReq {
  StaffMemberWorkArrangementId?: number | null;
  DayOfWeek?: WorkPatternDay | null;
  IsActive?: boolean | null;
  PageNumber?: number | null;
  PageSize?: number | null;
}

export interface GetStaffMemberWorkPatternsRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: StaffMemberWorkPatternRow[];
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface GetStaffMemberWorkPatternRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: StaffMemberWorkPatternRow | null;
}

export type CreateStaffMemberWorkPatternReq = StaffMemberWorkPatternFields;

/** `/update` carries the id in the body and replaces the record, so every field has to be resent. */
export type UpdateStaffMemberWorkPatternReq = CreateStaffMemberWorkPatternReq & { id: number };

export interface UpdateStaffMemberWorkPatternStatusReq {
  id: number;
  isActive: boolean;
}

