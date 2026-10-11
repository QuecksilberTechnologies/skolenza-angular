# An employee cannot list their own policies, and cannot acknowledge one that reaches them by applicability

**Component:** AxionPro API - `TenantPolicy` controller, `POST /api/TenantPolicy/acknowledgements`
**Severity:** Blocker - the employee-facing half of the policy module has no API to build against
**Reported:** 2026-09-22
**Environment:** `https://axionpro-api.onrender.com`

## Summary

Everything in `TenantPolicy` is keyed on HR's view: a policy, a version, a version's assignments,
a version's acknowledgements. Nothing is keyed on "me".

Two separate gaps fall out of that, and the second makes the first unbuildable even as a read-only
screen.

### 1. No self-service list

There is no `GET /api/TenantPolicy/my-policies`. An employee who wants to see the policies that
apply to them today, with their documents and their acknowledgement state, has no call to make.

The nearest endpoint is `GET /api/TenantPolicy/resolve?EmployeeId=...`, which takes an employee id
as a parameter - so it is HR's lookup tool, gated on the Policy Definitions View grant, not a
self-service read. It also returns policy identity only: no documents, no acknowledgement status,
no mandatory flag.

### 2. Acknowledgement requires an assignment that applicability never creates

From `docs/specs/TENANT_POLICY/TENANT_POLICY_API.md`:

> Assignment also creates missing acknowledgement rows with Assigned status in the same transaction.
> Acknowledgement is allowed only for the authenticated employee and only when an active assignment
> exists.

`PolicyAcknowledgement` rows are created by `POST /assignments` and by assignment bulk import. An
automatic applicability match creates no `PolicyAssignment` row and therefore no acknowledgement
row - which is correct as a data model, but it means:

**An employee covered purely by applicability can never acknowledge the policy that governs them.**

That is the normal case. Applicability is the mechanism for "all India permanent staff"; manual
assignment is the exception path for one named person. The module's acknowledgement evidence is
therefore only ever collected from the exceptions, never from the population.

## Reproduce

1. Create a policy with a single Include applicability row matching a known employee. Publish it.
2. Do **not** create a manual assignment.
3. Authenticate as that employee and call:

```bash
curl -X POST 'https://axionpro-api.onrender.com/api/TenantPolicy/acknowledgements' \
  -H 'authorization: Bearer <employee token>' \
  -H 'content-type: application/json' \
  -d '{ "moduleId": <Policy Acknowledgements>, "operationId": <Acknowledge>,
        "policyVersionId": <published version> }'
```

**Expected:** the acknowledgement is recorded, because this employee is in scope for this version.
**Actual:** rejected - no active assignment exists.

4. `GET /api/TenantPolicy/versions/{versionId}/acknowledgements` returns nothing for that employee,
   so HR's compliance evidence shows the policy as unacknowledged by everyone it actually covers.

## Impact

The whole employee-facing journey is missing, and it is the journey that makes the module worth
having. Today a published policy is visible only to HR, acknowledged only by manually assigned
individuals, and its compliance evidence covers a population that is by construction the smallest
one.

The web app has no `my-policies` route because there is nothing to call. Adding the screen against
resolve would produce a page that lists policy names, cannot show the signed document, and offers an
Acknowledge button that fails for most users.

The workaround - manually assigning every covered employee so acknowledgement becomes possible -
defeats applicability entirely and does not scale past a small tenant.

## Suggested fix

Two pieces. The contract decision in (2) should be settled first, because (1)'s response shape
depends on it.

**1. `GET /api/TenantPolicy/my-policies`**, for the authenticated employee, resolving against the
caller's identity rather than an `employeeId` parameter:

```json
{
  "isSucceeded": true,
  "message": "Policies retrieved successfully.",
  "data": [
    {
      "policyId": 42,
      "policyVersionId": 73,
      "policyCode": "MH-CASUAL-LEAVE",
      "policyName": "Maharashtra Casual Leave",
      "policyTypeName": "Casual Leave",
      "effectiveFrom": "2027-01-01",
      "effectiveTo": null,
      "coverageSource": "APPLICABILITY",
      "isMandatory": true,
      "acknowledgementStatus": 1,
      "acknowledgedDateTime": null,
      "documents": [{ "id": 9, "title": "Signed policy", "languageCode": "en" }]
    }
  ],
  "errors": []
}
```

Only `isEmployeeVisible` documents belong in that list. An `effectiveDate` parameter defaulting to
today lets the screen answer "what applied to me on this date" for a past period.

**2. Decide and document the acknowledgement contract for applicability-only coverage.** The
options, in preference order:

- **Materialise acknowledgement rows on publish** for every employee the version covers, with
  Assigned status - the same thing assignment already does, driven by applicability instead. This
  keeps `GET /versions/{versionId}/acknowledgements` as the single compliance source, and keeps the
  "active assignment" precondition for acknowledgement intact. Cost: a write proportional to
  coverage at publish time, and a decision about employees who join after publish.
- **Relax the precondition** so acknowledgement is allowed when the caller is in scope by
  applicability, creating the acknowledgement row on first acknowledge. Cheaper, but the
  acknowledgements list then shows only those who acted, so "who has not acknowledged" needs the
  coverage endpoint to answer.

Either way `TENANT_POLICY_API.md` should replace the current sentence with the chosen rule, and say
what happens to acknowledgement state when a new version is published over an acknowledged one.

## Verifying the fix

1. Publish a policy covering an employee by applicability only, with an employee-visible document.
2. As that employee, call `my-policies`. Expect the policy, its document, and a pending
   acknowledgement state.
3. Acknowledge it. Expect success, and the acknowledged timestamp on the next `my-policies` read.
4. As HR, `GET /versions/{versionId}/acknowledgements`. Expect that employee's row.
5. Confirm `my-policies` never returns a Draft, Approved or Archived version, nor a document with
   `isEmployeeVisible: false`.
6. In the web app, a My Policies route lists the signed-in employee's policies, opens a document,
   and acknowledges without an HR-created assignment.

## Related

- `docs/backend-tickets/tenant-policy-coverage-preview-endpoint-missing.md` - the same question from
  HR's side; option 2 above depends on that endpoint to report non-acknowledgers.
- `docs/backend-tickets/tenant-policy-employee-id-type-mismatch.md` - `my-policies` avoids the
  identifier problem by keying on the token, but the acknowledgements list still returns numeric
  `employeeId`.

## Client-side references

- `src/app/features/tenant-policies/tenant-policies.routes.ts` - no employee-facing route
- `src/app/core/services/tenant-policy-api.ts` (`acknowledgePolicy`, `getVersionAcknowledgements`)
- `src/app/features/tenant-policies/policy-version-workspace/policy-version-workspace.html`
  (Acknowledgements tab - HR's view of the same data)
