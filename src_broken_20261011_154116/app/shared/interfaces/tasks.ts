// Task Sheet domain models.
// No task backend yet — service reads mock JSON shaped like the standard API envelope.

export type TaskStatus = 'Todo' | 'InProgress' | 'Blocked' | 'Review' | 'Completed' | 'Cancelled';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type TaskCategory =
  | 'Feature'
  | 'Bug'
  | 'Improvement'
  | 'Documentation'
  | 'Research'
  | 'Operations'
  | 'Onboarding';

export type TaskScope = 'all' | 'my' | 'team';

/** Generic API envelope used by every task endpoint (mirrors backend response shape). */
export interface TaskApiResponse<T> {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: T;
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface TaskComment {
  id: string;
  author: string;
  initials: string;
  message: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  sizeLabel: string;
  uploadedBy: string;
  uploadedAt: string;
  url?: string;
}

export interface TaskChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface TaskActivity {
  id: string;
  actor: string;
  action: string;
  detail?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  assigneeId: string;
  assigneeName: string;
  reporterId: string;
  reporterName: string;
  startDate: string;
  dueDate: string;
  completedDate: string | null;
  estimatedHours: number;
  actualHours: number;
  /** 0–100 overall progress. */
  progress: number;
  tags: string[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
  checklist: TaskChecklistItem[];
  activity: TaskActivity[];
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilter {
  status?: TaskStatus | null;
  priority?: TaskPriority | null;
  category?: TaskCategory | null;
  assigneeId?: string | null;
}

export interface TaskAssignee {
  id: string;
  name: string;
}

export interface TaskMeta {
  categories: TaskCategory[];
  tags: string[];
  assignees: TaskAssignee[];
}

export interface TaskStats {
  today: number;
  upcoming: number;
  overdue: number;
  completed: number;
  pendingReview: number;
  inProgress: number;
}

// ── Request / response DTOs ──────────────────────────────────────────────────

export type GetTasksResponse = TaskApiResponse<Task[]>;
export type GetTaskResponse = TaskApiResponse<Task>;
export type GetTaskMetaResponse = TaskApiResponse<TaskMeta>;
