import { GoalCategory, PmsStatus } from './pms-common';

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  /** Relative weight 0–100. */
  weight: number;
  /** Completion 0–100. */
  progress: number;
  startDate: string; // ISO yyyy-MM-dd
  dueDate: string; // ISO yyyy-MM-dd
  status: PmsStatus;
  ownerId: string;
  ownerName: string;
}
