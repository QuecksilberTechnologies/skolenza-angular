// OKR (Objectives & Key Results) domain models.
// No OKR backend yet — service reads mock JSON shaped like the standard API envelope.

export type OkrLevel = 'Company' | 'Department' | 'Team' | 'Personal';

export type OkrStatus = 'Draft' | 'Active' | 'OnTrack' | 'Behind' | 'Completed' | 'Archived';

export type OkrVisibility = 'Public' | 'Private';

export type OkrScope = 'my' | 'team' | 'company';

/** Generic API envelope used by every OKR endpoint (mirrors backend response shape). */
export interface OkrApiResponse<T> {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: T;
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface IKeyResult {
  id: string;
  title: string;
  metric: string;
  target: number;
  current: number;
  unit: string;
  /** 0–100, derived from current/target but stored for display. */
  progress: number;
  /** Contribution to the objective; all KR weights of one OKR sum to 100. */
  weight: number;
}

export interface IOkr {
  id: string;
  title: string;
  description: string;
  objective: string;
  ownerStaffMemberId: string;
  ownerName: string;
  departmentId: string;
  department: string;
  level: OkrLevel;
  quarter: string;
  startDate: string;
  endDate: string;
  /** OKR weight relative to siblings, 0–100. */
  weight: number;
  status: OkrStatus;
  visibility: OkrVisibility;
  /** 0–100 overall objective progress. */
  progress: number;
  dueDate: string;
  keyResults: IKeyResult[];
  createdDate: string;
  isActive: boolean;
}

// ── Detail-page extras ────────────────────────────────────────────────────────

export interface IOkrComment {
  id: string;
  author: string;
  initials: string;
  message: string;
  createdAt: string;
}

export interface IOkrActivity {
  id: string;
  actor: string;
  action: string;
  detail?: string;
  createdAt: string;
}

export interface IOkrAttachment {
  id: string;
  fileName: string;
  sizeLabel: string;
  uploadedBy: string;
  uploadedAt: string;
  url?: string;
}

export interface ILinkedGoal {
  id: string;
  title: string;
  level: OkrLevel;
  progress: number;
}

export interface IOkrDetailExtras {
  comments: IOkrComment[];
  activities: IOkrActivity[];
  attachments: IOkrAttachment[];
  linkedGoals: ILinkedGoal[];
}

export interface OkrStats {
  active: number;
  completed: number;
  onTrack: number;
  atRisk: number;
  overdue: number;
}

// ── Filters & request/response DTOs ──────────────────────────────────────────

export interface IOkrFilter {
  level?: OkrLevel | null;
  departmentId?: string | null;
  quarter?: string | null;
  status?: OkrStatus | null;
  ownerStaffMemberId?: string | null;
}

export interface GetOkrsRequest {
  IsActive: boolean;
  PageNumber: number;
  PageSize: number;
  SortBy: string;
  SortOrder: string;
  SearchTerm?: string;
  Scope?: OkrScope;
  UserStaffMemberId?: string;
  Level?: OkrLevel | null;
  DepartmentId?: string | null;
  Quarter?: string | null;
  Status?: OkrStatus | null;
}

export type GetOkrsResponse = OkrApiResponse<IOkr[]>;
export type GetOkrResponse = OkrApiResponse<IOkr>;
export type GetOkrStatsResponse = OkrApiResponse<OkrStats>;
export type GetOkrDetailExtrasResponse = OkrApiResponse<IOkrDetailExtras>;

export interface AddOkrRequest {
  okr: Omit<IOkr, 'id' | 'createdDate' | 'isActive'>;
}

export interface UpdateOkrRequest {
  okr: IOkr;
}

export interface DeleteOkrRequest {
  id: string;
}

export interface ArchiveOkrRequest {
  ids: string[];
}

export interface DuplicateOkrRequest {
  id: string;
}
