/**
 * `moduleId` / `operationId` every Institution Policy endpoint takes. InstitutionPolicy is not listed in
 * `MODULE_OPERATION_ROUTES`, so nothing stamps them for this controller - the call site resolves
 * both from the authenticated menu and passes them, exactly as the existing policy-type and
 * policy-definition calls already do.
 */
export interface InstitutionPolicyContextRequest {
  moduleId?: number;
  operationId?: number;
}

/** Envelope for the Institution Policy endpoints whose `data` is a bare `true` on success. */
export interface InstitutionPolicyBooleanResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: boolean;
}
