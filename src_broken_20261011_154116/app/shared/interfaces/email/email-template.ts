/**
 * The centrally managed mail templates behind `/api/EmailTemplate/*`.
 *
 * Sibling of `./default-email-config`, which owns the SMTP account those mails are *sent* through:
 * this file is what they *say*. Only the six Host-administration routes are modelled — swagger marks
 * `get-template-by-code` and `send-template` as legacy routes retained for existing backend
 * integrations, and no screen calls them.
 *
 * ASSUMED CONTRACT — swagger documents the request DTOs but declares every response as a bare
 * `200 OK` with no schema, so the row and envelope shapes below follow the house convention
 * (`{ isSucceeded, message, errors, data }`, the paginated read adding the four page fields flat
 * alongside `data`).
 */

/** Fields shared by the create and update DTOs and echoed back on reads. */
export interface EmailTemplateFields {
  templateName: string | null;
  /** The key the platform's mail flows resolve a template by. See `email-template-codes.ts`. */
  templateCode: string | null;
  subject: string | null;
  /** HTML. Written through the rich-text editor or as source; stored verbatim either way. */
  body: string | null;
  fromEmail: string | null;
  fromName: string | null;
  /** Comma-separated address list, or null. */
  ccEmail: string | null;
  bccEmail: string | null;
  category: string | null;
  languageCode: string | null;
  isActive: boolean;
}

export interface EmailTemplateRow extends EmailTemplateFields {
  id: number;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isUpdatingStatus?: boolean; // NG
  isDeleting?: boolean; // NG
}

/**
 * Query params are PascalCase on this controller.
 *
 * `Category` and `LanguageCode` are swagger-documented filters the grid does not offer, so they
 * are left out rather than declared and never sent - add them back with the control that uses them.
 */
export interface GetEmailTemplatesReq {
  Search?: string | null;
  IsActive?: boolean | null;
  PageNumber?: number | null;
  PageSize?: number | null;
}

export interface GetEmailTemplatesRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: EmailTemplateRow[];
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface GetEmailTemplateRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: EmailTemplateRow | null;
}

/**
 * `permissionRequest` is not declared here on purpose — `moduleOperationInterceptor` attaches it,
 * the same way it does for `/DefaultEmailConfig/*`.
 */
export type CreateEmailTemplateReq = EmailTemplateFields;

/** `/update` carries the id in the body and replaces the record, so every field has to be resent. */
export type UpdateEmailTemplateReq = CreateEmailTemplateReq & { id: number };

export interface UpdateEmailTemplateStatusReq {
  id: number;
  isActive: boolean;
}

export interface EmailTemplateMutationRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: unknown;
}
