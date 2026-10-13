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
}
export type SaveTimetableEntry = Omit<
  TimetableEntry,
  'sectionName' | 'courseOfferingName' | 'periodName' | 'teacherName'
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

export interface CommunicationSetting {
  enableInApp: boolean;
  enableEmail: boolean;
  enableSms: boolean;
  enablePush: boolean;
  retentionDays: number;
}
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
export interface CreateStaffConversation {
  conversationTypeCode: 'DIRECT' | 'QUERY' | 'BROADCAST';
  staffQueryCategoryMasterId?: number;
  subject: string;
  initialMessage: string;
  participantStaffMemberIds: number[];
  audiences: StaffAudience[];
}
