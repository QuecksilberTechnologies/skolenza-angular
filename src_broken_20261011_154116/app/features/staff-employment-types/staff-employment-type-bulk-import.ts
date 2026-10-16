import { StaffEmploymentTypesAPI } from '@core/services';
import { BulkImportAdapter, BulkImportDisplayConfig } from '@shared/interfaces';

/** The wizard's adapter for the StaffMember Type master. See `department-bulk-import.ts` for why. */
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
  entityLabelSingular: 'staffMember type',
  entityLabelPlural: 'staffMember types',
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

