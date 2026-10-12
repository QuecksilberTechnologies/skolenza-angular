import { RolesApi } from '@core/services';
import { BulkImportAdapter, BulkImportDisplayConfig } from '@shared/interfaces';

/** The wizard's adapter for the Role master. See `department-bulk-import.ts` for why. */
export function roleBulkImportAdapter(api: RolesApi): BulkImportAdapter {
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

export const ROLE_IMPORT_DISPLAY: BulkImportDisplayConfig = {
  entityLabelSingular: 'role',
  entityLabelPlural: 'roles',
  columnHints: [
    'RoleName: required, up to 100 characters',
    'RoleType: required; use the ID returned by the Role Type catalogue',
    'Remark: optional, up to 200 characters',
    'IsActive: optional, true or false, blank means true',
  ],
  pastePlaceholder: 'RoleName,RoleType,Remark,IsActive\nSupport Lead,3,Handles tier 2 tickets,true',
  templateFileName: 'Role-template.csv',
  reportFileNamePrefix: 'Role-import',
  rowSummaryField: 'RoleName',
};
