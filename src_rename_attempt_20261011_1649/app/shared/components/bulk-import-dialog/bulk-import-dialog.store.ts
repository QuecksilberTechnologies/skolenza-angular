import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { DynamicDialogConfig } from '@openng/optimus-ui/dynamicdialog';
import { finalize, timer } from 'rxjs';

import { Common } from '@core/services/common';
import {
  BulkImportDialogData,
  BulkImportFixResult,
  BulkImportJob,
  BulkImportJobStatus,
  BulkImportPreview,
  BulkImportRowStatus,
} from '@shared/interfaces';
import { countCsvDataRows } from '@shared/utilities/csv-rows';
import { rowsToCsv, unionColumns } from '@shared/utilities/csv-serialise';
import { downloadBlob } from '@shared/utilities/download-blob';

/** Spec: "Poll job detail every 2-5 seconds until terminal status." */
const POLL_INTERVAL_MS = 3000;

/** Spec: "back off for network errors" — doubling from the base interval, capped at the ceiling. */
const POLL_BACKOFF_CEILING_MS = 24000;

/** After this many consecutive failures the dialog stops guessing and says so. */
const POLL_FAILURE_LIMIT = 5;

/**
 * Spec: "Limits: 5 MiB file, 25 MiB expanded XLSX, 5,000 data rows, 64 columns".
 *
 * The byte cap is the decimal 5 MB the dialog states rather than the server's 5 MiB, so the limit
 * the user reads is the one that applies — stricter than the server by 5%, never looser.
 */
const MAX_FILE_BYTES = 5 * 1000 * 1000;
const MAX_DATA_ROWS = 5000;

/** Legacy .xls, macro workbooks, PDF and images are unsupported, so they are turned away. */
const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx'];

export type ImportSource = 'file' | 'paste';

/**
 * Where the import has got to. One value rather than a set of booleans, so the states that cannot
 * co-exist cannot be represented: a draft is never being previewed and confirmed at once.
 *
 * `error` is only for a job that can no longer be read — a rejected preview or confirm leaves the
 * phase where it was so the same input can be corrected and sent again.
 */
export type BulkImportPhase =
  | 'idle'
  | 'previewing'
  | 'ready'
  | 'confirming'
  | 'polling'
  | 'result'
  | 'error';

/**
 * The wizard step on screen: Upload, Validate, Confirm, Complete. Held rather than derived from
 * `phase`, because Validate and Confirm read the same `ready` phase - which of the two is showing
 * is the user's move, not the request's.
 */
export type BulkImportStep = 1 | 2 | 3 | 4;

/** The `Record` key type keeps this exhaustive: a new status fails to compile until it is named. */
const STATUS_LABELS: Record<BulkImportJobStatus, string> = {
  [BulkImportJobStatus.Draft]: 'Draft',
  [BulkImportJobStatus.Queued]: 'Queued',
  [BulkImportJobStatus.Running]: 'Importing',
  [BulkImportJobStatus.Completed]: 'Completed',
  [BulkImportJobStatus.CompletedWithErrors]: 'Completed with errors',
  [BulkImportJobStatus.Failed]: 'Failed',
  [BulkImportJobStatus.Cancelled]: 'Cancelled',
};

/** The statuses the worker has stopped at. Draft is not one: it has not been queued yet. */
const TERMINAL_STATUSES: readonly BulkImportJobStatus[] = [
  BulkImportJobStatus.Completed,
  BulkImportJobStatus.CompletedWithErrors,
  BulkImportJobStatus.Failed,
  BulkImportJobStatus.Cancelled,
];

interface BulkImportState {
  phase: BulkImportPhase;
  step: BulkImportStep;
  file: File | null;
  pastedText: string;
  importSource: ImportSource;
  preview: BulkImportPreview | null;
  job: BulkImportJob | null;
  message: string | null;
  messageSeverity: 'info' | 'error';
  /** Whole-file problems the API reports alongside the message, rather than against a row. */
  responseErrors: string[];
  /**
   * Outside `phase` on purpose: a download runs alongside whatever the import is doing, so it is
   * not one of the steps the import can be at.
   */
  isDownloadingTemplate: boolean;
  isDownloadingReport: boolean;
  /** Same reasoning as the downloads: sending mail runs alongside the finished job, not within it. */
  isSendingInvitations: boolean;
  /**
   * One dispatch per finished job. A second send would re-claim nothing — already-sent rows are
   * skipped server side — but the button reappearing reads as though the first one had not worked.
   */
  invitationsSent: boolean;
  /** Sticky: a reset clears the job, but the caller's list is still stale from the one that ran. */
  hasImported: boolean;
  /**
   * Held across previews of the same source: "the same RequestId with the same source bytes, sheet
   * and mapping returns its saved preview" rather than opening a second draft.
   */
  requestId: string | null;
  /**
   * Bumped whenever a check starts or the source changes. A response carrying a stale token is
   * dropped: switching tabs mid-request would otherwise land the abandoned source's draft on
   * Validate, over the source the user has moved to.
   */
  previewToken: number;
}

const initialState: BulkImportState = {
  phase: 'idle',
  step: 1,
  file: null,
  pastedText: '',
  importSource: 'file',
  preview: null,
  job: null,
  message: null,
  messageSeverity: 'info',
  responseErrors: [],
  isDownloadingTemplate: false,
  isDownloadingReport: false,
  isSendingInvitations: false,
  invitationsSent: false,
  hasImported: false,
  requestId: null,
  previewToken: 0,
};

export const BulkImportStore = signalStore(
  withState(initialState),
  withProps(() => {
    // Provided by `DialogService.open()`; the store lives in the dialog component's injector.
    const data: BulkImportDialogData = inject(DynamicDialogConfig).data;

    return {
      adapter: data.adapter,
      display: data.display,
      commonService: inject(Common),
      destroyRef: inject(DestroyRef),
    };
  }),
  withComputed(
    ({ phase, preview, job, display, adapter, isSendingInvitations, invitationsSent }) => {
      /** Rows the user has to act on. A single invalid row blocks the whole draft. */
      const invalidRows = computed(() =>
        (preview()?.rows ?? []).filter((row) => row.errors.length > 0),
      );

      /** The UI fails closed if a malformed preview claims it can commit despite invalid rows. */
      const canConfirm = computed(() => {
        const draft = preview();

        return !!draft?.canCommit && draft.invalidCount === 0;
      });

      /** Result tone: red for a failed job, amber for partial or cancelled, green for a clean run. */
      const jobTone = computed<'success' | 'warning' | 'error'>(() => {
        // A job that stopped answering is not a clean run: the last status read is stale, and a
        // green tick beside it would claim a success nobody has confirmed.
        if (phase() === 'error') return 'warning';

        const current = job();
        if (!current) return 'success';

        if (current.status === BulkImportJobStatus.Failed) return 'error';
        if (
          current.status === BulkImportJobStatus.CompletedWithErrors ||
          current.status === BulkImportJobStatus.Cancelled ||
          current.failedCount > 0
        ) {
          return 'warning';
        }

        return 'success';
      });

      /**
       * Only StaffMember import supplies `sendInvitations`, so every other master keeps the footer it
       * has today. A job that created nothing has nobody to invite, and a dispatch already made is
       * not offered twice.
       */
      const canSendInvitations = computed(
        () =>
          !!adapter.sendInvitations &&
          phase() === 'result' &&
          (job()?.createdCount ?? 0) > 0 &&
          !invitationsSent() &&
          !isSendingInvitations(),
      );

      /** The rows a confirm would insert. Existing matches are skipped, so they are not among them. */
      const readyRows = computed(() =>
        (preview()?.rows ?? []).filter((row) => row.status === BulkImportRowStatus.Ready),
      );

      return {
        invalidRows,
        readyRows,
        canConfirm,
        jobTone,
        canSendInvitations,

        /** Every row the draft checked, whatever it made of them. */
        totalRows: computed(() => preview()?.rows.length ?? 0),
        /** Ready and existing both passed validation; only the invalid ones block the import. */
        validRowCount: computed(
          () => (preview()?.readyCount ?? 0) + (preview()?.existingCount ?? 0),
        ),

        isPreviewing: computed(() => phase() === 'previewing'),
        isConfirming: computed(() => phase() === 'confirming'),
        /** The window the job polls in, from confirm until the worker reaches a terminal status. */
        isRunning: computed(() => phase() === 'polling'),
        /** A job that has stopped moving - the point the panel switches from progress to result. */
        isComplete: computed(() => phase() === 'result'),
        isBusy: computed(() => ['previewing', 'confirming', 'polling'].includes(phase())),

        /**
         * Why Confirm is blocked, or `''` while the draft is confirmable — the template's `@if`
         * drops the empty string, so the same binding covers both states. It renders as a line of
         * text rather than a tooltip; the template says why.
         */
        confirmBlockedReason: computed(() => {
          const draft = preview();
          if (!draft || canConfirm()) return '';

          const invalid = draft.invalidCount;
          if (invalid === 0) return 'Correct the listed issues before importing.';

          const rows = invalid === 1 ? '1 invalid row' : `${invalid} invalid rows`;

          return `Fix the ${rows} before importing. One invalid row blocks the whole file.`;
        }),

        progressPercent: computed(() => {
          const current = job();
          if (!current?.totalRows) return 0;

          return Math.round((current.processedRows / current.totalRows) * 100);
        }),

        /** The headline: created count on a clean run, failed count when the job wants attention. */
        jobHeadline: computed(() => {
          const current = job();
          if (!current) return { value: 0, label: `${display.entityLabelPlural} created` };

          if (jobTone() !== 'success') {
            const failed = current.failedCount;

            return { value: failed, label: failed === 1 ? 'row failed' : 'rows failed' };
          }

          const created = current.createdCount;

          return {
            value: created,
            label:
              created === 1
                ? `${display.entityLabelSingular} created`
                : `${display.entityLabelPlural} created`,
          };
        }),
      };
    },
  ),
  withMethods((store) => {
    const { adapter, display, commonService, destroyRef } = store;

    const setMessage = (text: string | null, severity: 'info' | 'error') =>
      patchState(store, { message: text, messageSeverity: severity });

    /** Called whenever the source changes, so the next preview opens a draft of its own. */
    const resetResults = () =>
      patchState(store, {
        phase: 'idle',
        // A source that changed has no draft to validate, so the wizard goes back to its first step.
        step: 1,
        preview: null,
        job: null,
        responseErrors: [],
        requestId: null,
        // Whatever check is in flight was for the source being left behind.
        previewToken: store.previewToken() + 1,
        message: null,
        messageSeverity: 'info',
        // A second import through the same dialog is a new job, so it gets its own dispatch.
        invitationsSent: false,
      });

    /** One id per source. `crypto` is absent outside a secure context, and the field is optional. */
    const ensureRequestId = (): string | null => {
      if (typeof crypto === 'undefined') return null;

      const existing = store.requestId();
      if (existing) return existing;

      const created = crypto.randomUUID();
      patchState(store, { requestId: created });

      return created;
    };

    /** The file's text when it is CSV, `null` for a workbook this cannot read without a parser. */
    const readCsvText = async (file: File): Promise<string | null> => {
      if (!file.name.toLowerCase().endsWith('.csv')) return null;

      return await file.text();
    };

    const isRunningStatus = (job: BulkImportJob) => !TERMINAL_STATUSES.includes(job.status);

    /**
     * Re-reads the job until it stops moving. Closing the dialog stops the polling, not the import:
     * the worker owns the job from confirm onwards.
     *
     * `failures` counts *consecutive* unreadable polls. Each one doubles the wait, and after
     * `POLL_FAILURE_LIMIT` the dialog stops rather than hammer an endpoint that is not answering —
     * the import itself is unaffected, which is what the message says.
     */
    const pollJob = (jobId: string, failures = 0): void => {
      const delay = Math.min(POLL_INTERVAL_MS * 2 ** failures, POLL_BACKOFF_CEILING_MS);

      timer(delay)
        .pipe(takeUntilDestroyed(destroyRef))
        .subscribe(() => {
          adapter
            .getJob(jobId)
            .pipe(takeUntilDestroyed(destroyRef))
            .subscribe({
              next: (response) => {
                if (!response.isSucceeded) {
                  retryPoll(jobId, failures + 1);
                  return;
                }

                const job = response.data;
                patchState(store, { job, phase: isRunningStatus(job) ? 'polling' : 'result' });
                if (isRunningStatus(job)) pollJob(jobId);
              },
              // A single failed poll is not a failed import — wait longer and re-read.
              error: () => retryPoll(jobId, failures + 1),
            });
        });
    };

    const retryPoll = (jobId: string, failures: number): void => {
      if (failures < POLL_FAILURE_LIMIT) {
        pollJob(jobId, failures);
        return;
      }

      patchState(store, { phase: 'error' });
      setMessage(
        'Could not read the import status. The import keeps running on the server - reopen this ' +
          'dialog later or download the report.',
        'error',
      );
    };

    const runPreview = async (): Promise<void> => {
      // Reading a file suspends before the request goes out, so the second of two quick clicks
      // would otherwise open a draft of its own. The button is disabled while busy; this keeps
      // that true of the store as well, whatever the template does later.
      if (store.isBusy()) return;

      const file = store.importSource() === 'file' ? store.file() : null;
      const pastedText = store.importSource() === 'paste' ? store.pastedText().trim() : '';

      if (!file && !pastedText) {
        setMessage(
          store.importSource() === 'file'
            ? 'Choose a file before previewing.'
            : 'Paste CSV data before previewing.',
          'error',
        );
        return;
      }

      // `ready` while re-previewing a draft that already exists, so a rejected check has somewhere
      // to put the dialog back to rather than dropping it a step.
      const entryPhase = store.phase();

      // Claimed before the file is read, not after: the read is what opens the window for a
      // second click, and this is what closes the button for its duration.
      const token = store.previewToken() + 1;
      patchState(store, { phase: 'previewing', previewToken: token });

      /** Whether this check is still the one the dialog is waiting on. */
      const isCurrent = () => store.previewToken() === token;

      // Row counts need the text, so only CSV can be checked here — a workbook is the server's to
      // judge. The size cap in `acceptFile` is what covers an .xlsx.
      const csvText = file ? await readCsvText(file) : pastedText;
      // The read suspends, and the source can be swapped out from under it in that gap.
      if (!isCurrent()) return;

      if (csvText !== null) {
        const dataRows = countCsvDataRows(csvText);

        // The API answers a header on its own with "Provide a header row and at least one data
        // row", and the blank template is exactly that. Say so rather than spend a round trip.
        if (dataRows === 0) {
          patchState(store, { phase: entryPhase });
          setMessage(
            file
              ? `${file.name} has only a header row. Fill in one row per ` +
                  `${display.entityLabelSingular}, then choose it again.`
              : 'Paste the header row and at least one data row below it.',
            'error',
          );
          return;
        }

        if (dataRows > MAX_DATA_ROWS) {
          patchState(store, { phase: entryPhase });
          setMessage(
            `${dataRows} rows is over the ${MAX_DATA_ROWS} row limit. Split the import in parts.`,
            'error',
          );
          return;
        }
      }

      const formData = new FormData();
      const requestId = ensureRequestId();
      // Held until the source changes, so previewing the same bytes twice returns the saved draft
      // rather than opening a second one.
      if (requestId) formData.append('RequestId', requestId);
      // Only masters whose workbook has more than one worksheet name a sheet; the API reads the
      // only sheet there is when this is absent.
      if (display.sheetName) formData.append('SheetName', display.sheetName);
      // File and PastedText are mutually exclusive; the chosen file wins when both somehow exist.
      if (file) formData.append('File', file);
      else formData.append('PastedText', pastedText);

      adapter
        .preview(formData)
        .pipe(takeUntilDestroyed(destroyRef))
        .subscribe({
          next: (response) => {
            // A draft of the source the user has left is not the one to put on screen.
            if (!isCurrent()) return;

            setMessage(response.message, response.isSucceeded ? 'info' : 'error');

            // A rejected check of a draft that is already on screen leaves it there, the same way
            // an unreachable server does below. Otherwise a re-checked correction that the API
            // turns away wholesale would take the draft, the corrections and the step with it.
            const keepDraft = !response.isSucceeded && !!store.preview();

            // Whole-file problems live on the envelope, not on any row — keep them, or a rejected
            // upload reads as a bare sentence with nothing to act on.
            patchState(store, {
              responseErrors: response.errors ?? [],
              preview: response.isSucceeded ? response.data : keepDraft ? store.preview() : null,
              phase: response.isSucceeded ? 'ready' : keepDraft ? entryPhase : 'idle',
              // A rejected check has nothing new to show on Validate, so it stays where it was.
              step: response.isSucceeded ? 2 : keepDraft ? store.step() : 1,
            });
          },
          // Rejected input belongs next to the input it rejects, not in a toast over the table.
          // The draft that was on screen is still there, so the phase goes back, not to `idle`.
          error: (error) => {
            if (!isCurrent()) return;

            patchState(store, { phase: entryPhase });
            setMessage(error.message, 'error');
          },
        });
    };

    /** Both entry points end here, so a dropped file is held to the same limits as a chosen one. */
    const acceptFile = (file: File): void => {
      patchState(store, { importSource: 'file' });
      resetResults();

      if (!ACCEPTED_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension))) {
        patchState(store, { file: null });
        setMessage(`${file.name} is not a CSV or XLSX file. Choose one of those.`, 'error');
        return;
      }

      // The size cap holds for a workbook too - the one limit checkable without a parser.
      if (file.size > MAX_FILE_BYTES) {
        patchState(store, { file: null });
        setMessage(`${file.name} is larger than the 5 MB limit. Split it and try again.`, 'error');
        return;
      }

      patchState(store, { file });
    };

    return {
      acceptFile,

      /**
       * A drop carries whatever was dragged, however many files that is. Taking the first of
       * several silently imports a file nobody picked, so a multi-file drop is turned away.
       */
      acceptDroppedFiles(files: FileList): void {
        const file = files[0];
        if (!file) return;

        if (files.length > 1) {
          patchState(store, { importSource: 'file', file: null });
          resetResults();
          setMessage('Drop one file at a time. An import reads a single file.', 'error');
          return;
        }

        acceptFile(file);
      },

      /** The chosen file is what gets sent, so removing it has to be possible without reopening. */
      removeFile(): void {
        patchState(store, { file: null });
        resetResults();
      },

      onPastedTextChange(value: string): void {
        patchState(store, { importSource: 'paste', pastedText: value });
        resetResults();
      },

      /** Sources keep their values across tabs; the selected tab alone supplies the next preview. */
      onImportSourceChange(source: string | number | undefined): void {
        if (source !== 'file' && source !== 'paste') return;
        if (source === store.importSource()) return;

        patchState(store, { importSource: source });
        resetResults();
      },

      /** Returns the dialog to its empty state so a second file can go through without reopening. */
      startAnother(): void {
        patchState(store, { pastedText: '', file: null });
        resetResults();
      },

      previewImport(): void {
        void runPreview();
      },

      /**
       * Corrections made in the fix editor, checked the only way the API allows: the whole sheet is
       * written out again with the edits applied and previewed as a fresh source. There is no route
       * that edits a saved draft, and confirm takes no replacement rows.
       *
       * Deliberately not `resetResults()`, which would drop the user to step 1 with nothing on
       * screen. `runPreview` reads the current phase as its fallback, so a rejected re-check lands
       * back on Validate beside the rows it rejected, and its own `previewToken` bump covers a
       * re-check racing a check that was already in flight.
       */
      applyRowFixes(edits: BulkImportFixResult): void {
        const draft = store.preview();
        if (!draft || edits.size === 0 || store.isBusy()) return;

        const rows = draft.rows.map((row) => {
          const fixes = edits.get(row.rowNumber);

          return fixes ? { ...row, values: { ...row.values, ...fixes } } : row;
        });

        const columns = draft.sourceColumns.length
          ? draft.sourceColumns
          : unionColumns(rows.map((row) => row.values));
        const csv = rowsToCsv(
          columns,
          rows.map((row) => row.values),
        );

        patchState(store, {
          // `.csv` is load-bearing: the row-count pre-checks below only run on a readable text file.
          file: new File([csv], `${display.reportFileNamePrefix}-corrected.csv`, {
            type: 'text/csv',
          }),
          importSource: 'file',
          // `pastedText` is deliberately left alone: the corrected sheet goes up as a file, but the
          // rows the user pasted are still the only copy of what they typed, and clearing them
          // would leave the Paste tab empty with no way back to it.
          // Different bytes, so the saved draft is not this source's any more. Cleared rather than
          // replaced, to keep `ensureRequestId` the one place `crypto` is reached for.
          requestId: null,
          // The corrected values show in the table while the check runs, rather than the old ones.
          preview: { ...draft, rows },
          responseErrors: [],
        });

        void runPreview();
      },

      /**
       * Validate to Confirm. Guarded rather than trusted to the disabled button: a draft carrying
       * invalid rows has nothing to confirm, and the step it would land on says the opposite.
       */
      goToConfirm(): void {
        if (!store.canConfirm()) return;

        patchState(store, { step: 3 });
      },

      /** Confirm back to Validate. The draft is untouched, so nothing is re-checked. */
      backToValidate(): void {
        patchState(store, { step: 2 });
      },

      /**
       * Validate back to Upload. The file and the pasted rows both survive: the source is what the
       * user has to correct, and the draft over it is replaced by the next check either way.
       */
      backToUpload(): void {
        patchState(store, { step: 1 });
      },

      confirmImport(): void {
        const draft = store.preview();
        if (!draft || !store.canConfirm()) return;

        const { jobId } = draft;

        patchState(store, { phase: 'confirming' });
        adapter
          .confirm({ jobId })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (response) => {
              if (!response.isSucceeded) {
                patchState(store, { phase: 'ready' });
                setMessage(response.message, 'error');
                return;
              }

              // HTTP 200 means the job was accepted, not that any row has been inserted yet.
              const job = response.data;
              const running = isRunningStatus(job);
              setMessage(response.message, 'info');
              patchState(store, {
                job,
                hasImported: true,
                phase: running ? 'polling' : 'result',
                step: 4,
              });
              if (running) pollJob(jobId);
            },
            error: (error) => {
              patchState(store, { phase: 'ready' });
              setMessage(error.message, 'error');
            },
          });
      },

      downloadTemplate(): void {
        patchState(store, { isDownloadingTemplate: true });
        adapter
          .downloadTemplate()
          .pipe(
            finalize(() => patchState(store, { isDownloadingTemplate: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (blob) => downloadBlob(blob, display.templateFileName),
            error: (error) => commonService.showMessage(error.message, 'error'),
          });
      },

      downloadReport(): void {
        const jobId = store.job()?.jobId;
        if (!jobId) return;

        patchState(store, { isDownloadingReport: true });
        adapter
          .downloadReport(jobId)
          .pipe(
            finalize(() => patchState(store, { isDownloadingReport: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (blob) => downloadBlob(blob, `${display.reportFileNamePrefix}-${jobId}.csv`),
            error: (error) => commonService.showMessage(error.message, 'error'),
          });
      },

      /**
       * Import creates the accounts without sending mail, so the welcome invitation is a decision
       * the operator makes after reading the results. No `rowNumbers`: an omitted selection covers
       * up to 100 eligible rows, and the server skips anyone already sent or without a seat.
       */
      sendInvitations(): void {
        const jobId = store.job()?.jobId;
        if (!jobId || !adapter.sendInvitations || !store.canSendInvitations()) return;

        patchState(store, { isSendingInvitations: true });
        adapter
          .sendInvitations({ jobId })
          .pipe(
            finalize(() => patchState(store, { isSendingInvitations: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (response) => {
              // Delivery is the mail service's to confirm, so a successful dispatch is not a
              // successful delivery — the API's own wording is what the panel shows.
              setMessage(response.message, response.isSucceeded ? 'info' : 'error');
              patchState(store, {
                responseErrors: response.errors ?? [],
                invitationsSent: response.isSucceeded,
              });
            },
            error: (error) => setMessage(error.message, 'error'),
          });
      },

      statusLabel(status: BulkImportJobStatus): string {
        return STATUS_LABELS[status];
      },
    };
  }),
);
