# Swagger Coverage Audit — whole API surface

## Context

The five existing reports in this folder cover Host, Subscription, Tenant, Device and the
attendance-configuration family — roughly a third of the backend. This document audits the **entire**
published surface in one pass, so the remaining two thirds stop being invisible.

Source of truth: the live spec at `https://axionpro-api.onrender.com/swagger/v1/swagger.json`
(UI at https://axionpro-api.onrender.com/swagger/index.html), read on 2026-08-29. It publishes
**333 operations across ~70 controllers**. The frontend wires approximately **264** of them.

Method: every operation in the spec's `paths` object was listed with its HTTP method, then matched
against every URL built in `src/app/core/services/*-api.ts` and
`src/app/features/tickets/ticket-api.ts` (the only HTTP-calling service outside `core/services/`).
Matching is case-insensitive, as ASP.NET routing is. This is an audit deliverable — no source code
was changed to produce it.

Legend: ✅ implemented and wired to UI · ⚠️ implemented but unused · ❌ not implemented ·
💀 implemented against a route the spec does not have.

Companion documents: [`api-issues-for-backend.md`](./api-issues-for-backend.md),
[`attendance-config-api-coverage-report.md`](./attendance-config-api-coverage-report.md),
[`device-api-coverage-report.md`](./device-api-coverage-report.md),
[`host-api-coverage-report.md`](./host-api-coverage-report.md),
[`subscription-api-coverage-report.md`](./subscription-api-coverage-report.md),
[`tenant-api-coverage-report.md`](./tenant-api-coverage-report.md).

## 1. 💀 Broken today — the client calls routes the spec does not have

These rank above every gap below, because they are not missing work: they are code pointing at routes
that cannot answer. Each row was confirmed three times — the URL literal at the call site, whether
that method is reachable from a screen, and the spec's path list.

That last check splits the thirteen into two very different piles.

**Live and reachable (8)** — a user hits these:

| #   | Frontend call                                                    | Call site                           | Spec reality                                                                                                     |
| --- | ---------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 3   | `GET /api/Leave/get-all-leave-type`                              | `core/services/leave-types.ts:31`   | `GET /api/Leave/get`                                                                                             |
| 4   | `POST /api/Leave/add-leave-type`                                 | `core/services/leave-types.ts:45`   | `POST /api/Leave/add`                                                                                            |
| 5   | `POST /api/Leave/update-leave-type`                              | `core/services/leave-types.ts:51`   | `POST /api/Leave/update`                                                                                         |
| 6   | `POST /api/Leave/delete-leave-type`                              | `core/services/leave-types.ts:57`   | `GET /api/Leave/delete` — the verb differs, and a GET cannot carry the `{ id, roleId, employeeId }` body we send |
| 8   | `POST /api/UserModuleRolePermission/assign-employee-permissions` | `employee-api.ts:183`               | the controller publishes only `assign-role-permissions`                                                          |
| 10  | `POST /api/Asset/assign-employee`                                | `assets-api.ts:55`                  | absent; `Asset` publishes only `add` / `get` / `update` / `delete`                                               |
| 11  | `POST /api/Employee/Sensitive/update`                            | `employee-identity-api.ts:81`       | the controller publishes only `Create` and `get`                                                                 |
| 13  | `GET /api/Ticket/TicketHeader/get-all`                           | `features/tickets/ticket-api.ts:81` | the controller publishes no `get-all`                                                                            |

**Unreferenced (5)** — the method exists, nothing calls it. These are ours to delete, not questions
for the backend:

| #   | Frontend call                                             | Method                                                                                  |
| --- | --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | `POST /api/Auth/reset-login-new-password`                 | `setLoginNewPassword` (`auth-api.ts:198`)                                               |
| 2   | `GET /api/Gender/Gender/get`                              | `getGenders` (`users-api.ts:37`) — the app uses `getGenderOptions` → `/Gender/option`   |
| 7   | `GET /api/Role/get-permissions`                           | `getRolePermissions` (`roles-api.ts:136`)                                               |
| 9   | `POST /api/Employee/assign-role`                          | `assignEmployeeRole` (`employee-api.ts:163`)                                            |
| 12  | `GET /api/PolicyMappingLeaveType/get-by-employee-type-Id` | `getAllPolicyMappingLeaveTypesByEmployeeTypeId` (`policy-mapping-leave-type-api.ts:58`) |

The Leave group (#3–#6) is the most serious: the whole leave-type CRUD screen — read, create, update
and delete — is wired to four routes that do not exist. Row 13 fires whenever the ticket-header
master screen has no classification filter set, because `tickets.store.ts:260` then sends
`TicketClassifyId: undefined` and the service falls back to `get-all`.

Rows in the first table are raised with the backend team as **Issue 11** in
[`api-issues-for-backend.md`](./api-issues-for-backend.md). Nothing is repointed until they answer,
because a wrong guess about a rename replaces a visible failure with a silent write to the wrong
endpoint.

## 2. ❌ Controllers with no frontend integration at all

About 50 operations. Each of these needs UI, a store and routes — they are feature work, not a
missing service method. The one exception is `Leave`: that screen already exists and only needs its
four URLs repointed once section 1 is answered, so subtract its 4 operations from any backlog
estimate.

| Controller             | Endpoints | Notes                                                                                                                                                                  |
| ---------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Rule` (`/Sandwich/*`) | 8         | sandwich-leave rules: `get`/`add`/`update`/`delete` plus `DayCombination/{get,add,update,delete}`. Published **without** the `/api` prefix — verify that is deliberate |
| `EmployeeLeavePolicy`  | 6         | `add`, `map`, `update`, `LeaveBalance/update`, and two mapped-policy reads                                                                                             |
| `WorkflowStage`        | 5         | `get`, `get-all`, `create`, `update`, `delete`                                                                                                                         |
| `TenantParentModule`   | 4         | tenant-scoped mirror of `ParentModule`: `get-module-headers`, `list`, `{id}`, `{id}/status`                                                                            |
| `Leave`                | 4         | **not feature work** — the screen exists and points at dead routes; see section 1                                                                                      |
| `Client`               | 3         | `get`, `add`, `update`                                                                                                                                                 |
| `Travel`               | 3         | `getalltravelmodetype`, `addtravelmode`, `updatetravelmodetype`                                                                                                        |
| `EmailTemplate`        | 2         | `get-template-by-code`, `send-template`                                                                                                                                |
| `Category` (non-asset) | 2         | `POST /api/Category/get`, `POST /api/Category/getallmainchildcategory` — distinct from `/api/Asset/Category/*`, which is fully wired                                   |
| `Registration`         | 2         | `AccessDetails`, `candidate`                                                                                                                                           |
| `Entity`               | 1         | `GET /api/Entity/get`                                                                                                                                                  |
| `HolidayCalandar`      | 1         | `GET /api/HolidayCalandar/get` — `holidays-api.ts` is mock with the real base commented out (spelling verbatim from the spec)                                          |
| `MenuStructure`        | 1         | `POST /api/MenuStructure/get-menus-structure`                                                                                                                          |
| `FileUpload`           | 1         | `POST /api/FileUpload/UploadAsset/upload`                                                                                                                              |
| `CommonModule`         | 1         | `POST /api/CommonModule/add`                                                                                                                                           |
| `ComplianceRule`       | 1         | `POST /api/ComplianceRule/update` — an update with no matching read                                                                                                    |
| `Attendance`           | 1         | `POST /api/Attendance/mark-attendance`; the attendance feature is mock today. `POST /api/Attendance/timmy-test` also exists and looks like spec debris                 |
| `Company`              | 1         | `GET /api/Company/{firstname}/{lastname}` — reads like scaffolding; confirm before wiring                                                                              |

`POST /api/Auth/login` is unused **by design**: the app authenticates through
`POST /api/NewLogin/login` (`auth-api.ts`).

## 3. ❌ Single endpoints missing inside otherwise-wired controllers

The cheap ones. Each is a single method on a service that already exists, following the shape the
file already uses.

| Endpoint                                                       | Owning service                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| `GET /api/DeviceMaster/get-info-by-sno/{sNo}`                  | `device-master-api.ts`                                           |
| `GET /api/Host/get-host-module-by-id/{id}`                     | `host-api.ts` (also in `host-api-coverage-report.md`)            |
| `GET /api/SubModule/parent/{parentModuleId}`                   | `sub-module-api.ts`                                              |
| `GET /api/ReportingType/get-by-id`                             | `report-type-api.ts`                                             |
| `DELETE /api/PolicyType/delete-doc`                            | `policy-type-api.ts`                                             |
| `GET /api/PolicyTypeInsuranceMap/get-all-map-insurance`        | `policy-type-insurance-map-api.ts`                               |
| `GET /api/LeaveRule/LeaveRule/Sandwich/get`                    | `leave-rule.ts` (doubled segment is the spec's, not a typo here) |
| `POST /api/Designation/Department/Group/get`                   | `designations-api.ts`                                            |
| `GET /api/TicketClassification/get`                            | `features/tickets/ticket-api.ts`                                 |
| `GET /api/Ticket/TicketType/get-by-id`                         | `features/tickets/ticket-api.ts`                                 |
| `GET /api/PolicyMappingLeaveType/LeavePolicy/EmployeeType/get` | `policy-mapping-leave-type-api.ts` (see section 1 #12)           |

The eight absent `/api/Tenant/...` endpoints are catalogued in
[`tenant-api-coverage-report.md`](./tenant-api-coverage-report.md) and are not repeated here. Most
duplicate routes that are already wired; only three carry genuinely new capability, and two of those
are blocked — see Issue 9 in [`api-issues-for-backend.md`](./api-issues-for-backend.md).

## 4. Mock features with no backend at all

These read local JSON under `public/data/` and have **no** matching controller in the spec. They are
not frontend gaps — nothing can be integrated until the backend publishes something:

OKR (`okr-api.ts`, with the intended `/api/Okr` routes written out but commented), Performance
Management (`performance-management-api.ts`), Learning (`learning-api.ts`,
`learning-certificate-api.ts`, `learning-dashboard-api.ts`), Projects (`projects-api.ts`), Tasks
(`tasks-api.ts`), Payroll (`features/payroll/payroll-api.ts`), and the ticket list/detail store
(`features/tickets/tickets.store.ts` — note its sibling `ticket-api.ts`, which serves the ticket
_masters_, is real and wired).

Two mocks are different, because a real route is already waiting for them:

- `features/attendance/attendance-api.ts` → `POST /api/Attendance/mark-attendance`
- `holidays-api.ts` → `GET /api/HolidayCalandar/get`

## 5. ✅ Fully covered — no action

Employee 15/15 and every sub-resource (Bank, Contact, Dependent, Education, Experience, Insurance,
Sensitive bar the phantom `update`); the nine attendance-configuration controllers at 6/6 each
(DeviceMaster, TenantDevice, TenantLocation, AttendancePolicy, EmployeeLocationAssignment,
EmployeeDeviceEnrollment, EmployeeWorkArrangement, EmployeeWorkPattern, EmployeeWorkModeOverride);
TenantDeviceConfiguration 5/5; Asset, Asset/Category, Asset/Type, Asset/Status; Department;
Designation (bar section 3); Location; Option; EmployeeType; ParentModule; ModuleOperation;
OperationsMaster; Role; UserRole; UserModuleRolePermission (bar section 1 #8); Subscription 7/7;
PlanModuleMapping; TenantIndustry; HostAccess; TenantUserAccess; CommonMenu; ClientInfo; StatData;
Insurance; PolicyType (bar section 3); HostRolePermission; NewLogin; Enum 1/1.

`Enum` moved here from section 2. `GET /api/Enum/get-all-currencies?IsActive=true` is now
wired through `core/services/enum-api.ts` and `LookupStore.currencies`, and feeds the default
currency select on the host tenant edit form. It answers with a bare array rather than the
usual `{ isSucceeded, message, data }` envelope. `core/stores/currency.store.ts` still reads
`public/data/currencies.json`: that list is keyed by ISO code and drives subscription-plan
pricing, where the numeric ids this endpoint returns are not what the DTOs take. Folding the
two lookups into one is worth doing once the plan DTOs move to currency ids.

## 6. Correction to an existing report

[`subscription-api-coverage-report.md`](./subscription-api-coverage-report.md) row 4 marks
`GET /api/Subscription/get-all-tenant-accessible-modules` as ❌ absent, with totals of 6 wired · 1
absent. That is out of date: `SubscriptionsApi.getTenantAccessibleModules`
(`subscriptions-api.ts:66`, URL at `:69`) implements it, and
`features/host/tenants/tenant-modules/tenant-modules.store.ts:71` calls it. The controller is
**7/7 wired**. The endpoint still fails at runtime, but for a server-side reason — Issue 3 in
[`api-issues-for-backend.md`](./api-issues-for-backend.md).

## How to re-verify

```bash
curl -s https://axionpro-api.onrender.com/swagger/v1/swagger.json \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const s=JSON.parse(d);
      const out=[];for(const[p,ops]of Object.entries(s.paths))
        for(const[m,op]of Object.entries(ops))
          out.push((op.tags?.[0]??'?')+'|'+m.toUpperCase()+' '+p);
      out.sort();console.log(out.join('\n'),'\nTOTAL',out.length)})"
```

Then grep `src/` for each controller name as a URL literal (`'/Leave/'`, `'/Asset/'`, …) and compare
against the list. Every `*-api.ts` builds its URLs from `environment.apiUrl` plus a private base
field, so the base field of each service is the fastest starting point.
