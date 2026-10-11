export interface CreateStaffMemberReq {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  dateOfOnBoarding: string;
  officialEmail: string;
  departmentId: number;
  designationId: number;
  staffEmploymentTypeId: number;
  roleId: number;
  genderId: number;
  referalId: number;
  userStaffMemberId?: string;
  staffMemberDocumentId: number;
  countryId: number;
  isActive: boolean;
  hasPermanent: boolean;
}

export interface CreateStaffMemberRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IStaffMember;
}

export interface UpdateStaffMemberReq {
  staffMemberId: string;
  fieldName: string;
  fieldValue: string;
  entityName: string;
  id: number;
  updatedById: number;
}

export interface UpdateStaffMemberRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IStaffMember[];
}

export interface DeleeteStaffMemberReq {
  UserStaffMemberId: string;
  StaffMemberId: string;
}

export interface GetAllStaffMembersReq {
  UserStaffMemberId: string;
  Id?: string;
  EmployementCode?: string;
  FirstName?: string;
  LastName?: string;
  DateOfBirth?: string;
  DateOfOnBoarding?: string;
  GenderId?: number;
  IsMarried?: boolean;
  DepartmentId?: number;
  DesignationId?: number;
  StaffEmploymentTypeId?: number;
  EmailId?: string;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string | string[] | null | undefined;
  SortOrder?: string;
}

export interface GetAllStaffMembersRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IStaffMember[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface IStaffMember {
  staffMemberId: string;
  employementCode: string;
  lastName: string;
  middleName: string;
  firstName: string;
  genderId: number;
  genderName: string;
  countryId: number;
  nationality: string;
  dateOfBirth: string;
  dateOfOnBoarding: string;
  departmentId: number;
  departmentName: string;
  designationId: number;
  designationName: string;
  staffEmploymentTypeId: number;
  staffEmploymentTypeName: string;
  officialEmail: string;
  countryCode: string;
  mobileNumber?: string;
  emergencyContactPerson?: string;
  isActive: boolean;
  staffMemberImagePath?: string;
  completionPercentage: number;
  hasImagePicUploaded: boolean;
  summaryStaffMemberInfo: SummaryStaffMemberInfo;
  assignedRoles?: import('../role').AssignedRole[];
  isUpdatingStatus: boolean; // NG
  roleId?: number; // NG
  roleName?: string; // NG
  isAssigningRole?: boolean; // NG
  userRoles?: import('../role').UserRole[]; // NG - multi-role
}

export interface SummaryStaffMemberInfo {
  emergencyContactPerson?: string;
  emergencyContactNumber?: string;
  staffMemberCode: string;
  bloodGroup?: string;
  mobileNumber?: string;
  personalEmail: string;
  countryCode: string;
  relation?: number;
  relationName: string;
  isActive: boolean;
  isMarried?: boolean;
  onlineStatus: string;
  lastLoginDateTime: string;
  currentSalaryStatusId: number;
  currentSalaryStatusRemark: string;
  roleId: number;
  roleType: string;
  designationId: number;
  designation: string;
  departmentId: number;
  department: string;
  profileImage?: string;
  city?: string;
  address?: string;
  dateOfJoining: string;
  staffEmploymentTypeId: number;
  staffEmploymentTypeName: string;
}

export interface AppliedStaffMemberFilter {
  departmentId: string;
  designationId: string;
  staffEmploymentTypeId?: string;
}

// Get All Percentag
export interface GetAllPercentageReq {
  staffMemberId: string;
}

export interface GetAllPercentageRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: CompletionPercentage[];
  hasAllDocUploaded: boolean;
}

export interface CompletionPercentage {
  sectionName: string;
  completionPercent?: number;
  isInfoVerified?: boolean;
  isEditAllowed?: boolean;
  isSectionCreate: boolean;
}

export interface UpdateBulkReq {
  userStaffMemberId: string;
  staffMemberId: string;
  sections: UpdateBulkReqSec[];
  isActive: boolean;
}

export interface UpdateBulkReqSec {
  tabInfoType: number;
  isVerified: boolean;
  isEditAllowed: boolean;
}

export interface UpdateBulkRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: boolean;
}

export interface UpdateStaffMemberUpdateStatusReq {
  UserStaffMemberId: string;
  StaffMemberId: string;
  IsActive: boolean;
}

export interface StaffMemberStatistic {
  totalCount: number;
  activeCount: number;
  inActiveCount: number;
  onLeaveCount: number;
}

export interface GetStaffMemberStatisticsReq {
  UserStaffMemberId: string;
}

export interface GetStaffMemberStatisticsRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: StaffMemberStatistic;
}

export interface StaffMemberStatistic {
  totalCount: number;
  activeCount: number;
  inActiveCount: number;
  onLeaveCount: number;
}

export interface GetStaffMemberSummaryReq {
  StaffMemberId: string;
  IsActive: boolean;
}

export interface GetStaffMemberSummaryRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: SummaryStaffMemberInfo;
}

/** `moduleId` / `operationId` are added by `moduleOperationInterceptor`, not by the caller. */
export interface ResetStaffMemberPasswordReq {
  staffMemberId: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetStaffMemberPasswordRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: unknown;
}

export interface IStaffMemberFilter {
  staffMemberId?: string;
  staffMemberName?: string;
  staffEmploymentType?: number;
  designation?: number;
  department?: number;
  documentStatus?: number;
  staffMemberStatus?: number;
}

/**
 * Body of `POST /Staff/section-defaults`.
 *
 * Institution-wide, not per staffMember: it carries no staffMember id, so it sets whether a section is
 * editable by default rather than unlocking one person's record - that is what
 * `/Staff/update-edit-status` does, keyed by `tabInfoType`.
 *
 * `moduleId` names which section the default applies to (Work Locations, Devices, Work
 * Arrangement, Work Pattern or Overrides), so it is resolved per call from the permission tree and
 * sent in the body rather than stamped: `StaffMember` is deliberately absent from the interceptor's
 * controller fallback because one StaffMember URL can serve two modules.
 */
export interface UpdateStaffMemberSectionDefaultsReq {
  moduleId?: number;
  operationId?: number;
  isEditAllowed: boolean;
}

