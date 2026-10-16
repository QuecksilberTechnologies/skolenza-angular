import { ApiEnvelope } from './common/api-envelope';

/**
 * `/api/Dashboard/SuperAdmin/*` — one endpoint per Admin dashboard widget.
 *
 * Every response is the standard envelope; only the Institution Super-Admin role type gets a 200, every
 * other caller a 403.
 */
export interface SuperAdminDashboardRes<T> extends ApiEnvelope<T> {
  errors: string[];
}

export interface SuperAdminSummary {
  totalStaffMembers: number;
  newHiresThisMonth: number;
  /** Placeholder value until the recruitment module exists. */
  openPositions: number;
  /** Placeholder value until the approval module exists. */
  pendingApprovals: number;
}

export interface SuperAdminStaffMemberOverview {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
}

/** A Birthdays or Onboarding row. */
export interface SuperAdminDashboardStaffMember {
  /** Encoded id — never derive a numeric id from it. */
  staffMemberId: string;
  staffMemberName: string;
  departmentName: string | null;
  designationName: string | null;
  roleName: string | null;
  /** ISO date-time. Birthdays: the next birthday (not the DOB). Onboarding: the onboarding date. */
  date: string | null;
}

export interface SuperAdminDepartmentHeadcount {
  departmentId: number;
  departmentName: string;
  headcount: number;
}

export interface SuperAdminLeave {
  staffMemberId: string;
  staffMemberName: string;
  departmentName: string | null;
  /** `yyyy-MM-dd` */
  fromDate: string;
  /** `yyyy-MM-dd` */
  toDate: string;
  mobileNumber: string | null;
}

export interface SuperAdminLocation {
  id: number;
  code: string;
  name: string;
  locationType: number;
  isHeadOffice: boolean;
  isActive: boolean;
}

export interface SuperAdminLocationOverview {
  total: number;
  active: number;
  headOffice: number;
  /** Head office first, then by name; capped at the request's `limit`. */
  locations: SuperAdminLocation[];
}

export interface SuperAdminStorageCategory {
  name: string;
  usedGigabytes: number;
}

/** Placeholder values until storage metering exists. */
export interface SuperAdminStorage {
  capacityGigabytes: number;
  usedGigabytes: number;
  categories: SuperAdminStorageCategory[];
}

export interface SuperAdminHiringStage {
  stage: string;
  count: number;
}

/** Placeholder values until the recruitment module exists. */
export interface SuperAdminHiringPipeline {
  totalApplicants: number;
  stages: SuperAdminHiringStage[];
}

/** Backend clamps to 1–366; defaults to 30. */
export interface SuperAdminBirthdaysReq {
  days?: number;
}

/** Backend clamps to 1–50. */
export interface SuperAdminLimitReq {
  limit?: number;
}
