# Device API Coverage Report

## Context

The backend exposes three device controllers — 6 `/api/DeviceMaster/...` endpoints (the global catalog
of device models), 6 `/api/TenantDevice/...` endpoints (the units installed at tenant locations), and
5 `/api/TenantDeviceConfiguration/...` endpoints (how each unit connects).
See the Swagger docs at https://axionpro-api.onrender.com/swagger/index.html. This report records
which of them the Angular frontend calls and where. It is the companion to
[`host-api-coverage-report.md`](./host-api-coverage-report.md) and
[`subscription-api-coverage-report.md`](./subscription-api-coverage-report.md).

Unlike those two, this one documents a controller that was wired **as part of the same change**, so
it also records the contracts that had to be assumed.

All device HTTP calls live in three services: `src/app/core/services/device-master-api.ts`
(`DeviceMasterApi`, base `${environment.apiUrl}/DeviceMaster`),
`src/app/core/services/tenant-device-api.ts` (`TenantDeviceApi`, base
`${environment.apiUrl}/TenantDevice`), and
`src/app/core/services/tenant-device-configuration-api.ts` (`TenantDeviceConfigurationApi`, base
`${environment.apiUrl}/TenantDeviceConfiguration`). A fourth service,
`src/app/core/services/tenant-location-api.ts` (`TenantLocationApi`), wires the
`/api/TenantLocation/get-all` read that the tenant-device location dropdown needs.

Legend: ✅ implemented and wired to UI · ⚠️ implemented but unused · ❌ not implemented.

## DeviceMaster coverage

| #   | Endpoint           | Status | API method (`device-master-api.ts`) | Consumers                                                                                      |
| --- | ------------------ | ------ | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | GET get-all        | ✅     | `getDeviceMasters`                  | `device-masters.store.ts` (grid), `tenant-devices.store.ts` + `tenant-device-form.ts` (lookup) |
| 2   | GET get-by-id/{id} | ✅     | `getDeviceMaster`                   | `device-master-form.ts` (edit hydration)                                                       |
| 3   | POST create        | ✅     | `addDeviceMaster`                   | `device-master-form.ts`                                                                        |
| 4   | POST update        | ✅     | `updateDeviceMaster`                | `device-master-form.ts`                                                                        |
| 5   | POST update-status | ✅     | `setDeviceMasterStatus`             | `device-masters.store.ts` (`toggleActive`)                                                     |
| 6   | DELETE delete/{id} | ✅     | `deleteDeviceMaster`                | `device-masters.store.ts` (`deleteDeviceMaster`)                                               |

## TenantDevice coverage

| #   | Endpoint           | Status | API method (`tenant-device-api.ts`) | Consumers                                        |
| --- | ------------------ | ------ | ----------------------------------- | ------------------------------------------------ |
| 1   | GET get-all        | ✅     | `getTenantDevices`                  | `tenant-devices.store.ts` (grid)                 |
| 2   | GET get-by-id/{id} | ✅     | `getTenantDevice`                   | `tenant-device-form.ts` (edit hydration)         |
| 3   | POST create        | ✅     | `addTenantDevice`                   | `tenant-device-form.ts`                          |
| 4   | POST update        | ✅     | `updateTenantDevice`                | `tenant-device-form.ts`                          |
| 5   | POST update-status | ✅     | `setTenantDeviceStatus`             | `tenant-devices.store.ts` (`toggleActive`)       |
| 6   | DELETE delete/{id} | ✅     | `deleteTenantDevice`                | `tenant-devices.store.ts` (`deleteTenantDevice`) |

## TenantDeviceConfiguration coverage

The connection settings for a tenant device — IP/MAC/port, communication type, server host/path/URL,
push mode, heartbeat, and the enrollment/push/auto-sync flags — kept as a replaceable record per
device.

| #   | Endpoint           | Status | API method (`tenant-device-configuration-api.ts`) | Consumers                                                       |
| --- | ------------------ | ------ | ------------------------------------------------- | --------------------------------------------------------------- |
| 1   | GET get-all        | ✅     | `getTenantDeviceConfigurations`                   | `tenant-device-configurations.store.ts` (grid)                  |
| 2   | GET get-by-id/{id} | ✅     | `getTenantDeviceConfiguration`                    | `tenant-device-configuration-form.ts` (edit hydration)          |
| 3   | POST create        | ✅     | `addTenantDeviceConfiguration`                    | `tenant-device-configuration-form.ts`                           |
| 4   | POST update        | ✅     | `updateTenantDeviceConfiguration`                 | `tenant-device-configuration-form.ts`                           |
| 5   | DELETE delete/{id} | ✅     | `deleteTenantDeviceConfiguration`                 | `tenant-device-configurations.store.ts` (`deleteConfiguration`) |

**The connection block is duplicated.** `CreateTenantDeviceConfigurationRequestDTO` repeats, field
for field, what `CreateTenantDeviceRequestDTO` already carries — `ipAddress`, `macAddress`,
`devicePort`, `communicationType`, `serverHost` / `serverPort` / `serverPath` / `serverUrl`,
`pushMode`, `heartbeatIntervalSeconds`, `timeZoneId`, `configuration`, and the three
enrollment/push/auto-sync flags. They are two independent records with two independent write paths:
changing a device's IP on **Tenant Devices** leaves the configuration record showing the old value,
and the next save from the configuration form writes that stale value back into its own row. The
configuration form carries a notice saying so. **Which record the device actually reads is a backend
question** — until it is answered, neither screen can claim precedence, and neither can safely mirror
the other's writes.

This controller has **no `update-status`**, unlike `DeviceMaster` and `TenantDevice`, so the list
screen carries no status toggle and the store has no `toggleActive`. `get-by-id` and `delete`
declare `TenantId` / `ModuleId` / `OperationId` query parameters on top of the path id;
`TenantId` is sent on both (see the section below), `ModuleId` / `OperationId` are not — see
[`tenant-api-coverage-report.md`](./tenant-api-coverage-report.md) note 8.

### `TenantId` is required on both `get-all` reads

Swagger marks nothing required, but the server rejects a request that carries no tenant:

```
GET /api/TenantDevice/get-all?IsActive=true&PageSize=500
GET /api/TenantDeviceConfiguration/get-all?PageNumber=1&PageSize=10
  -> 400 {"IsSucceeded":false,"Message":"A valid identifier is required.",
          "Data":null,"Errors":["A valid identifier is required."],"ErrorCode":"VALIDATION_ERROR"}
```

`BaseService.makeHttpParams` drops `null`, so a filter left on "All" is simply absent from the query
string — which is why both screens 400'd on a cold load. Both stores now hold `tenantId` as required
state rather than a filter: their `rxResource` returns `undefined` from `params` until it is set, so
no request goes out, the grid shows a "Select a tenant" empty state, and the dependent selects stay
disabled. The tenant select carries no clear button and no "All" row.

The same message is what `/Subscription/get-all-tenant-accessible-modules` answers — see
[`api-issues-for-backend.md`](./api-issues-for-backend.md) issue 3.

### `TenantId` is required on `get-by-id` and `delete` too

The path id alone is not enough on `TenantDeviceConfiguration`:

```
GET /api/TenantDeviceConfiguration/get-by-id/1
  -> 400 {"IsSucceeded":false,"Message":"A valid identifier is required.",
          "Data":null,"Errors":["A valid identifier is required."],"ErrorCode":"VALIDATION_ERROR"}
```

That 400 is what made the list's **Edit** action look inert: the route opened, `#hydrate` failed,
and the form's error path navigated straight back to the list. The list now hands the tenant to the
edit route as a query parameter (`/app/tenant-device-configurations/:id/edit?tenantId=…`), the form
reads it off `ActivatedRoute.snapshot.queryParamMap` and passes it to
`getTenantDeviceConfiguration(id, tenantId)`, and the store passes its own `tenantId` to
`deleteTenantDeviceConfiguration(id, tenantId)`. `ModuleId` / `OperationId` stay unsent — the host
session is a super admin and the reads answer without them.

`TenantDevice` declares the same three parameters and is fixed the same way: the list passes
`?tenantId=…` to `/app/tenant-devices/:id/edit`, `tenant-device-form.ts` reads it off the snapshot
for `getTenantDevice(id, tenantId)`, and `tenant-devices.store.ts` passes its own `tenantId` to
`deleteTenantDevice(id, tenantId)`.

`TenantLocation` declares them too and still sends none, deliberately: that controller is
tenant-session only — a host session gets `401 "Inactive user."` from every endpoint (issue 1) — its
`get-all` takes no `TenantId` at all, and neither `tenant-locations.store.ts` nor the auth store
holds one, so the token is what scopes the call. Its `get-by-id` and `delete` have not been observed
failing. If they ever answer the same 400, the only tenant available client-side is the optional
`TenantLocationRow.tenantId`.

**Totals: 17 wired · 0 implemented but unused · 0 absent.**

`/api/TenantLocation` is wired in full through `tenant-location-api.ts` and the
`features/tenant-locations/` screens; the device forms use only its `get-all` read, as a lookup.

## Assumed contracts

Swagger publishes the request DTOs for both controllers but declares every response as a bare
`200 OK` with no schema, so the following are assumptions, marked `ASSUMED CONTRACT` in the code:

1. **Response envelopes.** `{ isSucceeded, message, errors, data }`, with
   `pageNumber / pageSize / totalRecords / totalPages` on the two `get-all` reads — the house shape,
   copied from `GetTenantResponse` in `shared/interfaces/tenant.ts`.
2. **Row shape.** The create DTO plus `id`, `isActive`, and the audit fields. `TenantDeviceRow` also
   assumes `tenantName` / `tenantLocationName` / `deviceMasterName` display fields; the grid renders
   them with `?? '-'` so a missing name degrades instead of blanking the column.
3. **`DeviceCommunicationType` member names.** Swagger publishes the enum as a bare `1..6` integer.
   `shared/interfaces/device/device.ts` assumes `Http = 1, Https = 2, WebSocket = 3, TcpIp = 4,
CloudApi = 5, PushSdk = 6`, mirroring the order of the `DeviceMaster` `supportsHttp` …
   `supportsPushSdk` flags — the only six-item communication list the backend exposes.
4. **`DeviceType` value 8.** Swagger declares eight values; the shipped enum names seven. The eighth
   is left unmapped (a `TODO` records it) and `GetDeviceTypePipe` renders it as `-`.

## Notes

- **`/api/TenantLocation/get-all` now declares a `TenantId` filter**, and both host screens send it,
  scoped to the tenant already chosen on the screen — `tenant-devices.store.ts` (`tenantLocations`)
  and `tenant-device-form.ts` (`tenantLocations`), whose lookups stay idle until that tenant is set.
  Both keep narrowing the result client-side in case the server ignores the parameter; rows the API
  returns without a `tenantId` stay selectable rather than vanishing. Drop that pass once the
  endpoint is confirmed to honour the filter for a host token — it still answers
  `401 "Inactive user."` for one (issue 1), which is why the edit form also re-adds the device's own
  location from `tenantLocationName` (`#hydratedLocation`).
- Both `update` endpoints **replace** the record and carry the id in the body, so the forms resend
  every field. That is why the DeviceMaster form covers all ~70 DTO fields rather than a subset.
- `update-status` is a POST with a `{ id, isActive }` body on both controllers — unlike the older
  `PATCH /{id}/status` of `ParentModule` and the query-param `PUT /update-status` of `Employee`.
- Query params on both `get-all` reads are **PascalCase** (`Search`, `IsActive`, `PageNumber`, …),
  matching the older controllers rather than the camelCase `ParentModule` ones.
- Neither screen has a backend catalog module of its own, so both ride the parent `Host` permission
  key (`core/host-modules.ts`), like Tenants and Modules.
- The aside menu is a static asset, not a backend feed: `app-aside-menu.ts` loads
  `public/data/aside-menu.json` through `httpResource`, so both screens are listed under
  `host.management` there and then filtered by `canAccessOrUnknown(moduleKey)`.

## Suggested follow-ups

1. Confirm the four assumed contracts above against the backend, and correct
   `shared/interfaces/device/*.ts` where they differ — the first real call of each endpoint is the
   cheapest place to catch it.
2. Ask for a `TenantId` filter on `/api/TenantLocation/get-all`; the client-side narrowing is a
   stopgap that also breaks down past `PageSize: 500` locations.
3. Ask for dedicated permission modules for the two device screens, so they stop riding the parent
   `Host` key.

## How to re-verify

Grep `src/` for the `'/DeviceMaster'`, `'/TenantDevice'`, `'/TenantDeviceConfiguration'`, and
`'/TenantLocation'` string literals and for each `DeviceMasterApi` / `TenantDeviceApi` /
`TenantDeviceConfigurationApi` / `TenantLocationApi` method name. Every match should appear in the
tables above.
