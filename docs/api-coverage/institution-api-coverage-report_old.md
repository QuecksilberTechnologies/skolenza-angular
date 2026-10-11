# Tenant API Coverage Report

## Context

The backend exposes 20 `/api/Tenant/...` endpoints plus six sibling controllers that are also
tenant-scoped (`TenantDevice`, `TenantDeviceConfiguration`, `TenantLocation`, `TenantParentModule`,
`TenantIndustry`, `TenantUserAccess`). See the Swagger docs at
https://axionpro-api.onrender.com/swagger/index.html. This report records which of them the Angular
frontend calls and where. It is the companion to
[`device-api-coverage-report.md`](./device-api-coverage-report.md),
[`host-api-coverage-report.md`](./host-api-coverage-report.md) and
[`subscription-api-coverage-report.md`](./subscription-api-coverage-report.md).

**This report no longer cites line numbers.** Its previous revision did, and every one of them had
rotted along with three of the statuses. Cite the method name and the file; grep for the rest.

All `/api/Tenant/...` calls live in a single service: `src/app/core/services/tenants-api.ts`
(`TenantsApi`, base `${environment.apiUrl}/Tenant`). No other file builds a `/Tenant/...` URL.

Legend: ✅ implemented and wired to UI · ⚠️ implemented but unused · ❌ not implemented.

## Tenant coverage

| #   | Endpoint                                          | Status | API method (`tenants-api.ts`) | Consumers                                                                                                |
| --- | ------------------------------------------------- | ------ | ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | POST create-tenant                                | ✅     | `registerTenant`              | `registration.ts` (self-service) — the host form moved to #14                                            |
| 2   | POST verify                                       | ✅     | `verifyEmail`                 | `registration-verify.ts`                                                                                 |
| 3   | GET get-all-tenants                               | ✅     | `getTenants`                  | `tenants.store.ts` (grid), `tenant-devices.store.ts`, `tenant-device-form.ts`, `dashboard-host.store.ts` |
| 4   | GET get-tenant-by-id                              | ✅     | `getTenantById`               | `tenant-form.ts` (edit hydration), `tenant-detail.ts` (row detail sheet) — see note 16                   |
| 5   | GET get-all-tenant-operations                     | ✅     | `getTenantOperations`         | `current-user-permissions.store.ts`, `role-permissions.store.ts`, `employees-permissions.store.ts`       |
| 6   | GET get-employee-code-pattern                     | ⚠️     | `getEmployeeCodePattern`      | superseded by #4, which returns the pattern — no caller left                                             |
| 7   | POST update-tenant                                | ⚠️     | `updateTenant`                | superseded by #15 — no caller left                                                                       |
| 8   | POST update-modules-and-operations                | ✅     | `updateModulesAndOperations`  | `tenant-modules.store.ts` ← `tenant-modules.ts` — no menu entry, URL only                                |
| 9   | POST activate-tenant                              | ✅     | `activateTenant`              | `tenants.store.ts` ← `tenants.ts`, `tenant-form.ts`                                                      |
| 10  | POST deactivate-tenant                            | ✅     | `deactivateTenant`            | `tenants.store.ts` ← `tenants.ts`, `tenant-form.ts`                                                      |
| 11  | POST delete-tenant                                | ✅     | `deleteTenant`                | `tenants.store.ts` ← `tenants.ts`                                                                        |
| 12  | POST {id}/resend-verification-by-host             | ✅     | `resendVerificationEmail`     | `tenants.store.ts` ← `tenants.ts` — see note 1                                                           |
| 13  | POST sync-active-plan-entitlements                | ✅     | `syncActivePlanEntitlements`  | `tenants.store.ts` ← `tenants.ts` — see note 15                                                          |
| 14  | POST new-tentant-creation-by-host                 | ✅     | `createTenantByHost`          | `tenant-form.ts` (host create) — see note 2                                                              |
| 15  | PUT new-tenant-update-by-host/{encryptedTenantId} | ✅     | `updateTenantByHost`          | `tenant-form.ts` (host edit) — see note 3                                                                |
| 16  | GET {id}/delete-dependencies                      | ❌     | —                             | pre-delete impact check — see note 4                                                                     |
| 17  | PUT /{id}                                         | ❌     | —                             | equivalent to #7; `UpdateTenantRequestDTO` is `UpdateHostManagedTenantRequestDTO` plus `tenantId`        |
| 18  | DELETE /{id}                                      | ❌     | —                             | equivalent to #11, minus the optional `remark`                                                           |
| 19  | POST get                                          | ❌     | —                             | own-tenant scoped, unusable from the host screen — see note 5                                            |
| 20  | POST create-host-user                             | ❌     | —                             | the frontend uses `/Host/create-host-user` (`host-api.ts`)                                               |
| 21  | GET get-all-tenant-by-subscription-plan-Id        | ❌     | —                             | superseded by #3 — see note 6                                                                            |

**Totals: 13 wired · 2 implemented but unused · 6 absent.** One of the absent ones (#16) is backend
capability the UI cannot currently reach; the other five duplicate an endpoint already in use.

## Sibling controllers

| Controller                       | Service                                                        | Coverage                                                                     |
| -------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `/api/TenantDevice`              | `tenant-device-api.ts`                                         | 6/6 — see [`device-api-coverage-report.md`](./device-api-coverage-report.md) |
| `/api/TenantDeviceConfiguration` | `tenant-device-configuration-api.ts`                           | 5/5 — `features/host/tenant-device-configurations/`                          |
| `/api/TenantLocation`            | `tenant-location-api.ts`                                       | 6/6 — `features/tenant-locations/`                                           |
| `/api/TenantIndustry`            | `industries-api.ts` (named for the domain, not the controller) | 2/2 — `get-industries`, `get-tenant-subscription-plan`                       |
| `/api/TenantUserAccess`          | `access-bootstrap-api.ts`                                      | 1/1 — `bootstrap`                                                            |
| `/api/TenantParentModule`        | —                                                              | **0/4 — no service builds this URL.** See note 7                             |

`/api/Subscription/get-tenant-subscription-plan-info` and
`/api/Subscription/get-all-tenant-accessible-modules` are tenant-scoped but live on the Subscription
controller; both are wired through `subscriptions-api.ts`.

## Notes

1. **The resend route was renamed and the client did not follow.** The backend removed
   `POST /Tenant/{id}/resend-verification` (it answers 404) in favour of
   `POST /Tenant/{id}/resend-verification-by-host` (401 unauthenticated, so the route exists).
   `resendVerificationEmail` now points at the new path. Nothing else had to change — the store spec
   mocks the method, not the URL, and no e2e fixture matches a `/Tenant/` route.
2. **`new-tentant-creation-by-host` is the host-side create, and the host form now calls it.** Its
   `NewTenantCreationRequestDTO` nests four blocks the self-service `create-tenant` DTO has no room
   for — `profile` (logo, theme colour, business type, employee/branch counts, founded year,
   website), `initialLocation` (a full `TenantLocation`), `employeeCodePattern` and
   `emailConfiguration` (SMTP host/port/credentials/from-address). The published `profile` block
   carries **no address**, even though `get-tenant-by-id` returns `profiles[].address`; the host
   form stopped collecting and sending it so the body matches the DTO. `tenant-form.ts` collects the
   first three in create mode and posts them through `createTenantByHost`; the SMTP block is the
   backend's to manage, so the body omits `emailConfiguration` entirely — see issue 9, which asks
   the backend to confirm a body without it is accepted. `registration.ts` keeps the self-service
   `create-tenant` path. The backend spells the path `new-tentant-…`; the typo is theirs and is
   reproduced verbatim wherever the path is written down. The update counterpart is #15, which
   names the same location block `selectedLocation` rather than `initialLocation`.

   Two details of the wiring worth knowing. `moduleId` / `operationId` are body fields here, and
   `moduleOperationInterceptor` fills them from an explicit `MODULE_OPERATION_ROUTES` row —
   `CreateTenantByHostReq` deliberately declares neither, so no call site can send the `0` this used
   to send. The row names `HOST_TENANT_CREATE` rather than the `HOST_TENANT_LIST` every other
   `/Tenant` call resolves to: the host create is its own leaf in `my-menu` (module 34, single
   operation `Add` 1), so the request goes out with `moduleId: 34, operationId: 1` — see note 8.
   And `initialLocation` carries no `countryId` of its own, so the head-office state and city cascade
   off the root `countryId` — which meant moving the `LookupStore` states/cities resources onto the
   `globalOptionsEmployeeId` gate, since a host session never calls `initialize()` and they would
   otherwise never fire. `/Location/State/option` and `/Location/district/option` are on the same
   controller as `/Location/country/option`, which already answers a host with `UserEmployeeId=0`.

3. **`new-tenant-update-by-host` is wired, and `profile` is write-only.** The host
   edit form now calls it and #7 has no caller left. `ModuleId` / `OperationId` are query params on
   this endpoint rather than body fields; `moduleOperationInterceptor` resolves them from the
   session's navigation tree through an explicit `MODULE_OPERATION_ROUTES` row, so `TenantsApi` sets
   neither — it used to send zero for both, which is what the API then authorised against. The
   path segment is spelled `{encryptedTenantId}` in swagger; `get-all-tenants` and `get-tenant-by-id`
   now answer with an 8-character opaque token (`"2ON458Q1"`) rather than an integer, and that token
   is what the app sends — every tenant id the frontend holds is typed `string` as of the
   device-configuration fix, see note 14.

   `#hydrate` fills the whole edit form from a single `get-tenant-by-id` — see note 16 for what that
   returns. Every section it fills is a section the form collects: the SMTP block is no longer one
   of them, so the password the response omits no longer blocks a save.

   Because the DTO has no `isActive`, a status change is still a second call to
   `activate-tenant` / `deactivate-tenant`, as it was under #7. It also has no `subscriptionPlanId`,
   so the edit form reports the tenant's plan rather than offering to change it.

4. **`{id}/delete-dependencies` is unused.** `tenants.ts` deletes behind a plain confirm dialog. The
   endpoint publishes no response schema, so what it reports has to be confirmed before it can drive
   the dialog copy.
5. `POST /Tenant/get` takes `{ isActive }` and returns the caller's _own_ enabled modules. Despite
   the name it is not a tenant-list call — it is the read side of #8, but it takes no `TenantId`, so
   the host screen cannot use it. `tenant-modules.store.ts` reads through
   `GET /Subscription/get-all-tenant-accessible-modules?TenantId&IsActive` instead, which does take a
   tenant. Neither endpoint publishes a response schema, so the store accepts both
   `{ tenantId, modules }` and a bare array. The write body is
   `{ tenantId, modules: [{ moduleId, isEnabled, operations: [{ operationId, isEnabled, isOperationUsed }] }] }`.
6. `get-all-tenant-by-subscription-plan-Id` ignores its `SubscriptionPlanId` parameter and accepts
   the full tenant filter set, so the frontend used to treat it as a general list-and-lookup call.
   The list screen has since moved to `get-all-tenants` (#3), which is the only Tenant list endpoint
   with `SearchKeyword`, `PageNumber` and `PageSize` — server-side search and paging. Check
   `subscription-plan-detail.model.ts` before deleting anything that still references the old shape.
7. **`TenantParentModule` (4 endpoints) has no frontend at all** — `get-module-headers`
   (`TenantId` + `ModuleScope`), `list`, `{id}`, and `PATCH {id}/status`. Module state currently
   reaches the app through `/TenantUserAccess/bootstrap` and
   `/Subscription/get-all-tenant-accessible-modules`. Whether this controller supersedes either is a
   backend question, not a gap to close blindly.
8. **Every Tenant DTO carries `moduleId` / `operationId`** — in the body for the POSTs, as
   `ModuleId` / `OperationId` query params for the GETs. `TenantsApi` still sets none of them itself;
   `moduleOperationInterceptor` attaches the pair to every `/Tenant` request, resolving the ids from
   `GET /Navigation/my-menu` via `FeaturePageStore` and keying on the leaf that owns the endpoint —
   `HOST_TENANT_LIST` for all but the create, which has its own leaf. The
   carrier comes from the controller-level fallback (`query` for reads and deletes, `body` for
   writes) except where one of six explicit rows overrides it, and those rows fall into three kinds.

   Two override the **carrier**: `{id}/resend-verification-by-host` and
   `new-tenant-update-by-host/{id}` are both `query`, because swagger declares the pair there and
   neither DTO has a field for it.

   Three override the **operation**, because `inferOperation` reads only the last path segment and so
   calls `activate-tenant`, `deactivate-tenant` and `delete-tenant` all `Update`. They name the
   operations `HOST_TENANT_LIST` actually publishes — `Active` (8), `Inactive` (9), `Delete` (3) —
   which is what the API acts on; before those rows a host delete was authorised as an update.

   One overrides the **module** as well, and it is the only `/Tenant` row that does:
   `new-tentant-creation-by-host` resolves `HOST_TENANT_CREATE` (34, `Add` 1), because the host
   create is its own leaf rather than an operation on the list page.

   Note that `CurrentUserPermissionsStore` is _not_ the resolver here: it returns early for the
   super-admin host, so `modules()` is empty for exactly the user who manages tenants.

9. `activate-tenant`, `deactivate-tenant` and `delete-tenant` all take `{ tenantId, remark? }`. The
   `remark` gives status changes an audit trail the `PUT` / `DELETE` variants do not. Nothing in the
   UI collects one.
10. `get-employee-code-pattern` requires `IsActive` and accepts `TenantId` or `Id`. Its response is
    typed `ObjectApiResponse` with a bare nullable `data`, so `EmployeeCodePattern` is an assumed
    contract. The six pattern fields are collected write-once at creation; the edit form reads them
    back and renders a sample code.
11. Tenants ride the parent `host` module key for permissions (`tenants.ts`); there is no dedicated
    tenant module key in the permission matrix. The same is true of every host device screen.
12. `ITenant` carries client-only spinner flags `isDeleting`, `isSendingVerification` and
    `isUpdatingStatus`. Only `isUpdatingStatus` is bound in `tenants.html`, on the status-toggle
    button; the other two drive `p-menu` items, which have no loading state.
13. The modules screen reuses `shared/components/permission-matrix`. That component hides modules
    flagged `isEnabled: false`, so `tenant-modules.store.ts` forces the catalog on and passes the
    tenant's current selection through the `rolePermissions` input instead. It also inherits the
    matrix's `Update|Delete|Approve|Reject → View` dependency rule.
14. **The tenant id is a `string` on the newer controllers, and the app now matches.** Swagger types
    `tenantId` / `TenantId` as `string` on `Tenant/get-tenant-by-id`, `get-employee-code-pattern`,
    the activate / deactivate / delete DTOs, and every `TenantDevice`, `TenantDeviceConfiguration`,
    `TenantLocation` and `TenantParentModule` read and write. The older controllers (`Leave*`,
    `*Module*`, `StatData`, `Subscription/*`) still type it `integer`. This report previously
    recorded the opposite call — keep sending a number, "the app has always sent one" — and that is
    what broke the Device Configurations screen: the tenant select fed a string into a zod schema
    demanding a number. `ITenant.id`, `TenantDeviceFields.tenantId`,
    `TenantDeviceConfigurationFields.tenantId` and `TenantLocationRow.tenantId` are all `string`
    now. Two places still straddle the split: `subscription-plan-detail.model.ts` joins the two
    controllers by comparing both sides as strings, and `dashboard-host.store.ts` can no longer sort
    tenants by id, so `recentTenants` reads the list in arrival order instead.

15. **`sync-active-plan-entitlements` declares `moduleId` / `operationId` at its body root, and the
    interceptor fills them.** Swagger: a Super Admin may send zero, any other Host role needs real
    permission identifiers. `tenants.store.ts` posts `{ tenantId }` alone and
    `moduleOperationInterceptor` merges the pair in through the controller-level fallback
    (`HOST_TENANT_LIST` / `Update`, `body` carrier), so no explicit row is needed here — see note 8.
    `SyncPlanEntitlementsReq` declares neither field, which is what keeps the old zero from coming
    back. The call is
    additive and idempotent - it fills in the `TenantEnabledModule` / `TenantEnabledOperation` rows
    the tenant's active plan grants and the snapshot is missing, and never duplicates or removes
    one. The row action is hidden on an inactive tenant, and the list is not refetched because no
    column it renders or filters on changes. It also replaced the row menu's "Modules & Operations"
    link, so `/app/tenants/:id/modules` and everything under `tenant-modules/` - #8 included - is
    now reachable only by typing the URL.

16. **`get-tenant-by-id` returns the whole tenant aggregate, and is the only contract for it.**
    Swagger declares a bare `200: OK` here — as it does for 334 of its 335 operations, every one of
    its 177 published schemas being a request DTO — so `TenantDetail` in
    `shared/interfaces/tenant.ts` is transcribed from live responses. Do not expect the spec to
    confirm any of it.

    Alongside the flat fields (plus `tenantIndustryName`, which saves resolving the label) it
    carries **eight child collections, every one an array** even where a single row is all that is
    meaningful: `profiles`, `locations`, `subscriptions`, `departments`, `employeeCodePatterns`,
    `employees`, `loginCredentials`, `emailConfigurations`. `tenant-form.ts` reads `[0]` of three of
    them, and picks the `isHeadOffice` row out of `locations` (its `id` is the update DTO's
    `selectedLocation.tenantLocationId`; `0` when the tenant has none). The row detail sheet
    (`tenant-detail.ts`) is the second consumer: it fetches on open and renders all eight
    collections read-only. It does not resolve `locations[].stateId` / `cityId` — those names cost
    a per-country / per-state lookup cascade the panel does not run.

    Three things the read side and the write DTOs disagree on, each handled in `#hydrate`:

    - `employeeCodePatterns[].runningNumberLength` is a **number**; both write DTOs take a string.
    - `contactNumber` carries the dial code **and embedded spaces** (`"+9198765 43210"`), which the
      country phone rule rejects, so `#stripDialCode` removes whitespace too.
    - `locations[]` rows are a **subset** of `TenantLocationRow` — no `isActive`, no `tenantId`, no
      `*Name` display fields, no audit columns — hence the separate `TenantDetailLocationRow`.

    `emailConfigurations[]` returns neither `smtpPasswordEncrypted` nor `isActive`. That used to be
    the edit form's last gap; the form no longer collects SMTP at all, so the only consumer left is
    the read-only block on the tenant detail sheet, which asks for neither.

    `subscriptions[0].subscriptionPlanId` is the only way a host session can learn a tenant's plan:
    `/Subscription/get-tenant-subscription-plan-info` demands an `EmployeeId` and `RoleId` a host
    does not have. That is what lets the plan-scoped `get-industries` load on an edit, and with it
    the Industry select. The plan itself is displayed read-only, since the update DTO has no
    `subscriptionPlanId`.

    The endpoint also declares `ModuleId` / `OperationId` query params. `moduleOperationInterceptor`
    supplies both through the controller-level fallback (`HOST_TENANT_LIST` / `View`, `query`
    carrier) — note 8.

## Suggested follow-ups

1. Confirm the backend accepts a host create/update body with no `emailConfiguration` key, and that
   omitting it leaves a tenant's stored SMTP row alone (issue 9). Both DTOs still declare the block
   non-nullable.
2. Two questions left over from issue 10. `HOST_TENANT_LIST` publishes a `Restore` (20) operation
   and no endpoint in the spec appears to consume it — confirm whether a tenant restore route
   exists. And confirm whether `moduleId` / `operationId` are required or optional: swagger marks
   them neither, and the calls succeeded for months without them.
3. Confirm what `{id}/delete-dependencies` returns, then use it in the delete confirm dialog
   (note 4).
4. Confirm with the backend what separates `isEnabled` from `isOperationUsed` in
   `update-modules-and-operations`; the screen sets both from the same checkbox.
5. Decide whether `TenantParentModule` supersedes the bootstrap/accessible-modules reads (note 7).
6. `activate-tenant`, `deactivate-tenant` and `delete-tenant` accept a `remark`. Nothing in the UI
   collects one.
7. Add `src/app/core/services/tenants-api.spec.ts` with `HttpTestingController` asserting the exact
   URLs. A spec of that kind is the only thing that would have caught note 1 before production.

## How to re-verify

Grep `src/` for `/Tenant` string literals and for each `TenantsApi` method name; every match should
appear in a table above. Re-check the DTO shapes against
`https://axionpro-api.onrender.com/swagger/v1/swagger.json`, and re-count the paths:

```bash
curl -s https://axionpro-api.onrender.com/swagger/v1/swagger.json \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const s=JSON.parse(d);
      for(const [p,ops] of Object.entries(s.paths)) if(/^\/api\/Tenant/.test(p))
        for(const m of Object.keys(ops)) console.log(m.toUpperCase(), p);})"
```
