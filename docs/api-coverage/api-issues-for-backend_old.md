# API Issues for the Backend Team

## Context

Three API calls fail in the running app (host login, `localhost:4200`). Each request was compared
against the published Swagger contract
(https://axionpro-api.onrender.com/swagger/index.html, spec at `/swagger/v1/swagger.json`).

**All three requests are well-formed.** Paths, query-parameter names, casing, value types, and the
spec's `required` flags all match. The failures originate on the server, so this document is the
hand-off: what was sent, what came back, what the spec says, and the decision each issue needs.

Companion documents: [`device-api-coverage-report.md`](./device-api-coverage-report.md),
[`host-api-coverage-report.md`](./host-api-coverage-report.md),
[`subscription-api-coverage-report.md`](./subscription-api-coverage-report.md),
[`swagger-coverage-audit.md`](./swagger-coverage-audit.md),
[`tenant-api-coverage-report.md`](./tenant-api-coverage-report.md).

Issues 9 and 10 are a different kind: not failing calls, but contracts the client could not fully
satisfy. Issue 9's two host endpoints are now wired and most of what it used to ask for has arrived;
what is left is one field the read side omits. Issue 10 is resolved on the client — what remains
there is two confirmations, not a blocker.

Issue 11 is a third kind, added after a full-surface audit: eight live frontend calls target paths
the spec does not publish at all. They are not malformed requests — they are requests to routes that
are not there. It also lists five unreferenced service methods pointing at absent routes, which are
our dead code to delete and need nothing from the backend.

Issue 12 is a failing call like the first three, and the newest: the tenant read answers
`NOT_FOUND` for a tenant the tenant list returns, the only difference being that the tenant is
inactive.

Issue 13 is a missing endpoint rather than a failing one: `POST /api/EmployeeDeviceEnrollment/card/bind`
is published and wired, but nothing published lets a tenant list the cards it may bind.

Issue 14 is the same kind: the enrollment DTOs take the device by an opaque id that no published
read returns.

## Summary

| #   | Request (as sent)                                                                   | Response                                                       |
| --- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | `GET /api/TenantLocation/get-all?IsActive=true&PageSize=500`                        | 401 · `"Inactive user."` · `ErrorCode: "UNAUTHORIZED"`         |
| 2   | `GET /api/Tenant/get-employee-code-pattern?TenantId=53&IsActive=true`               | 401 · `"Inactive user."` · `ErrorCode: "UNAUTHORIZED"`         |
| 3   | `GET /api/Subscription/get-all-tenant-accessible-modules?TenantId=48&IsActive=true` | 400 · `"A valid identifier is required."` · `VALIDATION_ERROR` |
| 3a  | `GET /api/TenantDevice/get-all?IsActive=true&PageSize=500`                          | 400 · same body · `TenantId` is required but marked optional   |
| 3b  | `GET /api/TenantDeviceConfiguration/get-all?PageNumber=1&PageSize=10`               | 400 · same body · `TenantId` is required but marked optional   |
| 9   | `PUT /api/Tenant/new-tenant-update-by-host/{encryptedTenantId}` — now called        | wired; the client now omits `emailConfiguration` — confirm     |
| 10  | `moduleId` / `operationId` on every Tenant DTO — now sent from `my-menu`            | resolved on the client; `Restore` (20) has no endpoint         |
| 11  | 8 live calls to paths absent from the spec (4 of them the whole Leave-type CRUD)    | renamed, removed, or live but unpublished?                     |
| 12  | `GET /api/Tenant/get-tenant-by-id?TenantId=…` for an **inactive** tenant            | 404 · `NOT_FOUND` · the list returns the same tenant fine      |
| 13  | No tenant-scoped lookup of bindable cards, so `card/bind` has nothing to pick from  | missing endpoint · the only card list is the Host-only module  |
| 14  | Enrollment DTOs take an opaque `tenantDeviceId`; no read publishes one              | missing field · the device list returns a numeric `id` only    |

All three were made by an authenticated **host** session (`roleTypeId: 0`) with a valid, unexpired
bearer token — other calls on the same page loads succeed with that same token (see "Why this is not
an expired token" below).

---

## Issue 1 — `GET /api/TenantLocation/get-all` rejects a host session

**Request**

```
GET /api/TenantLocation/get-all?IsActive=true&PageSize=500
Authorization: Bearer <host token>
```

**Response** — HTTP 401

```json
{
  "IsSucceeded": false,
  "Message": "Inactive user.",
  "Data": null,
  "Errors": [],
  "ErrorCode": "UNAUTHORIZED"
}
```

**Swagger says** — every parameter is optional:

| Parameter    | Type                 | Required |
| ------------ | -------------------- | -------- |
| Search       | string               | no       |
| CountryId    | integer(int32)       | no       |
| StateId      | integer(int32)       | no       |
| CityId       | integer(int32)       | no       |
| LocationType | `TenantLocationType` | no       |
| IsActive     | boolean              | no       |
| PageNumber   | integer(int32)       | no       |
| PageSize     | integer(int32)       | no       |

We send two optional parameters, both of the declared type. Nothing about the request violates the
contract, and the message is not about parameters — it is an authorization decision.

**Update — the spec has since grown a `TenantId`.** `/api/TenantLocation/get-all` now declares
`TenantId` / `ModuleId` / `OperationId` alongside the eight parameters above; the table was written
before they appeared. That is the filter Issue 4 asks for, so the two host screens now send
`TenantId` (`GetTenantLocationsReq.TenantId`, scoped to the tenant the screen has already chosen)
on the chance that it is also what the "Inactive user." check needs — the same pattern that fixed
`TenantDeviceConfiguration` in `52c67392`. If the 401 survives with the tenant present, the question
below stands unchanged and only the authorization half is left.

**Frontend call site** — `src/app/core/services/tenant-location-api.ts`
(`TenantLocationApi.getTenantLocations`), used by
`src/app/features/host/tenant-devices/tenant-devices.store.ts` and
`src/app/features/host/tenant-devices/tenant-device-form/tenant-device-form.ts` to populate the
Location dropdown when a host assigns a device to a tenant location.

**Likely cause** — the controller is tenant-scoped and resolves the caller to an employee record. A
host session has no employee/tenant context, so the check reports "Inactive user.". The same server
behaviour is already recorded in `src/app/layout/layout.ts:45-47` for the tenant lookups, which is
why `LookupStore` loads only countries for a host login.

**Decision needed**

- Should a host be able to read tenant locations? If **yes**, the "Inactive user." check has to
  accept a host principal on this controller.
- If **no**, we need a host-accessible equivalent — a way to list locations **for a given
  `TenantId`**. The `TenantId` filter now exists (see the update above), so only the authorization
  decision is outstanding.

Until one of those lands, the host tenant-device screens cannot offer a working location _picker_.
**Edit** is no longer blocked by it: `/TenantDevice/get-by-id` returns `tenantLocationName` beside
`tenantLocationId`, and `tenant-device-form.ts` now keeps that row as a selectable option
(`#hydratedLocation`), so an existing device always shows its own location and can re-save it.
**Add** still has no source of locations for a host.

**Reconfirmed** — reproduced again on a live host session assigning a device into a tenant
account: the Location dropdown is still empty, and the request still leaves without
`ModuleId`/`OperationId`. Root cause for the missing ids (new detail beyond the original issue
text above): `TENANT_LOCATIONS` is a tenant-only module and never appears in a host session's
`GET /Navigation/my-menu` tree, so `moduleOperationInterceptor` has nothing to resolve. This is
true for every host user — it is not a per-role/per-user permission gap, so nothing in a role's or
employee's permission grants can fix it. Sending `ModuleId`+`OperationId` for the host-side
Locations lookup therefore requires publishing a host-scoped Locations module/leaf (or otherwise
widening the id space the host menu carries), not editing individual users' permission grants.
Both outstanding questions from the original issue (host-token acceptance vs. a host-scoped
locations endpoint) are unchanged and still block a working Add-mode location picker.

---

## Issue 2 — `GET /api/Tenant/get-employee-code-pattern` rejects a host session

**Request**

```
GET /api/Tenant/get-employee-code-pattern?TenantId=53&IsActive=true
Authorization: Bearer <host token>
```

**Response** — HTTP 401

```json
{
  "IsSucceeded": false,
  "Message": "Inactive user.",
  "Data": null,
  "Errors": [],
  "ErrorCode": "UNAUTHORIZED"
}
```

**Swagger says**

| Parameter | Type           | Required |
| --------- | -------------- | -------- |
| Id        | integer(int32) | no       |
| TenantId  | integer(int64) | **yes**  |
| IsActive  | boolean        | **yes**  |

Both required parameters are present, correctly named and typed; the optional `Id` is omitted.

**Frontend call site** — `TenantsApi.getEmployeeCodePattern`. **No longer called.** `get-tenant-by-id`
returns the pattern as part of the tenant aggregate (issue 9), so the host tenant edit form reads it
from there and this 401 no longer blocks anything. The method is kept until the backend confirms the
endpoint can be retired.

**Why this one is surprising** — this is a `/api/Tenant/...` endpoint reached from a host-only
screen, and the host calls other `/api/Tenant` endpoints successfully in the same page load
(`get-all-tenant-by-subscription-plan-Id` returns 200). So the rejection is specific to this action,
not to the controller.

**Decision needed** — should a host reading a tenant's employee-code pattern be allowed? If yes,
the check needs to accept a host principal here. If not, tell us what a host should call instead —
the pattern is write-once at tenant creation, and this is currently the only documented read path.

---

## Issue 3 — `GET /api/Subscription/get-all-tenant-accessible-modules` demands an undocumented identifier

**Request**

```
GET /api/Subscription/get-all-tenant-accessible-modules?TenantId=48&IsActive=true
Authorization: Bearer <host token>
```

**Response** — HTTP 400

```json
{
  "IsSucceeded": false,
  "Message": "A valid identifier is required.",
  "Data": null,
  "Errors": ["A valid identifier is required."],
  "ErrorCode": "VALIDATION_ERROR"
}
```

**Swagger says** — again, nothing is required:

| Parameter          | Type           | Required |
| ------------------ | -------------- | -------- |
| TenantId           | integer(int64) | no       |
| EmployeeId         | integer(int64) | no       |
| SubscriptionPlanId | integer(int32) | no       |
| IsActive           | boolean        | no       |
| Remark             | string         | no       |

**Frontend call site** — `src/app/core/services/subscriptions-api.ts:62`
(`SubscriptionsApi.getTenantAccessibleModules`), called from
`src/app/features/host/tenants/tenant-modules/tenant-modules.store.ts:71` with
`{ TenantId, IsActive: true }`, backing the **Tenants → Modules & operations** screen
(`/app/tenants/48/modules`). The screen currently renders "No permissions available" because of
this error.

**The same message now reaches two device endpoints**

```
GET /api/TenantDevice/get-all?IsActive=true&PageSize=500
GET /api/TenantDeviceConfiguration/get-all?PageNumber=1&PageSize=10
  -> 400, byte-identical body
```

Here the cause is clear — neither request carried a `TenantId`, and both screens were host views
listing across tenants. The frontend now treats the tenant as required on both: it asks for nothing
until one is picked, and sends `TenantId` on every call. Swagger still marks the parameter optional.

**A likely explanation for this issue, too**

`/api/Tenant/get-all-tenants` answers with an opaque 8-character `id` (`"2ON458Q1"`), and the newer
controllers type `TenantId` as `string` to match. `Subscription/get-all-tenant-accessible-modules`
still types it `integer(int64)`, and the request above sent `TenantId=48` — a number that is no
longer any tenant's id. If the validator rejects it for that reason, the fix is to accept the same
string identifier the Tenant controller hands out.

**Decision needed**

- Does `get-all-tenant-accessible-modules` accept the string tenant id (`"2ON458Q1"`)? If so, the
  parameter should be typed `string` like the newer controllers, and this issue closes.
- If not, which identifier does it require — `EmployeeId`? `SubscriptionPlanId`? A combination?
- Either way, please mark the required parameters `required: true` in the spec so the contract
  matches the validator — on the two device `get-all` reads as well.

---

## Issue 4 — spec gaps that caused the confusion

1. **No `security` metadata.** The spec declares a `Bearer` scheme under
   `components.securitySchemes`, but there is **no `security` block** — neither global nor on any
   operation. The contract therefore never states which endpoints need a token, and never states
   which principal (host vs tenant employee vs admin) each controller accepts. Issues 1 and 2 are
   exactly that gap showing up at runtime. Please add per-operation `security`, or document the
   accepted principal per controller.
2. **Required parameters not marked.** Issue 3 is a validator that is stricter than the spec.
   `get-all-tenant-accessible-modules` marks nothing required while rejecting a request that omits
   an identifier.
3. **No response schemas.** Every operation on `DeviceMaster`, `TenantDevice`, and `TenantLocation`
   documents only a bare `200 OK` with no schema, so the frontend types are assumptions — they are
   listed in [`device-api-coverage-report.md`](./device-api-coverage-report.md) under "Assumed
   contracts". Publishing the response DTOs would remove that guesswork.
4. **`/api/TenantLocation/get-all` has no `TenantId` filter** (only Search / CountryId / StateId /
   CityId / LocationType / IsActive / paging). Even once Issue 1 is resolved, a host cannot ask for
   one tenant's locations. Please add the filter.

---

---

## Issue 5 — attendance controllers declare `employeeId` as `int64`, but no numeric employee id exists

The five employee-scoped attendance controllers (`EmployeeLocationAssignment`,
`EmployeeDeviceEnrollment`, `EmployeeWorkArrangement`, `EmployeeWorkPattern`,
`EmployeeWorkModeOverride`) publish `employeeId` — in both the create/update bodies and the `get-all`
filters — as `integer(int64)`.

**No numeric employee identifier is exposed anywhere in the tenant-facing API.** Measured against the
running app:

| Source                                                                                       | Value                                                                                               |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `loginInfo.user.employeeId` (session)                                                        | `"XGQRD0Z8"`                                                                                        |
| `/api/Employee/get-all` rows                                                                 | `employeeId: "LXZVEKN9"`, `"P4ND3WQG"` — an 8-character code, and the row carries no other id field |
| Every other employee endpoint (`Employee/Bank`, `Employee/Contact`, `Employee/Dependent`, …) | takes `EmployeeId` as that same **string**                                                          |

For contrast, `/api/TenantLocation/get-all` rows do carry a numeric `id` (`1`), so this is specific to
employees, not a general pattern.

**We tested sending the code anyway. The API rejects it:**

```
GET /api/EmployeeWorkModeOverride/get-all?EmployeeId=XGQRD0Z8&PageNumber=1&PageSize=100
→ 400  "The value 'XGQRD0Z8' is not valid for EmployeeId."
```

So the spec is accurate and the binding is a real `int64`. The identifier simply does not exist on
this side of the API, which leaves the five employee tabs unable to read or write.

**Client behaviour as of this build:** the tabs send the 8-character code regardless. The request is
always issued — visible in the browser Network tab — and the `400` above is surfaced to the user as a
toast, with the tab falling back to its empty state. Nothing is hidden on the client, so the failure
stays attributable to this binding until it is fixed.

The split runs through the whole spec — `EmployeeId` is declared `string` on `Employee`, `Insurance`
and `UserRole`, and `integer(int64)` on fifteen controllers including `Leave`, `LeaveRule`,
`Subscription` and `StatData`. Anything the app feeds from a session employee id therefore has the
same latent problem.

**Decision needed — either:**

- have the five attendance controllers bind the 8-character employee code, as `Employee/Bank`,
  `Employee/Contact` and `Employee/Dependent` already do; **or**
- expose the numeric employee id on a tenant-facing payload we already read
  (`/Employee/get-all`, `/Employee/get-profile-summary`), so the frontend can resolve one.

The first is preferable: it makes one identifier work everywhere.

---

## Issue 6 — attendance-configuration enums are published without member names

`AttendanceLocationScope`, `WorkMode`, `HybridType`, `WorkPatternDay`, `TenantLocationType` and
`WorkModeOverrideApprovalStatus` all appear in the spec as bare integer enums with no names and no
`x-enumNames`. The frontend has authored them from the backend spec document
(`shared/interfaces/attendance-config/attendance-config.ts`), which leaves three gaps:

| Enum                             | Published | Gap                                                                       |
| -------------------------------- | --------- | ------------------------------------------------------------------------- |
| `TenantLocationType`             | 1–9       | The document names only eight; **value 9 is unmapped** and renders as `-` |
| `HybridType`                     | 1–2       | Only `Fixed` is named; `Flexible` is a guess                              |
| `WorkModeOverrideApprovalStatus` | 1–4       | Only `Pending` is named; the other three are guesses                      |

Please publish the member names (or `x-enumNames`) for all six. Until then the three above are marked
`ASSUMED CONTRACT` in the code and their unmapped values are kept out of form dropdowns, so nobody can
save a value the UI cannot render.

---

## Issue 7 — no permission modules for attendance configuration

None of `TenantLocation`, `AttendancePolicy`, `EmployeeLocationAssignment`,
`EmployeeDeviceEnrollment`, `EmployeeWorkArrangement`, `EmployeeWorkPattern` or
`EmployeeWorkModeOverride` has a module in the permission matrix.

The two shipped screens therefore ride the existing tenant `Attendance` key. A new key would be worse:
`canAccessOrUnknown` fails open for an unknown tenant key while `canPerform` fails closed, so the
screen would be reachable by everyone with every row action hidden. Please add dedicated modules with
`Add` / `Update` / `Delete` operations.

---

## Issue 8 — `EmployeeWorkModeOverride` list parameters are undocumented

`GET /api/EmployeeWorkModeOverride/get-all` publishes no query parameters, unlike its eight sibling
controllers. The frontend contract assumes `Search`, `EmployeeId`, `RequestedWorkMode`,
`ApprovalStatus`, `FromDate`, `ToDate`, `IsActive`, `PageNumber`, `PageSize` by analogy, marked with a
`TODO`. Please confirm the real list before a filter UI is built on it.

Related: the controller is named `EmployeeWorkModeOverride`, while the specification document calls it
`EmployeeWorkModeOverrideRequest`. The deployed name is what the frontend targets.

---

## Issue 9 — the host tenant endpoints are wired; the client now omits `emailConfiguration`

Both host-side tenant endpoints are now wired:

- `POST /api/Tenant/new-tentant-creation-by-host` (the spelling is verbatim from the spec)
- `PUT /api/Tenant/new-tenant-update-by-host/{encryptedTenantId}?ModuleId=&OperationId=`

Both nest four blocks the self-service `create-tenant` DTO has no room for — `profile`,
`initialLocation` / `selectedLocation`, `employeeCodePattern` and `emailConfiguration`.
`tenant-form.ts` collects the first three in both modes and no longer sends the fourth, per the
decision below; `registration.ts` still uses the self-service `create-tenant`.

**The data-loss hazard this issue used to describe is closed.** It said `profile` and
`emailConfiguration` could be written but never read, so every edit overwrote them. That was wrong:
`GET /Tenant/get-tenant-by-id` returns the **whole tenant aggregate** — `profiles`, `locations`,
`subscriptions`, `departments`, `employeeCodePatterns`, `employees`, `loginCredentials`,
`emailConfigurations`, all as arrays. The edit form now hydrates every section from that one call and
no longer touches `get-employee-code-pattern` or `/TenantLocation/get-all`. Thanks.

**The host form no longer collects or sends `emailConfiguration`.** Tenant email configuration is
the backend's to manage, so the whole SMTP section came out of the host create and edit form and
both request bodies now omit the key. Two dedicated screens already cover the ground the section
duplicated: `/api/DefaultEmailConfig/*` (host defaults) and `/api/TenantEmailConfig/*` (the tenant's
own copy).

This also closes what this issue used to ask for. `emailConfigurations[]` returns `smtpHost`,
`smtpPort`, `smtpUsername`, `fromEmail` and `fromName` — but neither `smtpPasswordEncrypted` nor
`isActive`, so an operator changing a phone number had to retype the SMTP password to save, and the
`isActive` toggle had to open at an assumed `true`. Neither field is asked for any more. The read
side is still the source for the read-only SMTP block on the tenant detail sheet, which is why
`emailConfigurations[]` is still consumed.

**Decision needed**

1. **Please confirm that both host endpoints accept a body with no `emailConfiguration` key.**
   `NewTenantCreationRequestDTO` and `NewTenantUpdateRequestDTO` both declare it as a plain
   non-nullable `$ref` — no `nullable`, no `anyOf` null — so a handler that dereferences it would
   fault on every host tenant save. If the property has to be present, say whether `null` is
   accepted; the client would send that rather than reinstate the section.
2. **What happens to a tenant's stored SMTP row on an update that omits the block?** Left alone is
   what the client assumes. Cleared or replaced with blanks would be a data loss the host cannot
   see, since the form no longer displays those fields.
   2a. **Resolved on the client.** `defaultCurrency` had the same shape of problem and cost a real
   failed save: the reads return `null`, the client was sending `0`, and the PUT answered
   `"One or more selected configuration references are invalid for this tenant."` The form now
   collects a currency from `GET /api/Enum/get-all-currencies?IsActive=true` and sends its `id`,
   falling back to `null` — never `0` — for a tenant that has none. Two things still worth
   confirming: whether any other nullable FK on this DTO rejects `0` the same way, and whether that
   error could name the offending field.
3. `employeeCodePatterns[].runningNumberLength` comes back as a **number** (`4`), but
   `NewTenantEmployeeCodePatternRequestDTO` and its update variant both declare it a **string**. The
   client coerces on read. Which is intended?
4. Does `new-tenant-update-by-host` accept the 8-character `id` from `get-tenant-by-id` as its
   `{encryptedTenantId}` segment? That token is what the app sends.
5. `contactNumber` comes back with embedded spaces (`"+9198765 43210"`). The client strips them.
   Is the stored format meant to be significant?
6. Is `new-tentant-creation-by-host` intended to replace `create-tenant` for host sessions, or to sit
   beside it? And is the `tentant` spelling stable? The frontend now depends on both path strings.
7. `GET /Location/State/option` and `/Location/district/option` are now called from a host session
   with `UserEmployeeId=0`, the same way `/Location/country/option` already was, so the host tenant
   form can collect a head-office address. Please confirm those two do not reject a host token the
   way the tenant-scoped controllers in Issue 1 do.
8. `POST /Tenant/update-tenant` and `GET /Tenant/get-employee-code-pattern` now have no callers.
   Confirm the PUT and `get-tenant-by-id` respectively cover everything they did before retiring
   them.

9. A tenant onboarded through `create-tenant` has a **blank** `profiles[0]` row and **no**
   `locations` at all. The host edit form therefore treats profile and head office as optional
   on update — every field in `NewTenantUpdateRequestDTO` is nullable, so the blanks go out as
   nulls. Two things to confirm: that nulls there mean "leave it alone" rather than "clear it", and
   what a `selectedLocation` with `tenantLocationId: 0` and empty fields does — the client would
   rather send no location block at all than have a blank row created.

10. **`new-tentant-creation-by-host` carries no `defaultCurrency`.** The update DTO takes one and the
    reads return one, but the create DTO has no such field, so every host-created tenant starts with
    `null` and stays there until somebody opens the edit form and picks a currency. Should the create
    DTO carry it too?

11. **`profiles[].address` is returned by `get-tenant-by-id`, but no write DTO accepts it.** Neither
    `NewTenantCreationRequestDTO.profile` nor its update variant declares an `address` key, so the
    host form stopped collecting one and both bodies now omit it. A host-managed tenant's profile
    address can no longer be set from the app, and the detail sheet renders it empty. Is the field
    retired on the write side, or missing from the published DTO?

Swagger cannot answer any of the read-side questions: it declares a bare `200: OK` on 334 of its 335
operations, and all 177 published schemas are request DTOs. Everything above was transcribed from
live responses. Publishing response schemas would prevent the next round of this.

---

## Issue 10 — `moduleId` / `operationId` on the Tenant endpoints

Every `/api/Tenant/...` request DTO carries `moduleId` and `operationId` in the body, and every GET
declares `ModuleId` / `OperationId` query parameters. This issue used to report that the frontend
sent neither.

**Resolved on the client.** An interceptor resolves the pair from `GET /Navigation/my-menu` and
attaches it to every `/Tenant` request, keyed on the page that owns the endpoint. Read live for a
Super Admin host on 2026-09-06: `HOST_TENANT_LIST` is module 33 with operations `Active` 8,
`Delete` 3, `Inactive` 9, `Restore` 20, `Update` 2, `View` 4, and the host create has a page of its
own, `HOST_TENANT_CREATE`, module 34 with the single operation `Add` 1. So
`new-tentant-creation-by-host` authorises against 34 / 1, the status writes against 33 with their own
operations, and nothing sends a zero any more.

**Still open**

1. `Restore` (20) is published on `HOST_TENANT_LIST` and no endpoint in the spec appears to consume
   it. Is there a tenant restore endpoint the client is missing, or is the operation vestigial?
2. Are `moduleId` / `operationId` required or optional? Swagger marks them neither, and the calls
   succeeded for months without them, so please confirm the endpoints authorise or audit on them
   rather than ignoring them.

---

## Issue 11 — eight live calls target paths the spec does not publish

A full-surface audit of the spec (333 operations, recorded in
[`swagger-coverage-audit.md`](./swagger-coverage-audit.md)) turned up the opposite of a coverage gap:
routes the frontend calls that do not exist on the published contract. Every row below was confirmed
three times — the URL literal at the call site, whether that method is actually reachable from a
screen, and the spec's `paths` list, matched case-insensitively.

The reachability pass split the list in two. Only the first table needs an answer from you.

### 11a — live calls, reachable from a screen (8)

| #   | Frontend call                                                    | Call site                           | Nearest published route                                           |
| --- | ---------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| 3   | `GET /api/Leave/get-all-leave-type`                              | `core/services/leave-types.ts:31`   | `GET /api/Leave/get`                                              |
| 4   | `POST /api/Leave/add-leave-type`                                 | `core/services/leave-types.ts:45`   | `POST /api/Leave/add`                                             |
| 5   | `POST /api/Leave/update-leave-type`                              | `core/services/leave-types.ts:51`   | `POST /api/Leave/update`                                          |
| 6   | `POST /api/Leave/delete-leave-type`                              | `core/services/leave-types.ts:57`   | `GET /api/Leave/delete` — see the note below                      |
| 8   | `POST /api/UserModuleRolePermission/assign-employee-permissions` | `employee-api.ts:183`               | the controller publishes only `assign-role-permissions`           |
| 10  | `POST /api/Asset/assign-employee`                                | `assets-api.ts:55`                  | none — `Asset` publishes only `add` / `get` / `update` / `delete` |
| 11  | `POST /api/Employee/Sensitive/update`                            | `employee-identity-api.ts:81`       | the controller publishes only `Create` and `get`                  |
| 13  | `GET /api/Ticket/TicketHeader/get-all`                           | `features/tickets/ticket-api.ts:81` | the controller publishes no `get-all`                             |

Consumers, for reference: rows 3–6 are the leave-type master screen
(`features/leaves/leave.store.ts:290`, `:322`, and
`leave-requests/leave-types/leave-types-manage-dialog.ts:99`, `:128`); row 8 is Save on the employee
permission tab (`features/employees/employees-permissions/employees-permissions.store.ts:110`);
row 10 is the asset assignment popup (`assign-asset-popup.ts:141`); row 11 is the employee identity
form (`employee-identity-form.ts:162`); row 13 fires from the ticket-header master screen whenever no
classification filter is set, because `features/tickets/tickets.store.ts:260` then sends
`TicketClassifyId: undefined` and the service falls back to `get-all`.

**Where this hurts most**

- **Rows 3–6 — the entire leave-type CRUD screen.** All four operations point at routes that are not
  published. If `/api/Leave/{get,add,update,delete}` are the replacements this is a four-line fix on
  our side; if they are not, the screen has no backend at all.
- **Row 6 needs one extra answer.** `deleteLeaveType` POSTs a body — `{ id, roleId, employeeId }`
  (`core/services/leave-types.ts:55-58`) — while the candidate replacement is a **GET**. A GET has
  nowhere to put those three fields, so please confirm the query-parameter names as well as the path,
  or the repoint fails a second time.
- **Rows 8, 10, 11 are writes.** Employee permission assignment, asset assignment and
  sensitive-data update each fail after the user has filled a form and pressed Save.

### 11b — unreferenced methods, no decision needed (5)

These five service methods build URLs the spec does not publish, but **nothing calls them** —
verified by grepping `src/` and `e2e/`, specs included. They are our dead code and we will delete
them; they are listed only so the two tables reconcile against the audit.

| Frontend call                                             | Method                                                                                  | Note                                                                                                 |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `POST /api/Auth/reset-login-new-password`                 | `setLoginNewPassword` (`auth-api.ts:198`)                                               | `create-new-password` is the live path and is wired separately                                       |
| `GET /api/Gender/Gender/get`                              | `getGenders` (`users-api.ts:37`)                                                        | the base is `/Gender` and the call re-appends it; the app uses `getGenderOptions` → `/Gender/option` |
| `GET /api/Role/get-permissions`                           | `getRolePermissions` (`roles-api.ts:136`)                                               | screens use `UserModuleRolePermission/get-role-based-permissions`                                    |
| `POST /api/Employee/assign-role`                          | `assignEmployeeRole` (`employee-api.ts:163`)                                            | `UserRole/assign-roles-to-user` is live and wired                                                    |
| `GET /api/PolicyMappingLeaveType/get-by-employee-type-Id` | `getAllPolicyMappingLeaveTypesByEmployeeTypeId` (`policy-mapping-leave-type-api.ts:58`) | the published route is `LeavePolicy/EmployeeType/get`                                                |

**Decision needed — for each row in 11a, one of three answers:**

1. **Renamed** — give us the current path and we repoint the service method.
2. **Removed** — we delete the client method, and the feature that calls it goes with it.
3. **Live but missing from the spec** — please publish it, and we will treat the spec as
   authoritative from then on.

We have deliberately changed **nothing** in the services yet. Guessing at a rename would replace a
visible failure with a silent write to the wrong endpoint, which is worse.

**How to reproduce**

1. Sign in as a tenant user and open the leave-type master screen → rows 3–6 fire on load; the list
   stays empty and an error toast appears.
2. On the same screen, add, edit and delete a leave type → rows 4, 5 and 6 individually.
3. Open **Employees → an employee → Permissions**, change a checkbox and press **Save** → row 8. It is
   a write, so nothing fails until Save.
4. Open the asset assignment popup and assign an asset → row 10.
5. Open **Profile → Identity** and save a document → row 11.
6. Open the ticket-header master screen with the classification filter cleared → row 13.

Every one of these surfaces the failure as an error toast (both permission stores and the leave store
route errors through `CommonService.showMessage(..., 'error')`), so the requests are visible in the
Network tab and nothing is swallowed on the client.

---

## Issue 12 — `get-tenant-by-id` returns `NOT_FOUND` for an inactive tenant

**Request as sent** (host session, opening the tenant edit form):

```
GET /api/Tenant/get-tenant-by-id?TenantId=2LQ0GNJ7&ModuleId=33&OperationId=4
```

**Response** — HTTP 404:

```json
{
  "IsSucceeded": false,
  "Message": "The requested resource was not found.",
  "Data": null,
  "Errors": [],
  "ErrorCode": "NOT_FOUND"
}
```

The tenant exists. `GET /api/Tenant/get-all-tenants` in the same page load, with the same bearer
token and the same `ModuleId` / `OperationId` pair, returns it in `data[]` — that list is where the
`TenantId` above comes from. The one thing that distinguishes it from the tenants that read back
correctly is `isActive: false`.

**Decision needed**

1. Does `get-tenant-by-id` deliberately exclude inactive tenants? If it does, how is a host meant to
   read one back — a flag on this endpoint, or a separate route? The host tenant list is the only
   screen that manages inactive tenants, so its edit form has no other source for them.
2. If the exclusion is not deliberate, the read should return an inactive tenant the same way the
   list does.

The exclusion looks specific to this read rather than a general rule: `activate-tenant`,
`deactivate-tenant` and `delete-tenant` all accept an inactive tenant, and the list returns one.

**Frontend status**

Unchanged, and deliberately so. `tenant-form.ts` shows the API's own message and returns to the list
when the read answers with no data, which is the right behaviour for a `NOT_FOUND`. Adding a retry
or guessing an `IsActive` parameter onto the request would be inventing contract.

**How to reproduce**

1. Sign in as a host and open `/app/tenants`.
2. Deactivate any tenant, or pick one already inactive.
3. Open that row's **Edit** action → the form loads empty and the request above returns 404.

---

## Issue 13 — no tenant-scoped lookup of bindable cards

`POST /api/EmployeeDeviceEnrollment/card/bind` takes `{ enrollmentId, tenantCardId }` and the
handoff spec (`docs/specs/AXIONPRO_DEVICE_ANGULAR_HANDOFF.md` §4, §5.3) says the tenant binds an
already-issued card that is active and in the `Available` state. Nothing published lets the tenant
find that card.

The only card list is `GET /api/TenantCardMaster/get-all`, and that controller is the Host-only
Card Inventory module: its rows carry unit purchase price, supplier name and tax registration,
purchase invoice number and date, CGST/SGST/IGST or foreign tax, customs duty and freight. A tenant
must not read it, so the bind picker has no source.

**What the client needs**

A tenant-scoped read that returns only what a picker needs, and nothing financial:

```
GET /api/EmployeeDeviceEnrollment/bindable-cards        (or an equivalent path you prefer)
```

```json
{
  "isSucceeded": true,
  "message": "…",
  "data": [{ "tenantCardId": "CARD_OPAQUE_ID", "cardReference": "masked or printed reference" }]
}
```

Scoped to the signed-in tenant, filtered server-side to active + `Available`, with no price,
supplier, invoice or tax field on the row, and no raw card number.

**Decision needed**

1. Is a tenant expected to read `TenantCardMaster/get-all` after all? If so, which fields does it
   redact for a tenant session, and how is that signalled?
2. If not — the reading we have built to — please publish the lookup above.

**Frontend status**

Blocked but wired. `EmployeeDeviceEnrollmentApi.bindEmployeeDeviceCard()` posts the real bind
request, and the **Bind Card** dialog
(`features/user-menu/employee-profile/employee-device-enrollment-info/employee-device-card-bind/`)
is built against the row shape above. Its option list is an empty constant until this endpoint
lands, and the **Bind Card** action stays hidden while that list is empty, so no dead-end dialog
ships. Unbinding does not depend on this issue and is live: it goes through
`POST /api/EmployeeDeviceEnrollment/credential/remove`. No invented route is called.

---

## Issue 14 — the enrollment DTOs want an opaque device id nothing returns

`CreateEmployeeDeviceEnrollmentRequestDTO` and `UpdateEmployeeDeviceEnrollmentRequestDTO` both take
`tenantDeviceId` as a `string`, and the handoff spec writes it as `"TENANT_DEVICE_OPAQUE_ID"`
(`docs/specs/AXIONPRO_DEVICE_ANGULAR_HANDOFF.md` §5.3). `GET /api/EmployeeDeviceEnrollment/get-all`
reinforces the reading by publishing **both** `TenantDeviceId` (string) and
`ResolvedTenantDeviceId` (integer), the same pairing it uses for `EmployeeId`.

The only device read the client has is `GET /api/TenantDevice/get-all`, and a live response returns
rows whose `id` is a **number** (`shared/interfaces/device/tenant-device.ts:32`). No field on that
row looks like an encrypted id. So the client has no source for the value these DTOs want.

**Decision needed**

1. Does `TenantDevice/get-all` need to return the encrypted device id as well (a sibling field, or
   `id` itself switching to the opaque form)?
2. Or does the enrollment controller accept the numeric id serialised as a string, in which case
   `TenantDeviceId` on `get-all` and `ResolvedTenantDeviceId` should be documented as the same
   value in two types?

The same question applies to `EmployeeId` / `ResolvedEmployeeId`, which is the subject of Issue 5.

**Frontend status**

The device picker sends `String(device.id)` — the only value it has — and the edit dialog coerces
the enrollment's `tenantDeviceId` back through `String(...)` so the selected option still matches
whichever type the read returns. If the answer to (1) is yes, both sides change to carry the opaque
id and the coercion goes away.

---

## Why this is not an expired or invalid token

On the same page loads, with the same bearer token, these succeed:

- `GET /api/DeviceMaster/get-all?...` (including `?IsActive=true&PageSize=500` — the identical query
  string shape that fails on `TenantLocation`)
- `GET /api/Tenant/get-all-tenant-by-subscription-plan-Id?...`
- `GET /api/Subscription/get-all-subscription-plan?IsActive=true`
- `GET /api/Host/get-all-host-users`, `get-all-host-roles`, `CommonMenu`

A dead token would fail all of them.

---

## Please also consider: 401 vs 403

"Authenticated, but this principal may not do this" should be **403 Forbidden**, not 401. Our
`authInterceptor` (`src/app/core/interceptors/auth-interceptor.ts:38-51`) reads 401 as "the session
is dying": it refreshes the token and retries the request once, and if the retry is also 401 it
calls `logout()`. The `refresh-token` request visible immediately after each failure above is that
path running. So today an endpoint-level denial burns a token refresh and can sign the user out of
the app.

If the backend keeps returning 401 for authorization failures, we will harden the interceptor on our
side to distinguish the two cases from the response body — but switching these responses to 403
fixes it correctly and for every client.

## How to reproduce

1. Sign in as a host user.
2. Open `/app/tenant-devices` → Issue 1 fires on load (two lookups go out; only the
   `TenantLocation` one fails).
3. Open `/app/tenants/<id>/edit` → Issue 2 fires.
4. Open `/app/tenants/<id>/modules` → Issue 3 fires; the screen shows "No permissions available".

---

# Issue: tenant 54 has an empty module catalog, so every `ModuleId` endpoint denies

## What we see

A growing set of endpoints now accept `ModuleId` / `OperationId` — as PascalCase query params on
reads (`GET /TenantLocation/get-all`, `GET /Employee/get-all`, ~64 operations in total) and as
camelCase fields inside the request body on writes (`POST /TenantLocation/create`, `/update`,
`/update-status`).

For tenant 54 these endpoints return **403 "You do not have permission to perform this action."**,
and we cannot make them succeed from the client.

## Why the frontend cannot supply the ids

`GET /Tenant/get-all-tenant-operations?IsActive=true` answers:

```json
{
  "isSucceeded": true,
  "message": "Modules and operations fetched successfully.",
  "data": { "tenantId": 54, "modules": [] },
  "errors": []
}
```

That endpoint is the only published source of the numeric module ids, and it returns **no modules**.
`GET /Role/get-permissions` is likewise empty for this session. So the client has nothing to resolve
`ModuleId` from, and the params are omitted rather than sent wrong.

## The ids are not the whole story

Called directly from Swagger as a signed-in Super Admin, `GET /api/TenantLocation/get-all` with
`OperationId=4` (View) still returns **403** for every candidate `ModuleId` we could derive:

| `ModuleId` tried | Where it came from                                         | Result |
| ---------------- | ---------------------------------------------------------- | ------ |
| `24`             | `TENANT_LOCATIONS` node id in `GET /ProjectDetail/get-all` | 403    |
| `19`             | value shown in the Swagger UI example                      | 403    |
| `88`             | `moduleOperationMappingId` for TenantLocations/View        | 403    |

So the denial is not "the client forgot the params". It is an authorization decision against a
tenant whose modules and operations are not provisioned.

## What we are asking for

1. **Provision modules and operations for tenant 54** (and confirm which tenants are affected), so
   `get-all-tenant-operations` returns a non-empty `modules[]`.
2. **Confirm the id space.** Please state which endpoint publishes the `ModuleId` these operations
   expect. `ProjectDetail/get-all` node ids and `moduleOperationMappingId` both appear to be
   different id spaces, and `get-all-tenant-operations` is empty, so today there is no published
   source we can read it from.
3. **Confirm whether `ModuleId` / `OperationId` are required or optional.** Swagger marks them
   optional on every operation, but the behaviour suggests otherwise. If they are required, they
   should be documented as such.
4. A Super Admin arguably should not need per-module grants at all — please confirm whether that
   role is expected to bypass this check.

## Frontend status

The wiring is in place and correct: `CurrentUserPermissionsStore.identifiersOf()` /
`identifierFieldsOf()` resolve both ids and the call sites send them, gated so no request goes out
before the catalog has settled. The moment the catalog returns rows, these endpoints will start
receiving the params with no further frontend change. Until then the module names in
`src/app/core/permission-modules.ts` cannot be verified against anything.

## How to reproduce

1. Sign in as Super Admin on tenant 54.
2. Open `/app/tenant-locations` → `GET /TenantLocation/get-all` returns 403.
3. Open `/app/employees` → `GET /Employee/get-all` returns 403.
4. Inspect `GET /Tenant/get-all-tenant-operations` in the same session → `modules: []`.
