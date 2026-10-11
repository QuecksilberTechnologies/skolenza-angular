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
  | 'PEOPLE_MANAGER'
  | 'WORKFORCE_USER'
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
  peopleManager?: PeopleManagerDashboard | null;
  workforceUser?: WorkforceUserDashboard | null;
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
  designationName: string | null;
  /** `yyyy-MM-dd` */
  expectedLastWorkingDate: string;
  noticeDaysRemaining: number;
  status: string | null;
}

export interface RecentExitedStaffMember {
  staffMemberId: string | null;
  staffMemberName: string | null;
  departmentName: string | null;
  designationName: string | null;
  /** ISO date-time. */
  dateOfExit: string;
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
}

export interface PeopleManagerDashboard {
  teamSummary: DashboardSection<DashboardMetricCollection>;
  teamAttendance: DashboardSection<DashboardMetricCollection>;
  teamMembersOnNotice: DashboardSection<NoticePeriodStaffMember[] | null>;
  teamLeave: DashboardSection<DashboardWidgetItem[] | null>;
  teamBirthdays: DashboardSection<DashboardWidgetItem[] | null>;
  recentTeamOnboarding: DashboardSection<DashboardWidgetItem[] | null>;
}

export interface WorkforceUserDashboard {
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
