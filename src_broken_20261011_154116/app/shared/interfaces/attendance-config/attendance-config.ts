/**
 * Enums and the shared mutation envelope for the attendance-configuration controllers
 * (`InstitutionLocation`, `AttendancePolicy`, `StaffMemberLocationAssignment`, `StaffMemberDeviceEnrollment`,
 * `StaffMemberWorkArrangement`, `StaffMemberWorkPattern`, `StaffMemberWorkModeOverride`).
 *
 * ASSUMED CONTRACT — swagger publishes every one of these enums as a bare integer with no member
 * names, so the names below come from the backend spec document. Each enum records how far that
 * document actually goes.
 */

/**
 * MEASURED CONTRACT — the staffMember-scoped controllers here bind `staffMemberId` as a real `int64`.
 * Sending the 8-character staffMember code the app actually holds is rejected:
 *
 *     GET /api/StaffWorkModeOverride/get-all?StaffMemberId=XGQRD0Z8  →  400
 *     "The value 'XGQRD0Z8' is not valid for StaffMemberId."
 *
 * No numeric staffMember id is exposed anywhere in the institution-facing API — the session, the staffMember
 * grid and `/Staff/get-profile-summary` all carry only that code. The five staffMember tabs send it
 * anyway: the request goes out as soon as the code resolves, and the backend rejection is surfaced as
 * a toast instead of being pre-empted on the client. Issue 5 in `docs/api-coverage/api-issues-for-backend.md` tracks the
 * backend fix.
 */

/**
 * Which location boundary an staffMember's attendance is accepted within.
 *
 * Names are documented for all four values.
 */
export enum AttendanceLocationScope {
  /** Only the staffMember's primary assigned location. */
  PrimaryLocationOnly = 1,
  /** Any location assigned to the staffMember. */
  AssignedLocations = 2,
  /** Any active location belonging to the institution. */
  AnyInstitutionLocation = 3,
  /** No location boundary at all. */
  RemoteAnywhere = 4,
}

export interface AttendanceLocationScopeOption {
  id: AttendanceLocationScope;
  code: string;
  label: string;
}

/**
 * How an staffMember works — the permanent arrangement, a weekday pattern entry, or a temporary
 * override all use this same enum.
 *
 * Names are documented for all five values.
 */
export enum WorkMode {
  Office = 1,
  WorkFromHome = 2,
  Hybrid = 3,
  Field = 4,
  ClientSite = 5,
}

export interface WorkModeOption {
  id: WorkMode;
  code: string;
  label: string;
}

/**
 * Shape of a hybrid arrangement.
 *
 * ASSUMED CONTRACT — swagger publishes `1..2` with no names and the spec document only names
 * `Fixed`. `Flexible` is inferred as its counterpart. Confirm against the backend enum.
 */
export enum HybridType {
  /** Fixed weekday pattern — the `StaffMemberWorkPattern` rows decide each day. */
  Fixed = 1,
  /** Flexible — the staffMember only has to meet the minimum office-day counts. */
  Flexible = 2,
}

export interface HybridTypeOption {
  id: HybridType;
  code: string;
  label: string;
}

/**
 * Weekday of an `StaffMemberWorkPattern` row.
 *
 * Names are documented for all seven values. Note this is Monday-first (1 = Monday), unlike the
 * JavaScript `Date.getDay()` convention.
 */
export enum WorkPatternDay {
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
  Sunday = 7,
}

export interface WorkPatternDayOption {
  id: WorkPatternDay;
  code: string;
  label: string;
}

/**
 * Kind of physical site a `InstitutionLocation` represents.
 *
 * Values mirror the backend `InstitutionLocationType` enum. Keep these numeric values aligned because
 * location create/update requests serialize the enum as an integer.
 */
export enum InstitutionLocationType {
  HeadOffice = 1,
  Branch = 2,
  Office = 3,
  Plant = 4,
  Warehouse = 5,
  ClientSite = 6,
  ProjectSite = 7,
  Campus = 8,
  RemoteOffice = 9,
}

export interface InstitutionLocationTypeOption {
  id: InstitutionLocationType;
  code: string;
  label: string;
}

/**
 * Approval state of an `StaffMemberWorkModeOverride`.
 *
 * ASSUMED CONTRACT — swagger publishes `1..4` with no names and the spec document only names
 * `Pending`, noting that the approval permission model is deferred and that no approve / reject /
 * cancel endpoints exist yet. The remaining three names are inferred. Confirm before relying on them.
 */
export enum WorkModeOverrideApprovalStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
  Cancelled = 4,
}

export interface WorkModeOverrideApprovalStatusOption {
  id: WorkModeOverrideApprovalStatus;
  code: string;
  label: string;
}

/**
 * Response of every create / update / update-status / delete call on these controllers.
 *
 * ASSUMED CONTRACT — swagger declares a bare `200 OK` with no schema; this is the house envelope.
 * A dependency reject (409) arrives through the same shape and `BaseService.handleError` surfaces
 * its `message`.
 */
export interface AttendanceConfigMutationRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: unknown;
}

