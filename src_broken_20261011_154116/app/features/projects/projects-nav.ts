import {
  ProjectPriority,
  ProjectTask,
  ProjectTaskStatus,
  ScheduleItemType,
} from '@shared/interfaces';

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/** "Today" anchor for overdue/upcoming calculations (mock data is dated around this). */
export const TODAY = new Date('2026-07-05');

export interface StatusMeta {
  label: string;
  severity: Severity;
  icon: string;
}

export const STATUS_META: Record<ProjectTaskStatus, StatusMeta> = {
  todo: { label: 'To Do', severity: 'secondary', icon: 'pi pi-inbox' },
  'in-progress': { label: 'In Progress', severity: 'info', icon: 'pi pi-spin pi-spinner' },
  review: { label: 'Review', severity: 'warn', icon: 'pi pi-search' },
  done: { label: 'Done', severity: 'success', icon: 'pi pi-check-circle' },
};

export interface PriorityMeta {
  label: string;
  severity: Severity;
  icon: string;
}

export const PRIORITY_META: Record<ProjectPriority, PriorityMeta> = {
  low: { label: 'Low', severity: 'info', icon: 'pi pi-angle-down' },
  medium: { label: 'Medium', severity: 'warn', icon: 'pi pi-minus' },
  high: { label: 'High', severity: 'danger', icon: 'pi pi-angle-double-up' },
};

export interface ScheduleTypeMeta {
  label: string;
  icon: string;
  color: string;
}

/** Drives calendar color-by-type and the schedule item form. */
export const SCHEDULE_TYPE_META: Record<ScheduleItemType, ScheduleTypeMeta> = {
  milestone: { label: 'Milestone', icon: 'pi pi-flag', color: '#8b5cf6' },
  meeting: { label: 'Meeting', icon: 'pi pi-users', color: '#3b82f6' },
  deadline: { label: 'Deadline', icon: 'pi pi-clock', color: '#ef4444' },
  release: { label: 'Release', icon: 'pi pi-rocket', color: '#10b981' },
  sprint: { label: 'Sprint Planning', icon: 'pi pi-forward', color: '#f59e0b' },
  review: { label: 'Review', icon: 'pi pi-eye', color: '#06b6d4' },
};

/** Column order for the kanban board. */
export const KANBAN_COLUMNS: ProjectTaskStatus[] = ['todo', 'in-progress', 'review', 'done'];

export const STATUS_OPTIONS: { label: string; value: ProjectTaskStatus }[] = (
  Object.keys(STATUS_META) as ProjectTaskStatus[]
).map((s) => ({ label: STATUS_META[s].label, value: s }));

export const PRIORITY_OPTIONS: { label: string; value: ProjectPriority }[] = (
  Object.keys(PRIORITY_META) as ProjectPriority[]
).map((p) => ({ label: PRIORITY_META[p].label, value: p }));

export const SCHEDULE_TYPE_OPTIONS: { label: string; value: ScheduleItemType }[] = (
  Object.keys(SCHEDULE_TYPE_META) as ScheduleItemType[]
).map((t) => ({ label: SCHEDULE_TYPE_META[t].label, value: t }));

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** A task is overdue when past due and not done. */
export function isOverdue(task: ProjectTask, today = TODAY): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  return startOfDay(task.dueDate) < startOfDay(today);
}

/** Due today and still open. */
export function isDueToday(task: ProjectTask, today = TODAY): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  return startOfDay(task.dueDate).getTime() === startOfDay(today).getTime();
}
