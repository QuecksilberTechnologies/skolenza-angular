import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BulkImportJobResponse, BulkImportJobStatus } from '@shared/interfaces';

import { HostBulkImportApi } from './host-bulk-import-api';

const jobResponse: BulkImportJobResponse = {
  isSucceeded: true,
  message: 'ok',
  errors: [],
  data: {
    jobId: 'job-1',
    master: 1,
    status: BulkImportJobStatus.Queued,
    createdAtUtc: '2026-09-01T10:00:00Z',
    updatedAtUtc: '2026-09-01T10:00:00Z',
    scheduledAtUtc: null,
    totalRows: 3,
    processedRows: 0,
    createdCount: 0,
    existingCount: 0,
    failedCount: 0,
    error: null,
    preview: null,
  },
};

describe('HostBulkImportApi', () => {
  let api: HostBulkImportApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HostBulkImportApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(HostBulkImportApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('builds the URL from the target it is given', () => {
    api.previewBulkImport('ChildModule', new FormData()).subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/ChildModule/import/preview'));
    expect(request.request.method).toBe('POST');
    request.flush(jobResponse);
  });

  it('previews multipart data without changing it', () => {
    const formData = new FormData();
    formData.append('PastedText', 'OperationName\nApprove');

    api.previewBulkImport('Operation', formData).subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/Operation/import/preview'));
    expect(request.request.body).toBe(formData);
    request.flush(jobResponse);
  });

  it('carries the job id as a query param, not a path segment', () => {
    api.getBulkImportJob('DeviceMaster', 'job-1').subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/DeviceMaster/import/job'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('JobId')).toBe('job-1');
    request.flush(jobResponse);
  });

  it('pages the job history on the query string', () => {
    api.listBulkImportJobs('ModuleOperation', { pageNumber: 3, pageSize: 50 }).subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/ModuleOperation/import/jobs'));
    expect(request.request.params.get('PageNumber')).toBe('3');
    expect(request.request.params.get('PageSize')).toBe('50');
    request.flush({ ...jobResponse, data: [jobResponse.data] });
  });

  it('confirms, retries and cancels with the job id alone', () => {
    for (const [call, path] of [
      [() => api.confirmBulkImport('Module', { jobId: 'job-1' }), '/Module/import/confirm'],
      [() => api.retryBulkImport('Module', { jobId: 'job-1' }), '/Module/import/retry'],
      [() => api.cancelBulkImport('Module', { jobId: 'job-1' }), '/Module/import/cancel'],
    ] as const) {
      call().subscribe();

      const request = httpMock.expectOne((req) => req.url.endsWith(path));
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ jobId: 'job-1' });
      request.flush(jobResponse);
    }
  });

  it('omits the institution id for a global catalogue', () => {
    api.downloadBulkImportTemplate('Operation').subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/Operation/import/template'));
    expect(request.request.params.keys()).toEqual([]);
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['OperationName']));
  });

  it('sends the institution id for the one target that imports on a institution behalf', () => {
    api.listBulkImportJobs('InstitutionCardMaster', { institutionId: 'institution-7' }).subscribe();

    const jobs = httpMock.expectOne((req) => req.url.endsWith('/InstitutionCardMaster/import/jobs'));
    expect(jobs.request.params.get('InstitutionId')).toBe('institution-7');
    jobs.flush({ ...jobResponse, data: [] });

    api.downloadBulkImportReport('InstitutionCardMaster', 'job-1', 'institution-7').subscribe();

    const report = httpMock.expectOne((req) =>
      req.url.endsWith('/InstitutionCardMaster/import/report'),
    );
    expect(report.request.params.get('JobId')).toBe('job-1');
    expect(report.request.params.get('InstitutionId')).toBe('institution-7');
    expect(report.request.responseType).toBe('blob');
    report.flush(new Blob(['RowNumber,Status']));
  });
});
