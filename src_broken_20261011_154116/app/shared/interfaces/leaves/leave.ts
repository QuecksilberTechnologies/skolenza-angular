import { LucideIconData } from 'lucide-angular';

export interface LeaveMutationRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: unknown;
}

export interface SubmitLeaveRequestPayload {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  duration: string;
  reason: string;
  documentUrl?: string | null;
}

export interface ILeaveTypeCard {
  id: number;
  name: string;
  description: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  available: number | null;
  consumed: number | null;
  total: number | null;
  isActive: boolean;
  isComingSoon: boolean;
  showDetails: boolean;
}

export interface IUpcomingLeave {
  id: number;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  statusColor: string;
  days: number;
}

export interface ILeaveData {
  leaveTypes: ILeaveTypeCard[];
  upcomingLeaves: IUpcomingLeave[];
  leaveHistory: ILeave[];
}

export interface GetMyLeavesRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: ILeaveData;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface GetRequestedLeavesRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: ILeaveRequest[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface GetLeaveBalancesRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: ILeaveBalance[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface GetLeaveStatusRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: ILeaveStatus[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface LeaveState {
  // My Leaves
  leaveTypeCards: ILeaveTypeCard[];
  upcomingLeaves: IUpcomingLeave[];
  leaveHistory: ILeave[];
  isLoadingMyLeaves: boolean;

  // Requested Leaves
  leaveRequests: ILeaveRequest[];
  totalRequestRecords: number;
  isLoadingRequests: boolean;

  // Leave Balances
  leaveBalances: ILeaveBalance[];
  totalBalanceRecords: number;
  isLoadingBalances: boolean;

  // Leave Status
  leaveStatus: ILeaveStatus[];
  isLoadingStatus: boolean;

  // Leave Types (admin CRUD)
  leaveTypes: ILeaveType[];
  isLoadingTypes: boolean;

  // Leave Rules (admin CRUD)
  leaveRules: ILeaveRule[];
  isLoadingRules: boolean;
}

export interface ILeave {
  id: number;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  statusText: string;
  statusColor: string;
  approvedBy?: string | null;
  appliedOn?: string;
}

export interface ILeaveRequest {
  id: number;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  statusText: string;
  statusColor: string;
  staffMember: string;
  staffMemberEmail: string;
  staffMemberCode?: string;
  isAccepted: boolean;
  isRejected: boolean;
  isCancelled?: boolean;
  decidedAt?: string | null;
  rejectionReason?: string | null;
}

export interface ILeaveStatus {
  id: number;
  institutionId: number;
  statusName: string;
  description: string;
  isActive: boolean;
  color?: string;
}

export interface ILeaveDuration {
  name: string;
  value: string;
  icon: LucideIconData;
}

export interface LeaveStatusForm {
  statusName: string;
  color: string;
  description: string;
}

export interface LeaveTypeForm {
  typeName: string;
  description: string;
  leaveTypeIcon: string;
}

export interface ILeaveTypeIcon {
  iconName: string;
  icon?: LucideIconData;
}

export interface ILeaveBalance {
  id: number;
  staffMemberId: number;
  staffMemberName?: string;
  staffMemberEmail?: string;
  vacation: number;
  sick: number;
  personal: number;
  maternity: number;
  paternity: number;
  isActive: boolean;
  icon?: LucideIconData;
}

export interface GetAllLeaveTypesResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: ILeaveType[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface ILeaveType {
  id: number;
  leaveName: string;
  description: string;
  isActive: boolean;
  addedById: number;
  updatedById: null;
}

export interface AddLeaveTypeRequest {
  staffMemberId: string;
  roleId: number;
  //   institutionId: number;
  leaveName: string;
  description: string;
  uploadIcon: string | LucideIconData;
  isActive: boolean;
}

export interface UpdateLeaveTypeRequest {
  staffMemberId: string;
  roleId: number;
  //   institutionId: number;
  id: number;
  leaveName: string;
  description: string;
  uploadIcon: string | LucideIconData;
  isActive: boolean;
}

export interface DeleteLeaveTypeRequest {
  id: number;
  roleId: number;
  staffMemberId: string;
}

// Leave Rules
export interface CreateLeaveRuleRequest {
  staffMemberId: string;
  //   institutionId: number;
  policyLeaveTypeId: number;
  applySandwichRule: boolean;
  isHalfDayAllowed: boolean;
  halfDayNoticeHours: number;
  noticePeriodDays: number;
  maxContinuousLeaves: number;
  minGapBetweenLeaves: number;
  isActive: boolean;
  isSoftDeleted?: boolean;
  remark: string;
  addedById?: number;
}

export interface UpdateLeaveRuleRequest {
  staffMemberId: string;
  //   institutionId: number;
  policyLeaveTypeId: number;
  applySandwichRule: boolean;
  isHalfDayAllowed: boolean;
  halfDayNoticeHours: number;
  noticePeriodDays: number;
  maxContinuousLeaves: number;
  minGapBetweenLeaves: number;
  isActive: boolean;
  remark: string;
  updatedById?: number;
}

export interface DeleteLeaveRuleRequest {
  id: number;
  userId: string;
}

export interface GetLeaveRuleResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: ILeaveRule[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface ILeaveRule {
  id: number;
  institutionId: number;
  policyTypeName: string;
  leaveTypeId: number;
  leaveTypeName: string;
  staffEmploymentTypeId: number;
  staffEmploymentTypeName: null;
  applicableGender: string;
  applicableMaritalStatus: string;
  totalLeavesPerYear: number;
  monthlyAccrual: boolean;
  carryForward: boolean;
  encashable: boolean;
  effectiveFrom: Date;
  effectiveTo: Date;
  isActive: boolean;
  remark: string;
}

export interface LeaveRuleForm {
  policyLeaveTypeId: number;
  applySandwichRule: boolean;
  isHalfDayAllowed: boolean;
  halfDayNoticeHours: number;
  noticePeriodDays: number;
  maxContinuousLeaves: number;
  minGapBetweenLeaves: number;
  remark: string;
}

// PolicyMappingLeaveType
export interface PolicyMappingLeaveTypeMapRequest {
  roleId: number;
  staffMemberId: string;
  //   institutionId: number;
  policyTypeId: number;
  leaveTypeId: number;
  staffEmploymentTypeId: number;
  applicableGenderId: number;
  isMarriedApplicable: boolean;
  totalLeavesPerYear: number;
  monthlyAccrual: boolean;
  carryForward: boolean;
  maxCarryForward: number;
  carryForwardExpiryMonths: number;
  encashable: boolean;
  maxEncashable: number;
  isProofRequired: boolean;
  proofDocumentType: string;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
  remark: string;
}

export interface PolicyLeaveTypeMapForm {
  policyTypeId: number;
  leaveTypeId: number;
  applicableGenderId: number;
  isMarriedApplicable: boolean;
  totalLeavesPerYear: number;
  monthlyAccrual: boolean;
  carryForward: boolean;
  maxCarryForward: number;
  carryForwardExpiryMonths: number;
  encashable: boolean;
  maxEncashable: number;
  isProofRequired: boolean;
  proofDocumentType: string;
  effectiveFrom: string;
  effectiveTo: string;
  remark: string;
}

export interface PolicyMappingLeaveTypeMapResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IPolicyMappingLeaveType[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface IPolicyMappingLeaveType {
  id: number;
  institutionId: number;
  policyTypeName: string;
  leaveTypeId: number;
  leaveTypeName: string;
  staffEmploymentTypeId: number;
  isStaffMemberMapped: unknown;
  staffEmploymentTypeName: unknown;
  applicableGenderId?: number;
  isMarriedApplicable?: boolean;
  totalLeavesPerYear: number;
  monthlyAccrual: boolean;
  carryForward: boolean;
  encashable: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
  remark: string;
}

export interface PolicyMappingLeaveTypeUpdateRequest {
  policyLeaveTypeMappingId: number;
  institutionId: number;
  staffMemberId: number;
  assignStaffMemberId: number;
  isActive: boolean;
}

export interface PolicyMappingLeaveTypeDeleteRequest {
  id?: number;
  userId: string;
}
