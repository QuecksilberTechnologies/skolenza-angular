import { ProjectPriority } from './project';

export type ProjectTaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

export interface Assignee {
  id: string;
  name: string;
  avatar?: string;
}

export interface ProjectAttachment {
  id: string;
  name: string;
  size?: number;
}

export interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  status: ProjectTaskStatus;
  priority: ProjectPriority;
  assignee?: Assignee;
  startDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  tags?: string[];
  attachments?: ProjectAttachment[];
  color?: string;
  progress?: number;
  reminder?: Date | null;
  notes?: string;
  commentsCount?: number;
  archived?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectTaskFilter {
  status?: ProjectTaskStatus | null;
  priority?: ProjectPriority | null;
  assigneeId?: string | null;
  tag?: string | null;
}

export interface StatusTag {
  value: string;
  colorKey: string;
}

export interface PriorityTag {
  value: string;
  colorKey: string;
}
