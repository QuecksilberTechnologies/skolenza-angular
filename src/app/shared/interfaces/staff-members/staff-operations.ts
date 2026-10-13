export interface TimetablePeriod {
  id: number;
  academicSessionId: number;
  academicSessionName: string;
  campusId?: number;
  code: string;
  name: string;
  description?: string;
  sequence: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}
export type SaveTimetablePeriod = Omit<TimetablePeriod, 'academicSessionName'>;

export interface TimetableEntry {
  id: number;
  academicSessionId: number;
  classSectionId: number;
  courseOfferingId: number;
  timetablePeriodMasterId: number;
  staffTeachingAssignmentId: number;
  dayOfWeek: number;
  roomReference?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  sectionName: string;
  courseOfferingName: string;
  periodName: string;
  teacherName: string;
  statusCode: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';
  revisionNumber: number;
  currentApprovalSequence: number;
  canEdit: boolean;
  canSubmit: boolean;
  canReview: boolean;
  canPublish: boolean;
  reviewRemark?: string;
}
export type SaveTimetableEntry = Omit<
  TimetableEntry,
  | 'sectionName'
  | 'courseOfferingName'
  | 'periodName'
  | 'teacherName'
  | 'statusCode'
  | 'revisionNumber'
  | 'currentApprovalSequence'
  | 'canEdit'
  | 'canSubmit'
  | 'canReview'
  | 'canPublish'
  | 'reviewRemark'
>;

export interface SubstituteWorkflowStep {
  id?: number;
  sequence: number;
  approverTypeCode: 'MANAGER' | 'ACCESS_ROLE' | 'POSITION' | 'STAFF_MEMBER';
  accessRoleId?: number;
  staffPositionMasterId?: number;
  staffMemberId?: number;
  isActive: boolean;
}
export interface SubstituteWorkflow {
  id: number;
  code: string;
  name: string;
  description?: string;
  requiresSubstituteAcceptance: boolean;
  allowSelfNomination: boolean;
  autoApproveWhenNoSteps: boolean;
  isActive: boolean;
  steps: SubstituteWorkflowStep[];
}
export type SaveSubstituteWorkflow = SubstituteWorkflow;

export interface TimetableWorkflow {
  id: number;
  code: string;
  name: string;
  description?: string;
  campusId?: number;
  classSectionId?: number;
  allowTeacherDraftProposal: boolean;
  autoPublishAfterFinalApproval: boolean;
  isDefault: boolean;
  isActive: boolean;
  steps: SubstituteWorkflowStep[];
}
export type SaveTimetableWorkflow = TimetableWorkflow;

export interface CommunicationSetting {
  enableInApp: boolean;
  enableEmail: boolean;
  enableSms: boolean;
  enablePush: boolean;
  retentionDays: number;
}
export interface StaffQueryCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}
export type SaveStaffQueryCategory = StaffQueryCategory;
export interface StaffAudience {
  audienceTypeCode: 'CAMPUS' | 'DEPARTMENT' | 'STAFF_CATEGORY' | 'ACCESS_ROLE' | 'STAFF_MEMBER';
  targetId: number;
}
export interface StaffConversation {
  id: number;
  conversationTypeCode: 'DIRECT' | 'QUERY' | 'BROADCAST';
  subject: string;
  statusCode: string;
  createdByStaffMemberId: number;
  createdDateTime: string;
  participantCount: number;
  messageCount: number;
  isClosed: boolean;
}
export interface StaffConversationMessage {
  id: number;
  senderStaffMemberId: number;
  senderName: string;
  body: string;
  sentDateTime: string;
}
export interface StaffConversationDetail extends StaffConversation {
  queryCategoryName?: string;
  messages: StaffConversationMessage[];
}
export interface StaffOperationsOption {
  id: number;
  name: string;
}
export interface StaffOperationsOptions {
  staffMembers: StaffOperationsOption[];
  campuses: StaffOperationsOption[];
  departments: StaffOperationsOption[];
  staffCategories: StaffOperationsOption[];
  accessRoles: StaffOperationsOption[];
  staffPositions: StaffOperationsOption[];
}
export interface StaffAbsenceImpact {
  id: number;
  leaveRequestId: number;
  absentStaffMemberId: number;
  absentStaffMemberName: string;
  timetableEntryId: number;
  impactDate: string;
  sectionName: string;
  courseOfferingName: string;
  periodName: string;
  statusCode: string;
  substituteAssignmentId?: number;
  substituteStaffMemberId?: number;
  substituteStaffMemberName?: string;
  substituteStatusCode?: string;
}
export interface SubstituteAssignmentRequest {
  staffAbsenceImpactId: number;
  substituteWorkflowMasterId: number;
  substituteStaffMemberId: number;
  remark?: string;
}
export interface CreateStaffConversation {
  conversationTypeCode: 'DIRECT' | 'QUERY' | 'BROADCAST';
  staffQueryCategoryMasterId?: number;
  subject: string;
  initialMessage: string;
  participantStaffMemberIds: number[];
  audiences: StaffAudience[];
}
