import { Task, TaskCategory, TaskPriority, TaskStatus } from '@shared/interfaces';

import { TODAY } from '../tasks-nav';

/** Editable shape backing the Signal Form (dates as Date objects for the picker). */
export interface TaskFormModel {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  assigneeId: string;
  startDate: Date | null;
  dueDate: Date | null;
  estimatedHours: number;
  actualHours: number;
  progress: number;
  tags: string[];
  isRecurring: boolean;
}

export function emptyTaskForm(): TaskFormModel {
  return {
    title: '',
    description: '',
    status: 'Todo',
    priority: 'Medium',
    category: 'Feature',
    assigneeId: '',
    startDate: new Date(TODAY),
    dueDate: null,
    estimatedHours: 0,
    actualHours: 0,
    progress: 0,
    tags: [],
    isRecurring: false,
  };
}

export function taskToForm(task: Task): TaskFormModel {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    category: task.category,
    assigneeId: task.assigneeId,
    startDate: task.startDate ? new Date(task.startDate) : null,
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    estimatedHours: task.estimatedHours,
    actualHours: task.actualHours,
    progress: task.progress,
    tags: [...task.tags],
    isRecurring: task.isRecurring,
  };
}

/** Format a Date as yyyy-MM-dd (empty string when unset). */
function ymd(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '';
}

/** Build the full domain object the API expects from the edited form model. */
export function formToTask(model: TaskFormModel, assigneeName: string, base?: Task): Task {
  const now = new Date().toISOString();
  return {
    id: base?.id ?? `TSK-${Date.now()}`,
    title: model.title.trim(),
    description: model.description.trim(),
    status: model.status,
    priority: model.priority,
    category: model.category,
    assigneeId: model.assigneeId,
    assigneeName,
    reporterId: base?.reporterId ?? 'emp-1',
    reporterName: base?.reporterName ?? 'You',
    startDate: ymd(model.startDate),
    dueDate: ymd(model.dueDate),
    completedDate:
      model.status === 'Completed' ? (base?.completedDate ?? ymd(new Date(TODAY))) : null,
    estimatedHours: model.estimatedHours,
    actualHours: model.actualHours,
    progress: model.status === 'Completed' ? 100 : model.progress,
    tags: model.tags,
    attachments: base?.attachments ?? [],
    comments: base?.comments ?? [],
    checklist: base?.checklist ?? [],
    activity: base?.activity ?? [],
    isRecurring: model.isRecurring,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
  };
}
