# Host API Coverage Report

## Context

The backend exposes 14 `/api/Host/...` endpoints (see the Swagger docs at
https://axionpro-api.onrender.com/swagger/index.html). This report records which of them the Angular
frontend actually calls, and whether each call is wired to real UI or is dead code. It is an audit
deliverable — no source code was changed to produce it.

All Host HTTP calls live in a single service: `src/app/core/services/host-api.ts` (class `HostApi`,
base `${environment.apiUrl}/Host`). No other file builds a `/Host/...` URL.

Legend: ✅ implemented and wired to UI · ⚠️ implemented but unused · ❌ not implemented.

## Coverage

| #   | Endpoint                       | Status | API method (`host-api.ts`)   | Consumers                                                                                               |
| --- | ------------------------------ | ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | POST create-host-user          | ✅     | `createHostUser` :70         | `host-user-manage-dialog.ts:149`                                                                        |
| 2   | POST create-host-role          | ✅     | `createHostRole` :100        | `host-role-manage-dialog.ts:112`                                                                        |
| 3   | GET get-host-user-by-id/{id}   | ✅     | `getHostUserById` :44        | `auth.store.ts:148`, `current-user-permissions.store.ts:186`                                            |
| 4   | GET get-all-host-users         | ✅     | `getHostUsers` :36           | `host-users.store.ts:58`, `dashboard-host.store.ts:115`                                                 |
| 5   | POST update-host-user          | ✅     | `updateHostUser` :76         | `host-user-manage-dialog.ts:182`, `host-users.store.ts:156` (active toggle), `host-profile.store.ts:74` |
| 6   | POST delete-host-user          | ✅     | `deleteHostUser` :82         | `host-users.store.ts:125` ← `host-users.ts:207`                                                         |
| 7   | POST change-host-user-password | ✅     | `changeHostUserPassword` :94 | `update-password.ts:129`                                                                                |
| 8   | POST reset-host-user-password  | ✅     | `resetHostUserPassword` :88  | `host-user-reset-password-dialog.ts:94`                                                                 |
| 9   | GET get-host-role-by-id/{id}   | ✅     | `getHostRoleById` :56        | `host-role-permissions.store.ts:79`                                                                     |
| 10  | GET get-all-host-roles         | ✅     | `getHostRoles` :50           | `host-roles.store.ts:43`, `dashboard-host.store.ts:117`, `host-user-manage-dialog.ts:57`                |
| 11  | POST update-host-role          | ✅     | `updateHostRole` :106        | `host-role-manage-dialog.ts:142`, `host-roles.store.ts:131` (active toggle)                             |
| 12  | POST delete-host-role          | ✅     | `deleteHostRole` :112        | `host-roles.store.ts:102` ← `host-roles.ts:187`                                                         |
| 13  | GET get-host-modules           | ⚠️     | `getHostModules` :62         | none — zero call sites in `src/`                                                                        |
| 14  | GET get-host-module-by-id/{id} | ❌     | —                            | —                                                                                                       |

**Totals: 12 wired · 1 implemented but unused · 1 absent.**

## Notes

- There is no dedicated activate/deactivate endpoint. Both the user and role status toggles reuse
  the `update-*` endpoints — see the comments at `host-users.store.ts:142` and
  `host-roles.store.ts:119`.
- `get-all-host-roles` accepts no query parameters, so the status filter is applied client-side.
- `host-profile.store.ts` sends the full record on update because the endpoint replaces rather than
  patches (comment at `host-profile.store.ts:61`).
- The permission matrix does not use `get-host-modules`; it reads
  `HostRolePermission/get-role-module-permissions` (`host-role-permissions.store.ts:100`).
  `src/app/core/host-modules.ts` is only a static module-name constant that mirrors the endpoint —
  not a call.
- `HostApi` also wraps two endpoints outside the `Host` controller, both wired:
  `getHostRoleModulePermissions` :118 (`HostRolePermission/get-role-module-permissions/{hostRoleId}`)
  and `saveHostRoleModulePermissions` :136 (`HostRolePermission/save-role-module-permissions`).

## Suggested follow-ups

1. Remove `getHostModules` (`host-api.ts:62-68`) together with the then-orphaned
   `GetHostModulesResponse` and `HostModule` types in `src/app/shared/interfaces/host-user.ts:57,71`
   — nothing else references them. Verify with `bun run lint` and `bun run test`.
2. Add `getHostModuleById` only when a screen actually needs it; today none does.

## How to re-verify

Grep `src/` for `'/Host/'` string literals and for each `HostApi` method name. Every match should
appear in the table above.
