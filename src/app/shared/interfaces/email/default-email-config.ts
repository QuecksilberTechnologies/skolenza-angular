/**
 * The central SMTP configuration behind `/api/DefaultEmailConfig/*`.
 *
 * This is the Host-owned record that gets copied into a Institution's own email configuration the first
 * time that institution self-registers — not `InstitutionEmailConfigRow` in `shared/interfaces/institution.ts`,
 * which is what `get-institution-by-id` reports back about the copy each institution then edits.
 *
 * ASSUMED CONTRACT — swagger documents the request DTOs but declares every response as a bare
 * `200 OK` with no schema, so the row and envelope shapes below follow the house convention
 * (`{ isSucceeded, message, errors, data }`). `get-all` takes no paging or search params, so the
 * list comes back whole.
 */

/** Fields shared by the create and update DTOs and echoed back on reads. */
export interface DefaultEmailConfigFields {
  configName: string | null;
  smtpHost: string | null;
  smtpPort: number;
  smtpUsername: string | null;
  fromEmail: string | null;
  fromName: string | null;
  isActive: boolean;
  isDefault: boolean;
}

/** `smtpPassword` is deliberately absent: it is write-only and the reads never echo it. */
export interface DefaultEmailConfigRow extends DefaultEmailConfigFields {
  id: number;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isDeleting?: boolean; // NG
}

export interface GetDefaultEmailConfigsRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: DefaultEmailConfigRow[];
}

export interface GetDefaultEmailConfigRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: DefaultEmailConfigRow | null;
}

/**
 * `permissionRequest` is not declared here on purpose — `moduleOperationInterceptor` attaches it,
 * the same way it attaches `ModuleId` / `OperationId` to every other controller.
 */
export type CreateDefaultEmailConfigReq = DefaultEmailConfigFields & { smtpPassword?: string };

/** `/update` replaces the record. Omit `smtpPassword` to preserve the stored secret. */
export type UpdateDefaultEmailConfigReq = CreateDefaultEmailConfigReq & { id: number };

export interface DefaultEmailConfigMutationRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: unknown;
}
