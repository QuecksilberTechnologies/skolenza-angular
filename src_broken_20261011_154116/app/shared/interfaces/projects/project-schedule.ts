import { EventInput } from 'fullcalendar';

export type ScheduleItemType =
  | 'milestone'
  | 'meeting'
  | 'deadline'
  | 'release'
  | 'sprint'
  | 'review';

export interface ProjectScheduleItem extends EventInput {
  id: string;
  title: string;
  type: ScheduleItemType;
  start: Date;
  end?: Date;
  allDay: boolean;
  description?: string;
  location?: string;
  linkedTaskId?: string;
  reminder?: Date | null;
  backgroundColor?: string;
  borderColor?: string;
  color?: string;
}

export type NewProjectScheduleItem = Omit<ProjectScheduleItem, 'id'>;

export interface GetScheduleRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: ProjectScheduleItem[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}
