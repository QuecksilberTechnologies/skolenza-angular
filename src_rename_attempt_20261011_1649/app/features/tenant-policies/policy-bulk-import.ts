import { InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import {
  BulkImportAdapter,
  BulkImportDisplayConfig,
  InstitutionPolicyBulkTarget,
} from '@shared/interfaces';

/**
 * The wizard's adapter for one policy bulk target.
 *
 * Nothing stamps `ModuleId`/`OperationId` for InstitutionPolicy — the controller is absent from
 * `MODULE_OPERATION_ROUTES` — so every call resolves them here, against the leaf that owns the
 * target: `Import` on the writes the catalogue shows as operation 13, `View` on the reads it shows
 * as operation 4. The ids are resolved per call rather than once, because a screen can open the
 * wizard before `my-menu` has been read.
 */
export function policyBulkImportAdapter(
  institutionPolicyApi: InstitutionPolicyApi,
  featurePageStore: InstanceType<typeof FeaturePageStore>,
  target: InstitutionPolicyBulkTarget,
  moduleCode: string,
): BulkImportAdapter {
  const ids = (operationName: string) => {
    const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
      [moduleCode],
      operationName,
    );
    return { moduleId: ModuleId, operationId: OperationId };
  };

  return {
    preview: (body) => {
      // Multipart, so the context travels as two more parts rather than as a query string.
      const { moduleId, operationId } = ids('Import');
      if (moduleId !== undefined) body.append('moduleId', String(moduleId));
      if (operationId !== undefined) body.append('operationId', String(operationId));
      return institutionPolicyApi.previewBulkImport(target, body);
    },
    confirm: (body) => institutionPolicyApi.confirmBulkImport(target, { ...body, ...ids('Import') }),
    retry: (body) => institutionPolicyApi.retryBulkImport(target, { ...body, ...ids('Import') }),
    cancel: (body) => institutionPolicyApi.cancelBulkImport(target, { ...body, ...ids('Import') }),
    getJob: (jobId) => institutionPolicyApi.getBulkImportJob(target, jobId, ids('View')),
    listJobs: (req) => institutionPolicyApi.getBulkImportJobs(target, { ...req, ...ids('View') }),
    downloadTemplate: () => institutionPolicyApi.downloadBulkImportTemplate(target, ids('View')),
    downloadReport: (jobId) => institutionPolicyApi.downloadBulkImportReport(target, jobId, ids('View')),
  };
}

/** Columns and samples are the template headers documented in `docs/specs/INSTITUTION_POLICY/`. */
export const POLICY_TYPE_IMPORT_DISPLAY: BulkImportDisplayConfig = {
  entityLabelSingular: 'policy type',
  entityLabelPlural: 'policy types',
  columnHints: [
    'PolicyTypeCode: required, unique within the institution',
    'PolicyName: required',
    'PolicyCategoryCode: required, an existing policy category',
    'Description: optional',
    'DefaultCurrencyCode: optional, ISO code such as INR',
    'IsActive: optional, true or false, blank means true',
  ],
  pastePlaceholder:
    'PolicyTypeCode,PolicyName,PolicyCategoryCode,Description,DefaultCurrencyCode,IsActive\nLEAVE,Leave Policy,LEAVE,Leave and holiday rules,INR,true',
  templateFileName: 'Policy-type-template.csv',
  reportFileNamePrefix: 'Policy-type-import',
  rowSummaryField: 'PolicyTypeCode',
};

export const POLICY_DEFINITION_IMPORT_DISPLAY: BulkImportDisplayConfig = {
  entityLabelSingular: 'policy',
  entityLabelPlural: 'policies',
  columnHints: [
    'PolicyCode: required, unique within the institution',
    'PolicyName: required',
    'PolicyTypeCode: required, an existing policy type',
    'EffectiveFrom: required, yyyy-MM-dd',
    'EffectiveTo: optional, yyyy-MM-dd, blank means open ended',
    'Summary: optional',
    'DefaultCurrencyCode: optional, ISO code such as INR',
    'RulesJson: optional JSON array, doubled quotes inside the cell',
    'ApplicabilityJson: optional JSON array, doubled quotes inside the cell',
  ],
  pastePlaceholder:
    'PolicyCode,PolicyName,PolicyTypeCode,EffectiveFrom,EffectiveTo,Summary,DefaultCurrencyCode,RulesJson,ApplicabilityJson\nMH-CASUAL-LEAVE,Maharashtra Casual Leave,LEAVE,2027-01-01,,Maharashtra permanent staff,INR,,',
  templateFileName: 'Policy-template.csv',
  reportFileNamePrefix: 'Policy-import',
  rowSummaryField: 'PolicyCode',
};

export const POLICY_ASSIGNMENT_IMPORT_DISPLAY: BulkImportDisplayConfig = {
  entityLabelSingular: 'assignment',
  entityLabelPlural: 'assignments',
  columnHints: [
    'PolicyCode: required, an existing policy',
    'VersionNumber: required, and that version must be Published',
    'StaffMemberCode: required, an existing staffMember',
    'EffectiveFrom: required, yyyy-MM-dd',
    'EffectiveTo: optional, yyyy-MM-dd, blank means open ended',
    'IsMandatory: optional, true or false, blank means true',
  ],
  pastePlaceholder:
    'PolicyCode,VersionNumber,StaffMemberCode,EffectiveFrom,EffectiveTo,IsMandatory\nMH-CASUAL-LEAVE,1,QT/2026/0201,2027-01-01,,true',
  templateFileName: 'Policy-assignment-template.csv',
  reportFileNamePrefix: 'Policy-assignment-import',
  rowSummaryField: 'PolicyCode',
};
