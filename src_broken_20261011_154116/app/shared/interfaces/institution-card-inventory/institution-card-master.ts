/**
 * Host-only physical card procurement inventory for a selected institution, behind
 * `/api/InstitutionCardMaster/*`.
 *
 * ASSUMED CONTRACT — swagger documents the request DTOs but declares every response as a bare
 * `200 OK` with no schema, so the row and envelope shapes below follow the house convention
 * (`{ isSucceeded, message, errors, data }`, paginated reads adding the four page fields), same as
 * `device-master.ts`. `taxTreatment` and `cardStatus` are unnamed backend enums (`InstitutionCardTaxTreatment`
 * 1-4, `InstitutionCardStatus` 1-6) resolved to labels at runtime via
 * `DeviceDdlOptionsApi.getInstitutionCardInventory()` rather than a local enum.
 */

/** Fields shared by the create and update DTOs and echoed back on reads. */
export interface InstitutionCardMasterFields {
  institutionId: string;
  cardNumber: string | null;
  cardReference: string | null;
  purchaseCurrencyCode: string | null;
  unitPurchasePriceExcludingTax: number | null;
  supplierCountryId: number | null;
  supplierStateId: number | null;
  placeOfSupplyCountryId: number | null;
  placeOfSupplyStateId: number | null;
  supplierName: string | null;
  supplierTaxRegistrationNumber: string | null;
  purchaseInvoiceNumber: string | null;
  /** Full ISO date-time. */
  purchaseInvoiceDate: string | null;
  taxTreatment: number | null;
  cgstRate: number | null;
  cgstAmount: number | null;
  sgstRate: number | null;
  sgstAmount: number | null;
  igstRate: number | null;
  igstAmount: number | null;
  foreignTaxLabel: string | null;
  foreignTaxRate: number | null;
  foreignTaxAmount: number | null;
  customsDutyAmount: number | null;
  freightAmount: number | null;
  isActive: boolean;
}

export interface InstitutionCardMasterRow extends InstitutionCardMasterFields {
  id: string;
  /** Joined in by the read endpoints; the create/update DTOs never carry these. */
  institutionName?: string | null;
  cardStatus?: number | null;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isUpdatingStatus?: boolean; // NG
  isDeleting?: boolean; // NG
}

/** Query params are PascalCase on this controller. */
export interface GetInstitutionCardMastersReq {
  Search?: string | null;
  /** Optional filter - omitting it lists every institution's card inventory. */
  InstitutionId?: string | null;
  /** `DeviceDdlOptionValue.value` is a string; the query string parses it to the backend enum
   *  either way, so the filter is carried as whichever the ddl options gave us. */
  CardStatus?: string | number | null;
  IsActive?: boolean | null;
  PageNumber?: number | null;
  PageSize?: number | null;
}

export interface GetInstitutionCardMastersRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: InstitutionCardMasterRow[];
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface GetInstitutionCardMasterRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: InstitutionCardMasterRow | null;
}

/** No `moduleId`/`operationId` — the request-pipeline interceptor injects those, same as every
 *  other `*-api.ts`, even though swagger's DTO lists them. */
export type CreateInstitutionCardMasterReq = InstitutionCardMasterFields;

/** `/update` carries the id in the body and replaces the record, so every field has to be resent. */
export type UpdateInstitutionCardMasterReq = CreateInstitutionCardMasterReq & { id: string };

export interface UpdateInstitutionCardMasterStatusReq {
  id: string;
  isActive: boolean;
  /** Scopes the write the same way `get-by-id` and `delete` are scoped. */
  institutionId: string | null;
}

export interface InstitutionCardMasterMutationRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: unknown;
}
