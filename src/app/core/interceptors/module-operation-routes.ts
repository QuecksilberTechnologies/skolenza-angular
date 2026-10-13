import {
  INSTITUTION_ACCESS_MODULE_CODES,
  ModuleCodeCandidates,
} from '@core/feature-page-identifiers';
import { environment } from '@env/environment';
import { HOST_BILLING_MODULE } from '@shared/interfaces/host-billing';
import { PROFILE_TABS } from '@shared/utilities/common-data';

/**
 * Where an endpoint wants its `ModuleId` / `OperationId`.
 *
 * - `query` — PascalCase `ModuleId` / `OperationId` on the query string.
 * - `body` — inside the request body. The casing is derived from the body itself rather than
 *   declared: a JSON body takes camelCase `moduleId` / `operationId`, a `FormData` body takes
 *   PascalCase. Declaring it would be a second thing to keep in sync with a fact the request
 *   already carries.
 * - `permissionRequest` — inside the request body, nested one level down under a
 *   `permissionRequest` object. `/DefaultEmailConfig/*` models the pair as a `PermissionRequestDTO`
 *   rather than as two root fields, and ASP.NET binds nothing from a flat `moduleId` there.
 *
 * The carrier cannot be inferred from the method or the body type, which is why every row states
 * it: `POST /Staff/Education/update-education` has a multipart body but wants the ids in the
 * *query*, while `DELETE /Staff/Insurance/delete` has no query string at all and wants them in
 * a JSON body.
 */
type IdentifierCarrier = 'query' | 'body' | 'permissionRequest';

/**
 * A row's module, as `FeaturePageNode.moduleCode` from `GET /Navigation/my-menu`.
 *
 * A list when one URL is published under a different code per session — `my-menu` is
 * permission-filtered, so a host tree carries `INSTITUTION_DEVICES` where a institution tree carries
 * `INSTITUTION_DEVICE_SETUP`. The session's own tree picks the one it publishes
 * (`resolveModuleCodeIn`), which is what keeps the ids correct without a session check here.
 *
 * A function when one URL serves several modules and only the request says which: the
 * verification- and edit-status writes act on whichever profile tab their body names, so the
 * module cannot be a constant. `undefined` means the body did not say, and the interceptor sends
 * the request bare — an absent id is honest, a guessed one is not.
 *
 * It takes the body rather than the `HttpRequest` so the table stays plain data and its spec can
 * call the resolver directly.
 */
export type RouteModule =
  | ModuleCodeCandidates
  | ((body: unknown) => ModuleCodeCandidates | undefined);

export interface ModuleOperationRoute {
  /** Uppercase, as `HttpRequest.method` reports it. Part of the key — one path can carry two
   *  operations under two methods. */
  method: string;
  /** The path after `environment.apiUrl`, leading slash included. `{id}` matches exactly one
   *  non-empty segment. Matching is case-insensitive, as ASP.NET routing is. */
  path: string;
  module: RouteModule;
  /**
   * The leaf page's own `operations[].name`. A runtime string, never an enum: the backend
   * owns this vocabulary, and a page that publishes no operation of the obvious name gets the
   * nearest published one named here explicitly rather than a synthesised one.
   */
  operation: string;
  carrier: IdentifierCarrier;
}

/**
 * `FeaturePageNode.moduleCode` values, verified against a live `GET /Navigation/my-menu`.
 *
 * `ModuleId` is the leaf's own `id` and `OperationId` is that leaf's `operations[].id`. Operation
 * ids are global — `View` is 4 everywhere — but module ids are not: `STAFF_DIRECTORY` is 8,
 * `STAFF_OVERVIEW` 9, `STAFF_BANK_DETAILS` 10.
 */
const EMP = {
  list: 'STAFF_DIRECTORY',
  overview: 'STAFF_OVERVIEW',
  bank: 'STAFF_BANK_DETAILS',
  contact: 'STAFF_CONTACT_DETAILS',
  experience: 'STAFF_EXPERIENCE',
  insurance: 'STAFF_INSURANCE',
  identity: 'STAFF_IDENTITY',
  education: 'STAFF_QUALIFICATIONS',
  dependents: 'STAFF_DEPENDANTS',
  workLocations: 'STAFF_CAMPUS_ASSIGNMENTS',
  devices: 'STAFF_DEVICE_ENROLMENTS',
  workArrangement: 'STAFF_WORK_ARRANGEMENTS',
  workPattern: 'STAFF_WORK_PATTERNS',
  overrides: 'STAFF_WORK_MODE_OVERRIDES',
  passwordManagement: 'EMP_PASSWORD_MANAGEMENT',
} as const;

/**
 * The installed-device screens, which a host session and a institution session reach under different
 * codes: `my-menu` publishes `INSTITUTION_DEVICES` / `INSTITUTION_DEVICE_CONFIG` to a host and
 * `INSTITUTION_DEVICE_SETUP` / `INSTITUTION_DEVICE_CONFIGURATION` to a institution. Both are named so the
 * session's own tree resolves the ids; exactly one of each pair is present per session.
 */
const INSTITUTION_DEVICE_CODES = ['INSTITUTION_DEVICES', 'INSTITUTION_DEVICE_SETUP'] as const;
const INSTITUTION_DEVICE_CONFIG_CODES = [
  'INSTITUTION_DEVICE_CONFIG',
  'INSTITUTION_DEVICE_CONFIGURATION',
] as const;

/** Work sites, the same way: the host leaf is its own code, granting `View` only. */
const CAMPUS_CODES = ['INSTITUTION_CAMPUSES', 'HOST_CAMPUS_LIST'] as const;

const INSTITUTION_STAFF_EMPLOYMENT_TYPES_CODES = 'STAFF_EMPLOYMENT_TYPES';
/**
 * Holiday calendar, read live 2026-09-23: module id 118, operations Add 1, Delete 3, Export 23,
 * Import 13, Update 2, View 4. `my-menu` renamed it from `INSTITUTION_POLICY_HOLIDAY_CALENDAR`; the old
 * code is not kept, since only a stale cache can still carry it and its id is the wrong one.
 */
const INSTITUTION_HOLIDAY_CODE = 'INSTITUTION_POLICY_HOLIDAY';

/** The Host-side central SMTP screen. Its own leaf in `my-menu`, unlike the device screens. */
const HOST_DEFAULT_EMAIL_CONFIG = 'HOST_DEFAULT_EMAIL_CONFIG';

/** The Host-side mail template catalog. Sibling leaf to the SMTP screen above. */
const HOST_EMAIL_TEMPLATE = 'HOST_EMAIL_TEMPLATE';

/** The Institution's own template catalog. A child leaf of `INSTITUTION_EMAIL_CONFIG` in `my-menu`. */
const INSTITUTION_EMAIL_TEMPLATE = 'INSTITUTION_EMAIL_TEMPLATE';

/** `PROFILE_TABS` → the feature page that publishes that tab's `Verify` / `Allow Editing`. */
const PROFILE_TAB_MODULE_CODE: Readonly<Record<number, string>> = {
  // The basic-info tab is the profile overview, not the staffMember list: `STAFF_DIRECTORY` publishes no
  // `Verify` at all, while `STAFF_OVERVIEW` publishes View / Update / Verify / Allow Editing.
  [PROFILE_TABS.StaffMember]: EMP.overview,
  [PROFILE_TABS.Bank]: EMP.bank,
  [PROFILE_TABS.Contact]: EMP.contact,
  [PROFILE_TABS.Experience]: EMP.experience,
  [PROFILE_TABS.Identity]: EMP.identity,
  [PROFILE_TABS.Education]: EMP.education,
  [PROFILE_TABS.Dependent]: EMP.dependents,
  [PROFILE_TABS.Insurance]: EMP.insurance,
};

/**
 * `/Staff/update-verification-status` and `/Staff/update-edit-status` are one endpoint per
 * *action*, not per module: `profile-header.ts` sends `tabInfoType` to say which tab it is acting
 * on, and that tab is the module the API authorises against.
 */
export const moduleFromTabInfoType = (body: unknown): string | undefined => {
  const tab = (body as { tabInfoType?: unknown } | null | undefined)?.tabInfoType;
  return typeof tab === 'number' ? PROFILE_TAB_MODULE_CODE[tab] : undefined;
};

/**
 * Every StaffMember-family operation whose swagger definition declares `ModuleId` / `OperationId`,
 * read from `https://skolenza-api.onrender.com/swagger/v1/swagger.json` and cross-checked against
 * the URL each `core/services/staffMember*-api.ts` method actually builds.
 *
 * These rows are consulted before `CONTROLLER_MODULE_FALLBACK` and always win. They exist because
 * one StaffMember URL can serve two modules — `POST /Staff/update` is `STAFF_DIRECTORY` for the list and
 * `STAFF_OVERVIEW` for the profile — which no controller-level rule can tell apart. Do not replace
 * these literals with a `/Staff` prefix rule.
 */
export const MODULE_OPERATION_ROUTES: readonly ModuleOperationRoute[] = [
  // StaffMember list (STAFF_DIRECTORY)
  {
    method: 'POST',
    path: '/Staff/create',
    module: EMP.list,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/Staff/get-all',
    module: EMP.list,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Staff/get-summary',
    module: EMP.list,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Staff/update-bulk',
    module: EMP.list,
    operation: 'Update',
    carrier: 'body',
  },
  // The body is null (`staffMember-api.ts:135`) - the ids ride the query string.
  {
    method: 'PUT',
    path: '/Staff/update-status',
    module: EMP.list,
    operation: 'Update',
    carrier: 'query',
  },
  {
    method: 'DELETE',
    path: '/Staff/delete-all',
    module: EMP.list,
    operation: 'Delete',
    carrier: 'query',
  },

  // Institution-owned staff professional masters, positions and assignments. These endpoints
  // intentionally remain under the existing STAFF_DIRECTORY permission boundary; there is no
  // duplicate feature-page catalogue for the professional structure workspace.
  {
    method: 'GET',
    path: '/Staff/professional-structure/categories',
    module: EMP.list,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Staff/professional-structure/categories',
    module: EMP.list,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'PUT',
    path: '/Staff/professional-structure/categories/{id}',
    module: EMP.list,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'PUT',
    path: '/Staff/professional-structure/categories/{id}/job-families',
    module: EMP.list,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'PUT',
    path: '/Staff/professional-structure/categories/{id}/active/{id}',
    module: EMP.list,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/Staff/professional-structure/masters/{id}',
    module: EMP.list,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Staff/professional-structure/masters/{id}',
    module: EMP.list,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'PUT',
    path: '/Staff/professional-structure/masters/{id}/{id}',
    module: EMP.list,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/Staff/professional-structure/masters/{id}/{id}',
    module: EMP.list,
    operation: 'Delete',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Staff/professional-structure/positions',
    module: EMP.list,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Staff/professional-structure/positions',
    module: EMP.list,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'PUT',
    path: '/Staff/professional-structure/positions/{id}',
    module: EMP.list,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/Staff/professional-structure/positions/{id}',
    module: EMP.list,
    operation: 'Delete',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Staff/professional-structure/staff/{id}',
    module: EMP.list,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'PUT',
    path: '/Staff/professional-structure/capability-verification/{id}',
    module: EMP.list,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/Staff/academic-structure/teaching-assignment-types',
    module: EMP.list,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Staff/academic-structure/masters/{id}',
    module: EMP.list,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Staff/academic-structure/masters/{id}',
    module: EMP.list,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'PUT',
    path: '/Staff/academic-structure/masters/{id}/{id}',
    module: EMP.list,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/Staff/academic-structure/masters/{id}/{id}',
    module: EMP.list,
    operation: 'Delete',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Staff/academic-structure/staff/{id}',
    module: EMP.list,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Staff/academic-structure/teaching-assignments',
    module: EMP.list,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'PUT',
    path: '/Staff/academic-structure/teaching-assignments/{id}',
    module: EMP.list,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/Staff/academic-structure/teaching-assignments/{id}',
    module: EMP.list,
    operation: 'Delete',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Staff/academic-structure/class-teacher-assignments',
    module: EMP.list,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'PUT',
    path: '/Staff/academic-structure/class-teacher-assignments/{id}',
    module: EMP.list,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/Staff/academic-structure/class-teacher-assignments/{id}',
    module: EMP.list,
    operation: 'Delete',
    carrier: 'query',
  },
  ...[
    '/Staff/curriculum-delivery/workflow-statuses',
    '/Staff/curriculum-delivery/frameworks',
    '/Staff/curriculum-delivery/teaching-assignments',
    '/Staff/curriculum-delivery/lesson-plans',
    '/Staff/curriculum-delivery/lesson-deliveries',
    '/Staff/curriculum-delivery/syllabus-progress',
    '/Staff/curriculum-delivery/frameworks/{id}/units',
  ].map(
    (path) =>
      ({
        method: 'GET',
        path,
        module: EMP.list,
        operation: 'View',
        carrier: 'query',
      }) as ModuleOperationRoute,
  ),
  ...[
    '/Staff/curriculum-delivery/frameworks',
    '/Staff/curriculum-delivery/units',
    '/Staff/curriculum-delivery/topics',
    '/Staff/curriculum-delivery/lesson-plans',
    '/Staff/curriculum-delivery/lesson-deliveries',
  ].map(
    (path) =>
      ({
        method: 'POST',
        path,
        module: EMP.list,
        operation: 'Add',
        carrier: 'body',
      }) as ModuleOperationRoute,
  ),
  ...[
    '/Staff/curriculum-delivery/frameworks/{id}',
    '/Staff/curriculum-delivery/frameworks/{id}/review',
    '/Staff/curriculum-delivery/units/{id}',
    '/Staff/curriculum-delivery/topics/{id}',
    '/Staff/curriculum-delivery/lesson-plans/{id}',
    '/Staff/curriculum-delivery/lesson-plans/{id}/review',
    '/Staff/curriculum-delivery/lesson-deliveries/{id}',
    '/Staff/curriculum-delivery/lesson-deliveries/{id}/review',
  ].map(
    (path) =>
      ({
        method: 'PUT',
        path,
        module: EMP.list,
        operation: 'Update',
        carrier: 'body',
      }) as ModuleOperationRoute,
  ),
  ...[
    '/Staff/curriculum-delivery/frameworks/{id}',
    '/Staff/curriculum-delivery/units/{id}',
    '/Staff/curriculum-delivery/topics/{id}',
    '/Staff/curriculum-delivery/lesson-plans/{id}',
    '/Staff/curriculum-delivery/lesson-deliveries/{id}',
  ].map(
    (path) =>
      ({
        method: 'DELETE',
        path,
        module: EMP.list,
        operation: 'Delete',
        carrier: 'query',
      }) as ModuleOperationRoute,
  ),
  ...[
    '/Staff/operations/timetable/periods',
    '/Staff/operations/timetable/entries',
    '/Staff/operations/substitute-workflows',
    '/Staff/operations/communication/settings',
    '/Staff/operations/communication/conversations',
  ].map(
    (path) =>
      ({
        method: 'GET',
        path,
        module: EMP.list,
        operation: 'View',
        carrier: 'query',
      }) as ModuleOperationRoute,
  ),
  ...[
    '/Staff/operations/timetable/periods',
    '/Staff/operations/timetable/entries',
    '/Staff/operations/substitute-workflows',
    '/Staff/operations/communication/conversations',
    '/Staff/operations/communication/conversations/{id}/messages',
  ].map(
    (path) =>
      ({
        method: 'POST',
        path,
        module: EMP.list,
        operation: 'Add',
        carrier: 'body',
      }) as ModuleOperationRoute,
  ),
  ...[
    '/Staff/operations/timetable/periods/{id}',
    '/Staff/operations/timetable/entries/{id}',
    '/Staff/operations/substitute-workflows/{id}',
    '/Staff/operations/communication/settings',
  ].map(
    (path) =>
      ({
        method: 'PUT',
        path,
        module: EMP.list,
        operation: 'Update',
        carrier: 'body',
      }) as ModuleOperationRoute,
  ),

  // Password reset. Read live 2026-09-25: `my-menu` moved `Reset Password` (id 21) onto `STAFF_DIRECTORY`
  // and no longer publishes `EMP_PASSWORD_MANAGEMENT`. Both are named so a session still served
  // the old shape resolves; the resolver picks whichever one publishes the operation.
  {
    method: 'POST',
    path: '/Staff/reset-password',
    module: [EMP.list, EMP.passwordManagement],
    operation: 'Reset Password',
    carrier: 'body',
  },

  // Profile overview (STAFF_OVERVIEW). `/Staff/update` is claimed by two pages: STAFF_DIRECTORY and
  // STAFF_OVERVIEW both publish `Update`, and only the module id differs. It resolves here on
  // evidence - its one live caller is `staffMemberBasicApi.updateStaffMemberBasics`, a profile write,
  // while `staffMemberApi.updateStaffMember` has no caller. Same for `get-all-percentage`, whose only
  // caller is the profile widget `verification-settings.ts`.
  {
    method: 'GET',
    path: '/Staff/get',
    module: EMP.overview,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Staff/get-profile-summary',
    module: EMP.overview,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Staff/get-all-percentage',
    module: EMP.overview,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Staff/Image/get',
    module: EMP.overview,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Staff/update',
    module: EMP.overview,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Staff/official/update',
    module: EMP.overview,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Staff/profile/pic/update',
    module: EMP.overview,
    operation: 'Update',
    carrier: 'body',
  },

  // One endpoint per action rather than per module - the body's `tabInfoType` names the page.
  {
    method: 'POST',
    path: '/Staff/update-verification-status',
    module: moduleFromTabInfoType,
    operation: 'Verify',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Staff/update-edit-status',
    module: moduleFromTabInfoType,
    operation: 'Allow Editing',
    carrier: 'body',
  },

  // StaffMember / Bank - multipart writes, so the body carrier means PascalCase form fields.
  {
    method: 'POST',
    path: '/Staff/Bank/create',
    module: EMP.bank,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/Staff/Bank/get',
    module: EMP.bank,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Staff/Bank/update',
    module: EMP.bank,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/Staff/Bank/delete',
    module: EMP.bank,
    operation: 'Delete',
    carrier: 'query',
  },

  // StaffMember / Contact
  {
    method: 'POST',
    path: '/Staff/Contact/create',
    module: EMP.contact,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/Staff/Contact/get',
    module: EMP.contact,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Staff/Contact/update',
    module: EMP.contact,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/Staff/Contact/delete',
    module: EMP.contact,
    operation: 'Delete',
    carrier: 'query',
  },

  // StaffMember / Dependent
  {
    method: 'POST',
    path: '/Staff/Dependent/create',
    module: EMP.dependents,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/Staff/Dependent/get',
    module: EMP.dependents,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Staff/Dependent/get-in-detail',
    module: EMP.dependents,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Staff/Dependent/update',
    module: EMP.dependents,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/Staff/Dependent/delete',
    module: EMP.dependents,
    operation: 'Delete',
    carrier: 'query',
  },

  // StaffMember / Education - `update-education` has a multipart body but declares every scalar,
  // the ids included, as a query parameter.
  {
    method: 'POST',
    path: '/Staff/Education/create',
    module: EMP.education,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/Staff/Education/get',
    module: EMP.education,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Staff/Education/update-education',
    module: EMP.education,
    operation: 'Update',
    carrier: 'query',
  },
  {
    method: 'DELETE',
    path: '/Staff/Education/delete',
    module: EMP.education,
    operation: 'Delete',
    carrier: 'query',
  },

  // StaffMember / Experience
  {
    method: 'POST',
    path: '/Staff/Experience/create',
    module: EMP.experience,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/Staff/Experience/get',
    module: EMP.experience,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Staff/Experience/update',
    module: EMP.experience,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/Staff/Experience/delete',
    module: EMP.experience,
    operation: 'Delete',
    carrier: 'query',
  },
  {
    method: 'DELETE',
    path: '/Staff/Experience/delete-doc',
    module: EMP.experience,
    operation: 'Delete',
    carrier: 'query',
  },

  // StaffMember / Sensitive - multipart writes carry the ids as PascalCase form fields.
  {
    method: 'POST',
    path: '/Staff/Sensitive/Create',
    module: EMP.identity,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/Staff/Sensitive/get',
    module: EMP.identity,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Staff/Sensitive/update',
    module: EMP.identity,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/Staff/Sensitive/delete',
    module: EMP.identity,
    operation: 'Delete',
    carrier: 'body',
  },

  // StaffMember / Insurance - the delete carries a JSON body (`staffMember-insurance-api.ts:83`).
  {
    method: 'POST',
    path: '/Staff/Insurance/staff-member-insurance-enroll',
    module: EMP.insurance,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/Staff/Insurance/get-all-enroll',
    module: EMP.insurance,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'DELETE',
    path: '/Staff/Insurance/delete',
    module: EMP.insurance,
    operation: 'Delete',
    carrier: 'body',
  },

  // StaffMemberLocationAssignment (STAFF_CAMPUS_ASSIGNMENTS)
  {
    method: 'GET',
    path: '/StaffCampusAssignment/get-all',
    module: EMP.workLocations,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/StaffCampusAssignment/get-by-id/{id}',
    module: EMP.workLocations,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/StaffCampusAssignment/create',
    module: EMP.workLocations,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffCampusAssignment/update',
    module: EMP.workLocations,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffCampusAssignment/update-status',
    module: EMP.workLocations,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/StaffCampusAssignment/delete/{id}',
    module: EMP.workLocations,
    operation: 'Delete',
    carrier: 'query',
  },

  // StaffMemberDeviceEnrollment (STAFF_DEVICE_ENROLMENTS). This page publishes only View / Assign / Remove, so
  // the writes map onto the two it has: enrolling or re-pointing a device is assigning it,
  // while `Remove` stays reserved for the DELETE, so a status toggle can never read as an
  // un-enrolment.
  {
    method: 'GET',
    path: '/StaffDeviceEnrollment/get-all',
    module: EMP.devices,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/StaffDeviceEnrollment/get-by-id/{id}',
    module: EMP.devices,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/StaffDeviceEnrollment/create',
    module: EMP.devices,
    operation: 'Assign',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffDeviceEnrollment/update',
    module: EMP.devices,
    operation: 'Assign',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffDeviceEnrollment/update-status',
    module: EMP.devices,
    operation: 'Assign',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffDeviceEnrollment/card/bind',
    module: EMP.devices,
    operation: 'Assign',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffDeviceEnrollment/credential/remove',
    module: EMP.devices,
    operation: 'Remove',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/StaffDeviceEnrollment/delete/{id}',
    module: EMP.devices,
    operation: 'Remove',
    carrier: 'query',
  },

  // StaffMemberMonitoring. The backend authorises it against STAFF_DEVICE_ENROLMENTS too, so the writes follow
  // the enrollment rows above: saving the policy and registering an agent are both `Assign`. The
  // `runtime/*` routes use the agent credential, not a session, and are never called from here.
  {
    method: 'POST',
    path: '/Staff/Monitoring/policy',
    module: EMP.devices,
    operation: 'Assign',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Staff/Monitoring/agent/register',
    module: EMP.devices,
    operation: 'Assign',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/Staff/Monitoring/agent/status',
    module: EMP.devices,
    operation: 'View',
    carrier: 'query',
  },

  // StaffMemberWorkArrangement
  {
    method: 'GET',
    path: '/StaffWorkArrangement/get-all',
    module: EMP.workArrangement,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/StaffWorkArrangement/get-by-id/{id}',
    module: EMP.workArrangement,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/StaffWorkArrangement/create',
    module: EMP.workArrangement,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffWorkArrangement/update',
    module: EMP.workArrangement,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffWorkArrangement/update-status',
    module: EMP.workArrangement,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/StaffWorkArrangement/delete/{id}',
    module: EMP.workArrangement,
    operation: 'Delete',
    carrier: 'query',
  },

  // StaffMemberWorkPattern
  {
    method: 'GET',
    path: '/StaffWorkPattern/get-all',
    module: EMP.workPattern,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/StaffWorkPattern/get-by-id/{id}',
    module: EMP.workPattern,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/StaffWorkPattern/create',
    module: EMP.workPattern,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffWorkPattern/update',
    module: EMP.workPattern,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffWorkPattern/update-status',
    module: EMP.workPattern,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/StaffWorkPattern/delete/{id}',
    module: EMP.workPattern,
    operation: 'Delete',
    carrier: 'query',
  },

  // StaffMemberWorkModeOverride (STAFF_WORK_MODE_OVERRIDES). The page also publishes Approve / Reject, but
  // `update-status` is `{ id, isActive }` - an activation toggle, not an approval.
  {
    method: 'GET',
    path: '/StaffWorkModeOverride/get-all',
    module: EMP.overrides,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/StaffWorkModeOverride/get-by-id/{id}',
    module: EMP.overrides,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/StaffWorkModeOverride/create',
    module: EMP.overrides,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffWorkModeOverride/update',
    module: EMP.overrides,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffWorkModeOverride/update-status',
    module: EMP.overrides,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffWorkModeOverride/approve',
    module: EMP.overrides,
    operation: 'Approve',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffWorkModeOverride/reject',
    module: EMP.overrides,
    operation: 'Reject',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/StaffWorkModeOverride/delete/{id}',
    module: EMP.overrides,
    operation: 'Delete',
    carrier: 'query',
  },

  // Institution Device publishes workflow operations rather than CRUD. The fallback would infer Add
  // and Delete from the verbs, neither of which exists on INSTITUTION_DEVICES.
  {
    method: 'POST',
    path: '/InstitutionDevice/create',
    module: INSTITUTION_DEVICE_CODES,
    operation: 'Assign',
    carrier: 'body',
  },
  {
    method: 'DELETE',
    path: '/InstitutionDevice/delete/{id}',
    module: INSTITUTION_DEVICE_CODES,
    operation: 'Remove',
    carrier: 'query',
  },

  // Institution. The controller-level fallback covers the rest of `/Institution`; these rows exist because it
  // gets something wrong on each, and they fall into three kinds.
  //
  // The two `query` rows override the *carrier*: swagger declares `ModuleId` / `OperationId` as
  // query params on both, so the non-GET fallback's `body` carrier would write them where nothing
  // binds them. The resend endpoint takes no body at all, and `UpdateInstitutionByHostReq` declares
  // neither field.
  //
  // The three status rows override the *operation*. `inferOperation` reads only the last path
  // segment, so `activate-institution`, `deactivate-institution` and `delete-institution` all come out as
  // `Update` — while `HOST_INSTITUTION_LIST` publishes `Active`, `Inactive` and `Delete` as operations
  // of their own, and those are what the API acts on.
  //
  // The create row overrides the *module* as well, and is the only `/Institution` row that does.
  // Prefer the dedicated `HOST_INSTITUTION_CREATE` page when it publishes `Add`. Older permission
  // catalogs expose the same action under `HOST_INSTITUTION_LIST`, so keep that compatible leaf as the
  // second candidate. Candidate resolution is operation-aware and never crosses id spaces.
  {
    method: 'POST',
    path: '/Institution/{id}/resend-verification-by-host',
    module: 'HOST_INSTITUTION_LIST',
    operation: 'Update',
    carrier: 'query',
  },
  {
    method: 'PUT',
    path: '/Institution/new-institution-update-by-host/{id}',
    module: 'HOST_INSTITUTION_LIST',
    operation: 'Update',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Institution/new-tentant-creation-by-host',
    module: ['HOST_INSTITUTION_CREATE', 'HOST_INSTITUTION_LIST'],
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Institution/activate-institution',
    module: 'HOST_INSTITUTION_LIST',
    operation: 'Active',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Institution/deactivate-institution',
    module: 'HOST_INSTITUTION_LIST',
    operation: 'Inactive',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Institution/delete-institution',
    module: 'HOST_INSTITUTION_LIST',
    operation: 'Delete',
    carrier: 'body',
  },

  // Default email configuration. The two reads and the delete resolve through the controller-level
  // fallback, which already picks the `query` carrier swagger declares for them. These two rows
  // exist because the write DTOs nest the pair inside `PermissionRequestDTO` instead of taking two
  // root fields, so the fallback's flat `body` carrier would write them where nothing binds.
  {
    method: 'POST',
    path: '/DefaultEmailConfig/create',
    module: HOST_DEFAULT_EMAIL_CONFIG,
    operation: 'Add',
    carrier: 'permissionRequest',
  },
  {
    method: 'POST',
    path: '/DefaultEmailConfig/update',
    module: HOST_DEFAULT_EMAIL_CONFIG,
    operation: 'Update',
    carrier: 'permissionRequest',
  },

  // Email templates. Same shape as the row pair above and for the same reason: the three write
  // DTOs nest the ids inside `PermissionRequestDTO`, so the fallback's flat `body` carrier would
  // write them where nothing binds. The two reads and the delete take the pair on the query string,
  // which is what the fallback already picks for them.
  {
    method: 'POST',
    path: '/EmailTemplate/create',
    module: HOST_EMAIL_TEMPLATE,
    operation: 'Add',
    carrier: 'permissionRequest',
  },
  {
    method: 'POST',
    path: '/EmailTemplate/update',
    module: HOST_EMAIL_TEMPLATE,
    operation: 'Update',
    carrier: 'permissionRequest',
  },
  {
    method: 'POST',
    path: '/EmailTemplate/update-status',
    module: HOST_EMAIL_TEMPLATE,
    operation: 'Update',
    carrier: 'permissionRequest',
  },

  // Host billing (`/api/host/billing/*`). Every leaf is its own `my-menu` code under
  // `HOST_SUBSCRIPTIONS`, and no controller fallback can serve them — the first segment is `host`
  // — so every endpoint is a row. Reads and deletes take the pair on the query; the writes nest it
  // under `permissionRequest`, except the webhook retry, whose whole body is a
  // `PermissionRequestDTO` and so takes it flat.
  {
    method: 'GET',
    path: '/host/billing/configuration',
    module: HOST_BILLING_MODULE.configuration,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'PUT',
    path: '/host/billing/configuration',
    module: HOST_BILLING_MODULE.configuration,
    operation: 'Update',
    carrier: 'permissionRequest',
  },
  {
    method: 'GET',
    path: '/host/billing/plan-prices',
    module: HOST_BILLING_MODULE.planPrices,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/host/billing/plan-prices',
    module: HOST_BILLING_MODULE.planPrices,
    operation: 'Add',
    carrier: 'permissionRequest',
  },
  {
    method: 'PUT',
    path: '/host/billing/plan-prices/{id}',
    module: HOST_BILLING_MODULE.planPrices,
    operation: 'Update',
    carrier: 'permissionRequest',
  },
  {
    method: 'DELETE',
    path: '/host/billing/plan-prices/{id}',
    module: HOST_BILLING_MODULE.planPrices,
    operation: 'Delete',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/host/billing/tax-rules',
    module: HOST_BILLING_MODULE.taxRules,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/host/billing/tax-rules',
    module: HOST_BILLING_MODULE.taxRules,
    operation: 'Add',
    carrier: 'permissionRequest',
  },
  {
    method: 'PUT',
    path: '/host/billing/tax-rules/{id}',
    module: HOST_BILLING_MODULE.taxRules,
    operation: 'Update',
    carrier: 'permissionRequest',
  },
  {
    method: 'DELETE',
    path: '/host/billing/tax-rules/{id}',
    module: HOST_BILLING_MODULE.taxRules,
    operation: 'Delete',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/host/billing/transactions',
    module: HOST_BILLING_MODULE.transactions,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/host/billing/refunds',
    module: HOST_BILLING_MODULE.refunds,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/host/billing/refunds',
    module: HOST_BILLING_MODULE.refunds,
    operation: 'Add',
    carrier: 'permissionRequest',
  },
  {
    method: 'GET',
    path: '/host/billing/reconciliation',
    module: HOST_BILLING_MODULE.reconciliation,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/host/billing/webhooks/{id}/retry',
    module: HOST_BILLING_MODULE.reconciliation,
    operation: 'Update',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/host/billing/audit',
    module: HOST_BILLING_MODULE.audit,
    operation: 'View',
    carrier: 'query',
  },

  // Institution email templates. The Host twin's DTOs on another controller, so the same three writes
  // need the same `permissionRequest` rows. `sync` creates templates and the API authorises it
  // against `Add`, where `inferOperation` would read the last segment as `Update`.
  {
    method: 'POST',
    path: '/InstitutionEmailTemplate/create',
    module: INSTITUTION_EMAIL_TEMPLATE,
    operation: 'Add',
    carrier: 'permissionRequest',
  },
  {
    method: 'POST',
    path: '/InstitutionEmailTemplate/update',
    module: INSTITUTION_EMAIL_TEMPLATE,
    operation: 'Update',
    carrier: 'permissionRequest',
  },
  {
    method: 'POST',
    path: '/InstitutionEmailTemplate/update-status',
    module: INSTITUTION_EMAIL_TEMPLATE,
    operation: 'Update',
    carrier: 'permissionRequest',
  },
  {
    method: 'POST',
    path: '/InstitutionEmailTemplate/sync',
    module: INSTITUTION_EMAIL_TEMPLATE,
    operation: 'Add',
    carrier: 'permissionRequest',
  },

  // Role bulk import. The API authorises these writes against `Add`, but `inferOperation` reads the
  // last segment and would call every one of them `Update` — the rows exist to correct that. The
  // matching GETs (`/bulk/template`, `/bulk/jobs`, `/bulk/jobs/{jobId}`, `/bulk/jobs/{jobId}/report`)
  // need no row: the fallback already resolves them to `View` on the query string, which the API
  // wants.
  {
    method: 'POST',
    path: '/Role/bulk/preview',
    module: INSTITUTION_ACCESS_MODULE_CODES.role,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Role/bulk/confirm',
    module: INSTITUTION_ACCESS_MODULE_CODES.role,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Role/bulk/retry',
    module: INSTITUTION_ACCESS_MODULE_CODES.role,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Role/bulk/cancel',
    module: INSTITUTION_ACCESS_MODULE_CODES.role,
    operation: 'Add',
    carrier: 'body',
  },

  // Department bulk import. Same correction as the Role pair above, for the same reason.
  {
    method: 'POST',
    path: '/Department/bulk/preview',
    module: INSTITUTION_ACCESS_MODULE_CODES.department,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Department/bulk/confirm',
    module: INSTITUTION_ACCESS_MODULE_CODES.department,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Department/bulk/retry',
    module: INSTITUTION_ACCESS_MODULE_CODES.department,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Department/bulk/cancel',
    module: INSTITUTION_ACCESS_MODULE_CODES.department,
    operation: 'Add',
    carrier: 'body',
  },

  // Designation bulk import. Same correction as the Role pair above, for the same reason.
  {
    method: 'POST',
    path: '/Designation/bulk/preview',
    module: INSTITUTION_ACCESS_MODULE_CODES.designation,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Designation/bulk/confirm',
    module: INSTITUTION_ACCESS_MODULE_CODES.designation,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Designation/bulk/retry',
    module: INSTITUTION_ACCESS_MODULE_CODES.designation,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Designation/bulk/cancel',
    module: INSTITUTION_ACCESS_MODULE_CODES.designation,
    operation: 'Add',
    carrier: 'body',
  },

  // StaffMember type bulk import. Same correction as the Role pair above, for the same reason.
  {
    method: 'POST',
    path: '/StaffEmploymentType/bulk/preview',
    module: INSTITUTION_STAFF_EMPLOYMENT_TYPES_CODES,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffEmploymentType/bulk/confirm',
    module: INSTITUTION_STAFF_EMPLOYMENT_TYPES_CODES,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffEmploymentType/bulk/retry',
    module: INSTITUTION_STAFF_EMPLOYMENT_TYPES_CODES,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/StaffEmploymentType/bulk/cancel',
    module: INSTITUTION_STAFF_EMPLOYMENT_TYPES_CODES,
    operation: 'Add',
    carrier: 'body',
  },

  // StaffMember bulk import. Same correction as the Role pair above, for the same reason. The whole
  // `/Staff/bulk` family authorises against `STAFF_DIRECTORY`, the list page that opens the dialog -
  // there is no separate import module. `send-invitations` mutates too, so it is also `Add`.
  {
    method: 'POST',
    path: '/Staff/bulk/preview',
    module: EMP.list,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Staff/bulk/confirm',
    module: EMP.list,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Staff/bulk/retry',
    module: EMP.list,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Staff/bulk/cancel',
    module: EMP.list,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Staff/bulk/send-invitations',
    module: EMP.list,
    operation: 'Add',
    carrier: 'body',
  },
  // Unlike the four masters above, the reads need rows of their own: `StaffMember` is deliberately
  // absent from `CONTROLLER_MODULE_FALLBACK` (one StaffMember URL can serve two modules), so nothing
  // synthesises the `View` these would otherwise inherit.
  {
    method: 'GET',
    path: '/Staff/bulk/template',
    module: EMP.list,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Staff/bulk/jobs',
    module: EMP.list,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Staff/bulk/jobs/{id}',
    module: EMP.list,
    operation: 'View',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Staff/bulk/jobs/{id}/report',
    module: EMP.list,
    operation: 'View',
    carrier: 'query',
  },

  // Attendance policies publish both Add and Create. This endpoint is explicitly authorised as
  // Create (id 22), so it cannot use the controller fallback, which infers Add from its path.
  {
    method: 'POST',
    path: '/AttendancePolicy/create',
    module: 'INSTITUTION_ATTENDANCE_POLICIES',
    operation: 'Create',
    carrier: 'body',
  },

  // Host parent-Module catalogue bulk import (`HostModuleBulkImport`, controller `Module` — a
  // different controller from the `ParentModule` CRUD one, so it is not covered by that
  // controller's `DENY_CONTROLLERS` entry). `inferOperation` reads the last path segment and would
  // call both `Update` — these rows correct that.
  //
  // Read live 2026-09-16: `HOST_MODULES` resolves to module id 72. The institution bulk-import
  // precedent of sending `Add` (operation 1) 403'd here even though `Add` is granted for this
  // module — unlike the institution masters, which accept either. Swagger's own summary says
  // preview/template want "Import permission" specifically, and sending `Import` instead cleared
  // the 403 (confirmed live the same day): the request now reaches the handler and fails with a
  // 500 from the backend, which is outside what a frontend row can fix.
  //
  // `import/job`, `import/jobs`, `import/template` and `import/report` need no row: the fallback
  // resolves them to `View` on the query string, which swagger also allows. `import/retry` and
  // `import/cancel` need none either — the fallback's inferred `Update` is unconfirmed but
  // untested for the institution masters' own retry/cancel too, so this stays consistent with them
  // rather than guessing a different operation.
  {
    method: 'POST',
    path: '/Module/import/preview',
    module: 'HOST_MODULES',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Module/import/confirm',
    module: 'HOST_MODULES',
    operation: 'Import',
    carrier: 'body',
  },

  // The other five Host catalogues' bulk import. Every module code and the `Import` operation are
  // the ones the live smoke run resolved from `my-menu` and then exercised end to end on
  // 2026-09-19 (`docs/testing/bulk/all-live-smoke/2026-09-19-run.ps1:93`), reads included - that
  // run sent `Import` on `template`, `job` and `report` too, so `Import` is what these rows claim
  // rather than the `View` the institution-side reads infer. Nothing here is guessed:
  //
  // - `SubModule`, `ModuleOperation` and `OperationsMaster` sit in `DENY_CONTROLLERS`, so nothing
  //   is stamped for them at all - and the import family is a separate controller from the CRUD
  //   one it shares a name with (`/Operation/import/*` against `/OperationsMaster/*`). An explicit
  //   row wins over the deny either way; without these rows every call goes out unstamped.
  // - `InstitutionCardMaster` has a fallback, but it names `HOST_INSTITUTION_CARD_INVENTORY`, and the leaf
  //   that actually grants this import is `HOST_INSTITUTION_RFID_MANAGEMENT`. Its reads need rows for
  //   that reason alone.
  // - `DeviceMaster`'s fallback already resolves its reads to `View` on `HOST_DEVICE_SETUP`, which
  //   is right, so only its four writes are corrected. Its retry/cancel need rows even though
  //   `Module`'s are left on the fallback: `hostBulkImportAdapter` exposes retry and cancel for
  //   every target, so the moment a job-history surface is pointed at the device catalogue the
  //   fallback's inferred `Update` would 403 against an endpoint that wants `Import`.
  {
    method: 'POST',
    path: '/DeviceMaster/import/preview',
    module: 'HOST_DEVICE_SETUP',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/DeviceMaster/import/confirm',
    module: 'HOST_DEVICE_SETUP',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/DeviceMaster/import/retry',
    module: 'HOST_DEVICE_SETUP',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/DeviceMaster/import/cancel',
    module: 'HOST_DEVICE_SETUP',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/InstitutionCardMaster/import/preview',
    module: 'HOST_INSTITUTION_RFID_MANAGEMENT',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/InstitutionCardMaster/import/confirm',
    module: 'HOST_INSTITUTION_RFID_MANAGEMENT',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/InstitutionCardMaster/import/retry',
    module: 'HOST_INSTITUTION_RFID_MANAGEMENT',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/InstitutionCardMaster/import/cancel',
    module: 'HOST_INSTITUTION_RFID_MANAGEMENT',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/InstitutionCardMaster/import/job',
    module: 'HOST_INSTITUTION_RFID_MANAGEMENT',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/InstitutionCardMaster/import/jobs',
    module: 'HOST_INSTITUTION_RFID_MANAGEMENT',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/InstitutionCardMaster/import/template',
    module: 'HOST_INSTITUTION_RFID_MANAGEMENT',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/InstitutionCardMaster/import/report',
    module: 'HOST_INSTITUTION_RFID_MANAGEMENT',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/ChildModule/import/preview',
    module: 'HOST_SUBMODULES',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/ChildModule/import/confirm',
    module: 'HOST_SUBMODULES',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/ChildModule/import/retry',
    module: 'HOST_SUBMODULES',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/ChildModule/import/cancel',
    module: 'HOST_SUBMODULES',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/ChildModule/import/job',
    module: 'HOST_SUBMODULES',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/ChildModule/import/jobs',
    module: 'HOST_SUBMODULES',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/ChildModule/import/template',
    module: 'HOST_SUBMODULES',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/ChildModule/import/report',
    module: 'HOST_SUBMODULES',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/Operation/import/preview',
    module: 'HOST_OPERATIONS',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Operation/import/confirm',
    module: 'HOST_OPERATIONS',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Operation/import/retry',
    module: 'HOST_OPERATIONS',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Operation/import/cancel',
    module: 'HOST_OPERATIONS',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/Operation/import/job',
    module: 'HOST_OPERATIONS',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Operation/import/jobs',
    module: 'HOST_OPERATIONS',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Operation/import/template',
    module: 'HOST_OPERATIONS',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/Operation/import/report',
    module: 'HOST_OPERATIONS',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'POST',
    path: '/ModuleOperation/import/preview',
    module: 'HOST_MODULE_OPERATIONS',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/ModuleOperation/import/confirm',
    module: 'HOST_MODULE_OPERATIONS',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/ModuleOperation/import/retry',
    module: 'HOST_MODULE_OPERATIONS',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/ModuleOperation/import/cancel',
    module: 'HOST_MODULE_OPERATIONS',
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/ModuleOperation/import/job',
    module: 'HOST_MODULE_OPERATIONS',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/ModuleOperation/import/jobs',
    module: 'HOST_MODULE_OPERATIONS',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/ModuleOperation/import/template',
    module: 'HOST_MODULE_OPERATIONS',
    operation: 'Import',
    carrier: 'query',
  },
  {
    method: 'GET',
    path: '/ModuleOperation/import/report',
    module: 'HOST_MODULE_OPERATIONS',
    operation: 'Import',
    carrier: 'query',
  },

  // Holiday calendar (`INSTITUTION_HOLIDAY_CODE`, added to `CONTROLLER_MODULE_FALLBACK` as
  // `holiday` below). Every operation name here is quoted verbatim from swagger
  // (https://skolenza-api.onrender.com/swagger/v1/swagger.json, read 2026-09-22), which states its
  // own required operation per route rather than requiring a live `my-menu` read to infer it.
  //
  // `GET /get`, `GET /{id}`, `PUT /{id}` and `DELETE /{id}` already read right off the fallback and
  // need no row. The three below don't: the bare `POST /Holiday` and
  // `POST /Holiday/import` have no `create`/`add` last segment for `inferOperation` to read,
  // and `GET /Holiday/export` is a GET the fallback would call `View`.
  {
    method: 'POST',
    path: '/Holiday',
    module: INSTITUTION_HOLIDAY_CODE,
    operation: 'Add',
    carrier: 'body',
  },
  {
    method: 'POST',
    path: '/Holiday/import',
    module: INSTITUTION_HOLIDAY_CODE,
    operation: 'Import',
    carrier: 'body',
  },
  {
    method: 'GET',
    path: '/Holiday/export',
    module: INSTITUTION_HOLIDAY_CODE,
    operation: 'Export',
    carrier: 'query',
  },
];

/**
 * Controllers the interceptor never touches, whatever else matches.
 *
 * Three separate reasons, and none of them is "this endpoint has no permission dimension" alone:
 *
 * - `Navigation`, `Auth` and `NewLogin` are the deadlock guard the allowlist used to provide for
 *   free. `Navigation/my-menu` is the request a parked request waits on, and a parked request that
 *   401s is retried through `Auth/refresh-token` — either one re-entering this chain would wait on
 *   the request it is trying to unblock.
 * - `ModuleOperation`, `OperationsMaster`, `ParentModule`, `SubModule` and `PlanModuleMapping`
 *   already own `moduleId` / `operationId` in their bodies, meaning the mapping's *target* rather
 *   than the caller's permission (`shared/interfaces/module-operation.ts`,
 *   `shared/interfaces/plan-module-mapping.ts`).
 * - `Option`, `Enum`, `CommonMenu`, `ClientInfo`, `StatData` and `Image` are lookups. `Option` is
 *   the pointed one: its `OperationId` is a result *filter* (`shared/interfaces/option.ts`), so an
 *   injected id would quietly change what comes back rather than fail loudly.
 */
const DENY_CONTROLLERS: ReadonlySet<string> = new Set(
  [
    'Navigation',
    'Auth',
    'NewLogin',
    'ModuleOperation',
    'OperationsMaster',
    'ParentModule',
    'ChildModule',
    'PlanModuleMapping',
    'Option',
    'Enum',
    'CommonMenu',
    'ClientInfo',
    'StatData',
    'Image',
  ].map((controller) => controller.toLowerCase()),
);

/**
 * Paths denied on their own, because their controller is not.
 *
 * `Institution/get-all-institution-operations` feeds `CurrentUserPermissionsStore`, one 401 away from the
 * same refresh deadlock. `Role/type-options` and `StaffMember/Contact/relation-options` are
 * authenticated constants lookups whose backend contracts deliberately accept no ModuleId or
 * OperationId. The rest of those controllers still resolves through the fallback below.
 */
const DENY_PATHS: ReadonlySet<string> = new Set([
  '/institution/get-all-institution-operations',
  '/role/type-options',
  '/staff-member/contact/relation-options',
  '/staff/category/options',
]);

/**
 * `controller → moduleCode`, the blanket rule behind the explicit table above.
 *
 * The module a request authorises against is a property of the *resource*, not of the screen the
 * user is standing on: `features/staffMembers/` reads `/Designation/get-all`, `layout/` calls
 * `/Institution/*` from every route, and the dashboard touches six modules from one URL. Keying on the
 * controller is the only reading that survives those.
 *
 * `/Staff*` is deliberately absent. That family is the one place where a single URL serves two
 * modules — `POST /Staff/update` is `STAFF_DIRECTORY` or `STAFF_OVERVIEW` depending on the caller — so it
 * stays on the hand-written rows, which win anyway.
 *
 * Codes are `FeaturePageNode.moduleCode`, cross-checked against `ASIDE_MENU_MODULE_UI`. A module
 * `GET /Navigation/my-menu` does not publish (Asset, TicketClassification, Insurance, PolicyType)
 * has no code to name yet and is left out until it does.
 */
const CONTROLLER_MODULE_FALLBACK: Readonly<Record<string, ModuleCodeCandidates>> = {
  department: INSTITUTION_ACCESS_MODULE_CODES.department,
  designation: INSTITUTION_ACCESS_MODULE_CODES.designation,
  reportingtype: 'INSTITUTION_REPORTING_TYPES',
  role: INSTITUTION_ACCESS_MODULE_CODES.role,
  usermodulerolepermission: INSTITUTION_ACCESS_MODULE_CODES.role,
  institutionlocation: CAMPUS_CODES,
  campus: CAMPUS_CODES,
  institutiondevice: INSTITUTION_DEVICE_CODES,
  institutiondeviceconfiguration: INSTITUTION_DEVICE_CONFIG_CODES,
  // The catalog screen, not the unbuilt `/host/devices` inventory page `HOST_DEVICE_INVENTORY`
  // names — `my-menu` publishes `/app/device-masters` under this code.
  devicemaster: 'HOST_DEVICE_SETUP',
  institutioncardmaster: 'HOST_INSTITUTION_CARD_INVENTORY',
  institution: 'HOST_INSTITUTION_LIST',
  defaultemailconfig: HOST_DEFAULT_EMAIL_CONFIG,
  emailtemplate: HOST_EMAIL_TEMPLATE,
  // The institution-side twin takes the pair flat at the body root, so the carriers this row infers —
  // `query` for the reads and the delete, `body` for the writes — are already the right ones.
  institutionemailconfig: 'INSTITUTION_EMAIL_CONFIG',
  institutionemailtemplate: INSTITUTION_EMAIL_TEMPLATE,
  attendancepolicy: 'INSTITUTION_ATTENDANCE_POLICIES',
  staffMembertype: INSTITUTION_STAFF_EMPLOYMENT_TYPES_CODES,
  staffemploymenttype: INSTITUTION_STAFF_EMPLOYMENT_TYPES_CODES,
  // Backend's own spelling of the controller segment — see the explicit-row comment above for
  // where its three writes correct the fallback's inferred operation.
  holiday: INSTITUTION_HOLIDAY_CODE,
  // `Module` (the `HostModuleBulkImport` controller) is a different controller from
  // `ParentModule`, and only ever serves `/Module/import/*` — see the rows above for why the two
  // writes need their own `Add` override.
  module: 'HOST_MODULES',
  // `/Dashboard/*` — the Admin widget reads (`/SuperAdmin/*`) and the per-role dashboards
  // (`/{INSTITUTION_ADMIN|STAFF_MANAGER|STAFF_MEMBER|EXTERNAL_USER}`), all `View` on the query.
  dashboard: 'INSTITUTION_DASHBOARD_OVERVIEW',
};

const WILDCARD = '{id}';

const literalRoutes = new Map<string, ModuleOperationRoute>();
const wildcardRoutes: { route: ModuleOperationRoute; segments: string[] }[] = [];

for (const route of MODULE_OPERATION_ROUTES) {
  const path = route.path.toLowerCase();
  if (path.includes(WILDCARD)) {
    wildcardRoutes.push({ route, segments: path.split('/') });
  } else {
    literalRoutes.set(`${route.method} ${path}`, route);
  }
}

/**
 * The operation name a synthesised row claims, from the method and the last path segment.
 *
 * The same reading the hand-written rows make: a read is `View`, a `DELETE` is `Delete`, a
 * `create` / `add` is `Add`, and every other write is `Update`. A controller whose page publishes a
 * different vocabulary resolves no `OperationId` and the interceptor's dev-mode warning names it —
 * that warning is how the exception earns an explicit row.
 */
function inferOperation(method: string, path: string): string {
  if (method === 'GET') return 'View';
  if (method === 'DELETE') return 'Delete';

  const last = path.split('/').filter(Boolean).pop() ?? '';
  return last === 'create' || last === 'add' ? 'Add' : 'Update';
}

/** A row for a controller in `CONTROLLER_MODULE_FALLBACK`, or `undefined` for anything else. */
function fallbackRoute(method: string, path: string): ModuleOperationRoute | undefined {
  if (DENY_PATHS.has(path)) return undefined;

  const controller = path.split('/')[1] ?? '';
  if (!controller || DENY_CONTROLLERS.has(controller)) return undefined;

  const module = CONTROLLER_MODULE_FALLBACK[controller];
  if (!module) return undefined;

  // Reads and deletes carry no body worth merging into; everything else does. The hand-written
  // rows override this wherever the API disagrees, which is why they are consulted first.
  const carrier: IdentifierCarrier = method === 'GET' || method === 'DELETE' ? 'query' : 'body';

  return {
    method,
    path,
    module,
    operation: inferOperation(method, path),
    carrier,
  };
}

/**
 * The route entry for a request, or `undefined` when the URL is not one of ours.
 *
 * Resolution order is explicit row → wildcard row → controller fallback, so a hand-written row
 * always wins: the fallback is the blanket rule, not an override.
 *
 * Matching is case-insensitive on the path because ASP.NET routing is, and the app does not always
 * spell a route the way the spec does (`/Staff/Sensitive/create` vs `Create`).
 */
export function resolveModuleOperationRoute(
  method: string,
  url: string,
): ModuleOperationRoute | undefined {
  if (!url.startsWith(environment.apiUrl)) return undefined;

  // `req.url` excludes params passed through the `params` option, but a call site is free to embed
  // a query string in the URL — strip it so the key stays literal either way.
  const requestPath = url.slice(environment.apiUrl.length).split('?')[0].toLowerCase();
  const path = requestPath
    .replace(/^\/institutioncardmaster(?=\/|$)/, '/institutioncardmaster')
    .replace(/^\/institutionemailconfig(?=\/|$)/, '/institutionemailconfig')
    .replace(/^\/institutionemailtemplate(?=\/|$)/, '/institutionemailtemplate');

  const literal = literalRoutes.get(`${method} ${path}`);
  if (literal) return literal;

  const segments = path.split('/');
  const wildcard = wildcardRoutes.find(
    ({ route, segments: pattern }) =>
      route.method === method &&
      pattern.length === segments.length &&
      pattern.every((segment, i) =>
        segment === WILDCARD ? !!segments[i] : segment === segments[i],
      ),
  )?.route;

  return wildcard ?? fallbackRoute(method, path);
}
