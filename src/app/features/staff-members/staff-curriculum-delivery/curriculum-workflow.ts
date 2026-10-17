import { StatusTone } from '@shared/components';
import { CurriculumUnit, StaffTeachingAssignment } from '@shared/interfaces';

/** Workflow codes the backend publishes through `GET /workflow-statuses`. */
export type WorkflowCode = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

/** Badge tone and icon per workflow state; the label is the status name the API returns. */
export const WORKFLOW_BADGE: Record<WorkflowCode, { tone: StatusTone; icon: string }> = {
  DRAFT: { tone: 'neutral', icon: 'pi-pencil' },
  SUBMITTED: { tone: 'info', icon: 'pi-send' },
  APPROVED: { tone: 'success', icon: 'pi-check-circle' },
  REJECTED: { tone: 'danger', icon: 'pi-times-circle' },
};

/** Topics from the units of the course offering the chosen teaching assignment teaches. */
export function topicsForTeachingAssignment(
  units: CurriculumUnit[],
  assignments: StaffTeachingAssignment[],
  assignmentId: number | null,
): CurriculumUnit['topics'] {
  const courseOfferingId = assignments.find((item) => item.id === assignmentId)?.courseOfferingId;
  return courseOfferingId
    ? units
        .filter((unit) => unit.courseOfferingId === courseOfferingId)
        .flatMap((unit) => unit.topics)
    : [];
}

export function assignmentLabel(item: StaffTeachingAssignment): string {
  return `${item.staffMemberName} · ${item.subjectName} · ${item.academicGroupName} / ${item.classSectionName}`;
}

/** Trimmed text. A cleared field goes out as `''` so the server clears it, as the old forms did. */
export const optionalText = (value: string): string => value.trim();
