export enum AcademicMasterType {
  Session = 'Session',
  Programme = 'Programme',
  Group = 'Group',
  Section = 'Section',
  Subject = 'Subject',
  CourseOffering = 'CourseOffering',
}

export interface AcademicMaster {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  campusId?: number;
  parentId?: number;
  academicSessionId?: number;
  academicSessionName?: string;
  academicProgrammeId?: number;
  academicProgrammeName?: string;
  academicGroupId?: number;
  academicGroupName?: string;
  subjectId?: number;
  subjectName?: string;
  type: number;
  startDate?: string;
  endDate?: string;
  level?: string;
  capacity?: number;
  curriculumVersion?: string;
  requiredPeriodsPerWeek?: number;
}

export interface TeachingAssignmentTypeOption {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export type SaveAcademicMaster = Omit<
  AcademicMaster,
  'id' | 'academicSessionName' | 'academicProgrammeName' | 'academicGroupName' | 'subjectName'
> & { id?: number };

export interface StaffTeachingAssignment {
  id: number;
  staffMemberName: string;
  courseOfferingId: number;
  courseOfferingName: string;
  subjectName: string;
  classSectionId: number;
  classSectionName: string;
  academicGroupName: string;
  assignmentType: number;
  assignmentTypeName: string;
  contributionPercent: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface ClassTeacherAssignment {
  id: number;
  classSectionId: number;
  classSectionName: string;
  academicGroupName: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface StaffAcademicProfile {
  teachingAssignments: StaffTeachingAssignment[];
  classTeacherAssignments: ClassTeacherAssignment[];
}

export interface SaveTeachingAssignment {
  id?: number;
  staffMemberId: string;
  courseOfferingId: number;
  classSectionId: number;
  assignmentType: number;
  contributionPercent: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface SaveClassTeacherAssignment {
  id?: number;
  staffMemberId: string;
  classSectionId: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isPrimary: boolean;
  isActive: boolean;
}
