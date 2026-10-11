# AxionPro API integration gap report

Source: https://axionpro-api.onrender.com/swagger/v1/swagger.json (479 ops, 472 paths, 81 tags)
Method: swagger ops joined against every `${environment.apiUrl}` HTTP call resolved out of `src/**/*.ts` (350 unique calls).

## Legend

| Emoji | Status              | Meaning                                                               |
| ----- | ------------------- | --------------------------------------------------------------------- |
| 🔴    | Broken              | The app calls a route the API does not serve - 404, gated client-side |
| 🟠    | Not integrated      | Controller documented, zero client calls                              |
| 🟡    | Partly integrated   | Some operations wired, the listed ones are not                        |
| 🔵    | Covered dynamically | Called through a computed path, so the join cannot see it             |
| ✅    | Fully integrated    | Every documented operation is called (not listed in this report)      |

## Summary

| Status | Bucket                           | Count  |
| ------ | -------------------------------- | ------ |
|        | Swagger ops                      | 479    |
| ✅     | Ops the app calls                | ~411   |
| 🟠🟡   | **Ops never called (gap)**       | **59** |
| 🔴     | **App calls with NO swagger op** | **40** |

## A. Uncalled swagger endpoints (grouped)

Heading emoji is the controller's overall state; every bullet below is an operation the app never calls.

### ✅ DeviceDdlOptions (0 uncalled) - every section now has a call site

- `GET /api/device-ddl-options/advanced` — Gets verification, QR, and fill-light options for the Advanced settings form.
- `GET /api/device-ddl-options/app-notification` — Gets app-notification options for the optional App notification form.
- `GET /api/device-ddl-options/bell` — Gets bell output and ring-pattern options so Angular does not hard-code vendor values for the Bell section.
- `GET /api/device-ddl-options/device-setup` — Gets device display, language, and recognition options for the Device setup form.
- `GET /api/device-ddl-options/employee-device-credentials` — Gets employee credential choices only for the Remove credential action, keeping credential codes out of Angula
- `GET /api/device-ddl-options/ethernet` — Gets Ethernet options for the Ethernet network form.
- `GET /api/device-ddl-options/lock` — Gets door, Wiegand, and card-display options for the Lock settings form.
- `GET /api/device-ddl-options/serial` — Gets serial baud-rate and function options for the Serial settings form.
- `GET /api/device-ddl-options/time` — Gets time, date, NTP, and time-zone options so Angular renders firmware-valid values for the Time settings sec
- `GET /api/device-ddl-options/wifi` — Gets Wi-Fi options for the Wi-Fi network form.

### 🟡 Tenant (5 uncalled, all deliberate) - 18/23 wired

Every row below duplicates an endpoint the app already calls, or cannot be called from the screen
that would want it. Verdicts are `docs/api-coverage/tenant-api-coverage-report.md`'s, confirmed
2026-09-21; **do not wire these** without a reason that report does not already answer.

- `PUT /api/Tenant/{id}` — **Duplicate.** Equivalent to `POST update-tenant`, itself superseded by
  the wired `PUT new-tenant-update-by-host/{encryptedTenantId}` (`updateTenantByHost`).
- `DELETE /api/Tenant/{id}` — **Duplicate.** Equivalent to the wired `POST delete-tenant`, minus
  the optional `remark`.
- `POST /api/Tenant/create-host-user` — **Duplicate.** The app uses `/Host/create-host-user`
  (`host-api.ts:72`).
- `POST /api/Tenant/get` — **Unusable here.** Returns the _caller's own_ enabled modules and takes
  no `TenantId`, so the host screen cannot use it; the tenant side reads
  `Subscription/get-all-tenant-accessible-modules` instead.
- `GET /api/Tenant/get-all-tenant-by-subscription-plan-Id` — **Superseded and broken.** It ignores
  its `SubscriptionPlanId`, and `get-all-tenants` is the only list route with server-side search
  and paging.

### 🟠 WorkflowStage (5 uncalled) - no integration

- `POST /api/WorkflowStage/create` — Not-Used-In-Angular.
- `DELETE /api/WorkflowStage/delete` — Not-Used-In-Angular.
- `GET /api/WorkflowStage/get` — Not-Used-In-Angular.
- `GET /api/WorkflowStage/get-all` — Not-Used-In-Angular.
- `PUT /api/WorkflowStage/update` — Not-Used-In-Angular.

### 🟡 Designation (1 uncalled, deliberate) - 13/14 wired

- `POST /api/Designation/Department/Group/get` — **Would replace working code.** Returns
  designations grouped by department. The department → designation cascade already fetches one
  department's designations on demand (`features/employees/employee-import-fields.ts:42`), which is
  lazy by design; swapping it for an all-groups call is a refactor with no user-visible gain.

### ✅ Employee (0 uncalled) - 26/26 wired

- `POST /api/Employee/section-defaults` — now called from the **Employee Editing** tab at
  `/app/setting/employee-editing`, one switch per section. It carries no employee id, so it is a
  **tenant-wide** default, not the per-employee unlock `/Employee/update-edit-status` provides; the
  section is identified by the `moduleId` of its `my-menu` leaf. The API publishes no read, so the
  tab says out loud that the switches send a new default rather than showing the stored one.

### 🟠 TenantParentModule (4 uncalled) - no integration

- `GET /api/TenantParentModule/get-module-headers` — Not-Used-In-Angular.
- `GET /api/TenantParentModule/list` — Not-Used-In-Angular.
- `GET /api/TenantParentModule/{id}` — Not-Used-In-Angular.
- `PATCH /api/TenantParentModule/{id}/status` — Not-Used-In-Angular.

### 🟠 Client (3 uncalled) - no integration

- `POST /api/Client/add` — Not-Used-In-Angular.
- `GET /api/Client/get` — Not-Used-In-Angular.
- `POST /api/Client/update` — Not-Used-In-Angular.

### 🟡 TicketType (1 uncalled, deliberate) - 6/7 wired

- `GET /api/Ticket/TicketType/get-by-id` — **Nothing to call it.** A single-record read; the edit
  dialog is handed the row it is editing, so a wired method would have no caller.

### 🟠 Travel (3 uncalled) - no integration

- `POST /api/Travel/addtravelmode` — Not-Used-In-Angular.
- `GET /api/Travel/getalltravelmodetype` — Not-Used-In-Angular.
- `POST /api/Travel/updatetravelmodetype` — Not-Used-In-Angular.

### 🟠 Attendance (2 uncalled) - no integration

- `POST /api/Attendance/mark-attendance` — Not-Used-In-Angular.
- `POST /api/Attendance/timmy-test` — Not-Used-In-Angular.

### 🟡 Auth (2 uncalled) - 6/8 wired

- `POST /api/Auth/login` — **Superseded, do not wire.** The app posts `NewLogin/login`
  (`core/services/auth-api.ts:161`); this is the older route the same session flow replaced.
- `POST /api/Auth/refresh-token-v2` — **Opt-in, and nothing asks us to opt in.** Same request DTO
  as the wired `refresh-token`, which `token-refresh-service.ts` already wraps in a single-flight
  refresh with deliberate failure propagation and its own specs. Swapping the session-refresh path
  with no defect to fix is risk on the app's most safety-critical route. Revisit if the backend
  deprecates the legacy one or a concrete problem appears.

### 🟠 Category (2 uncalled) - orphan controller, no feature

The whole `/api/Category` controller is these two reads, both keyed by `{ categoryId }`, with no
create, update or list-all beside them. Nothing in the app has a category concept outside
`/Asset/Category/*`, which is a different controller and fully wired. Greenfield: these belong to a
feature that does not exist yet.

- `POST /api/Category/get` — Not-Used-In-Angular.
- `POST /api/Category/getallmainchildcategory` — Not-Used-In-Angular.

### 🟠 ComplianceRule (2 uncalled) - no integration

- `POST /api/ComplianceRule/create` —
- `POST /api/ComplianceRule/update` —

### 🟡 EmailTemplate (2 uncalled) - 6/8 wired

- `GET /api/EmailTemplate/get-template-by-code` — **Legacy, do not wire.** Superseded by `get-by-id`
  and `get-all`; the decision is recorded at `core/services/email-template-api.ts:21`.
- `POST /api/EmailTemplate/send-template` — **Legacy, do not wire.** Same decision, same comment.

### 🟡 Location (1 uncalled, deliberate) - 4/5 wired

- `GET /api/Location/LocalityType/option` — **Nothing to label or filter.** `Locality` carries no
  locality-type field and `Locality/option` accepts no type parameter (`DistrictId`,
  `UserEmployeeId`, `TodaysDate` only), so the only consumer of localities - the policy
  applicability picker - has nowhere to put a type. Wire it when the locality shape gains a type.

### 🟠 Registration (2 uncalled) - no integration

- `POST /api/Registration/AccessDetails` — Not-Used-In-Angular.
- `POST /api/Registration/candidate` — Not-Used-In-Angular.

### 🟠 CommonModule (1 uncalled) - no integration

- `POST /api/CommonModule/add` — Not-Used-In-Angular.

### 🟠 Company (1 uncalled) - no integration

- `GET /api/Company/{firstname}/{lastname}` — Not-Used-In-Angular.

### 🟠 DeviceCommand (1 uncalled) - no integration

- `POST /api/device-commands/submit` — Queues a protocol-confirmed diagnostic command when no typed UI endpoint applies; normal Angular screens shoul

### 🟠 Entity (1 uncalled) - no integration

- `GET /api/Entity/get` — Not-Used-In-Angular.

### 🟠 FileUpload (1 uncalled) - no integration

- `POST /api/FileUpload/UploadAsset/upload` — Not-Used-In-Angular.

### 🟡 Gender (1 uncalled) - 1/2 wired

- `GET /api/Gender/get` — **Deprecated, do not wire.** Superseded by `GET /api/Gender/option`, the only gender route the client calls (`core/stores/lookup.store.ts:72`). `UsersApi.getGenders()` was removed - it had no callers and pointed at a malformed `/api/Gender/Gender/get`.

### 🟠 HolidayCalandar (1 uncalled) - no integration

- `GET /api/HolidayCalandar/get` — Not-Used-In-Angular.

### 🟡 Host (1 uncalled, deliberate) - 13/14 wired

- `GET /api/Host/get-host-module-by-id/{id}` — **Nothing to call it.** Single-record read; the
  module screens edit from the row they already hold.

### 🟠 MenuStructure (1 uncalled) - no integration

- `POST /api/MenuStructure/get-menus-structure` — Not-Used-In-Angular.

### 🟡 ReportingType (1 uncalled, deliberate) - 4/5 wired

- `GET /api/ReportingType/get-by-id` — **Nothing to call it.** The edit dialog is handed the row
  (`features/report-type/report-type.ts:133` passes `data: { reportType }`).

### 🟡 SubModule (1 uncalled, deliberate) - 5/6 wired

- `GET /api/SubModule/parent/{parentModuleId}` — **Duplicate.** A narrower view of the wired
  `get-all`, which the sub-modules screen already filters by parent.

### 🟡 TicketClassification (1 uncalled, deliberate) - 5/6 wired

- `GET /api/TicketClassification/get` — **Nothing to call it.** Single-record read; the list uses
  the documented, wired `/all` and the dialogs edit from the row.

### 🔵 TicketHeader (0 uncalled) - 4/4 wired

- `GET /api/Ticket/TicketHeader/get-by-classification-id` — **Called.** `ticket-api.ts:77` picks it
  through a ternary whenever `TicketClassifyId` is set, so the literal-URL join missed it. Its
  other branch is the undocumented `get-all`, see B2.

## A1. The greenfield controllers are pre-permission scaffolding, not a backlog

Audited 2026-09-21 against swagger and the app's own permission model. **26 of these 27 operations
take no `ModuleId` / `OperationId`** - the only one that does is `MenuStructure/get-menus-structure`,
and it reuses `GetEmployeeTypeRequestDTO` for a menu call. Every endpoint this app successfully
calls goes through that pipeline, stamped by `moduleOperationInterceptor` or supplied in the body.

None of these controllers has a `moduleCode` in `layout/app-aside-menu/aside-menu-module-map.ts`, an
entry in `layout/app-aside-menu/aside-menu-unmapped-modules.ts` (which records codes `my-menu`
publishes but deliberately hides), or a name in `core/permission-modules.ts`. So `my-menu` does not
publish them, no `ModuleId` resolves, and - per `permission-modules.ts`'s own warning - "the param
is dropped, and the endpoint answers 403".

**A screen for any of these cannot be gated, cannot be reached from the menu, and its calls would
not authorise.** The backend has to publish a module for a controller before a screen can exist.
Raised as `docs/backend-tickets/greenfield-controllers-outside-permission-pipeline.md`.
Three buckets:

### Never wire (4 ops)

- `POST /api/Attendance/timmy-test` — a developer test endpoint.
- `GET /api/Company/{firstname}/{lastname}` — a person's name as the path. Scaffold.
- `POST /api/CommonModule/add` — a create with no read, list or update beside it.
- `POST /api/MenuStructure/get-menus-structure` — the menu already comes from
  `GET /Navigation/my-menu`, and this takes an employee-type DTO.

### Incomplete controllers - no screen is possible yet (7 ops)

Each is missing the half a screen needs. Ask the backend to complete them before planning UI.

- `ComplianceRule` — `create` and `update`, no read or list. You could write rules and never see them.
- `Registration` — `candidate` and `AccessDetails`, both writes, no read.
- `Entity/get` — a lone read, purpose undocumented.
- `FileUpload/UploadAsset/upload` — a lone generic upload; asset files already upload through
  `upsert-asset-dialog`.
- `HolidayCalandar/get` — a lone read. `features/holidays/` is mock-only today, and a read with no
  write is a partial migration off a working mock, not an improvement.

### Complete CRUDs, blocked only on a published module (16 ops)

These are the ones worth a product conversation. Each could support a small master screen the day
`my-menu` publishes a code for it.

- `WorkflowStage` (5) — full CRUD, scoped by `EmployeeId` / `RoleId`. Confirm first whether it
  overlaps the policy approval stages already built in `features/tenant-policies/`.
- `TenantParentModule` (4) — `list`, `{id}`, `get-module-headers`, `PATCH {id}/status`. Coverage
  report note 7 already asks whether it supersedes `/TenantUserAccess/bootstrap` and
  `Subscription/get-all-tenant-accessible-modules`; that question is still open and answering it is
  a prerequisite, not a detail.
- `Client` (3) — `get` / `add` / `update`.
- `Travel` (3) — `getalltravelmodetype` / `addtravelmode` / `updatetravelmodetype`.
- `Attendance/mark-attendance` (1) — `features/attendance/` is mock-only; this is the one write that
  would start a real migration.

## B. 🔴 App calls with NO matching swagger operation (404, gated in the client)

`environment.apiUrl = https://axionpro-api.onrender.com/api` - the same host in both environments.

**Status: all 40 confirmed dead and gated.** Every route in this section was probed against the
live host on 2026-09-20 and returned 404, while its documented siblings returned 400/401/415 - so
the misses are deployment gaps, not swagger omissions. None is a rename: no replacement operation
exists to repoint any of them at (checked for employee-scoped permission and asset-assignment
routes in particular).

40, not the 39 the original join found: `GET /Ticket/TicketHeader/get-all` is picked by a ternary
in `features/tickets/ticket-api.ts:77`, so a literal-URL scan does not see it.

`unavailableRouteInterceptor` (`core/interceptors/unavailable-route-interceptor.ts`, outermost in
`app.config.ts`) now fails these requests before they are sent, with the same `404` the server
would have sent and one message the screens surface through `BaseService.handleError`:
"This feature is not available on the server yet." The status stays 4xx on purpose -
`GlobalErrorHandler` reports anything 5xx to Sentry, and a gated screen would file an incident per
click. The UI is left in place - the features are built and routed, only the backend is missing.
The route table is `core/interceptors/unavailable-routes.ts`; **delete a controller or route from
it the day the backend ships it**, and the calls below go live untouched.

### 🔴 B1. Whole controllers absent from swagger (35 calls)

The UI behind these is live, not scaffolding: `features/policies/*`, `features/attendance-policies/*`,
`features/leaves/leave.store.ts`, and the employee-profile insurance and work-arrangement forms all
call them. Gated as a whole controller each, so a route added under one is gated too until the
table is updated.

| Controller               | Service                                          | Ops                                                                 |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------------------- |
| `AttendancePolicy`       | `core/services/attendance-policy-api.ts`         | get-all, get-by-id/{id}, create, update, update-status, delete/{id} |
| `Insurance`              | `core/services/policies-insurance-api.ts`        | create, get-all, get-ddl, get-detail-ddl, update, delete            |
| `PolicyType`             | `core/services/policy-type-api.ts`               | get-all, get-all-unstruct, get-ddl, create, update, delete          |
| `PolicyTypeInsuranceMap` | `core/services/policy-type-insurance-map-api.ts` | get-all, get-details, map, update, delete                           |
| `PolicyMappingLeaveType` | `core/services/policy-mapping-leave-type-api.ts` | get, get-by-employee-type-Id, map, update, delete                   |
| `Leave`                  | `core/services/leave-types.ts`                   | get-all-leave-type, add/update/delete-leave-type                    |
| `LeaveRule`              | `core/services/leave-rule.ts`                    | get, create, update, delete                                         |

### 🔴 B2. Single routes the swagger does not expose (5 calls)

Every row below is live - a feature calls it today, which is why the 404 reached a user before the
gate. Each is gated on its own method and path, so the rest of its controller keeps working.

| Route                                                       | Service                          | Caller                                                                                                                                 |
| ----------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `POST Employee/Sensitive/update`                            | `employee-identity-api.ts`       | `employee-identity-form.ts` - swagger has only `Employee/Sensitive/Create` + `/get`                                                    |
| `GET Role/get-permissions`                                  | `employee-api.ts`                | `employees-permissions.store.ts` - swagger only has `UserModuleRolePermission/get-role-based-permissions`                              |
| `POST UserModuleRolePermission/assign-employee-permissions` | `employee-api.ts`                | `employees-permissions.store.ts` - swagger only has `assign-role-permissions`                                                          |
| `POST Asset/assign-employee`                                | `assets-api.ts`                  | `assign-asset-popup.ts`                                                                                                                |
| `GET Ticket/TicketHeader/get-all`                           | `features/tickets/ticket-api.ts` | `tickets.store.ts` - `getHeaders()` falls back to it whenever `TicketClassifyId` is unset; swagger has only `get-by-classification-id` |

Three more undocumented routes were reached only by API methods nothing called; the methods are
gone rather than repointed:

- `POST Employee/assign-role` - `EmployeeApi.assignEmployeeRole`, no callers. Role changes already
  go through `UserRole/assign-roles-to-user` (`RolesApi.assignUserRoles`).
- `GET Role/get-permissions` - `RolesApi.getRolePermissions`, no callers. Its live sibling
  `getRoleBasedPermissions()` uses the documented `UserModuleRolePermission/get-role-based-permissions`.
- `POST Auth/reset-login-new-password` - `AuthApi.setLoginNewPassword`, no callers. The forgot and
  reset flows both call `createNewLoginPassword()` -> the documented `Auth/create-new-password`.

## C. Notes

- **The join has two blind spots, so 9 rows in the original report were wrong.** It only sees a URL
  written inline in the `.post()`/`.get()` call, and only one branch of a ternary. Struck on
  2026-09-21 after checking the source: all 6 `Subscription` ops (wired in
  `core/services/subscriptions-api.ts:35-93` behind `const url = ...`),
  `Location/Locality/option` (`locations-api.ts:87`), and `Ticket/TicketType/get-all` +
  `get-by-header-id` (`features/tickets/ticket-api.ts:109`, picked by a ternary).
- **Also already wired, struck 2026-09-21:** `GET /api/device-ddl-options/tenant-card-inventory` is
  served by `DeviceDdlOptionsApi.getTenantCardInventory()` and consumed by
  `features/host/tenant-card-inventory/tenant-card-inventory.store.ts`.
- **Also already wired, struck 2026-09-21:** `GET /api/PlanModuleMapping/options/{subscriptionPlanId}`
  is `PlanModuleMappingApi.getPlanModuleOptions()`, called by
  `features/host/subscriptions/subscription-plan-module-map/`. Another `const url = ...` the join
  cannot see.
- **Audited 2026-09-21, deliberately not wired (10 ops):** the single-route leftovers across
  `Designation`, `TicketType`, `TicketClassification`, `Host`, `ReportingType`, `SubModule`,
  `Location`, `Category` and `Auth`. Each was checked against the code and swagger rather than the
  join, and each is a duplicate of a wired route, a single-record read whose screen already holds
  the row, a lookup with no field to bind to, or an orphan of a feature that does not exist. The
  per-row verdicts are in section A above; **none of them should be wired to satisfy the count.**
  All 10 remain genuinely uncalled, so they stay in the gap total.
- **Closed on 2026-09-21 (tenant administration):** `Tenant/add-employee-code-pattern`,
  `Tenant/update-employee-code-pattern` and `Tenant/{id}/delete-dependencies`. The pattern pair
  drives a new screen at `features/employee-code-configuration/`, which replaces the
  `TENANT_EMPLOYEE_CODE` placeholder the sidebar already pointed at; it previews with
  `confirm: false`, gates Apply on the backend's `canCommit`, echoes the `previewHash` on confirm
  and discards a stale preview on 409 rather than re-previewing silently. `delete-dependencies`
  now runs before the tenant delete confirmation and lists what the delete takes with it.
  **Caveat:** swagger publishes no response schema for any of these three, so
  `EmployeeCodePatternPreview` and `TenantDeleteDependency` are modelled from prose and marked
  UNVERIFIED. The preview table says so on screen if the rows come back in a shape it cannot read,
  and the delete dialog falls back to its old generic warning.
- **Closed on 2026-09-21 (devices and enrollment):** `TenantDeviceConfiguration`'s
  `gateway-address/{tenantDeviceId}`, `replace-https-gateway-url` and `dispatch-mqtts-now`,
  `TenantDevice/update-location`, `DeviceMaster/get-info-by-sno/{sNo}`,
  `EmployeeDeviceEnrollment/face/upsert` and `pin/upsert`, and
  `device-ddl-options/employee-device-access-windows`. The three
  `TenantDeviceConfiguration` routes and the move landed on the **tenant** surfaces
  (`features/tenant-devices/`), not the Host grids: the whole settings family denies Host
  principals. Shapes come from `docs/specs/device-configuration/`.
- **Deliberately not wired:** `POST /api/device-commands/submit`. Its own handoff says "Do not use
  for normal Tenant forms. It is a controlled Host diagnostic endpoint", and
  `docs/specs/device-configuration/device-initial-configuration-report.md` records that it now
  rejects configuration, reboot, cleanup, upgrade and write-file commands - so there is no command
  a screen could legitimately send through it. Revisit only with a named diagnostic workflow.
- **Closed on 2026-09-21 (Host bulk import):** all 40 operations of the five Host `import/*`
  controllers - `DeviceMaster`, `TenantCardMaster`, `SubModule`, `Operation` and `ModuleOperation`.
  `core/services/module-bulk-import-api.ts` was generalised into `host-bulk-import-api.ts`, which
  takes the controller as a `HostBulkImportTarget`, and `features/host/host-bulk-import.ts` holds
  one adapter factory plus a display config per catalogue. Each of the five Host list pages now
  opens the shared wizard. Permission rows and the module codes behind them come from the live
  smoke run recorded in `docs/testing/bulk/all-live-smoke/2026-09-19.md`.
- **Closed on 2026-09-21:** `bulk/jobs`, `bulk/retry` and `bulk/cancel` on all five tenant masters
  (Employee, Department, Designation, Role, EmployeeType). The five Bulk Upload menu entries are
  now real job-history screens (`features/bulk-upload/`) rather than placeholder stubs, and each
  master's adapter and copy moved next to it as `<master>-bulk-import.ts` so the list page and the
  history page drive one definition.
- `device-ddl-options/{section}` is called dynamically by `device-ddl-options-api.ts`, so the 12 swagger rows are all covered - `employee-device-access-windows` was the last one without a section constant and gained `getEmployeeDeviceAccessWindows()` on 2026-09-21.
- Swagger's own `Angular usage status` annotations are unreliable: 232 of 479 ops carry no annotation, and several annotated `Not-Used-In-Angular` routes are in fact called.
- Mock-only features (no backend wiring at all): OKR, leave, learning, performance management, projects, tasks, holidays, attendance, payroll - all read static `data/*.json`.
