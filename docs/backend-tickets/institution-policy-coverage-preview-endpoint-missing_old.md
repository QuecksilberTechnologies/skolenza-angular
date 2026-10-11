# Nothing lists the employees an applicability rule covers, so HR publishes a policy blind

**Component:** AxionPro API - `TenantPolicy` controller
**Severity:** Major - a policy's reach can only be checked one employee at a time, after publish
**Reported:** 2026-09-22
**Environment:** `https://axionpro-api.onrender.com`

## Summary

`PolicyApplicability` decides who a policy version reaches. A row carries up to thirteen optional
filters (country, state, district, locality, tenant location, employee type, department,
designation, employee, gender, work arrangement, employment status, minimum service days), combined
with AND inside a row and OR across rows, with Include/Exclude modes, specificity ranking and a
numeric priority tiebreak.

There is no endpoint that answers "given this version, which employees does that actually select?"

The only read that evaluates applicability is `GET /api/TenantPolicy/resolve`, and it is keyed the
other way round: one employee, one date, returning the policies that reach _them_. Checking the
coverage of a single policy therefore means calling resolve once per employee and filtering the
results client-side - which is also impossible today, because the same endpoint cannot accept the
employee identifier the API hands out
(`docs/backend-tickets/tenant-policy-employee-id-type-mismatch.md`).

## The gap

Reads that touch applicability, from `docs/specs/TENANT_POLICY/TENANT_POLICY_ENDPOINT_CATALOG.md`:

| Endpoint                                    | Keyed on        | Answers                                                            |
| ------------------------------------------- | --------------- | ------------------------------------------------------------------ |
| 7. `GET /{id}`                              | policy id       | the version's applicability **rows**, not the employees they match |
| 9. `GET /resolve`                           | employee + date | which policies reach one employee                                  |
| 15. `GET /versions/{versionId}/assignments` | version id      | **manual** assignments only                                        |

Endpoint 15 is the one HR reaches for, and it is the wrong answer: the Assignments tab lists rows
created by `POST /assignments`. An automatic applicability match never produces an assignment row.
"No manual assignments" therefore reads to the user as "this policy reaches nobody", when a single
all-null Include row may cover the whole tenant.

## Reproduce

1. Create a policy with one Include applicability row, all filters null, `priority: 500`,
   `effectiveFrom` today. Publish it.
2. Open the version workspace → **Assignments**. The tab is empty.
3. There is no call, anywhere in the catalogue's 37 operations, that returns the employees this
   version now covers.

**Expected:** some call enumerates the covered employees, and says which applicability row matched.

## Impact

Applicability is the part of this module most likely to be got wrong, and it is the part with no
feedback loop:

- An Exclude row that is broader than intended silently removes people. Specificity and priority
  decide the tie, and neither is visible in aggregate.
- A `minimumServiceDays` value interacts with `Employee.DateOfOnBoarding`, which HR cannot
  cross-check by hand across a tenant.
- Publish is the point of no return for a version, and it happens with no preview of who is affected.
- Compliance reporting - "prove which employees this policy covered on this date" - has no source.

The client has no workaround. Iterating the employee list and calling resolve per employee is
O(employees) HTTP calls for one screen, and would still miss _why_ a given employee matched.

## Suggested fix

**`GET /api/TenantPolicy/versions/{versionId}/coverage`**, taking an `effectiveDate` (defaulting to
today) and standard paging, returning the employees the version reaches on that date:

```json
{
  "isSucceeded": true,
  "message": "Policy coverage retrieved successfully.",
  "data": {
    "items": [
      {
        "employeeId": "1OZ8MZRL",
        "employeeName": "Deepesh Gupta",
        "employementCode": "QT/2018/0001",
        "coverageSource": "APPLICABILITY",
        "matchedApplicabilityId": 88,
        "priority": 500,
        "specificity": 3
      },
      {
        "employeeId": "78N5XZW2",
        "employeeName": "China",
        "employementCode": "QT/2026/0201",
        "coverageSource": "ASSIGNMENT",
        "matchedApplicabilityId": null,
        "priority": null,
        "specificity": null
      }
    ],
    "totalRecords": 2
  },
  "errors": []
}
```

`employeeId` must be the string token `GET /api/Employee/get-all` returns, per the identifier ticket
below. `moduleId` / `operationId` resolve against Policy Definitions with `View`, like the other
reads on that leaf.

Two properties matter as much as the list itself:

1. **`coverageSource`** distinguishes an automatic applicability match from a manual assignment, so
   the Assignments tab stops being mistaken for the coverage answer.
2. **`matchedApplicabilityId`** names the winning row, so an HR user can see _which_ rule pulled an
   employee in - and, by its absence from the list, reason about who an Exclude row removed.

Worth considering alongside it: an **excluded** variant, or an `includeExcluded` flag that returns
excluded employees with the Exclude row that removed them. Diagnosing an over-broad Exclude is the
harder half of the problem, and the include-only list cannot show it.

A draft-version preview - running coverage against a Draft before publishing - is the feature's
whole point. If the endpoint is restricted to Published versions it does not solve the reported
problem.

## Verifying the fix

1. Publish a version with one all-null Include row. Call coverage. Expect every active employee in
   the tenant, each with `coverageSource: "APPLICABILITY"`.
2. Add a narrower Exclude row on a new draft version. Call coverage against the **draft**. Expect
   the excluded employees to be absent.
3. Manually assign one employee who does not match applicability. Expect them in the list with
   `coverageSource: "ASSIGNMENT"`.
4. Call with an `effectiveDate` before the version's `effectiveFrom`. Expect an empty list.
5. In the web app, a Coverage tab on the version workspace lists covered employees and the rule that
   matched each one, before the version is published.

## Related

- `docs/backend-tickets/tenant-policy-employee-id-type-mismatch.md` - the response shape above
  assumes the string employee identifier the rest of the API uses.
- `docs/backend-tickets/tenant-policy-employee-policy-list-endpoint-missing.md` - the same question
  asked from the employee's side.

## Client-side references

- `src/app/features/tenant-policies/policy-version-workspace/policy-version-workspace.store.ts`
  (tab resources; no coverage resource exists)
- `src/app/features/tenant-policies/policy-definitions/resolve-policies-dialog/resolve-policies-dialog.ts`
  (the one-employee preview this would complement)
