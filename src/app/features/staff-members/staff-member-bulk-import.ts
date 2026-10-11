import { StaffMembersApi } from '@core/services';
import {
  BulkImportAdapter,
  BulkImportDisplayConfig,
  BulkImportFieldConfig,
} from '@shared/interfaces';

/** The wizard's adapter for the StaffMember master. See `department-bulk-import.ts` for why. */
export function staffMemberBulkImportAdapter(api: StaffMembersApi): BulkImportAdapter {
  return {
    preview: (body) => api.previewBulkImport(body),
    confirm: (body) => api.confirmBulkImport(body),
    getJob: (jobId) => api.getBulkImportJob(jobId),
    listJobs: (req) => api.listBulkImportJobs(req),
    retry: (body) => api.retryBulkImport(body),
    cancel: (body) => api.cancelBulkImport(body),
    downloadTemplate: () => api.downloadBulkImportTemplate(),
    downloadReport: (jobId) => api.downloadBulkImportReport(jobId),
    // StaffMember is the only master that creates logins, so it is the only one that can invite.
    sendInvitations: (body) => api.sendBulkImportInvitations(body),
  };
}

/**
 * A function rather than a constant: `fields` comes from `staffMemberImportFields()`, which needs an
 * injection context for its lazy lookups, so only the caller can build it.
 */
export function staffMemberImportDisplay(
  fields: readonly BulkImportFieldConfig[],
): BulkImportDisplayConfig {
  return {
    entityLabelSingular: 'staff member',
    entityLabelPlural: 'staff members',
    sheetName: 'StaffMembers',
    columnHints: [
      'Required: FirstName, LastName, OfficialEmail, DateOfBirth, DateOfOnBoarding',
      'Required ids: GenderId, CountryId, DepartmentId, DesignationId, StaffEmploymentTypeId',
      'Required flags: HasPermanent and IsActive, true or false',
      'RoleId: optional, the Staff role is used when it is blank',
      'Designation must belong to the chosen Department, and both must be active',
      'Dates use yyyy-MM-dd. Keep codes and phone numbers as text to preserve leading zeros',
      'ContactNumber is required once any contact or address column is filled',
      'Existing accounts are skipped, never overwritten or reactivated',
    ],
    pastePlaceholder:
      'FirstName,LastName,OfficialEmail,DateOfBirth,DateOfOnBoarding,GenderId,CountryId,' +
      'DepartmentId,DesignationId,StaffEmploymentTypeId,HasPermanent,IsActive\n' +
      'Asha,Rao,asha.rao@example.com,1995-04-12,2026-01-05,2,1,3,7,1,true,true',
    templateFileName: 'StaffMember-template.csv',
    reportFileNamePrefix: 'StaffMember-import',
    // The one column that is both always required and unique, so a failed row is identifiable.
    rowSummaryField: 'OfficialEmail',
    // Lets the dialog's fix editor render real fields rather than 27 unlabelled text boxes.
    fields,
  };
}
