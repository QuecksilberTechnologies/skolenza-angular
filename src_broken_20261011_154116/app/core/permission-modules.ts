/**
 * `moduleName` values from the institution module catalog (`GET /Institution/get-all-institution-operations`).
 *
 * These are the keys `CurrentUserPermissionsStore.identifiersOf()` matches on to resolve the
 * `ModuleId` / `OperationId` params that the API now requires, so they must stay byte-identical
 * to the backend (matching is case-insensitive, nothing else is).
 *
 * VERIFY BEFORE RELYING ON THESE. Only `StaffMembers`, `Departments` and `Designations` are confirmed
 * against a live catalog; the rest are the app's existing coarse guard keys, which are not
 * guaranteed to be the endpoint's own module. To check, log the catalog in the browser console on
 * any signed-in page:
 *
 *     // devtools console
 *     JSON.parse(localStorage['skolenza/loginInfo']) // confirm a session, then watch the
 *     // Network tab response of Institution/get-all-institution-operations for data.modules[].moduleName
 *
 * A wrong name here resolves no id, the param is dropped, and the endpoint answers 403.
 */
export const INSTITUTION_MODULE = {
  staffMembers: 'StaffMembers',
  departments: 'Departments',
  designations: 'Designations',
  roles: 'Roles',
  reportingTypes: 'ReportingType',
  assets: 'Assets',
  policies: 'Policies',
  /** UNVERIFIED — the routes gate on the coarse `Attendance` key, which may not be this module. */
  institutionLocations: 'Institution Locations',
  /** UNVERIFIED — same caveat as `institutionLocations`. */
  attendancePolicies: 'Attendance',
} as const;
