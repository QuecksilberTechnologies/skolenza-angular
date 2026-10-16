import { DepartmentsApi } from '@core/services';
import { BulkImportAdapter, BulkImportDisplayConfig } from '@shared/interfaces';

/**
 * The wizard's adapter for the Department master.
 *
 * Extracted from the list page so the Bulk Upload job-history screen drives the same endpoints and
 * the same copy: two surfaces import the one master, and a second inline copy would drift.
 * `ModuleId` / `OperationId` are stamped by `moduleOperationInterceptor`, not here.
 */
export function departmentBulkImportAdapter(api: DepartmentsApi): BulkImportAdapter {
  return {
    preview: (body) => api.previewBulkImport(body),
    confirm: (body) => api.confirmBulkImport(body),
    getJob: (jobId) => api.getBulkImportJob(jobId),
    listJobs: (req) => api.listBulkImportJobs(req),
    retry: (body) => api.retryBulkImport(body),
    cancel: (body) => api.cancelBulkImport(body),
    downloadTemplate: () => api.downloadBulkImportTemplate(),
    downloadReport: (jobId) => api.downloadBulkImportReport(jobId),
  };
}

export const DEPARTMENT_IMPORT_DISPLAY: BulkImportDisplayConfig = {
  entityLabelSingular: 'department',
  entityLabelPlural: 'departments',
  columnHints: [
    'DepartmentName: required, up to 255 characters',
    'Description: optional, up to 500 characters',
    'Remark: optional, up to 200 characters',
    'IsActive: optional, true or false, blank means true',
  ],
  pastePlaceholder:
    'DepartmentName,Description,Remark,IsActive\nEngineering,Product development,Head office,true',
  templateFileName: 'Department-template.csv',
  reportFileNamePrefix: 'Department-import',
  rowSummaryField: 'DepartmentName',
};
