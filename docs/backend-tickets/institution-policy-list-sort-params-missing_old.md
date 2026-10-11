# The paged policy list takes no sort parameters, so the list cannot be ordered by name or code

**Component:** AxionPro API - `TenantPolicy` controller
**Severity:** Minor - sortable column headers in the web app change nothing
**Reported:** 2026-10-03
**Environment:** `https://axionpro-api.onrender.com`

## Summary

`GET /api/TenantPolicy` (the paged Policy Definitions list) accepts `PageNumber`, `PageSize`,
`PolicyTypeId`, `StatusId`, `Search`, `ModuleId` and `OperationId` - and nothing for ordering.
Every comparable paged list in the API already takes `SortBy` and `SortOrder` as query strings:
`/api/Department/get`, `/api/Designation/get`, `/api/Role/get`, `/api/Employee/get`,
`/api/Asset/get`, `/api/Asset/Category/get` and others (see Swagger).

Without them the server's own ordering is the only ordering. Sorting the current page client-side
is not an option: with paging, it would reorder ten rows and present them as if the whole list were
sorted.

## Reproduce

1. `GET /api/TenantPolicy?pageNumber=1&pageSize=10&SortBy=name&SortOrder=asc`
2. `GET /api/TenantPolicy?pageNumber=1&pageSize=10&SortBy=name&SortOrder=desc`

**Expected:** the two pages come back in opposite name order.
**Actual:** both responses are identical; the unknown parameters are ignored.

## Impact

The Policy Definitions screen marks the **Name** and **Code** headers as sortable. Clicking one
flips the sort arrow and re-fetches, but the rows come back in the same order. The control looks
broken.

## Suggested fix

Add `SortBy` and `SortOrder` to `GET /api/TenantPolicy`, matching the existing lists:

| Parameter   | Type   | Values                            | Default              |
| ----------- | ------ | --------------------------------- | -------------------- |
| `SortBy`    | string | `name`, `code` (case-insensitive) | current server order |
| `SortOrder` | string | `asc`, `desc`                     | `desc`               |

- Sort is applied **before** paging, across the whole filtered result, and combines with
  `PolicyTypeId`, `StatusId` and `Search`.
- An empty or unknown `SortBy` falls back to the current default order rather than erroring, so
  existing callers are unaffected.
- Add a stable tiebreaker (e.g. policy id) so rows with equal names do not shift between pages.
- `totalRecords` is unchanged by sorting.

Optional, if cheap: also allow `policyType`, `status` and `effectiveFrom`, so more columns can
become sortable later. The web app needs only `name` and `code` today.

## Verifying the fix

1. Repeat the repro: the two calls return opposite orders.
2. With 25+ policies, page through `SortBy=code&SortOrder=asc` at `pageSize=10`. No row repeats or
   goes missing across pages, and codes ascend across page boundaries.
3. Combine with `PolicyTypeId` and `Search`: only matching rows return, still sorted.
4. Omit both parameters: the response matches today's order.

## Client-side follow-up (after the API ships)

Pass the table's sort through, the way `departments.store.ts` does: `loadPolicies` reads
`sortField` / `sortOrder` via `Common.getPaginationParam`, stores them in the existing `sortBy` /
`sortOrder` state, and the `policiesResource` params send `SortBy` / `SortOrder`.

## Client-side references

- `src/app/features/tenant-policies/policy-definitions/policy-definitions.html` (`pSortableColumn="name"`, `pSortableColumn="code"`)
- `src/app/features/tenant-policies/policy-definitions/policy-definitions.store.ts` (`sortBy` / `sortOrder` state, `policiesResource`, `loadPolicies`)
- `src/app/features/departments/departments.store.ts` (reference wiring for `SortBy` / `SortOrder`)
- `docs/specs/TENANT_POLICY/TenantPolicyActualScreensGuide.md` (list request, no sort params)
