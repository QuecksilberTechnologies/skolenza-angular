/** Shared types for the Performance Management System (PMS) feature. */

/** Lifecycle status shared across goals, reviews, meetings. */
export type PmsStatus = 'Draft' | 'Pending' | 'InReview' | 'Completed' | 'Cancelled';

export type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/** Status → p-tag severity + label for display. */
export const PMS_STATUS_META: Record<PmsStatus, { label: string; severity: TagSeverity }> = {
  Draft: { label: 'Draft', severity: 'secondary' },
  Pending: { label: 'Pending', severity: 'warn' },
  InReview: { label: 'In Review', severity: 'info' },
  Completed: { label: 'Completed', severity: 'success' },
  Cancelled: { label: 'Cancelled', severity: 'danger' },
};

export const PMS_STATUS_OPTIONS: { label: string; value: PmsStatus }[] = (
  Object.keys(PMS_STATUS_META) as PmsStatus[]
).map((value) => ({ label: PMS_STATUS_META[value].label, value }));

/** Standard API response envelope used across the app (see GetHolidaysRes). */
export interface PmsResponse<T> {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: T;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

/** Shared filter shape for list pages. */
export interface PmsFilter {
  staffMemberId?: string;
  department?: string;
  managerId?: string;
  cycle?: string;
  status?: PmsStatus;
  dateFrom?: string;
  dateTo?: string;
}

export const GOAL_CATEGORIES = [
  'Business',
  'Technical',
  'Leadership',
  'Personal Development',
  'Collaboration',
] as const;
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

/** Soft bg/text colour pairs per category for chip display. AA-contrast 50/700 combos. */
export const GOAL_CATEGORY_META: Record<GoalCategory, string> = {
  Business: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Technical: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  Leadership: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Personal Development':
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  Collaboration: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

export const GOAL_CATEGORY_FALLBACK_CLASS =
  'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300';

export const REVIEW_CYCLES = ['Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026', 'Annual-2026'] as const;
export type ReviewCycle = (typeof REVIEW_CYCLES)[number];

export const COMPETENCIES = [
  'Communication',
  'Ownership',
  'Problem Solving',
  'Teamwork',
  'Quality',
] as const;
export type Competency = (typeof COMPETENCIES)[number];
