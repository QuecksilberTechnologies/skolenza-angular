import { DesignationsApi } from '@core/services';
import { BulkImportAdapter, BulkImportDisplayConfig } from '@shared/interfaces';

/** The wizard's adapter for the Designation master. See `department-bulk-import.ts` for why. */
export function designationBulkImportAdapter(api: DesignationsApi): BulkImportAdapter {
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

export const DESIGNATION_IMPORT_DISPLAY: BulkImportDisplayConfig = {
  entityLabelSingular: 'designation',
  entityLabelPlural: 'designations',
  columnHints: [
    'DesignationName: required, up to 255 characters',
    'DepartmentName: required, must match an active department that already exists',
    'Description: optional, up to 500 characters',
    'IsActive: optional, true or false, blank means true',
  ],
  pastePlaceholder:
    'DesignationName,DepartmentName,Description,IsActive\nManager,Engineering,Engineering manager,true',
  templateFileName: 'Designation-template.csv',
  reportFileNamePrefix: 'Designation-import',
  rowSummaryField: 'DesignationName',
};
