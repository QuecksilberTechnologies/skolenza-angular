# Applicability `workArrangementType` and `employmentStatus` have no published legend, so two scope filters are unreachable

**Component:** AxionPro API - `TenantPolicy` controller, `PolicyApplicabilityInputDTO`
**Severity:** Major - two documented applicability filters cannot be set from any client
**Reported:** 2026-09-22
**Environment:** `https://axionpro-api.onrender.com`

## Summary

`PolicyApplicability` carries thirteen scope filters. Eleven of them are lookup ids the client can
populate from an existing endpoint - country, state, district, locality, tenant location, employee
type, department, designation, employee, gender - or a plain integer with obvious meaning
(`minimumServiceDays`).

Two are not:

| Field                 | Swagger type                 | Where its values come from |
| --------------------- | ---------------------------- | -------------------------- |
| `workArrangementType` | `int32`, nullable, no `$ref` | nowhere                    |
| `employmentStatus`    | `int32`, nullable, no `$ref` | nowhere                    |

Both are plain integers with no enum, no `$ref`, and no value legend in the swagger document, in
`TENANT_POLICY_API.md`, or in `TENANT_POLICY_ENDPOINT_CATALOG.md`. `GET /api/TenantPolicy/lookups`
returns `categories`, `statuses`, `ruleTypes` and `documentTypes` - none of which is either of
these.

The fields are evidently meaningful: the resolver reads date-effective work arrangement and
employment status off the employee record when matching scope. There is simply no way for a caller
to learn which integer means which.

## Reproduce

1. `GET /api/TenantPolicy/lookups`. Four code lists, neither of these among them.
2. Search the swagger document for `workArrangementType` and `employmentStatus`. Both appear only on
   `PolicyApplicabilityInputDTO` and the applicability read DTO, typed `integer($int32)`, nullable,
   with no enumeration.
3. `POST /api/TenantPolicy` with `"workArrangementType": 1` on an applicability row. It is accepted
   and stored - so an arbitrary integer is persisted as scope without validation against any known
   set.

**Expected:** the legal values for both fields are discoverable from the API.

## Impact

The client cannot render a selector for a field whose options it cannot name, so both are
deliberately left out of the applicability editor. From
`policy-definition-form.schema.ts:62-68`:

> Still not editable in this UI - carried through unedited from an existing row rather than dropped.

That passthrough keeps the UI from destroying a value set through another channel, but it is the
limit of what a client can do. Consequences today:

- A policy scoped to hybrid or remote staff, or to employees on probation or notice, cannot be
  authored in the product at all. Those are ordinary HR requirements.
- A row created by bulk import or by direct database access carrying one of these filters cannot be
  understood by anyone reading the UI - the scope silently narrows with nothing on screen to explain
  it.
- Step 3 above shows the backend does not validate the value either, so a typo in an import file
  becomes a scope filter that matches nothing, with no error.

## Suggested fix

Publish both code lists on `GET /api/TenantPolicy/lookups`, alongside the four it already carries,
and validate incoming values against them:

```json
{
  "categories":    [ ... ],
  "statuses":      [ ... ],
  "ruleTypes":     [ ... ],
  "documentTypes": [ ... ],
  "workArrangementTypes": [ { "id": 1, "code": "ONSITE", "name": "On-site" },
                            { "id": 2, "code": "HYBRID", "name": "Hybrid" },
                            { "id": 3, "code": "REMOTE", "name": "Remote" } ],
  "employmentStatuses":   [ { "id": 1, "code": "PROBATION", "name": "Probation" },
                            { "id": 2, "code": "CONFIRMED", "name": "Confirmed" },
                            { "id": 3, "code": "NOTICE",    "name": "Notice period" } ]
}
```

Values are illustrative. The point is that the client reads them rather than hard-coding them, the
same rule the module already applies to `ModuleId` and `OperationId`.

If these two fields are in fact meant to align with an existing master - the employee work
arrangement feature already models work modes - say which, and reference that endpoint from the
contract instead of duplicating the list. Either answer unblocks the UI; silence does not.

Worth stating explicitly in the same pass: which employee record each is matched against at resolve
time - the date-effective `EmployeeWorkArrangement` row, or a scalar on `Employee` - since that
decides what a policy scoped this way means on a date the employee's arrangement changed.

## Verifying the fix

1. `GET /api/TenantPolicy/lookups`. Expect the two new code lists.
2. `POST /api/TenantPolicy` with an applicability row carrying a value outside the published set.
   Expect a 400, not a stored row.
3. Post a row with a published value; read it back through `GET /api/TenantPolicy/{policyId}` and
   confirm the value round-trips.
4. Resolve for an employee whose work arrangement matches, and for one whose does not, on the same
   date. Expect the scoped policy in the first result only.
5. In the web app, the applicability row offers Work arrangement and Employment status selects, and
   an existing row's values render as names rather than being invisible.

## Client-side follow-up

This ticket is the backend half. The client fix, once the lookups exist:

- `src/app/shared/interfaces/tenant-policy/tenant-policy-type.ts` - extend `TenantPolicyLookups`
  with both lists.
- `src/app/features/tenant-policies/policy-definitions/policy-definition-form/policy-definition-form.schema.ts:62-68`
  - drop the passthrough comment; the fields become ordinary `optionalId` selects.
- `src/app/features/tenant-policies/policy-definitions/policy-definition-form/policy-definition-form.html`
  - add the two selects to the applicability row, via the shared `select-field` wrapper.

## Related

- `docs/backend-tickets/tenant-policy-exception-approval-status-undocumented.md` - the same class of
  gap on `exceptionType` and `approvalStatusId`; both are fixed by the same `lookups` extension.
