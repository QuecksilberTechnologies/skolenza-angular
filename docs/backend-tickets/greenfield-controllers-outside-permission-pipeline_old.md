# Thirteen controllers publish no module, so no screen can authorise against them

**Component:** AxionPro API - `WorkflowStage`, `TenantParentModule`, `Client`, `Travel`,
`Attendance`, `ComplianceRule`, `Registration`, `CommonModule`, `Company`, `Entity`, `FileUpload`,
`HolidayCalandar`, `MenuStructure`
**Severity:** Blocker for any UI on these controllers - not a defect in existing behaviour
**Reported:** 2026-09-21
**Environment:** `https://axionpro-api.onrender.com`

## Summary

27 documented operations across these 13 controllers have no client integration. The frontend
cannot build one, because **26 of the 27 take no `ModuleId` / `OperationId`**, and none of the 13
controllers has a module published in `GET /Navigation/my-menu` or in the tenant module catalogue
from `GET /Tenant/get-all-tenant-operations`.

Every endpoint the app calls today resolves those two ids - stamped by `moduleOperationInterceptor`
from the navigation tree, or carried in the request body. With no module published:

- no `ModuleId` resolves, so the param is dropped and the endpoint answers **403**;
- `CurrentUserPermissionsStore.canPerform()` and `FeaturePageStore.canPerformOrUnknown()` have no
  code to gate on, so the screen's buttons cannot be permission-gated;
- the sidebar cannot render a link, because it renders from `my-menu`.

So this is not "the frontend has not got to these yet". A screen built today would be unreachable
and its calls would not authorise.

## The evidence

Only one of the 27 participates in the permission pipeline at all:

| Operation                                     | Takes `ModuleId` / `OperationId` |
| --------------------------------------------- | -------------------------------- |
| `POST /api/MenuStructure/get-menus-structure` | yes - but see below              |
| the other 26                                  | no                               |

`MenuStructure/get-menus-structure` takes `GetEmployeeTypeRequestDTO` for a menu call, and the menu
already comes from `GET /Navigation/my-menu`, so it is superseded rather than missing.

Checked against the client's three registries, all three of which have to agree before a screen can
exist. None of the 13 controllers appears in any of them:

- `src/app/layout/app-aside-menu/aside-menu-module-map.ts` - `moduleCode` → route and icon.
- `src/app/layout/app-aside-menu/aside-menu-unmapped-modules.ts` - codes `my-menu` publishes that
  the sidebar deliberately hides. Absence here means the code is not published at all, rather than
  published and hidden.
- `src/app/core/permission-modules.ts` - the `moduleName` values `identifiersOf()` matches on. Its
  own docblock: "A wrong name here resolves no id, the param is dropped, and the endpoint answers
  403."

Three more signals that this cluster predates the permission model rather than awaiting UI:

- `POST /api/Attendance/timmy-test` - a developer test endpoint in the public contract.
- `GET /api/Company/{firstname}/{lastname}` - a person's name as the route.
- `POST /api/CommonModule/add` - a create with no read, list or update beside it.

## What we are asking for

Three separate decisions. Only the first unblocks frontend work.

### 1. Publish a module for the controllers that are complete (16 ops)

These have a workable CRUD surface already. Each needs a `moduleCode` in `my-menu` with the
operations it should grant, and `ModuleId` / `OperationId` accepted on its routes the way every
other controller does.

| Controller                   | Ops | Surface                                                         |
| ---------------------------- | --- | --------------------------------------------------------------- |
| `WorkflowStage`              | 5   | `create`, `get-all`, `get`, `update`, `delete`                  |
| `TenantParentModule`         | 4   | `list`, `{id}`, `get-module-headers`, `PATCH {id}/status`       |
| `Client`                     | 3   | `get`, `add`, `update`                                          |
| `Travel`                     | 3   | `getalltravelmodetype`, `addtravelmode`, `updatetravelmodetype` |
| `Attendance/mark-attendance` | 1   | the one write that would start a real attendance migration      |

Two of these need a design answer from your side before we build anything, because the answer
changes whether we build at all:

- **`WorkflowStage`** is scoped by `EmployeeId` / `RoleId`. Does it overlap the policy approval
  stages already shipped in `features/tenant-policies/`? If it is the general form of the same
  concept, we would rather migrate onto it than run two.
- **`TenantParentModule`** looks like it may supersede `/TenantUserAccess/bootstrap` and
  `GET /Subscription/get-all-tenant-accessible-modules`, which is where tenant module state reaches
  the app today. `docs/api-coverage/tenant-api-coverage-report.md` note 7 raised this and it is
  still open. If it supersedes them, say so and we will plan the migration; if it does not, tell us
  what it is for.

### 2. Complete the controllers that are missing half a screen (7 ops)

Each of these can be written to but never read back, or read but never written. No screen is
possible until the other half exists.

| Controller                      | Has                                        | Needs                                                       |
| ------------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `ComplianceRule`                | `create`, `update`                         | a list and a single read                                    |
| `Registration`                  | `candidate`, `AccessDetails` (both writes) | a read for what was submitted                               |
| `Entity`                        | `get` (by `TenantId`)                      | documentation of what an Entity is                          |
| `FileUpload/UploadAsset/upload` | one generic upload                         | a reason to prefer it over the typed uploads already in use |
| `HolidayCalandar`               | `get`                                      | create/update, or confirmation it is read-only by design    |

`HolidayCalandar` in particular: `features/holidays/` currently reads a static `data/holidays.json`.
Moving to a read-only endpoint with no write is a partial migration off a working mock, so we would
rather wait for the full surface than ship a half one.

### 3. Confirm these four can be retired (4 ops)

We do not intend to call them. Confirming lets us mark them closed rather than tracking them as a
gap forever.

- `POST /api/Attendance/timmy-test`
- `GET /api/Company/{firstname}/{lastname}`
- `POST /api/CommonModule/add`
- `POST /api/MenuStructure/get-menus-structure`

## Verifying the fix

For any controller in group 1:

1. Sign in and `GET /api/Navigation/my-menu`. Expect a node whose `moduleCode` names the controller,
   carrying the operations it grants (`View`, `Add`, `Update`, `Delete` as applicable).
2. Call one of its routes with the `ModuleId` / `OperationId` that node reports. Expect 200, not 403.
3. Call the same route with the ids omitted. Expect the same 403 every other controller gives, so
   the gating is real rather than absent.
4. In the web app, add the code to `aside-menu-module-map.ts`, build the screen, and confirm the
   link renders and the action buttons gate correctly for a role that lacks the operation.

## Related

- `docs/api-gap-report.md` section A1 - the same audit, kept beside the rest of the gap analysis.
- `docs/api-coverage/tenant-api-coverage-report.md` note 7 - the open `TenantParentModule` question.

## Client-side references

- `src/app/core/permission-modules.ts` - the `moduleName` registry and its 403 warning
- `src/app/layout/app-aside-menu/aside-menu-module-map.ts` - `moduleCode` → route
- `src/app/layout/app-aside-menu/aside-menu-unmapped-modules.ts` - published-but-hidden codes
- `src/app/core/interceptors/module-operation-routes.ts` - the stamping table every wired call uses
- `src/app/core/stores/feature-page.store.ts` (`moduleOperationIds`, `canPerformOrUnknown`)
