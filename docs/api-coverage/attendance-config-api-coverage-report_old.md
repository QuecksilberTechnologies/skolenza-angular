# Attendance Configuration API Coverage Report

## Context

The backend spec ("54 API endpoints") defines the attendance-configuration domain as **9 controllers
× 6 endpoints = 54 endpoints** — 12 on the Host side, 42 on the Tenant side. See the Swagger docs at
https://axionpro-api.onrender.com/swagger/index.html. This report records how much of that surface
the Angular frontend calls today.

It is the companion to [`device-api-coverage-report.md`](./device-api-coverage-report.md) (which
already documents the 12 Host endpoints in full, including the assumed contracts),
[`host-api-coverage-report.md`](./host-api-coverage-report.md),
[`tenant-api-coverage-report.md`](./tenant-api-coverage-report.md),
[`subscription-api-coverage-report.md`](./subscription-api-coverage-report.md), and
[`api-issues-for-backend.md`](./api-issues-for-backend.md) — whose Issues 1 and 4 already log the
`/api/TenantLocation/get-all` 401 and its missing `TenantId` filter.

Legend: ✅ implemented and wired to UI · ⚠️ implemented but unused · ❌ not implemented.

## Summary

**All 54 endpoints are wired to a screen. The 30 employee-scoped ones cannot run yet** — the API
identifies employees by an int64 the frontend has no way to obtain (Issue 5, detailed below).

| #   | Area (controller)          | Owner       | Endpoints | API service                                         | Store | UI  | Route | Menu |
| --- | -------------------------- | ----------- | --------- | --------------------------------------------------- | ----- | --- | ----- | ---- |
| 1   | DeviceMaster               | HostUser    | ✅ 6 / 6  | `core/services/device-master-api.ts`                | ✅    | ✅  | ✅    | ✅   |
| 2   | TenantDevice               | HostUser    | ✅ 6 / 6  | `core/services/tenant-device-api.ts`                | ✅    | ✅  | ✅    | ✅   |
| 3   | TenantLocation             | Tenant User | ✅ 6 / 6  | `core/services/tenant-location-api.ts`              | ✅    | ✅  | ✅    | ✅   |
| 4   | AttendancePolicy           | Tenant User | ✅ 6 / 6  | `core/services/attendance-policy-api.ts`            | ✅    | ✅  | ✅    | ✅   |
| 5   | EmployeeLocationAssignment | Tenant User | ✅ 6 / 6  | `core/services/employee-location-assignment-api.ts` | ✅    | ✅  | ✅    | tab  |
| 6   | EmployeeDeviceEnrollment   | Tenant User | ✅ 6 / 6  | `core/services/employee-device-enrollment-api.ts`   | ✅    | ✅  | ✅    | tab  |
| 7   | EmployeeWorkArrangement    | Tenant User | ✅ 6 / 6  | `core/services/employee-work-arrangement-api.ts`    | ✅    | ✅  | ✅    | tab  |
| 8   | EmployeeWorkPattern        | Tenant User | ✅ 6 / 6  | `core/services/employee-work-pattern-api.ts`        | ✅    | ✅  | ✅    | tab  |
| 9   | EmployeeWorkModeOverride   | Tenant User | ✅ 6 / 6  | `core/services/employee-work-mode-override-api.ts`  | ✅    | ✅  | ✅    | tab  |

Rows 1–4 are standalone screens with their own aside-menu entries. Rows 5–9 are employee-scoped, so
they are **tabs inside the employee profile** (`features/user-menu/employee-profile/`) rather than
menu items — matching how the backend scopes them.

Note the row-9 controller is **`EmployeeWorkModeOverride`** — the backend spec document calls it
`EmployeeWorkModeOverrideRequest`, which does not exist.

Only `update-status` is unused: the five tabs carry `isActive` on their create and update bodies, so
the status toggle has no separate affordance. The methods exist on every service.

`features/policies/` is insurance and leave policy — unrelated to `AttendancePolicy`.

All contracts live in `shared/interfaces/attendance-config/`; the six domain enums and the shared
`AttendanceConfigMutationRes` envelope are in `attendance-config.ts` there.

## 1–2. DeviceMaster and TenantDevice — ✅ complete

All 12 Host endpoints are wired end to end: services, contracts, stores, grids, full-page forms with
colocated zod schemas, detail drawers, routes (`roleTypeGuard([0])` + `hasModulePermissionGuard`), and
aside-menu entries. Per-endpoint tables and the four assumed contracts live in
[`device-api-coverage-report.md`](./device-api-coverage-report.md); they are not repeated here.

## 3. TenantLocation — ✅ 6 of 6

| #   | Endpoint           | Status | API method (`tenant-location-api.ts`) | Consumers                                                                                       |
| --- | ------------------ | ------ | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | GET get-all        | ✅     | `getTenantLocations`                  | `tenant-locations.store.ts` (grid), `tenant-devices.store.ts`, `tenant-device-form.ts` (lookup) |
| 2   | GET get-by-id/{id} | ✅     | `getTenantLocation`                   | `tenant-location-form.ts` (edit hydration)                                                      |
| 3   | POST create        | ✅     | `addTenantLocation`                   | `tenant-location-form.ts`                                                                       |
| 4   | POST update        | ✅     | `updateTenantLocation`                | `tenant-location-form.ts`                                                                       |
| 5   | POST update-status | ✅     | `setTenantLocationStatus`             | `tenant-locations.store.ts` (`toggleActive`)                                                    |
| 6   | DELETE delete/{id} | ✅     | `deleteTenantLocation`                | `tenant-locations.store.ts` (`deleteTenantLocation`)                                            |

Screen: `features/tenant-locations/` — grid with type / country / state / city / status filters,
full-page form (18 fields across five `app-section-card` sections), and a read-only detail drawer.
Route `tenant-locations`, `roleTypeGuard([1, 3])`, write routes behind
`hasModuleOperationGuard('Attendance', 'Add' | 'Update')` and `unsavedChangesGuard`.

The contracts moved from `shared/interfaces/device/` to `shared/interfaces/attendance-config/` —
`TenantLocation` is a tenant-side master and the parent of `TenantDevice`,
`EmployeeLocationAssignment`, `EmployeeWorkArrangement`, `EmployeeWorkPattern` and
`EmployeeWorkModeOverride`. `TenantLocationRow` now extends `Partial<TenantLocationFields>` so the
host tenant-device dropdown, which reads only five of those fields, keeps compiling.

**Still open:** the endpoint is tenant-scoped and returns `401 "Inactive user."` for a **host** token
(Issue 1 in [`api-issues-for-backend.md`](./api-issues-for-backend.md)). `get-all` has since grown a
`TenantId` filter, which the two host screens now send in case the tenant is what the check wants;
if the 401 survives, the host tenant-device location dropdown stays empty on **Add**, while **Edit**
falls back to the `tenantLocationName` the device row itself carries. The new screens are
`adminManager`-only, so they are unaffected either way.

## 4. AttendancePolicy — ✅ 6 of 6

| #   | Endpoint           | Status | API method (`attendance-policy-api.ts`) | Consumers                                                 |
| --- | ------------------ | ------ | --------------------------------------- | --------------------------------------------------------- |
| 1   | GET get-all        | ✅     | `getAttendancePolicies`                 | `attendance-policies.store.ts` (grid)                     |
| 2   | GET get-by-id/{id} | ✅     | `getAttendancePolicy`                   | `attendance-policy-form.ts` (edit hydration)              |
| 3   | POST create        | ✅     | `addAttendancePolicy`                   | `attendance-policy-form.ts`                               |
| 4   | POST update        | ✅     | `updateAttendancePolicy`                | `attendance-policy-form.ts`                               |
| 5   | POST update-status | ✅     | `setAttendancePolicyStatus`             | `attendance-policies.store.ts` (`toggleActive`)           |
| 6   | DELETE delete/{id} | ✅     | `deleteAttendancePolicy`                | `attendance-policies.store.ts` (`deleteAttendancePolicy`) |

Screen: `features/attendance-policies/` — grid with policy-type and status filters, full-page form
(14 fields), and a detail drawer. The policy-type dropdown reuses `PolicyTypeApi.getPolicyTypeNames()`
(`/PolicyType/get-ddl`); its `PolicyTypeEnumVal` param became optional so the call can ask for every
type, since no published enum member covers attendance.

## 5–9. Employee profile tabs — ✅ 30 endpoints

`EmployeeLocationAssignment`, `EmployeeDeviceEnrollment`, `EmployeeWorkArrangement`,
`EmployeeWorkPattern`, `EmployeeWorkModeOverride` each surface as a tab under
`features/user-menu/employee-profile/`:

| Tab              | Route                      | Folder                               | Notes                                                 |
| ---------------- | -------------------------- | ------------------------------------ | ----------------------------------------------------- |
| Work Locations   | `location-assignment-info` | `employee-location-assignment-info/` | Primary flag, effective date range                    |
| Devices          | `device-enrollment-info`   | `employee-device-enrollment-info/`   | Face / fingerprint / card credentials                 |
| Work Arrangement | `work-arrangement-info`    | `employee-work-arrangement-info/`    | Add hidden while one is active — a second is rejected |
| Work Pattern     | `work-pattern-info`        | `employee-work-pattern-info/`        | Hangs off the arrangement, one row per weekday        |
| Overrides        | `work-mode-override-info`  | `employee-work-mode-override-info/`  | Raise and edit only — no approval endpoint exists     |

Each tab is a per-tab `signalStore` keyed on the employee id, the shared `Profile*` blocks for
rendering, and an Optimus `DialogService` form built on Signal Forms with a colocated zod schema.

### ⚠️ The five tabs are blocked on the backend

They render, but they cannot read or write, because **the employee identifier they need does not
exist on this side of the API**. The controllers bind `employeeId` as a real `int64`; the app only
ever holds an 8-character code:

```
GET /api/EmployeeWorkModeOverride/get-all?EmployeeId=XGQRD0Z8  →  400
"The value 'XGQRD0Z8' is not valid for EmployeeId."
```

The session (`employeeId: "XGQRD0Z8"`), the employee grid and `/Employee/get-profile-summary` all
carry only that code, while every other employee endpoint (`Employee/Bank`, `Employee/Contact`,
`Employee/Dependent`, …) takes it as a string and works.

So each tab resolves the id only when the code is numeric, and otherwise shows a short message
naming the gap — no request is issued, because it would 400 on every visit. The moment the backend
either binds the code or exposes a numeric id, the tabs light up with no further change. Issue 5 in
[`api-issues-for-backend.md`](./api-issues-for-backend.md) carries the decision.

The profile page is shared: it shows the signed-in employee by default, or whoever
`?employeeId=` names when an admin opens it from the Employees grid — the row action menu links to
all five tabs alongside the eight older ones. Every add, edit and delete
affordance is gated on `canPerform('Attendance', …)`, so an employee without attendance permissions
reads their own configuration but cannot change it.

**Work Pattern resolves its own parent.** Patterns hang off an arrangement, not off the employee, so
the tab loads the employee's arrangements, picks the active one (falling back to the most recent),
and lists that arrangement's weekdays. With no arrangement at all it explains that one is needed
rather than showing an empty list. Weekdays already configured are filtered out of the day select,
because the backend rejects a duplicate day.

## Domain enums

All six are now authored in `shared/interfaces/attendance-config/attendance-config.ts`, with option
arrays in `shared/utilities/common-data.ts` and label pipes in `shared/pipes/`:

| Enum                             | Values | Names                                                                        |
| -------------------------------- | ------ | ---------------------------------------------------------------------------- |
| `AttendanceLocationScope`        | 1–4    | documented                                                                   |
| `WorkMode`                       | 1–5    | documented                                                                   |
| `WorkPatternDay`                 | 1–7    | documented (Monday-first, unlike `Date.getDay()`)                            |
| `TenantLocationType`             | 1–9    | 8 documented; **value 9 unmapped**, rendered as `-` — same as `DeviceType` 8 |
| `HybridType`                     | 1–2    | **assumed** — spec names only `Fixed`; `Flexible` inferred                   |
| `WorkModeOverrideApprovalStatus` | 1–4    | **assumed** — spec names only `Pending`                                      |

Swagger publishes every one of them as a bare integer with no member names, so the three flagged rows
carry an `ASSUMED CONTRACT` note in the source and need confirming against the backend enums.

## Notes

### Dependency rules

The spec defines hard reject rules the screens have to anticipate. No custom status-code parsing was
added: `BaseService.handleError` already unwraps the backend `message`, and both stores surface it in
the toast, so a reject reads as its own explanation. The confirm dialogs on the two shipped screens
name the dependency up front:

- Deactivate / delete `DeviceMaster` → rejected while any active or non-deleted `TenantDevice` links
  to it.
- Deactivate / delete `TenantDevice` → rejected while an active `EmployeeDeviceEnrollment` exists.
- Deactivate / delete `TenantLocation` → rejected while any `TenantDevice`,
  `EmployeeLocationAssignment`, `EmployeeWorkArrangement`, `EmployeeWorkPattern` or
  `WorkModeOverride` still references it.
- Deactivate / delete `AttendancePolicy` → rejected while an active `EmployeeWorkArrangement` uses it.
- Delete `EmployeeWorkArrangement` → rejected while `WorkPattern` or `Override` children exist.
- Nothing cascade-deletes anywhere in this domain.

Uniqueness constraints: `SerialNumber` globally unique; `DeviceCode` and `AssetTag` unique **within a
tenant**; `LocationCode` unique within a tenant; one `WorkPattern` row per weekday per arrangement.

An employee may hold **at most one current active `EmployeeWorkArrangement`**, and the existing one is
**not** replaced automatically — so a create form must handle the "already has one" case explicitly.

### Backend-side gaps that block UI work

- **No approve / reject / cancel endpoints for `EmployeeWorkModeOverride`.** The spec states
  the approval permission model is intentionally deferred. A request can be raised but never actioned,
  and `ApprovalStatus` is effectively a read-only `Pending`. Any UI built now is a half-flow.
- **No attendance engine.** All 54 endpoints store configuration only. Nothing yet computes
  Present / Absent / Late, evaluates geofence, or resolves which location and device were permitted on
  a given day. Attendance reporting screens are not buildable from this surface.
- **`TenantDevice.GetBySerialNumberAsync()` exists in the repository layer but is not exposed over
  HTTP**, so lookup-by-serial — the natural enrollment UX — is unavailable.
- **Tenant users cannot mutate `TenantDevice` at all**; they only create enrollment mappings. Any
  tenant-facing device screen must be read-only over host-owned data.

### Permission matrix

No `moduleKey` exists for any attendance-configuration area, so both shipped screens ride the existing
tenant **`Attendance`** key — in their list components, and in `hasModuleOperationGuard` on the write
routes.

That choice is deliberate. `canAccessOrUnknown` fails _open_ for an unknown tenant key, while
`canPerform` returns _false_ for one, so an invented key such as `TenantLocations` would let everyone
onto the screen and hide Add / Edit / Delete from everyone but a superadmin. `Attendance` already
exists in the menu and the tenant operations catalog, and these are attendance-configuration screens,
so both gates behave. A `TODO` in each list component records the swap.

Menu entries themselves are data, not code: `public/data/aside-menu.json` is loaded through
`httpResource` in `layout/app-aside-menu/app-aside-menu.ts` and filtered by `moduleKey`, so adding one
needs no TypeScript change.

## Suggested follow-ups

1. **Resolve the TenantLocation identity question** (Issue 1 in
   [`api-issues-for-backend.md`](./api-issues-for-backend.md)) — whether a host may read tenant
   locations, or whether a host-scoped equivalent with a `TenantId` filter is needed. Until then the
   host tenant-device location dropdown stays empty.
2. **Request permission-matrix modules** for the attendance-configuration areas, so the screens stop
   riding the `Attendance` key.
3. **Confirm the three assumed enums** (`HybridType`, `WorkModeOverrideApprovalStatus`, and the ninth
   `TenantLocationType` value) against the backend, and confirm the assumed response shapes with the
   first real payloads. The tabs lean on assumed display fields (`tenantLocationName`, `deviceName`,
   `attendancePolicyName`, …); each renders `-` if the backend does not send them.
4. **Confirm a tenant session may read `/api/TenantDevice/get-all`.** The Devices tab needs it for its
   device picker, but the spec calls the controller HostUser-only. If it is rejected, the picker is
   empty and enrollments cannot be created.
5. **Approval endpoints for `EmployeeWorkModeOverride`.** The Overrides tab says plainly that requests
   stay pending; it becomes a real flow only once approve / reject / cancel exist.
6. Ask the backend to expose `GetBySerialNumberAsync()` so the Devices tab can offer lookup by serial
   instead of a long dropdown.

## How to re-verify

```bash
# Every area should have exactly one service file
ls src/app/core/services | grep -E "tenant-location|attendance-policy|employee-(location-assignment|device-enrollment|work-)"

# The two standalone screens
ls src/app/features/tenant-locations src/app/features/attendance-policies

# The five employee tabs
ls -d src/app/features/user-menu/employee-profile/employee-{location-assignment,device-enrollment,work-arrangement,work-pattern,work-mode-override}-info

# The contracts moved out of the device folder
ls src/app/shared/interfaces/attendance-config
```

```bash
bun run lint && bun run build && bun run test
```

Every match should be accounted for in the tables above.
