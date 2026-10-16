import { computed, DestroyRef, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { TableLazyLoadEvent } from '@openng/optimus-ui/table';
import { finalize, map, tap } from 'rxjs';

import { Common } from '@core/services';
import {
  BulkImportAdapter,
  BulkImportDisplayConfig,
  BulkImportJob,
  BulkImportJobStatus,
} from '@shared/interfaces';
import { downloadBlob } from '@shared/utilities/download-blob';

/** `GET {master}/bulk/jobs` caps `PageSize` at 100, so the page-size options stop below it. */
export const BULK_IMPORT_JOBS_PAGE_SIZES = [10, 25, 50, 100];

interface BulkImportJobsState {
  /**
   * Supplied by the page once its inputs have resolved. `null` keeps the resource idle: the store
   * is master-agnostic and has nothing to fetch until it is told which master it is showing.
   */
  adapter: BulkImportAdapter | null;
  display: BulkImportDisplayConfig | null;
  jobs: BulkImportJob[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  /** The row whose retry or cancel is in flight, for the per-row spinner. */
  busyJobId: string | null;
  downloadingJobId: string | null;
}

const initialState: BulkImportJobsState = {
  adapter: null,
  display: null,
  jobs: [],
  totalRecords: 0,
  pageNumber: 1,
  pageSize: 10,
  busyJobId: null,
  downloadingJobId: null,
};

/** Everything from `Completed` up is terminal: no retry target, nothing left to cancel. */
const isTerminal = (status: BulkImportJobStatus) => status >= BulkImportJobStatus.Completed;

export const BulkImportJobsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const commonService = inject(Common);

    const jobsResource = rxResource({
      params: () => {
        const adapter = store.adapter();
        // No adapter yet, or a master whose service predates the history routes: stay idle.
        if (!adapter?.listJobs) return undefined;

        return { adapter, pageNumber: store.pageNumber(), pageSize: store.pageSize() };
      },
      stream: ({ params }) =>
        params.adapter.listJobs!({
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
        }).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }

            const jobs = res.isSucceeded ? res.data : [];
            patchState(store, {
              jobs,
              // The API documents no total. Without one, a full page is taken as "there is
              // more" - but only by one row: claiming a whole extra page offers a page 2 that
              // fetches empty and then vanishes as the count corrects itself.
              totalRecords:
                res.totalRecords ??
                (params.pageNumber - 1) * params.pageSize +
                  jobs.length +
                  (jobs.length === params.pageSize ? 1 : 0),
            });
          }),
          map((res) => res.data),
        ),
    });

    return { jobsResource };
  }),
  withComputed(({ jobsResource, adapter }) => ({
    // Idle before the page has handed over its adapter must read as loading, or the table flashes
    // its empty state on every entry.
    isLoading: computed(() => jobsResource.isLoading() || adapter() === null),
  })),
  withMethods((store) => {
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** A new job lands on page 1: reload when the params would not change, patch when they would. */
    const reloadFirstPage = () => {
      if (store.pageNumber() === 1) {
        store.jobsResource.reload();
      } else {
        patchState(store, { pageNumber: 1 });
      }
    };

    const replaceJob = (job: BulkImportJob) =>
      patchState(store, {
        jobs: store.jobs().map((existing) => (existing.jobId === job.jobId ? job : existing)),
      });

    return {
      /** Called once by the page, from its inputs. */
      setContext(adapter: BulkImportAdapter, display: BulkImportDisplayConfig): void {
        patchState(store, { adapter, display });
      },

      loadJobs(event: TableLazyLoadEvent): void {
        const { page, rows } = commonService.getPaginationParam(event);
        patchState(store, { pageNumber: page, pageSize: rows });
      },

      reloadFirstPage(): void {
        reloadFirstPage();
      },

      /**
       * Retry queues a **fresh** job for the failed rows rather than reviving this one, so the
       * response's `jobId` is usually a new one that is not in the table yet. Reloading page 1 is
       * what shows it; patching the row by id would silently do nothing.
       */
      retryJob(job: BulkImportJob): void {
        const retry = store.adapter()?.retry;
        if (!retry || store.busyJobId()) return;

        patchState(store, { busyJobId: job.jobId });

        retry({ jobId: job.jobId })
          .pipe(
            finalize(() => patchState(store, { busyJobId: null })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) reloadFirstPage();
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /**
       * Cancellation is advisory: `Draft` and `Queued` stop outright, `Running` stops at the next
       * batch boundary, and rows already committed stay committed. The returned status is the only
       * proof the job actually stopped, so a 200 alone is never reported as a cancellation.
       */
      cancelJob(job: BulkImportJob): void {
        const cancel = store.adapter()?.cancel;
        if (!cancel || store.busyJobId()) return;

        patchState(store, { busyJobId: job.jobId });

        cancel({ jobId: job.jobId })
          .pipe(
            finalize(() => patchState(store, { busyJobId: null })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (!res.isSucceeded) {
                commonService.showMessage(res.message, 'error');
                return;
              }

              replaceJob(res.data);
              commonService.showMessage(
                res.data.status === BulkImportJobStatus.Cancelled
                  ? res.message
                  : 'Cancellation requested. The job stops at its next batch boundary, and rows already imported stay imported.',
                res.data.status === BulkImportJobStatus.Cancelled ? 'success' : 'info',
              );
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      downloadReport(job: BulkImportJob): void {
        const adapter = store.adapter();
        const display = store.display();
        if (!adapter || !display || store.downloadingJobId()) return;

        patchState(store, { downloadingJobId: job.jobId });

        adapter
          .downloadReport(job.jobId)
          .pipe(
            finalize(() => patchState(store, { downloadingJobId: null })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (blob) => downloadBlob(blob, `${display.reportFileNamePrefix}-${job.jobId}.csv`),
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      canRetry: (job: BulkImportJob): boolean =>
        job.status === BulkImportJobStatus.CompletedWithErrors ||
        job.status === BulkImportJobStatus.Failed,

      canCancel: (job: BulkImportJob): boolean => !isTerminal(job.status),
    };
  }),
);
