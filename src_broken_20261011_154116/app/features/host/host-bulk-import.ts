import { HostBulkImportApi, HostBulkImportTarget } from '@core/services';
import { BulkImportAdapter, BulkImportDisplayConfig } from '@shared/interfaces';

/**
 * The wizard's adapter for one Host catalogue.
 *
 * Every target speaks the same eight flat `import/*` routes off its own controller, so the target
 * is the only thing that varies and one factory serves all six. `institutionId` is left unset by the
 * global catalogues and supplied only by `InstitutionCardMaster`, which imports on a institution's behalf.
 *
 * `ModuleId` / `OperationId` are stamped by `moduleOperationInterceptor`, not here.
 */
export function hostBulkImportAdapter(
  api: HostBulkImportApi,
  target: HostBulkImportTarget,
  institutionId?: () => string | null | undefined,
): BulkImportAdapter {
  /** Read per call: a screen can open the wizard before its institution selection has resolved. */
  const scope = () => institutionId?.() ?? undefined;

  return {
    preview: (body) => {
      // Multipart, so the institution travels as one more part rather than as a query string.
      const id = scope();
      if (id) body.append('institutionId', id);
      return api.previewBulkImport(target, body);
    },
    confirm: (body) => api.confirmBulkImport(target, { ...body, institutionId: scope() }),
    retry: (body) => api.retryBulkImport(target, { ...body, institutionId: scope() }),
    cancel: (body) => api.cancelBulkImport(target, { ...body, institutionId: scope() }),
    getJob: (jobId) => api.getBulkImportJob(target, jobId, scope()),
    listJobs: (req) => api.listBulkImportJobs(target, { ...req, institutionId: scope() }),
    downloadTemplate: () => api.downloadBulkImportTemplate(target, scope()),
    downloadReport: (jobId) => api.downloadBulkImportReport(target, jobId, scope()),
  };
}

export const MODULE_IMPORT_DISPLAY: BulkImportDisplayConfig = {
  entityLabelSingular: 'parent module',
  entityLabelPlural: 'parent modules',
  columnHints: [
    'ModuleCode: required, up to 50 characters, unique',
    'ModuleName: required, up to 100 characters',
    'DisplayName: required, up to 100 characters',
    'UrlPath: required, up to 500 characters',
    'ModuleScope: required, 1 for Institution/Common or 2 for Host',
    'IsCommonMenu: optional, true or false, blank means false',
    'IsModuleDisplayInUI: optional, true or false, blank means true',
    'IsActive: optional, true or false, blank means true',
    'ItemPriority: optional, integer, negative pins the item to the end of its menu',
    'ImageIconWeb: optional, up to 255 characters',
    'ImageIconMobile: optional, up to 255 characters',
    'Remark: optional, up to 200 characters',
  ],
  pastePlaceholder:
    'ModuleCode,ModuleName,DisplayName,UrlPath,ModuleScope,IsActive\n' +
    'HR_SETTINGS,HR Settings,HR Settings,hr-settings,1,true',
  templateFileName: 'Module-template.csv',
  reportFileNamePrefix: 'Module-import',
  rowSummaryField: 'ModuleName',
};

/*
 * The five catalogues below take their column lists from the templates the live smoke run
 * downloaded on 2026-09-19 (`docs/testing/bulk/all-live-smoke/2026-09-19-evidence/*-template.csv`).
 * Each "minimum accepted row" is the payload that run imported successfully, so it is a set the
 * API is known to accept rather than a guess at which single columns are mandatory. The downloaded
 * template stays the authority on the full column list.
 */

export const DEVICE_MASTER_IMPORT_DISPLAY: BulkImportDisplayConfig = {
  entityLabelSingular: 'device',
  entityLabelPlural: 'devices',
  columnHints: [
    'Minimum accepted row: SNo, DeviceCode, DeviceName, CompanyName, ModelNo, DeviceType',
    'SNo: the serial or stock number',
    'DeviceCode: unique within the catalogue',
    'DeviceType: the vendor family, such as FaceFingerprint',
    'IsActive: optional, true or false, blank means true',
    'The template carries 70 columns. Capability flags (SupportsFace, SupportsMqtt and the rest),',
    'capacities, hardware specifications, pricing and warranty fields are all optional',
  ],
  pastePlaceholder:
    'SNo,DeviceCode,DeviceName,CompanyName,ModelNo,DeviceType,IsActive\n' +
    'ZK-SFV5L-01,ZKTECO-SPEEDFACE-V5L,ZKTeco SpeedFace V5L,ZKTeco,SpeedFace-V5L,FaceFingerprint,true',
  templateFileName: 'Device-master-template.csv',
  reportFileNamePrefix: 'Device-master-import',
  rowSummaryField: 'DeviceCode',
};

export const INSTITUTION_CARD_IMPORT_DISPLAY: BulkImportDisplayConfig = {
  entityLabelSingular: 'card',
  entityLabelPlural: 'cards',
  columnHints: [
    'Every row is imported into the institution selected above, so pick one before importing',
    'Minimum accepted row: CardNumber, CardReference, PurchaseCurrencyCode,',
    'UnitPurchasePriceExcludingTax, PurchaseInvoiceDate',
    'CardNumber: unique within the institution. Card numbers are masked in the downloaded report',
    'PurchaseInvoiceDate: yyyy-MM-dd',
    'Tax: TaxTreatment with the matching CgstRate/CgstAmount, SgstRate/SgstAmount or',
    'IgstRate/IgstAmount, or the ForeignTaxLabel/ForeignTaxRate/ForeignTaxAmount trio',
    'Supplier and place of supply take country and state ids, not names',
    'IsActive: optional, true or false, blank means true',
  ],
  pastePlaceholder:
    'CardNumber,CardReference,PurchaseCurrencyCode,UnitPurchasePriceExcludingTax,CgstAmount,PurchaseInvoiceDate,IsActive\n' +
    '0001234567,QT-CORPORATE-ACCESS-01,INR,150,13.50,2026-09-19,true',
  templateFileName: 'Institution-card-template.csv',
  reportFileNamePrefix: 'Institution-card-import',
  rowSummaryField: 'CardNumber',
};

export const SUB_MODULE_IMPORT_DISPLAY: BulkImportDisplayConfig = {
  entityLabelSingular: 'sub module',
  entityLabelPlural: 'child modules',
  columnHints: [
    'Minimum accepted row: ParentModuleCode, ModuleCode, ModuleName, PageName, DisplayName,',
    'URLPath, ModuleScope',
    'ParentModuleCode: an existing parent module, matched by code',
    'ModuleCode: unique across the catalogue',
    'ModuleScope: 1 for Institution/Common or 2 for Host',
    'IsModuleDisplayInUI and IsCommonMenu: optional, true or false',
    'ItemPriority: optional, integer, negative pins the item to the end of its menu',
    'ImageIconWeb, ImageIconMobile and Remark: optional',
    'IsActive: optional, true or false, blank means true',
  ],
  pastePlaceholder:
    'ParentModuleCode,ModuleCode,ModuleName,PageName,DisplayName,URLPath,ModuleScope,IsActive\n' +
    'HR_SETTINGS,HR_LEAVE_RULES,HR-Leave-Rules,hr-leave-rules,Leave Rules,/app/hr/leave-rules,1,true',
  templateFileName: 'SubModule-template.csv',
  reportFileNamePrefix: 'SubModule-import',
  rowSummaryField: 'ModuleCode',
};

export const OPERATION_IMPORT_DISPLAY: BulkImportDisplayConfig = {
  entityLabelSingular: 'operation',
  entityLabelPlural: 'operations',
  columnHints: [
    'Minimum accepted row: OperationName, OperationType',
    'OperationName: what the action is called wherever it is granted',
    'OperationType: the numeric type id, unique across the catalogue',
    'Remark and IconImage: optional',
    'IsActive: optional, true or false, blank means true',
  ],
  pastePlaceholder:
    'OperationName,OperationType,Remark,IsActive,IconImage\n' +
    'Review Compliance,200145,Review a compliance record,true,bi bi-clipboard-check',
  templateFileName: 'Operation-template.csv',
  reportFileNamePrefix: 'Operation-import',
  rowSummaryField: 'OperationName',
};

export const MODULE_OPERATION_IMPORT_DISPLAY: BulkImportDisplayConfig = {
  entityLabelSingular: 'module operation',
  entityLabelPlural: 'module operations',
  columnHints: [
    'Minimum accepted row: ModuleCode, OperationType, PageURL',
    'ModuleCode: an existing module or sub module, matched by code',
    'OperationType: an existing operation, matched by its numeric type id',
    'IsCommonItem and IsOperational: optional, true or false',
    'Priority: optional, integer, orders the action within its module',
    'DataViewStructureId, PageTypeId, IconURL and Remark: optional',
    'IsActive: optional, true or false, blank means true',
  ],
  pastePlaceholder:
    'ModuleCode,OperationType,PageURL,IconURL,IsCommonItem,IsOperational,Priority,IsActive\n' +
    'HR_LEAVE_RULES,200145,/app/hr/leave-rules,bi bi-clipboard-check,false,true,10,true',
  templateFileName: 'ModuleOperation-template.csv',
  reportFileNamePrefix: 'ModuleOperation-import',
  rowSummaryField: 'ModuleCode',
};
