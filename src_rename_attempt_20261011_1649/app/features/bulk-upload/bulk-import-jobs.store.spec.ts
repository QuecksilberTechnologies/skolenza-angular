import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Common } from '@core/services';
import {
  BulkImportAdapter,
  BulkImportDisplayConfig,
  BulkImportJob,
  BulkImportJobResponse,
  BulkImportJobsResponse,
  BulkImportJobStatus,
} from '@shared/interfaces';

import { BulkImportJobsStore } from './bulk-import-jobs.store';

const job = (over: Partial<BulkImportJob> = {}): BulkImportJob => ({
  jobId: 'job-1',
  master: 1,
  status: BulkImportJobStatus.CompletedWithErrors,
  createdAtUtc: '2026-09-01T10:00:00Z',
  updatedAtUtc: '2026-09-01T10:05:00Z',
  scheduledAtUtc: null,
  totalRows: 10,
  processedRows: 10,
  createdCount: 8,
  existingCount: 1,
  failedCount: 1,
  error: null,
  preview: null,
  ...over,
});

const jobsResponse = (data: BulkImportJob[], over: Partial<BulkImportJobsResponse> = {}) =>
  ({ isSucceeded: true, message: 'ok', errors: [], data, ...over }) as BulkImportJobsResponse;

const jobResponse = (data: BulkImportJob, over: Partial<BulkImportJobResponse> = {}) =>
  ({ isSucceeded: true, message: 'ok', errors: [], data, ...over }) as BulkImportJobResponse;

const display: BulkImportDisplayConfig = {
  entityLabelSingular: 'department',
  entityLabelPlural: 'departments',
  columnHints: [],
  pastePlaceholder: '',
  templateFileName: 'Department-template.csv',
  reportFileNamePrefix: 'Department-import',
  rowSummaryField: 'DepartmentName',
};

type Spy = ReturnType<typeof vi.fn>;

/** Every adapter member as a spy, named rather than indexed so property access type-checks. */
interface AdapterMock {
  preview: Spy;
  confirm: Spy;
  getJob: Spy;
  listJobs: Spy;
  retry: Spy;
  cancel: Spy;
  downloadTemplate: Spy;
  downloadReport: Spy;
}

describe('BulkImportJobsStore', () => {
  let adapter: AdapterMock;
  let commonMock: { showMessage: Spy; getPaginationParam: Spy };
  let store: InstanceType<typeof BulkImportJobsStore>;

  const settle = () => TestBed.inject(ApplicationRef).whenStable();
  const setContext = () => store.setContext(adapter as unknown as BulkImportAdapter, display);

  beforeEach(() => {
    adapter = {
      preview: vi.fn(),
      confirm: vi.fn(),
      getJob: vi.fn(),
      listJobs: vi.fn().mockReturnValue(of(jobsResponse([job()]))),
      retry: vi.fn().mockReturnValue(of(jobResponse(job({ status: BulkImportJobStatus.Queued })))),
      cancel: vi
        .fn()
        .mockReturnValue(of(jobResponse(job({ status: BulkImportJobStatus.Cancelled })))),
      downloadTemplate: vi.fn(),
      downloadReport: vi.fn().mockReturnValue(of(new Blob(['RowNumber,Status']))),
    };

    commonMock = {
      showMessage: vi.fn(),
      getPaginationParam: vi.fn().mockReturnValue({ page: 2, rows: 25 }),
    };

    TestBed.configureTestingModule({
      providers: [BulkImportJobsStore, { provide: Common, useValue: commonMock }],
    });
    store = TestBed.inject(BulkImportJobsStore);
  });

  it('stays idle until the page hands over its adapter', async () => {
    await settle();

    expect(adapter.listJobs).not.toHaveBeenCalled();
    // Idle has to read as loading, or the table flashes its empty state on entry.
    expect(store.isLoading()).toBe(true);
  });

  it('lists the jobs once it has a context', async () => {
    setContext();
    await settle();

    expect(adapter.listJobs).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 10 });
    expect(store.jobs()).toHaveLength(1);
  });

  it('refetches on a lazy load with the table paging', async () => {
    setContext();
    await settle();

    store.loadJobs({ first: 25, rows: 25 });
    await settle();

    expect(adapter.listJobs).toHaveBeenLastCalledWith({ pageNumber: 2, pageSize: 25 });
  });

  it('signals one more row, not a whole phantom page, when the API sends no total', async () => {
    adapter.listJobs.mockReturnValue(of(jobsResponse(Array.from({ length: 10 }, () => job()))));
    setContext();
    await settle();

    // A full page means "there is more"; claiming a second full page offers a page that fetches
    // empty and then disappears as the count corrects itself.
    expect(store.totalRecords()).toBe(11);
  });

  it('uses the API total when it sends one', async () => {
    adapter.listJobs.mockReturnValue(of(jobsResponse([job()], { totalRecords: 42 })));
    setContext();
    await settle();

    expect(store.totalRecords()).toBe(42);
  });

  it('reports a list failure rather than showing an empty table as success', async () => {
    adapter.listJobs.mockReturnValue(
      of(jobsResponse([], { isSucceeded: false, message: 'Not permitted' })),
    );
    setContext();
    await settle();

    expect(commonMock.showMessage).toHaveBeenCalledWith('Not permitted', 'error');
    expect(store.jobs()).toEqual([]);
  });

  it('reloads after a retry rather than patching the row it was called on', async () => {
    adapter.listJobs.mockClear();
    setContext();
    await settle();

    // Retry queues a *fresh* job, so the response carries an id that is not in the table yet.
    adapter.retry.mockReturnValue(of(jobResponse(job({ jobId: 'job-2' }))));

    store.retryJob(job());
    await settle();

    expect(adapter.retry).toHaveBeenCalledWith({ jobId: 'job-1' });
    expect(adapter.listJobs).toHaveBeenCalledTimes(2);
    expect(store.busyJobId()).toBeNull();
  });

  it('confirms a cancel only when the returned status says it was cancelled', async () => {
    setContext();
    await settle();

    store.cancelJob(job());

    expect(commonMock.showMessage).toHaveBeenLastCalledWith('ok', 'success');
  });

  it('reports a still-running job as a request, not a cancellation', async () => {
    adapter.cancel.mockReturnValue(of(jobResponse(job({ status: BulkImportJobStatus.Running }))));
    setContext();
    await settle();

    store.cancelJob(job());

    const [message, severity] = commonMock.showMessage.mock.lastCall as [string, string];
    expect(severity).toBe('info');
    expect(message).toContain('stops at its next batch boundary');
  });

  it('names the report after the display prefix and the job id', async () => {
    // Asserted through the anchor `downloadBlob` builds: the file name is the part a user sees.
    const anchor = document.createElement('a');
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    URL.createObjectURL = vi.fn().mockReturnValue('blob:report');
    URL.revokeObjectURL = vi.fn();

    setContext();
    await settle();

    store.downloadReport(job());

    expect(anchor.download).toBe('Department-import-job-1.csv');
    expect(click).toHaveBeenCalled();
    createElement.mockRestore();
  });

  it('surfaces a download failure and clears the row spinner', async () => {
    adapter.downloadReport.mockReturnValue(throwError(() => new Error('Gone')));
    setContext();
    await settle();

    store.downloadReport(job());

    expect(commonMock.showMessage).toHaveBeenLastCalledWith('Gone', 'error');
    expect(store.downloadingJobId()).toBeNull();
  });

  it('offers retry only on the failed outcomes, and cancel only before a job is terminal', () => {
    expect(store.canRetry(job({ status: BulkImportJobStatus.CompletedWithErrors }))).toBe(true);
    expect(store.canRetry(job({ status: BulkImportJobStatus.Failed }))).toBe(true);
    expect(store.canRetry(job({ status: BulkImportJobStatus.Completed }))).toBe(false);
    expect(store.canRetry(job({ status: BulkImportJobStatus.Running }))).toBe(false);

    expect(store.canCancel(job({ status: BulkImportJobStatus.Draft }))).toBe(true);
    expect(store.canCancel(job({ status: BulkImportJobStatus.Running }))).toBe(true);
    expect(store.canCancel(job({ status: BulkImportJobStatus.Completed }))).toBe(false);
    expect(store.canCancel(job({ status: BulkImportJobStatus.Cancelled }))).toBe(false);
  });
});
