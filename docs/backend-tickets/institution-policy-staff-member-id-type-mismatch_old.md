# TenantPolicy binds employees as `int64`, but no endpoint ever returns a numeric employee id

**Component:** AxionPro API — `TenantPolicy` controller
**Severity:** Blocker — every employee-targeting feature in the policy module is impossible from any client
**Reported:** 2026-09-20
**Status:** Partially fixed 2026-09-26. `GET /api/TenantPolicy/resolve` now takes the string
`EmployeeId`, and the client sends the lookup's id as-is (commit `e46265d7`). Assign, exception and
applicability still bind `int64`.
**Environment:** `https://axionpro-api.onrender.com`, authenticated with a Super-Admin tenant token

## Summary

Employees are identified everywhere in this product by an 8-character alphanumeric token, and that
is the only employee identifier any endpoint returns. The `TenantPolicy` module is the sole place
that binds an employee as a numeric `int64`. Because no endpoint exposes that numeric key, the
client has nothing valid to send, and every policy feature that targets an employee fails before it
can reach the database.

This is not a client conversion bug. There is no value to convert.

## The two identifier shapes

`GET /api/Employee/get-all` returns, for every row:

```json
{ "employeeId": "1OZ8MZRL", "employementCode": "QT/2018/0001", "firstName": "Deepesh Gupta" }
{ "employeeId": "78N5XZW2", "employementCode": "QT/2026/0201", "firstName": "China" }
{ "employeeId": "XGQR0N8W", "employementCode": "QT/2026/0203", "firstName": "Priya" }
```

Neither field is numeric. The response carries no other id.

Meanwhile every employee-targeting contract in `TenantPolicy` is `int64`:

| DTO / endpoint                    | Employee field | Declared type           |
| --------------------------------- | -------------- | ----------------------- |
| `AssignPolicyRequestDTO`          | `employeeIds`  | `array<integer, int64>` |
| `CreatePolicyExceptionRequestDTO` | `employeeId`   | `int64`, `minimum: 1`   |
| `PolicyApplicabilityInputDTO`     | `employeeId`   | `int64`, nullable       |
| `GET /api/TenantPolicy/resolve`   | `EmployeeId`   | `string` (fixed 26 Sep) |

## Reproduce

These probes were recorded on 2026-09-20 and no longer reproduce, since resolve now binds a string.
The same binding failure still applies to the three `int64` write contracts above.
`GET /api/TenantPolicy/resolve` was read-only, so it was the safe probe. Both calls use a valid
tenant token and the `ModuleId`/`OperationId` pair for `TENANT_POLICY_DEFINITIONS` + `View`
(`110` / `4` in the reporting tenant).

```bash
# 1. The identifier the API itself hands out for this employee
curl 'https://axionpro-api.onrender.com/api/TenantPolicy/resolve?EmployeeId=1OZ8MZRL&EffectiveDate=2026-09-20&ModuleId=110&OperationId=4' \
  -H 'authorization: Bearer <tenant token>'
```

**Actual — HTTP 400:**

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": { "EmployeeId": ["The value '1OZ8MZRL' is not valid for EmployeeId."] },
  "traceId": "00-e18a4fa0288b5a7df997d9fecdb38437-2536a49ef89b939c-00"
}
```

```bash
# 2. A numeric id, to show the parameter does bind and is then looked up
curl 'https://axionpro-api.onrender.com/api/TenantPolicy/resolve?EmployeeId=1&EffectiveDate=2026-09-20&ModuleId=110&OperationId=4' \
  -H 'authorization: Bearer <tenant token>'
```

**Actual — HTTP 404:**

```json
{
  "IsSucceeded": false,
  "Message": "Employee was not found.",
  "Data": null,
  "Errors": [],
  "ErrorCode": "NOT_FOUND"
}
```

The second response is the important one. `EmployeeId=1` parses and reaches an employee lookup, so
the policy module resolves employees against a numeric key that exists in its own schema. That key
is never published, so a client can only guess at it.

**Expected:** the identifier `GET /api/Employee/get-all` returns for an employee is accepted by the
endpoints that target that employee.

## The numeric key is not obtainable anywhere

Checked against the published Swagger document:

- Every `/api/Employee*` path. None returns a numeric employee id.
- There is no employee option, lookup, dropdown or search endpoint. The only `*/option` endpoint in
  this area is `GET /api/EmployeeType/option`, which is the employee **type** master.
- No schema in the document pairs a numeric `id` with an employee code or employee name.

The rest of the API already agrees on the string form. These DTOs all declare `employeeId` as
`string`:

```
CreateContactRequestDTO                      UpdateContactRequestDTO
CreateEmployeeDeviceEnrollmentRequestDTO     UpdateEmployeeDeviceEnrollmentRequestDTO
CreateEmployeeLocationAssignmentRequestDTO   UpdateEmployeeLocationAssignmentRequestDTO
CreateEmployeeWorkArrangementRequestDTO      UpdateEmployeeWorkArrangementRequestDTO
CreateEmployeeWorkModeOverrideRequestDTO     UpdateEmployeeWorkModeOverrideRequestDTO
CreateEmployeeEnrolledRequestDTO             UpdateEmployeeSectionStatusRequestDTO
CreateIdentityRequest                        UpdateEmployeeRequestDTO
DeleteEnrolledEmployeePolicyRequestDTO       ResetEmployeePasswordRequestDTO
```

`TenantPolicy` is the outlier.

## Impact

Three features in the policy module are non-functional (Resolve was a fourth until 26 Sep). Each fails client-side before a request is
sent, because the client refuses to send `NaN`:

| Feature                    | Where                                              | What the user sees                          |
| -------------------------- | -------------------------------------------------- | ------------------------------------------- |
| Assign policy to employees | Version workspace → Assignments → Assign employees | "No valid employee was selected."           |
| Create a policy exception  | Version workspace → Exceptions                     | Same class of failure                       |
| Applicability by employee  | Policy definition form → Applicability row         | The Employee picker renders with no options |

Policy assignment by bulk import is affected too: the importer takes `EmployeeCode`, so it may be
mapping a different identifier than the one the API binds here. Worth confirming as part of the fix.

## Suggested fix

Change the three remaining `int64` contracts above to take the string `employeeId` the rest of the API already uses,
and resolve it to the internal numeric key server-side — the same translation every other employee
endpoint performs today.

The alternative, publishing the numeric primary key on the employee list, is worse: it introduces a
second employee identifier into a client that consistently uses the token, and every consumer then
has to know which of the two a given endpoint wants.

## Verifying the fix

1. Done 26 Sep: probe 1 above now binds the string id.
2. In the web app, open a policy version workspace → **Assignments** → **Assign employees**, pick
   two employees, set Effective from, and Assign. Expect a success toast and two new rows.
3. Done 26 Sep: Policy Definitions → **Resolve** lists every employee and returns the table.
4. Version workspace → **Exceptions** → add an exception for an employee.
5. Policy definition form → **Applicability** → the Employee select lists employees and a saved row
   round-trips its `employeeId`.
