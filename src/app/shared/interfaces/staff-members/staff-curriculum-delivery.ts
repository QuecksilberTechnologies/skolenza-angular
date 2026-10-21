export interface AcademicWorkflowStatusOption {
  id: number;
  code: string;
  name: string;
}
export interface CurriculumFramework {
  id: number;
  academicSessionId: number;
  academicSessionName: string;
  code: string;
  name: string;
  authorityName: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
  workflowStatusId: number;
  workflowStatusName: string;
  isActive: boolean;
}
export type SaveCurriculumFramework = Omit<
  CurriculumFramework,
  'id' | 'academicSessionName' | 'workflowStatusId' | 'workflowStatusName'
> & { id?: number };
export interface CurriculumTopic {
  id: number;
  curriculumUnitId: number;
  code: string;
  name: string;
  description?: string;
  sequence: number;
  plannedPeriods: number;
  learningOutcome?: string;
  isActive: boolean;
}
export interface CurriculumUnit {
  id: number;
  curriculumFrameworkId: number;
  courseOfferingId: number;
  courseOfferingName: string;
  parentCurriculumUnitId?: number;
  code: string;
  name: string;
  description?: string;
  sequence: number;
  plannedPeriods: number;
  learningOutcome?: string;
  isActive: boolean;
}
/** Units come without their topics; `GET units/{unitId}/topics` pages them. */
export type SaveCurriculumUnit = Omit<CurriculumUnit, 'id' | 'courseOfferingName'> & {
  id?: number;
};
export type SaveCurriculumTopic = Omit<CurriculumTopic, 'id'> & { id?: number };
export interface LessonPlan {
  id: number;
  staffTeachingAssignmentId: number;
  staffMemberName: string;
  courseOfferingName: string;
  plannedDate: string;
  periodReference?: string;
  objectives: string;
  teachingMethod?: string;
  resources?: string;
  activities?: string;
  assessment?: string;
  homework?: string;
  workflowStatusId: number;
  workflowStatusName: string;
  isActive: boolean;
  topics: CurriculumTopic[];
}
export interface SaveLessonPlan {
  id?: number;
  staffTeachingAssignmentId: number;
  plannedDate: string;
  periodReference?: string;
  objectives: string;
  teachingMethod?: string;
  resources?: string;
  activities?: string;
  assessment?: string;
  homework?: string;
  isActive: boolean;
  curriculumTopicIds: number[];
}
export interface LessonDeliveryCoverage {
  curriculumTopicId: number;
  completionPercent: number;
}
export interface LessonDelivery {
  id: number;
  lessonPlanId: number;
  deliveredDate: string;
  coverageNotes: string;
  homework?: string;
  evidenceReference?: string;
  exceptionReason?: string;
  replanAction?: string;
  workflowStatusId: number;
  workflowStatusName: string;
  isActive: boolean;
  coverage: LessonDeliveryCoverage[];
}
export type SaveLessonDelivery = Omit<
  LessonDelivery,
  'id' | 'workflowStatusId' | 'workflowStatusName'
> & { id?: number };
export interface WorkflowReview {
  workflowStatusId: number;
  remark?: string;
}
export interface SyllabusProgress {
  curriculumFrameworkId: number;
  curriculumFrameworkName: string;
  courseOfferingId: number;
  courseOfferingName: string;
  curriculumUnitId: number;
  curriculumUnitName: string;
  topicCount: number;
  completionPercent: number;
}
