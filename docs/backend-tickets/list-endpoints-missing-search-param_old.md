# Nine list endpoints take no general `Search` parameter

**Component:** AxionPro API - `Employee/get-all`, `Department/get`, `Designation/get`, `Role/get`,
`Asset/get`, `Asset/Category/get`, `ReportingType/get-all`, `PolicyType/get-all`,
`PolicyTypeInsuranceMap/get-all`
**Severity:** Minor - each list's search box matches names only, or matches nothing
**Reported:** 2026-10-04
**Environment:** `https://axionpro-api.onrender.com`

## Summary

Every list screen has one search box. These nine endpoints take no single free-text `Search`
query parameter, unlike `AttendancePolicy` (which takes `Search`), so the box cannot search the
columns the grid shows. Swagger returned 500 on 2026-10-04, so the table below comes from the
`main_branch` source: each controller's `[FromQuery]` DTO and its repository's `Where` clause.

| Endpoint                         | What it filters on today                                            | Gap                                       |
| -------------------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| `Department/get`                 | `DepartmentName` (`Contains`, case-insensitive)                     | Name only                                 |
| `Designation/get`                | `DesignationName` (`Contains`, case-insensitive)                    | Name only                                 |
| `Role/get`                       | `RoleName` (`Contains`, case-insensitive)                           | Name only                                 |
| `ReportingType/get-all`          | `TypeName` (`Contains`, **case-sensitive**)                         | Name only; `Audit` does not match `audit` |
| `Employee/get-all`               | `FirstName`, `LastName`, `EmployementCode`, each `Contains`, AND-ed | One term cannot match name OR code        |
| `Asset/get`                      | `SerialNumber`, `ModelNumber` (`Contains`)                          | Asset name is not searchable              |
| `Asset/Category/get`             | `Id`, `IsActive` only                                               | No text filter                            |
| `PolicyType/get-all`             | `PolicyName` is in the DTO but the repository never filters on it   | No text filter                            |
| `PolicyTypeInsuranceMap/get-all` | `PolicyTypeId`, `InsurancePolicyId`, `IsActive` only                | No text filter                            |

## What the frontend does today

Since 2026-10-04 the search box debounces input, normalises whitespace and sends one request per
settled term.

- Department, Designation, Role and Reporting Type send the term as their name field, so the box
  matches names only.
- The other five lists still send nothing. Their table refetches page 1 with no term, so typing
  in the box changes nothing.

## Ask

Add an optional `Search` query parameter to all nine endpoints:

- Match case-insensitively with `Contains`.
- OR across the columns the grid shows. For example, Employee: first name, last name, employee
  code, email. Asset: name, serial number, model number.
- Keep the existing name fields for compatibility.
- Ignore an empty or whitespace-only `Search`.

The frontend then swaps the name field for `Search` in one place per list, and wires the five
lists that send nothing today.
