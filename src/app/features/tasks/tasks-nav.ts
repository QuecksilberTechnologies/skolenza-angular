import { Task, TaskPriority, TaskStatus } from '@shared/interfaces';

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/** "Today" anchor for overdue/upcoming calculations (mock data is dated around this). */
export const TODAY = '2026-07-04';

export interface StatusMeta {
  label: string;
  severity: Severity;
  icon: string;
}

export const STATUS_META: Record<TaskStatus, StatusMeta> = {
  Todo: { label: 'To Do', severity: 'secondary', icon: 'pi pi-inbox' },
  InProgress: { label: 'In Progress', severity: 'info', icon: 'pi pi-spin pi-spinner' },
  Blocked: { label: 'Blocked', severity: 'danger', icon: 'pi pi-ban' },
  Review: { label: 'Review', severity: 'warn', icon: 'pi pi-search' },
  Completed: { label: 'Completed', severity: 'success', icon: 'pi pi-check-circle' },
  Cancelled: { label: 'Cancelled', severity: 'contrast', icon: 'pi pi-times-circle' },
};

export interface PriorityMeta {
  label: string;
  severity: Severity;
  icon: string;
}

export const PRIORITY_META: Record<TaskPriority, PriorityMeta> = {
  Low: { label: 'Low', severity: 'secondary', icon: 'pi pi-angle-down' },
  Medium: { label: 'Medium', severity: 'info', icon: 'pi pi-minus' },
  High: { label: 'High', severity: 'warn', icon: 'pi pi-angle-up' },
  Critical: { label: 'Critical', severity: 'danger', icon: 'pi pi-angle-double-up' },
};

/** Column order for the kanban board. Cancelled is intentionally excluded. */
export const KANBAN_COLUMNS: TaskStatus[] = [
  'Todo',
  'InProgress',
  'Blocked',
  'Review',
  'Completed',
];

export const STATUS_OPTIONS: { label: string; value: TaskStatus }[] = (
  Object.keys(STATUS_META) as TaskStatus[]
).map((s) => ({ label: STATUS_META[s].label, value: s }));

export const PRIORITY_OPTIONS: { label: string; value: TaskPriority }[] = (
  Object.keys(PRIORITY_META) as TaskPriority[]
).map((p) => ({ label: PRIORITY_META[p].label, value: p }));

/** A task is overdue when past due and not in a terminal state. */
export function isOverdue(task: Task, today = TODAY): boolean {
  return task.dueDate < today && task.status !== 'Completed' && task.status !== 'Cancelled';
}

/** Due today and still open. */
export function isDueToday(task: Task, today = TODAY): boolean {
  return task.dueDate === today && task.status !== 'Completed' && task.status !== 'Cancelled';
}
