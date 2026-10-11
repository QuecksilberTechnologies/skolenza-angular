import { of } from 'rxjs';
import { vi } from 'vitest';

import { HostBulkImportApi } from '@core/services';

import { hostBulkImportAdapter } from './host-bulk-import';

type Spy = ReturnType<typeof vi.fn>;

interface ApiMock {
  previewBulkImport: Spy;
  confirmBulkImport: Spy;
  getBulkImportJob: Spy;
  listBulkImportJobs: Spy;
  retryBulkImport: Spy;
  cancelBulkImport: Spy;
  downloadBulkImportTemplate: Spy;
  downloadBulkImportReport: Spy;
}

describe('hostBulkImportAdapter', () => {
  let api: ApiMock;

  const build = (institutionId?: () => string | null | undefined) =>
    hostBulkImportAdapter(api as unknown as HostBulkImportApi, 'ChildModule', institutionId);

  beforeEach(() => {
    api = {
      previewBulkImport: vi.fn().mockReturnValue(of({})),
      confirmBulkImport: vi.fn().mockReturnValue(of({})),
      getBulkImportJob: vi.fn().mockReturnValue(of({})),
      listBulkImportJobs: vi.fn().mockReturnValue(of({})),
      retryBulkImport: vi.fn().mockReturnValue(of({})),
      cancelBulkImport: vi.fn().mockReturnValue(of({})),
      downloadBulkImportTemplate: vi.fn().mockReturnValue(of(new Blob())),
      downloadBulkImportReport: vi.fn().mockReturnValue(of(new Blob())),
    };
  });

  it('routes every call at the target it was built for', () => {
    const adapter = build();
    const body = new FormData();

    adapter.preview(body);
    adapter.confirm({ jobId: 'job-1' });
    adapter.getJob('job-1');
    adapter.listJobs?.({ pageNumber: 1 });
    adapter.retry?.({ jobId: 'job-1' });
    adapter.cancel?.({ jobId: 'job-1' });
    adapter.downloadTemplate();
    adapter.downloadReport('job-1');

    expect(api.previewBulkImport).toHaveBeenCalledWith('ChildModule', body);
    expect(api.confirmBulkImport).toHaveBeenCalledWith('ChildModule', expect.anything());
    expect(api.getBulkImportJob).toHaveBeenCalledWith('ChildModule', 'job-1', undefined);
    expect(api.listBulkImportJobs).toHaveBeenCalledWith('ChildModule', expect.anything());
    expect(api.retryBulkImport).toHaveBeenCalledWith('ChildModule', expect.anything());
    expect(api.cancelBulkImport).toHaveBeenCalledWith('ChildModule', expect.anything());
    expect(api.downloadBulkImportTemplate).toHaveBeenCalledWith('ChildModule', undefined);
    expect(api.downloadBulkImportReport).toHaveBeenCalledWith('ChildModule', 'job-1', undefined);
  });

  it('sends no institution for a global catalogue', () => {
    const adapter = build();
    const body = new FormData();

    adapter.preview(body);
    adapter.confirm({ jobId: 'job-1' });

    expect(body.has('institutionId')).toBe(false);
    expect(api.confirmBulkImport).toHaveBeenCalledWith('ChildModule', {
      jobId: 'job-1',
      institutionId: undefined,
    });
  });

  it('carries the institution as a form part on preview and a field everywhere else', () => {
    const adapter = build(() => 'institution-7');
    const body = new FormData();

    adapter.preview(body);
    adapter.confirm({ jobId: 'job-1' });
    adapter.listJobs?.({ pageSize: 25 });
    adapter.downloadReport('job-1');

    expect(body.get('institutionId')).toBe('institution-7');
    expect(api.confirmBulkImport).toHaveBeenCalledWith('ChildModule', {
      jobId: 'job-1',
      institutionId: 'institution-7',
    });
    expect(api.listBulkImportJobs).toHaveBeenCalledWith('ChildModule', {
      pageSize: 25,
      institutionId: 'institution-7',
    });
    expect(api.downloadBulkImportReport).toHaveBeenCalledWith('ChildModule', 'job-1', 'institution-7');
  });

  it('reads the institution per call, so a selection made after the wizard opened still counts', () => {
    let institutionId: string | null = null;
    const adapter = build(() => institutionId);

    adapter.downloadTemplate();
    expect(api.downloadBulkImportTemplate).toHaveBeenLastCalledWith('ChildModule', undefined);

    institutionId = 'institution-9';
    adapter.downloadTemplate();
    expect(api.downloadBulkImportTemplate).toHaveBeenLastCalledWith('ChildModule', 'institution-9');
  });

  it('treats a cleared institution filter as no institution rather than an empty string', () => {
    const adapter = build(() => '');
    const body = new FormData();

    adapter.preview(body);

    expect(body.has('institutionId')).toBe(false);
  });
});
