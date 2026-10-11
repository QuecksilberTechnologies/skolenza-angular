# Missing Route Guards Report

**Date:** 2026-08-17
**Scope:** All `*.routes.ts` files under `src/app`
**Status:** Audit only — no code changes applied

---

## 1. Guard Inventory

Five guards exist in `src/app/core/guards/`:

| Guard                                | Type                    | Purpose                                                                                                                                       |
| ------------------------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `isAuthenticatedGuard`               | `CanActivateFn`         | Session check. Applied once, on `/app` in `app.routes.ts:18`.                                                                                 |
| `roleTypeGuard([ids])`               | `CanActivateFn` factory | Role gate. `roleTypeId`: 0 = Host, 1 = Admin, 2 = Employee, 3 = Manager. Shows a toast and redirects to the caller's own dashboard on denial. |
| `roleTypeMatch([ids])`               | `CanMatchFn` factory    | Side-effect-free twin of `roleTypeGuard`, for paths shared across roles. Used only for `profile`.                                             |
| `hasModulePermissionGuard('Module')` | `CanActivateFn` factory | Per-module RBAC via `CurrentUserPermissionsStore.canAccessOrUnknown()`.                                                                       |
| `unsavedChangesGuard`                | `CanDeactivateFn`       | `confirm()` prompt for dirty forms.                                                                                                           |
| `requirePlanIdGuard`                 | `CanActivateFn`         | Requires a `planId` query param; used on `auth/register-tenant`.                                                                              |

## 2. Root Cause

`app-aside-menu.ts:132` filters sidebar entries by their `moduleKey`:

```ts
.filter((i) => !i.moduleKey || this.#permissionsStore.canAccessOrUnknown(i.moduleKey))
```

`public/data/aside-menu.json` declares a `moduleKey` for most feature entries. The corresponding **routes**, however, mostly carry only a `roleTypeGuard`. The result is that a module the backend never granted is hidden from the menu but still reachable by typing the URL. Only three routes currently pair the role gate with the module gate: `leave` (`Leaves`), `payroll` (`Payroll`), and `roles` (`Roles`).

## 3. Findings

### A. Module permission gate missing — 🔴 High

The menu hides these entries by `moduleKey`, but the route does not enforce the same check.

| Route          | File                     | moduleKey       | Current guard  | Missing                                     |
| -------------- | ------------------------ | --------------- | -------------- | ------------------------------------------- |
| `employees`    | `features.routes.ts:34`  | `Employees`     | `allStaff`     | `hasModulePermissionGuard('Employees')`     |
| `attendance`   | `features.routes.ts:47`  | `Attendance`    | `allStaff`     | `hasModulePermissionGuard('Attendance')`    |
| `holidays`     | `features.routes.ts:53`  | `Holidays`      | `allStaff`     | `hasModulePermissionGuard('Holidays')`      |
| `assets`       | `features.routes.ts:59`  | `Assets`        | `allStaff`     | `hasModulePermissionGuard('Assets')`        |
| `tickets`      | `features.routes.ts:65`  | `Tickets`       | `allStaff`     | `hasModulePermissionGuard('Tickets')`       |
| `okr`          | `features.routes.ts:71`  | `OKR`           | `allStaff`     | `hasModulePermissionGuard('OKR')`           |
| `tasks`        | `features.routes.ts:77`  | `Tasks`         | `allStaff`     | `hasModulePermissionGuard('Tasks')`         |
| `projects`     | `features.routes.ts:98`  | `Projects`      | `allStaff`     | `hasModulePermissionGuard('Projects')`      |
| `projects/:id` | `features.routes.ts:104` | `Projects`      | `allStaff`     | `hasModulePermissionGuard('Projects')`      |
| `departments`  | `features.routes.ts:152` | `Departments`   | `adminManager` | `hasModulePermissionGuard('Departments')`   |
| `designations` | `features.routes.ts:158` | `Designations`  | `adminManager` | `hasModulePermissionGuard('Designations')`  |
| `report-types` | `features.routes.ts:164` | `ReportingType` | `adminManager` | `hasModulePermissionGuard('ReportingType')` |
| `policies`     | `features.routes.ts:201` | `Policies`      | `adminManager` | `hasModulePermissionGuard('Policies')`      |

Already correct — no action needed:

| Route     | Guards                                                                                 |
| --------- | -------------------------------------------------------------------------------------- |
| `leave`   | `roleTypeGuard([1,3])` + `hasModulePermissionGuard('Leaves')` (`leaves.routes.ts:7`)   |
| `payroll` | `roleTypeGuard([1,3])` + `hasModulePermissionGuard('Payroll')` (`payroll.routes.ts:5`) |
| `roles`   | `adminManager` + `hasModulePermissionGuard('Roles')` (`roles.routes.ts:11`)            |

Note: `hasModulePermissionGuard` deliberately fails open for modules absent from the tenant-operations catalog (`has-module-permission-guard.ts:15-18`), so adding it to a route the backend does not model is safe — the `roleTypeGuard` remains the effective gate.

### B. No `canActivate` at all — 🔴 High

| Route           | File                     | Reachable by                                                                                              |
| --------------- | ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `setting`       | `features.routes.ts:126` | Every authenticated role, including Host — exposes tenant brand identity, appearance, and locale settings |
| `notifications` | `features.routes.ts:133` | Every authenticated role                                                                                  |

`settings.routes.ts` children (`brand-identity`, `appearance`, `language-region`, `notifications`) are likewise unguarded; only `billing` carries `adminManager` (`settings.routes.ts:40`).

### C. Role gate too broad on admin-only children — 🟠 Medium

Child routes inherit the parent's `canActivate`, so these all sit behind `allStaff` (Admin + Manager + Employee) when they should be Admin/Manager only.

| Route                               | File                     | Issue                                                           |
| ----------------------------------- | ------------------------ | --------------------------------------------------------------- |
| `employees/permissions/:employeeId` | `employees.routes.ts:13` | An Employee can open the permission editor for any `employeeId` |
| `assets/asset-status`               | `assets.routes.ts:19`    | Master-data configuration                                       |
| `assets/asset-types`                | `assets.routes.ts:24`    | Master-data configuration                                       |
| `assets/asset-categories`           | `assets.routes.ts:29`    | Master-data configuration                                       |
| `tickets/classifications`           | `tickets.routes.ts:18`   | Ticket configuration                                            |
| `tickets/headers`                   | `tickets.routes.ts:23`   | Ticket configuration                                            |
| `tickets/types`                     | `tickets.routes.ts:28`   | Ticket configuration                                            |
| `tickets/support-teams`             | `tickets.routes.ts:33`   | Ticket configuration                                            |

### D. Missing `canDeactivate` — 🟡 Low

| Route                               | File                     | Issue                                                                                                                                                                                 |
| ----------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `employees/permissions/:employeeId` | `employees.routes.ts:13` | Renders a permission matrix with unsaved state but has no `unsavedChangesGuard`. The two sibling permission editors both have it: `roles.routes.ts:18` and `host-roles.routes.ts:16`. |

### E. No guest-only guard on auth routes — ⚪ Informational

`auth.routes.ts` has no "already authenticated" redirect. A logged-in user can navigate back to `/auth/login`. No data exposure; cosmetic only.

## 4. Suggested Remediation

1. **A — module gates.** Append `hasModulePermissionGuard('<Key>')` to each `canActivate` array in `features.routes.ts`, taking the key verbatim from `public/data/aside-menu.json` so menu and route agree:

   ```ts
   canActivate: [...allStaff, hasModulePermissionGuard('Employees')],
   ```

2. **B — guard the ungated routes.** Add `canActivate: allStaff` to `setting` and `notifications` in `features.routes.ts`. The parent gate covers the `settings.routes.ts` children.

3. **C — tighten admin-only children.** Add `canActivate: [roleTypeGuard([1, 3])]` to the eight routes listed in section C.

4. **D — add `canDeactivate`.** Add `unsavedChangesGuard` to `employees/permissions/:employeeId`, matching `roles.routes.ts:18`. Confirm the component implements the `CanComponentDeactivate` interface (`unsaved-changes-guard.ts:3`); add a `canDeactivate()` method if it does not.

5. **E — optional.** Add a `guestOnlyGuard` to `auth/login` that redirects authenticated users via `authApi.redirectToDashboard()`.

## 5. Verification

- `npx ng build` — confirm no type errors from the new guard imports.
- `npx ng test` — `role-type-guard.spec.ts` should still pass; extend coverage for the newly gated routes.
- Manual matrix: for each of Host / Admin / Manager / Employee, navigate to every route in sections A–C by URL and confirm the allow-or-redirect result matches sidebar visibility.
