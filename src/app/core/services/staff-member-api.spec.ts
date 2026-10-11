import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  BulkImportJobResponse,
  BulkImportJobStatus,
  BulkImportPreviewResponse,
} from '@shared/interfaces';

import { StaffMembersApi } from './staff-member-api';

const previewResponse: BulkImportPreviewResponse = {
  isSucceeded: true,
  message: 'Draft saved. Review and confirm to queue import.',
  errors: [],
  data: {
    jobId: 'job-1',
    master: 5,
    sourceColumns: ['FirstName', 'LastName', 'OfficialEmail'],
    columnMapping: {
      FirstName: 'FirstName',
      LastName: 'LastName',
      OfficialEmail: 'OfficialEmail',
    },
    errors: [],
    rows: [],
    readyCount: 1,
    existingCount: 0,
    invalidCount: 0,
    isValid: true,
    confirmationAvailable: true,
    canCommit: true,
  },
};

const jobResponse: BulkImportJobResponse = {
  isSucceeded: true,
  message: '',
  errors: [],
  data: {
    jobId: 'job-1',
    master: 5,
    status: BulkImportJobStatus.Completed,
    createdAtUtc: '2026-09-17T18:04:43.676985Z',
    updatedAtUtc: '2026-09-17T18:04:48.30119Z',
    scheduledAtUtc: null,
    totalRows: 1,
    processedRows: 1,
    createdCount: 1,
    existingCount: 0,
    failedCount: 0,
    error: null,
    preview: null,
  },
};

describe('StaffMembersApi bulk import', () => {
  let api: StaffMembersApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StaffMembersApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(StaffMembersApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('previews multipart data without changing it', () => {
    const formData = new FormData();
    formData.append('SheetName', 'StaffMembers');
    formData.append('PastedText', 'FirstName,LastName\nAsha,Rao');

    api.previewBulkImport(formData).subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/Staff/bulk/preview'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBe(formData);
    request.flush(previewResponse);
  });

  it('confirms with the saved job id alone', () => {
    api.confirmBulkImport({ jobId: 'job-1' }).subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/Staff/bulk/confirm'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ jobId: 'job-1' });
    request.flush(jobResponse);
  });

  it('reads a job by route id and sends no permission params of its own', () => {
    api.getBulkImportJob('job-1').subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/Staff/bulk/jobs/job-1'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(jobResponse);
  });

  it('lists jobs with paging on the query string and no path segment', () => {
    api.listBulkImportJobs({ pageNumber: 2, pageSize: 25 }).subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/Staff/bulk/jobs'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('PageNumber')).toBe('2');
    expect(request.request.params.get('PageSize')).toBe('25');
    request.flush({ ...jobResponse, data: [jobResponse.data] });
  });

  it('lists the first page when no paging is given', () => {
    api.listBulkImportJobs().subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/Staff/bulk/jobs'));
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ ...jobResponse, data: [] });
  });

  it('retries and cancels with the saved job id alone', () => {
    api.retryBulkImport({ jobId: 'job-1' }).subscribe();

    const retry = httpMock.expectOne((req) => req.url.endsWith('/Staff/bulk/retry'));
    expect(retry.request.method).toBe('POST');
    expect(retry.request.body).toEqual({ jobId: 'job-1' });
    retry.flush(jobResponse);

    api.cancelBulkImport({ jobId: 'job-1' }).subscribe();

    const cancel = httpMock.expectOne((req) => req.url.endsWith('/Staff/bulk/cancel'));
    expect(cancel.request.method).toBe('POST');
    expect(cancel.request.body).toEqual({ jobId: 'job-1' });
    cancel.flush(jobResponse);
  });

  it('requests binary template and report downloads', () => {
    api.downloadBulkImportTemplate().subscribe();
    const template = httpMock.expectOne((req) => req.url.endsWith('/Staff/bulk/template'));
    expect(template.request.responseType).toBe('blob');
    template.flush(new Blob(['FirstName,LastName,OfficialEmail']));

    api.downloadBulkImportReport('job-1').subscribe();
    const report = httpMock.expectOne((req) =>
      req.url.endsWith('/Staff/bulk/jobs/job-1/report'),
    );
    expect(report.request.responseType).toBe('blob');
    report.flush(new Blob(['RowNumber,Status']));
  });

  it('sends invitations for a finished job by id, with no row selection', () => {
    api.sendBulkImportInvitations({ jobId: 'job-1' }).subscribe();

    const request = httpMock.expectOne((req) =>
      req.url.endsWith('/Staff/bulk/send-invitations'),
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ jobId: 'job-1' });
    request.flush(jobResponse);
  });
});

