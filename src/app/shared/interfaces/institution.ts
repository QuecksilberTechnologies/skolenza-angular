import { CampusType } from './attendance-config/attendance-config';

/** Query params for `/Institution/get-all-institutions` are PascalCase.
 *  `null` means "All" — `makeHttpParams` drops it from the query string. */
export interface GetInstitutionsRequest {
  IsActive?: boolean | null;
  IsVerified?: boolean | null;
  SearchKeyword?: string | null;
  PageNumber?: number;
  PageSize?: number;
}

export interface GetInstitutionResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IInstitution[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

/** `/Institution/get-institution-by-id` answers with the full {@link InstitutionDetail} aggregate, not a list row. */
export interface GetInstitutionByIdRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionDetail | null;
}

export interface IInstitution {
  /** An opaque 8-character token (`"2ON458Q1"`), not a number - the institution-scoped controllers
   *  match on it verbatim. */
  id: string;
  companyName: string;
  institutionCode: string;
  companyEmailDomain: string;
  institutionEmail: string;
  contactPersonName: string;
  contactNumber: string;
  countryId: number;
  isVerified: boolean;
  isActive: boolean;
  /** All three are host form fields; optional here because `get-all-institutions` omits them. */
  institutionTypeId?: number;
  genderId?: number;
  defaultCurrency?: number;
  isDeleting?: boolean; // NG
  isUpdatingStatus?: boolean; // NG
  isSyncingEntitlements?: boolean; // NG
}

/**
 * Body of `POST /Institution/update-institution`. The edit form only owns the fields `IInstitution` carries, so
 * `institutionTypeId`, `genderId` and `defaultCurrency` are echoed back from the hydrated row when
 * the API returns them and omitted otherwise — sending them blank would wipe them.
 *
 * `isActive` is not part of this contract — status changes go through `activate-institution` /
 * `deactivate-institution`.
 */
export interface UpdateInstitutionReq {
  institutionId: string;
  companyName: string;
  institutionCode: string;
  companyEmailDomain: string;
  institutionEmail: string;
  contactPersonName: string;
  contactNumber: string;
  countryId: number;
  institutionTypeId?: number;
  genderId?: number;
  defaultCurrency?: number;
}

/** Body of `activate-institution` / `deactivate-institution`; `remark` is the audit trail for the change. */
export interface InstitutionStatusChangeReq {
  institutionId: string;
  remark?: string | null;
}

/**
 * Body of `sync-active-plan-entitlements`. Swagger declares `moduleId` / `operationId` at the root
 * of this body too, but they are absent here for the same reason they are absent from
 * {@link CreateInstitutionByHostReq}: `moduleOperationInterceptor` writes them, and a call site that
 * sets them itself keeps its own value — which is how this one went out as zero before.
 */
export interface SyncPlanEntitlementsReq {
  institutionId: string;
}

/** Body of `delete-institution`; `remark` is the audit trail, and nothing collects one yet. */
export interface InstitutionDeleteReq {
  institutionId: string;
  remark?: string | null;
}

/** The staff-member-code pattern a institution was created with, as returned by `get-staff-member-code-pattern`. */
export interface StaffMemberCodePattern {
  prefix: string;
  separator: string;
  runningNumberLength: string;
  includeYear: boolean;
  includeMonth: boolean;
  includeDepartment: boolean;
}

export interface GetStaffMemberCodePatternRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: StaffMemberCodePattern | null;
}

/** `/Institution` mutation endpoints answer with the standard envelope and no typed payload. */
export interface InstitutionMutationRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: unknown;
}

/**
 * Company profile block of `POST /Institution/new-tentant-creation-by-host`. `industry` is the label
 * for the id the request already carries in `institutionTypeId`; the host form fills it from the
 * selected `Industry.industryName` rather than asking twice.
 *
 * The DTO carries no address: `profiles[]` returns one on the read side, but neither host write
 * DTO declares the key, so the host form does not collect it.
 */
export interface InstitutionProfilePayload {
  logoUrl: string;
  themeColor: string;
  businessType: string;
  industry: string;
  totalStaffMembers: number;
  totalCampuses: number;
  foundedYear: number;
  websiteUrl: string;
}

/**
 * Head-office block of the host create DTO. A near-copy of {@link CampusFields} minus
 * `countryId` (the root of the request carries it), `isHeadOffice` and `isActive` — the backend
 * fixes all three for the first location.
 */
export interface InstitutionInitialLocationPayload {
  locationCode: string;
  locationName: string;
  locationType: CampusType;
  /** Nullable in both DTOs; an edit may save a blank head office, which must go out as `null`. */
  stateId: number | null;
  districtId: number | null;
  localityId: number | null;
  address: string;
  landmark: string;
  postalCode: string;
  /** Nullable in both DTOs, and `0` is a real coordinate - a blank must go out as `null`. */
  latitude: number | null;
  longitude: number | null;
  geoFenceRadiusMeters: number | null;
  timeZoneId: string;
  isGeoFenceEnabled: boolean;
  isAttendanceAllowed: boolean;
  isBiometricEnabled: boolean;
}

/**
 * Head-office block of the host *update* DTO, which the backend names `selectedLocation` rather
 * than `initialLocation`. It differs from {@link InstitutionInitialLocationPayload} in two ways: it
 * names the row it is replacing through `campusId`, and it carries its own `countryId`.
 */
export interface InstitutionSelectedLocationPayload extends InstitutionInitialLocationPayload {
  /** `0` when the institution has no location yet, which is how the backend is asked to create one. */
  campusId: number;
  countryId: number;
}

/**
 * Body of `POST /Institution/new-tentant-creation-by-host` — the host-side create, as opposed to the
 * self-service `create-institution` that `RegisterInstitutionRequest` describes. The backend spells the path
 * `new-tentant-…`; the typo is theirs and is reproduced verbatim wherever the path is written.
 *
 * The DTO declares `moduleId` / `operationId` at the body root, and this interface deliberately
 * does not: `moduleOperationInterceptor` resolves them from the session's own navigation tree and
 * merges them in. A call site must not set them, or the interceptor leaves the call site's value
 * alone — which is how both went out as zero before.
 */
export interface CreateInstitutionByHostReq {
  subscriptionPlanId: number;
  institutionTypeId: number;
  companyName: string;
  institutionCode: string;
  companyEmailDomain: string;
  genderId: number;
  institutionEmail: string;
  contactPersonName: string;
  contactNumber: string;
  countryId: number;
  profile: InstitutionProfilePayload;
  initialLocation: InstitutionInitialLocationPayload;
  staffMemberCodePattern: StaffMemberCodePattern;
}

/**
 * Body of `PUT /Institution/new-institution-update-by-host/{encryptedInstitutionId}?ModuleId=&OperationId=` — the
 * host-side rich update, the counterpart to {@link CreateInstitutionByHostReq}. Unlike the create DTO it
 * carries no `subscriptionPlanId` (the plan is write-once) and no `moduleId` / `operationId` in the
 * body: those two are query params on this endpoint.
 *
 * `profile` is write-only in practice — no read endpoint returns it, so an edit form has nothing to
 * hydrate it from and every save replaces whatever was stored. See issue 9 in
 * `docs/api-coverage/api-issues-for-backend.md`.
 */
export interface UpdateInstitutionByHostReq {
  institutionTypeId: number;
  companyName: string;
  institutionCode: string;
  companyEmailDomain: string;
  institutionEmail: string;
  contactPersonName: string;
  genderId: number;
  contactNumber: string;
  countryId: number;
  /**
   * Nullable, and the institution reads return `null` for a institution that has none. Sending `0` is
   * rejected as an invalid configuration reference, so an unset currency stays `null`. The host
   * edit form collects it from `GET /api/Enum/get-all-currencies`; the create DTO carries no
   * currency at all, which is why a host-created institution starts with none.
   */
  defaultCurrency: number | null;
  profile: InstitutionProfilePayload;
  selectedLocation: InstitutionSelectedLocationPayload;
  staffMemberCodePattern: StaffMemberCodePattern;
}
/**
 * `/Institution/get-institution-by-id` answers with the whole institution aggregate, not the list row — the flat
 * fields plus eight child collections. It is the sole hydration source for the host institution edit
 * form, which is why every block the update DTO writes is typed here.
 *
 * MEASURED CONTRACT — swagger declares a bare `200: OK` for this operation (334 of its 335
 * operations do, and all 177 published schemas are request DTOs), so everything below is
 * transcribed from live responses rather than the spec. Backend spellings and types are reproduced
 * verbatim: `employementCode`, and `runningNumberLength` as a *number* where both write DTOs take a
 * string.
 *
 * Every child is an array even where only one row is ever meaningful, so the form reads `[0]`.
 */
export interface InstitutionDetail {
  /** The same opaque 8-character token `IInstitution.id` carries. */
  id: string;
  institutionTypeId: number | null;
  /** The label for {@link institutionTypeId}; saves resolving it against the Institution type list. */
  institutionTypeName: string | null;
  companyName: string | null;
  institutionCode: string | null;
  companyEmailDomain: string | null;
  institutionEmail: string | null;
  contactPersonName: string | null;
  genderId: number | null;
  /** Stored with the dial code, and observed to carry embedded spaces (`"+9198765 43210"`). */
  contactNumber: string | null;
  countryId: number;
  defaultCurrency: number | null;
  isVerified: boolean;
  isActive: boolean;
  profiles: InstitutionProfileRow[];
  campuses: InstitutionDetailLocationRow[];
  subscriptions: InstitutionSubscriptionRow[];
  departments: InstitutionDepartmentRow[];
  staffMemberCodePatterns: InstitutionStaffMemberCodePatternRow[];
  staffMembers: InstitutionStaffMemberRow[];
  loginCredentials: InstitutionLoginCredentialRow[];
  emailConfigurations: InstitutionEmailConfigRow[];
}

/**
 * Matches {@link InstitutionProfilePayload} field for field, plus the row id and `address` — which the
 * read side still returns even though no write DTO accepts it.
 */
export interface InstitutionProfileRow {
  id: number;
  address: string | null;
  logoUrl: string | null;
  themeColor: string | null;
  businessType: string | null;
  industry: string | null;
  totalStaffMembers: number | null;
  totalCampuses: number | null;
  foundedYear: number | null;
  websiteUrl: string | null;
}

/**
 * The location rows this endpoint returns. **Not** `CampusRow` — that is what
 * `/Campus/get-all` answers with, and it carries `isActive` and the `countryName` /
 * `stateName` / `districtName` / `localityName` display fields, none of which appear here. Do not
 * unify the two.
 *
 * `id` is what the update DTO wants as `selectedLocation.campusId`.
 */
export interface InstitutionDetailLocationRow {
  id: number;
  locationCode: string | null;
  locationName: string | null;
  locationType: CampusType;
  countryId: number | null;
  stateId: number | null;
  districtId: number | null;
  localityId: number | null;
  address: string | null;
  landmark: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  geoFenceRadiusMeters: number | null;
  timeZoneId: string | null;
  isHeadOffice: boolean;
  isGeoFenceEnabled: boolean;
  isAttendanceAllowed: boolean;
  isBiometricEnabled: boolean;
}

/**
 * The institution's plan. `/Subscription/get-institution-subscription-plan-info` reads the same record but
 * demands an `StaffMemberId` and `RoleId` a host session does not have, so this is the only place the
 * host screens can learn which plan a institution is on.
 */
export interface InstitutionSubscriptionRow {
  id: number;
  subscriptionPlanId: number;
  subscriptionPlanName: string | null;
  subscriptionStartDate: string;
  subscriptionEndDate: string | null;
  isTrial: boolean;
  paymentTxnId: string | null;
  paymentMode: string | null;
}

export interface InstitutionDepartmentRow {
  id: number;
  departmentName: string | null;
  description: string | null;
  remark: string | null;
  isExecutiveOffice: boolean;
}

/** {@link StaffMemberCodePattern} with the row id, the counter, and a numeric running-number length. */
export interface InstitutionStaffMemberCodePatternRow {
  id: number;
  prefix: string | null;
  includeYear: boolean;
  includeMonth: boolean;
  includeDepartment: boolean;
  separator: string | null;
  /** A *number* here; both write DTOs take a string. The form coerces on read. */
  runningNumberLength: number | null;
  lastUsedNumber: number | null;
}

export interface InstitutionStaffMemberRow {
  id: number;
  /** The backend's spelling. */
  employementCode: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  genderId: number | null;
  departmentId: number | null;
  departmentName: string | null;
  staffEmploymentTypeId: number | null;
  officialEmail: string | null;
  dateOfOnBoarding: string | null;
  countryId: number | null;
}

export interface InstitutionLoginCredentialRow {
  id: number;
  staffMemberId: number;
  loginId: string | null;
  hasFirstLogin: boolean;
  isPasswordChangeRequired: boolean;
  isOnboard: boolean;
  remark: string | null;
}

/**
 * The SMTP account, minus its secrets: **`smtpPasswordEncrypted` and `isActive` are not returned**,
 * though the update DTO takes both. The edit form leaves the password blank and required, and
 * defaults `isActive` to true.
 */
export interface InstitutionEmailConfigRow {
  id: number;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  fromEmail: string | null;
  fromName: string | null;
}

/**
 * Body of `POST /Institution/add-staff-member-code-pattern` and `PUT /Institution/update-staff-member-code-pattern`.
 *
 * Both are preview-or-confirm: send `confirm: false` first, show the caller what every staffMember's
 * code would become, then resend the identical pattern with `confirm: true` and the `previewHash`
 * the preview returned. A 409 means the preview went stale and a fresh one is required - never
 * confirm a preview the user has not seen.
 *
 * `moduleId` / `operationId` travel in the body rather than being stamped: `StaffMember`-family and
 * `Institution` writes resolve them per call, and POST wants `Add` where PUT wants `Update`.
 */
export interface SaveStaffMemberCodePatternReq {
  moduleId?: number;
  operationId?: number;
  pattern: StaffMemberCodePattern;
  confirm: boolean;
  previewHash?: string | null;
}

/**
 * One staffMember in the recode preview. Shape confirmed against the live captures in
 * `docs/specs/bulk-upload/results/staffMember-pattern-*-preview.json`, although swagger publishes no
 * response schema for either pattern route.
 */
export interface StaffMemberCodePatternPreviewRow {
  name?: string | null;
  currentCode?: string | null;
  proposedCode?: string | null;
  joiningDate?: string | null;
  errors?: string[] | null;
}

/**
 * The preview payload. `canCommit` gates the Apply button and `previewHash` is what the confirm
 * call has to echo back.
 */
export interface StaffMemberCodePatternPreview {
  previewHash?: string | null;
  applied?: boolean;
  canCommit?: boolean;
  lastUsedNumber?: number | null;
  staffMembers?: StaffMemberCodePatternPreviewRow[] | null;
  errors?: string[] | null;
}

export interface SaveStaffMemberCodePatternRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: StaffMemberCodePatternPreview | null;
}

/**
 * What `GET /Institution/{id}/delete-dependencies` reports before a institution is deleted.
 *
 * **UNVERIFIED** - swagger publishes no response schema here either, which is why the coverage
 * report left it unwired. The shape below is permissive on purpose: the delete dialog lists
 * whatever labelled counts come back and falls back to its plain confirmation when nothing
 * recognisable does, so an unexpected payload cannot block a delete that used to work.
 */
export interface InstitutionDeleteDependency {
  name?: string | null;
  label?: string | null;
  entity?: string | null;
  count?: number | null;
  blocksDelete?: boolean | null;
}

export interface GetInstitutionDeleteDependenciesRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: InstitutionDeleteDependency[] | Record<string, unknown> | null;
}

