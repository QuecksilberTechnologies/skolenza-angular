import { Signal } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Body shared by the bulk-import job actions. `ModuleId` / `OperationId` come from
 * `moduleOperationInterceptor`, not from the call site.
 *
 * `institutionId` is a Host-family addition (`HostBulkImportJobRequestDTO`): a Host session is not
 * implicitly scoped to one institution the way a logged-in institution admin's JWT is. Left `undefined` by
 * every institution-scoped master's own JSON body.
 */
export interface BulkImportJobRequest {
  jobId: string;
  institutionId?: string | null;
}

/** Query for the job-history list. Every field optional — an empty call lists the first page. */
export interface BulkImportJobsRequest {
  pageNumber?: number;
  pageSize?: number;
  institutionId?: string | null;
}

/** Row outcome inside a preview. `Ready=1, Existing=2, Invalid=3, Created=4, Failed=5`. */
export enum BulkImportRowStatus {
  Ready = 1,
  Existing = 2,
  Invalid = 3,
  Created = 4,
  Failed = 5,
}

/** Job lifecycle. Everything from `Completed` up is terminal, so polling stops there. */
export enum BulkImportJobStatus {
  Draft = 1,
  Queued = 2,
  Running = 3,
  Completed = 4,
  CompletedWithErrors = 5,
  Failed = 6,
  Cancelled = 7,
}

export interface BulkImportRow {
  /** Distinguishes a preview match from a row the worker has already handled. */
  processed: boolean;
  rowNumber: number;
  values: Record<string, string | null>;
  status: BulkImportRowStatus;
  existingId: number | null;
  errors: string[];
}

/** The saved draft a preview persists. No master records exist yet. */
export interface BulkImportPreview {
  jobId: string;
  master: number;
  sourceColumns: string[];
  columnMapping: Record<string, string>;
  errors: string[];
  rows: BulkImportRow[];
  readyCount: number;
  existingCount: number;
  invalidCount: number;
  isValid: boolean;
  confirmationAvailable: boolean;
  canCommit: boolean;
}

/** The queued job a confirm returns, and the shape polled from `GET {master}/bulk/jobs/{jobId}`. */
export interface BulkImportJob {
  jobId: string;
  master: number;
  status: BulkImportJobStatus;
  createdAtUtc: string;
  updatedAtUtc: string;
  scheduledAtUtc: string | null;
  totalRows: number;
  processedRows: number;
  createdCount: number;
  /** Processed matches only — the preview's own `existingCount` also counts initial matches. */
  existingCount: number;
  failedCount: number;
  error: string | null;
  preview: BulkImportPreview | null;
}

/** API envelope returned by `POST {master}/bulk/preview`. */
export interface BulkImportPreviewResponse {
  isSucceeded: boolean;
  message: string;
  errors: string[];
  data: BulkImportPreview;
}

/** API envelope returned by `POST {master}/bulk/confirm` and `GET {master}/bulk/jobs/{jobId}`. */
export interface BulkImportJobResponse {
  isSucceeded: boolean;
  message: string;
  errors: string[];
  data: BulkImportJob;
}

/**
 * API envelope returned by the job-history list. UNVERIFIED — swagger documents no response
 * schema for any `import/jobs`-shaped route, and no UI has consumed one yet; shaped on the
 * envelope every other endpoint in this codebase uses.
 */
export interface BulkImportJobsResponse {
  isSucceeded: boolean;
  message: string;
  errors: string[];
  data: BulkImportJob[];
  /** Optional for the same reason: paged list endpoints elsewhere send it, this one may not. */
  totalRecords?: number;
}

/**
 * The importing feature's own API calls, handed to the shared dialog rather than injected by it.
 * Every master speaks the same five endpoints off its own base URL, so the dialog needs no
 * knowledge of which one it is importing — and `shared/` never reaches into `features/`.
 *
 * `listJobs` / `retry` / `cancel` are optional: the dialog itself calls none of them today (no
 * master has a job-history UI yet), so an adapter built before they existed is still valid. A
 * future job-history surface can require them on whichever adapters it drives.
 *
 * `sendInvitations` is optional for the same reason and one more: only StaffMember import creates
 * accounts that need a welcome mail, so the button appears exactly where an adapter supplies it.
 */
export interface BulkImportAdapter {
  preview(body: FormData): Observable<BulkImportPreviewResponse>;
  confirm(body: BulkImportJobRequest): Observable<BulkImportJobResponse>;
  getJob(jobId: string): Observable<BulkImportJobResponse>;
  downloadTemplate(): Observable<Blob>;
  downloadReport(jobId: string): Observable<Blob>;
  listJobs?(req: BulkImportJobsRequest): Observable<BulkImportJobsResponse>;
  retry?(body: BulkImportJobRequest): Observable<BulkImportJobResponse>;
  cancel?(body: BulkImportJobRequest): Observable<BulkImportJobResponse>;
  sendInvitations?(body: BulkImportJobRequest): Observable<BulkImportJobResponse>;
}

/** The control the fix editor renders for a column. Everything else is a plain text input. */
export type BulkImportFieldType = 'text' | 'email' | 'tel' | 'select' | 'date' | 'switch';

/**
 * A row of a lookup list. Every master's options are `{ id, <something>Name }`, so the property
 * holding the name travels with the field rather than being guessed here.
 */
export interface BulkImportFieldOption {
  id: number | string;
  [key: string]: unknown;
}

/**
 * How the fix editor renders one source column. Supplied by the importing feature, because the
 * options come from that feature's lookups and `shared/` never reaches into `features/`.
 *
 * A column with no config renders as a text input, which is the whole of what the masters that
 * supply no `fields` at all get.
 */
export interface BulkImportFieldConfig {
  /** The source column this writes back to. */
  column: string;
  label: string;
  /** Heading of the card this sits under. Fields naming none share one default card. */
  section?: string;
  /** Defaults to `'text'`. */
  type?: BulkImportFieldType;
  /** Draws the label's `*`. zod issues carry no field metadata, so the marker has to be explicit. */
  required?: boolean;
  placeholder?: string;
  hint?: string;
  /** `select` only: the list to choose from, as a signal so a cascade re-renders on its own. */
  options?: Signal<readonly BulkImportFieldOption[]>;
  /** `select` only: the property on an option that names it, e.g. `departmentName`. */
  optionLabel?: string;
  /** `select` only: whether the list is still being fetched. */
  optionsLoading?: Signal<boolean>;
  /**
   * The column this one's options hang off — `DesignationId` depends on `DepartmentId`. The field
   * is disabled while the parent is blank, and cleared when the parent changes.
   */
  dependsOn?: string;
  /** Called with the parent's value on open and on every parent change, to fetch the next list. */
  loadOptions?: (parentValue: string) => void;
}

/**
 * The copy that changes per master. The column hints differ in wording and count, so they are
 * supplied whole rather than templated from the labels.
 */
export interface BulkImportDisplayConfig {
  /** Lower case, used mid-sentence: "one row per department". */
  entityLabelSingular: string;
  entityLabelPlural: string;
  /** One line per source column, naming the rules the server enforces. */
  columnHints: string[];
  pastePlaceholder: string;
  templateFileName: string;
  /** The report downloads as `{prefix}-{jobId}.csv`. */
  reportFileNamePrefix: string;
  /** The column whose value titles an invalid row, e.g. `DepartmentName`. */
  rowSummaryField: string;
  /**
   * Appended to the preview request as `SheetName`. Required when the master's workbook holds more
   * than one worksheet — `05-staffMembers.xlsx` carries a `Guide` sheet beside `StaffMembers`, and the
   * API will not guess which one to read.
   */
  sheetName?: string;
  /**
   * How the fix editor renders each column. Omitted, every column gets a text input — which is
   * still a working editor, just an unlabelled one, so no master has to supply this to benefit.
   */
  fields?: readonly BulkImportFieldConfig[];
}

/** Passed to `DialogService.open(BulkImportDialog, { data })`. */
export interface BulkImportDialogData {
  adapter: BulkImportAdapter;
  display: BulkImportDisplayConfig;
}

/**
 * Passed to `DialogService.open(BulkImportFixDialog, { data })`. Plain data throughout: the child
 * opens under the root injector, not the wizard's, so it cannot reach `BulkImportStore`.
 */
export interface BulkImportFixDialogData {
  /** Every invalid row, not the slice the Validate table renders. */
  rows: readonly BulkImportRow[];
  sourceColumns: readonly string[];
  columnMapping: Record<string, string>;
  /** Already defaulted by the caller, so the editor never has to decide what a bare column means. */
  fields: readonly BulkImportFieldConfig[];
  display: BulkImportDisplayConfig;
  /** The row to open on, when the editor was opened from one rather than from the whole list. */
  startRowNumber?: number;
}

/**
 * What the fix editor closes with: the columns the user actually changed, by row number. An empty
 * map — or `undefined` from a cancel — means there is nothing to re-check.
 */
export type BulkImportFixResult = ReadonlyMap<number, Record<string, string>>;
