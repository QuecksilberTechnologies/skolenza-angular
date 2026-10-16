/**
 * A institution's own SMTP settings, behind `/api/InstitutionEmailConfig/*`.
 *
 * The institution-side twin of `./default-email-config`: the Host owns the central record, and this is
 * the copy a institution edits for itself. Host sessions supply the institution identifier; a institution session
 * is scoped by its token, so nothing here carries a `institutionId`.
 *
 * Not to be confused with `InstitutionEmailConfigRow` in `shared/interfaces/institution.ts` — that is the
 * nested block `/Institution/get-institution-by-id` reports, a different endpoint with a different shape.
 *
 * ASSUMED CONTRACT — swagger documents the request DTOs but declares every response as a bare
 * `200 OK` with no schema, so the row and envelope shapes below follow the house convention
 * (`{ isSucceeded, message, errors, data }`). `get-all` takes no paging or search params, so the
 * list comes back whole.
 */

/** Fields shared by the create and update DTOs and echoed back on reads. */
export interface InstitutionEmailConfigFields {
  smtpHost: string | null;
  smtpPort: number;
  smtpUsername: string | null;
  fromEmail: string | null;
  fromName: string | null;
  isActive: boolean;
}

/** `smtpPassword` is deliberately absent: it is write-only and the reads never echo it. */
export interface InstitutionEmailConfigRecord extends InstitutionEmailConfigFields {
  id: number;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isDeleting?: boolean; // NG
}

export interface GetInstitutionEmailConfigsRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: InstitutionEmailConfigRecord[];
}

export interface GetInstitutionEmailConfigRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: InstitutionEmailConfigRecord | null;
}

/**
 * `moduleId` / `operationId` are not declared here — `moduleOperationInterceptor` attaches them,
 * flat at the body root, the way this controller's DTO takes them. `institutionId` is not declared
 * either: the server derives it from the session.
 */
export type CreateInstitutionEmailConfigReq = InstitutionEmailConfigFields & { smtpPassword?: string };

/** `/update` replaces the record. Omit `smtpPassword` to preserve the stored secret. */
export type UpdateInstitutionEmailConfigReq = CreateInstitutionEmailConfigReq & { id: number };

export interface InstitutionEmailConfigMutationRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: unknown;
}
