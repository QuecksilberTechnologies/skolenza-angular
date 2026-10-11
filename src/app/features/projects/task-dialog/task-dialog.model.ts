import {
  Assignee,
  ProjectPriority,
  ProjectTask,
  ProjectTaskStatus,
  ProjectAttachment,
} from '@shared/interfaces';

export type TaskDialogMode = 'create' | 'edit' | 'view';

/** Editable shape backing the Signal Form (dates as Date for the picker). */
export interface TaskFormModel {
  title: string;
  description: string;
  status: ProjectTaskStatus;
  priority: ProjectPriority;
  assigneeId: string;
  startDate: Date | null;
  dueDate: Date | null;
  estimatedHours: number;
  progress: number;
  color: string;
  reminder: Date | null;
  notes: string;
  tags: string[];
}

export function emptyTaskForm(): TaskFormModel {
  return {
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assigneeId: '',
    startDate: null,
    dueDate: null,
    estimatedHours: 0,
    progress: 0,
    color: '#3b82f6',
    reminder: null,
    notes: '',
    tags: [],
  };
}

export function taskToForm(task: ProjectTask): TaskFormModel {
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    assigneeId: task.assignee?.id ?? '',
    startDate: task.startDate ? new Date(task.startDate) : null,
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    estimatedHours: task.estimatedHours ?? 0,
    progress: task.progress ?? 0,
    color: task.color ?? '#3b82f6',
    reminder: task.reminder ? new Date(task.reminder) : null,
    notes: task.notes ?? '',
    tags: [...(task.tags ?? [])],
  };
}

/** Build the full domain object from the edited form model. */
export function formToTask(
  model: TaskFormModel,
  assignee: Assignee | undefined,
  attachments: ProjectAttachment[],
  base?: ProjectTask,
): ProjectTask {
  const now = new Date();
  return {
    id: base?.id ?? `PT-${now.getTime()}`,
    title: model.title.trim(),
    description: model.description.trim(),
    status: model.status,
    priority: model.priority,
    assignee,
    startDate: model.startDate ?? undefined,
    dueDate: model.dueDate ?? undefined,
    estimatedHours: model.estimatedHours,
    tags: model.tags,
    attachments,
    color: model.color,
    progress: model.status === 'done' ? 100 : model.progress,
    reminder: model.reminder,
    notes: model.notes.trim(),
    commentsCount: base?.commentsCount ?? 0,
    archived: base?.archived ?? false,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
  };
}

/** Pure date-order check for the dialog's Signal Form validation. */
export function isDueBeforeStart(due: Date | null, start: Date | null): boolean {
  return !!start && !!due && due < start;
}
