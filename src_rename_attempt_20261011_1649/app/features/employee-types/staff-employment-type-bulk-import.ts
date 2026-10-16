import { StaffEmploymentTypesAPI } from '@core/services';
import { BulkImportAdapter, BulkImportDisplayConfig } from '@shared/interfaces';

/** The wizard's adapter for the Staff Employment Type master. */
export function staffEmploymentTypeBulkImportAdapter(api: StaffEmploymentTypesAPI): BulkImportAdapter {
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

export const STAFF_EMPLOYMENT_TYPES_IMPORT_DISPLAY: BulkImportDisplayConfig = {
  entityLabelSingular: 'staff employment type',
  entityLabelPlural: 'staff employment types',
  columnHints: [
    'TypeName: required, up to 255 characters',
    'Description: optional, up to 255 characters',
    'Remark: optional, up to 255 characters',
    'IsActive: optional, true or false, blank means true',
  ],
  pastePlaceholder:
    'TypeName,Description,Remark,IsActive\nContractor,Contract staff,Project based,true',
  templateFileName: 'StaffEmploymentType-template.csv',
  reportFileNamePrefix: 'StaffEmploymentType-import',
  rowSummaryField: 'TypeName',
};

