# A tenant cannot read its own company record, and asking for it signs the user out

**Component:** AxionPro API - `Tenant` controller (`GET /api/Tenant/get-tenant-by-id`), `TenantLocation`
**Severity:** Blocker for the Company Profile screen - the sidebar leaf is published and reachable, but the
company's details cannot be read
**Reported:** 2026-09-22
**Environment:** `https://axionpro-api.onrender.com`

## Summary

`GET /Navigation/my-menu` publishes `TENANT_PROFILE` (Company Profile) to tenant Super-Admins, and the
sidebar renders it. There is no endpoint a tenant token can call to fill it.

The only read of the company record, `GET /api/Tenant/get-tenant-by-id`, is host-only. Called with a
tenant Super-Admin's token it answers:

```json
{
  "IsSucceeded": false,
  "Message": "A valid Host user token is required.",
  "Data": null,
  "Errors": [],
  "ErrorCode": "UNAUTHORIZED"
}
```

with HTTP **401**. That status is the second problem: the web client reads a 401 as an expired
session. It calls `refresh-token`, retries, and on a second 401 **logs the user out**. So the first
version of the Company Profile screen sent every tenant admin who opened it back to the login page.

## The gap

Swagger describes the operation as `GetTenantByIdQuery` handled by `GetTenantByIdQueryHandler`
via `GetHostManagedTenantDetailAsync`, returning `HostTenantDetailResponseDTO`. It is a host
management read by design. Nothing sits beside it for the tenant's own view.

Checked against the 335 operations in swagger, the tenant-scoped reads that exist are:

| Endpoint                                                  | What a tenant gets                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| `POST /NewLogin/login`                                    | `tenantId`, `tenantName` only                                             |
| `GET /api/TenantLocation/get-all`                         | the tenant's sites                                                        |
| `GET /api/Department/get`                                 | the tenant's departments                                                  |
| `GET /api/Tenant/get-employee-code-pattern`               | the code pattern                                                          |
| `GET /api/Subscription/get-tenant-subscription-plan-info` | demands `EmployeeId` and `RoleId` query params; never called from the app |

Nothing returns the rest of what the screen is for: industry, contact person and number, company
email domain, country, default currency, verification and active state, and the `profiles[0]` block
(logo, brand colour, business type, employee and branch totals, founded year, website, address).
All of it exists - a host sees it in `get-tenant-by-id` - but only a host can read it.

## Reproduce

1. Sign in as a tenant Super-Admin (Quecksilber Technologies, tenant id `78N5XZW2`).
2. Open **Company Profile** from the sidebar with the original build, which called
   `GET /api/Tenant/get-tenant-by-id?TenantId=78N5XZW2`.
3. Observe 401 with the body above, then a `refresh-token` call, then a second 401 on the retry, then
   a redirect to `/auth/login`.

**Expected:** the company's own record, or at worst a 403 the client can show without ending the
session.
**Actual:** 401 on a valid, unexpired tenant token, and the user is logged out.

## Impact

- The Company Profile screen ships thin. It shows only the company name (from the session), locations
  and departments, and none of the company's own details.
- The client had to stop calling the endpoint to protect the session, so a tenant cannot see or check
  what the host entered for them (contact, industry, website, plan).
- Tenant admins cannot tell whether their company is verified or active.

## What we are asking for

Two decisions. Only the first unblocks frontend work.

### 1. A tenant-scoped company read

A new read, for example `GET /api/Tenant/get-my-tenant` (the name is yours to pick). The tenant is
**derived from the token**. It takes no `TenantId`, so one tenant can never name another's id.

Return a tenant-safe subset of `HostTenantDetailResponseDTO`. The field names are the ones
`get-tenant-by-id` already returns; the values below are illustrative:

```json
{
  "id": "78N5XZW2",
  "companyName": "Quecksilber Technologies",
  "tenantCode": "QUECK",
  "tenantIndustryId": 3,
  "tenantIndustryName": "Information Technology",
  "companyEmailDomain": "quecksilber.example",
  "tenantEmail": "admin@quecksilber.example",
  "contactPersonName": "Deepesh Gupta",
  "contactNumber": "+919876543210",
  "countryId": 101,
  "defaultCurrency": 2,
  "isVerified": true,
  "isActive": true,
  "profile": {
    "logoUrl": "https://...",
    "themeColor": "#4287f5",
    "businessType": "Private Limited",
    "industry": "Software",
    "totalEmployees": 120,
    "totalBranches": 3,
    "foundedYear": 2018,
    "websiteUrl": "https://...",
    "address": "..."
  },
  "subscription": {
    "subscriptionPlanName": "Growth",
    "subscriptionStartDate": "2026-01-01",
    "subscriptionEndDate": null,
    "isTrial": false
  }
}
```

**Leave out** what `get-tenant-by-id` returns that a tenant has no need to read back through this
call: `employees`, `loginCredentials`, `emailConfigurations` (SMTP, host-managed per Issue 9 in
`docs/api-coverage/api-issues-for-backend.md`), `departments` and `locations` (both have tenant-scoped
controllers), and `employeeCodePatterns` (`get-employee-code-pattern` covers it). `profile` and
`subscription` are single objects here, not one-element arrays.

`moduleId` / `operationId` resolve against the published `TENANT_PROFILE` leaf with `View`, like the
other reads. The client stamps them from the `my-menu` tree, so the leaf needs a `View` operation
granted to Super-Admin. Please confirm it is.

Not asked for: a tenant-side write. The host update, `new-tenant-update-by-host`, replaces the whole
aggregate and is host-only. Editing is a separate conversation.

### 2. Answer a wrong token type with 403, not 401

`401` on a valid token of the wrong type makes the client run its expired-session path: refresh, retry,
log out. `403` is what the client already treats as a final "not yours" answer, showing a toast and
staying on the page.

This applies beyond `get-tenant-by-id`. `TenantLocation` already answers a **host** token with
`401 "Inactive user."`, per Issue 1 in `docs/api-coverage/api-issues-for-backend.md`, so it is the
same problem in the other direction. Any endpoint that rejects the caller's role, rather than their
credentials, should not return 401.

## Also worth confirming

- **City and state names on `TenantLocation/get-all`.** The Company Profile screen renders the head
  office as `Narmada Nagar, MP nagar, 482008` with no city or state, so `cityName` and `stateName`
  were absent or empty on that row. If the list is meant to carry them, they are not being filled.
  If it is not, the client has no stateless id-to-name lookup to fall back on: the state and city
  lists are one-country-at-a-time cascades.

## Verifying the fix

1. Sign in as a tenant Super-Admin and call the new read with no `TenantId`. Expect 200 and the record
   above for that tenant.
2. Call it with a Super-Admin from a second tenant. Expect that tenant's own record, never the first's.
3. Call it with a host token. Expect a 403 (or an agreed host behaviour), not a 401.
4. Call `GET /api/Tenant/get-tenant-by-id` with a tenant token. Expect 403, not 401.
5. In the web app, open Company Profile: the identity card fills with the fields above, and no
   request in the network tab returns 401.

## Related

- `docs/api-coverage/api-issues-for-backend.md` Issue 1 - `TenantLocation` answers a host token with 401.
- `docs/api-coverage/api-issues-for-backend.md` Issue 9 - the host tenant endpoints, and
  `get-tenant-by-id` as the single read of `profiles[]`.
- `docs/backend-tickets/greenfield-controllers-outside-permission-pipeline.md` - the other side of
  the same permission model.

## Client-side references

- `src/app/features/tenant/company-profile/company-profile.store.ts` (what a tenant token can read
  today, and why `get-tenant-by-id` is not among it)
- `src/app/features/tenant/company-profile/company-profile.html` (the identity card that would take the
  new fields)
- `src/app/core/services/tenants-api.ts` (`getTenantById`, host-only)
- `src/app/core/interceptors/auth-interceptor.ts` (the 401 refresh-then-logout path)
- `src/app/core/interceptors/error-interceptor.ts` (the 403 handling)
- `src/app/shared/interfaces/tenant.ts` (`TenantDetail`, `TenantProfileRow`, `TenantSubscriptionRow`)
