export interface Project {
  id: number;
  name: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  startDate: Date;
  endDate: Date;
  team: string[];
}

export interface GetProjectsRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: Project[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface ProjectStats {
  item: ProjectItem;
  budget: string;
  progress: ProjectProgress;
  status: ProjectStatus;
  view: string;
}

export interface ProjectItem {
  name: string;
  user: string;
  image: string;
}

export interface ProjectProgress {
  value: string;
  trend: ProgressTrend;
}

export type ProjectStatus = 'active' | 'completed' | 'on-hold';
export type ProjectPriority = 'high' | 'medium' | 'low';
export type ProgressTrend = 'up' | 'down';
