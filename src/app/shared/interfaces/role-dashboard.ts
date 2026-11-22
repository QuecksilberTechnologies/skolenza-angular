import { ApiEnvelope } from './common/api-envelope';
import {
  SuperAdminDashboardStaffMember,
  SuperAdminDepartmentHeadcount,
  SuperAdminStaffMemberOverview,
  SuperAdminHiringPipeline,
  SuperAdminLeave,
  SuperAdminLocationOverview,
  SuperAdminStorage,
  SuperAdminSummary,
} from './super-admin-dashboard';

/**
 * `GET /api/Dashboard/{roleTypeCode}` — the whole dashboard for one role type in a single call.
 * Only the block matching the caller's role type is populated; the others are absent or null.
 */
export type RoleDashboardCode =
  | 'INSTITUTION_ADMIN'
  | 'STAFF_MANAGER'
  | 'STAFF_MEMBER'
  | 'EXTERNAL_USER';

export interface RoleDashboardRes extends ApiEnvelope<RoleDashboardData | null> {
  errors: string[] | null;
}

export interface RoleDashboardData {
  roleTypeCode: string | null;
  roleTypeName: string | null;
  /** ISO date-time. */
  generatedAtUtc: string;
  institutionAdministrator?: InstitutionAdministratorDashboard | null;
  staffManager?: StaffManagerDashboard | null;
  staffMember?: StaffMemberDashboard | null;
  externalUser?: ExternalUserDashboard | null;
}

/** Every widget is wrapped so the UI can flag values the backend still fakes. */
export interface DashboardSection<T> {
  data: T;
  source: string | null;
  isPlaceholder: boolean;
  placeholderFields: string[] | null;
}

export interface DashboardMetric {
  code: string | null;
  label: string | null;
  value: number;
  unit: string | null;
}

export interface DashboardMetricCollection {
  metrics: DashboardMetric[] | null;
}

export interface DashboardWidgetItem {
  code: string | null;
  title: string | null;
  subtitle: string | null;
  status: string | null;
  date: string | null;
}

export interface NoticePeriodStaffMember {
  code: string | null;
  staffMemberName: string | null;
  departmentName: string | null;
  positionName: string | null;
  /** `yyyy-MM-dd` */
  expectedLastWorkingDate: string;
  noticeDaysRemaining: number;
  status: string | null;
}

export interface RecentExitedStaffMember {
  staffMemberId: string | null;
  staffMemberName: string | null;
  departmentName: string | null;
  positionName: string | null;
  /** ISO date-time. */
  dateOfExit: string;
}

export interface LocationFeeSummary {
  locationId: number;
  locationName: string | null;
  totalStudents: number;
  /** Amount due for the period across every student at the location. */
  expectedAmount: number;
  collectedAmount: number;
  fullyPaidCount: number;
  partiallyPaidCount: number;
  notPaidCount: number;
}

export interface FeeCollectionSummary {
  /** `yyyy-MM` */
  period: string;
  /** ISO 4217, e.g. `INR`. */
  currencyCode: string | null;
  locations: LocationFeeSummary[] | null;
}

export interface MonthlyPayrollSummary {
  /** `yyyy-MM` */
  month: string;
  totalStaff: number;
  paidCount: number;
  /** Net salary already disbursed for the month. */
  paidAmount: number;
  /** Net salary still owed to staff not yet paid. */
  pendingAmount: number;
}

export interface DashboardPayrollSummary {
  /** ISO 4217, e.g. `INR`. */
  currencyCode: string | null;
  /** Newest month first. */
  months: MonthlyPayrollSummary[] | null;
}

export interface InstitutionAdministratorDashboard {
  summary: DashboardSection<SuperAdminSummary>;
  staffMemberOverview: DashboardSection<SuperAdminStaffMemberOverview>;
  currentlyOnLeave: DashboardSection<SuperAdminLeave[] | null>;
  staffMembersOnNotice: DashboardSection<NoticePeriodStaffMember[] | null>;
  exitedStaffMembers: DashboardSection<RecentExitedStaffMember[] | null>;
  locations: DashboardSection<SuperAdminLocationOverview>;
  upcomingBirthdays: DashboardSection<SuperAdminDashboardStaffMember[] | null>;
  recentOnboarding: DashboardSection<SuperAdminDashboardStaffMember[] | null>;
  departmentHeadcount: DashboardSection<SuperAdminDepartmentHeadcount[] | null>;
  storageStatus: DashboardSection<SuperAdminStorage>;
  hiringPipeline: DashboardSection<SuperAdminHiringPipeline>;
  /**
   * Proposed contract, not yet served by the backend (checked against Swagger 2026-11-22).
   * Optional so the dashboard keeps working until it ships.
   */
  feeCollection?: DashboardSection<FeeCollectionSummary | null> | null;
  /** Proposed contract, not yet served by the backend. Only sent to Payroll-permitted callers. */
  payrollSummary?: DashboardSection<DashboardPayrollSummary | null> | null;
}

export interface StaffManagerDashboard {
  teamSummary: DashboardSection<DashboardMetricCollection>;
  teamAttendance: DashboardSection<DashboardMetricCollection>;
  teamMembersOnNotice: DashboardSection<NoticePeriodStaffMember[] | null>;
  teamLeave: DashboardSection<DashboardWidgetItem[] | null>;
  teamBirthdays: DashboardSection<DashboardWidgetItem[] | null>;
  recentTeamOnboarding: DashboardSection<DashboardWidgetItem[] | null>;
}

export interface StaffMemberDashboard {
  myProfile: DashboardSection<DashboardMetricCollection>;
  myAttendance: DashboardSection<DashboardMetricCollection>;
  myLeave: DashboardSection<DashboardMetricCollection>;
  myTasks: DashboardSection<DashboardWidgetItem[] | null>;
  myDocuments: DashboardSection<DashboardWidgetItem[] | null>;
  announcements: DashboardSection<DashboardWidgetItem[] | null>;
}

export interface ExternalUserDashboard {
  clientSummary: DashboardSection<DashboardMetricCollection>;
  openTickets: DashboardSection<DashboardWidgetItem[] | null>;
  recentActivity: DashboardSection<DashboardWidgetItem[] | null>;
  clientSiteStaffMembers: DashboardSection<DashboardWidgetItem[] | null>;
  documents: DashboardSection<DashboardWidgetItem[] | null>;
}
