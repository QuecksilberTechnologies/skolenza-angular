# Employee import and code-pattern UI handoff

**FINAL: requested live release acceptance COMPLETE, 11 September 2026.**
Live commit: `2c91b6eb`; Render deployment: `dep-dai0l23m8hqs73dmbdeg`.
Migration/restart, CSV create, paste skip replay, DB/report matching, all-employee
pattern update/restore and EmployeeType CRUD/menu verification passed.
Final codes: QT/2018/0001 (Admin), QT/2026/0145, QT/2026/0200; next number 0201.
Add-pattern existing-tenant rejection was verified live; missing-pattern creation
and XLSX parsing are covered by isolated automated tests. No real emails were sent.
All older pending notes below are historical and superseded by this checkpoint.

Latest live checkpoint (11 September): Employee migration and service restart are
complete. CSV import created two employees, paste replay skipped both, and DB/report
verification passed for codes, mobile, contact/address, login, role and image.
Next-code preview returned QT/2026/0201. No invitations were sent.
Pattern recoding awaits deployment of correction `2c91b6eb`: exact legacy codes
generated from persisted account creation dates are recognized, while proposed
codes use original joining dates. Overall acceptance is still WIP for this item.
The older local-only checkpoints below are historical.

Local implementation and 77 focused automated cases passed on 2026-09-11.
Deployment and authenticated HTTP acceptance remain PENDING. Automatic approval
review blocked the separate local API launch. This is not a Render acceptance pass.
The exact test inventory is in `results/employee-automated-summary.json`.

Release checkpoint (11 September): Render build `3387971` failed because the
EmployeeType handler used a different response DTO namespace from its repository.
The alias is corrected locally and Release publish passes. Per user direction,
deployment is deferred until local work is finished; these routes are not live yet.

## Files and field mapping

- `05-employees.xlsx`: choose worksheet `Employees`; row 1 contains 27 headers.
  `Guide` explains requirements and existing destination tables.
- `05-employees.csv`: identical headers, no example employee records.
- Required base information: FirstName, LastName, OfficialEmail, DateOfBirth,
  original DateOfOnBoarding, GenderId, CountryId, DepartmentId, DesignationId,
  EmployeeTypeId, HasPermanent and IsActive.
- RoleId can be supplied; otherwise the existing Employee-role default is used.
  Department, Designation, EmployeeType and Role must belong to the signed-in
  tenant and be active. Designation must belong to the selected Department.
- MobileNumber maps to Employee. ContactName, ContactNumber, AlternateNumber,
  ContactEmail, ContactCountryId, StateId, DistrictId, HouseNo, Street, LandMark,
  Address map through the existing Contact DTO to primary personal EmployeeContact.
  ContactNumber is required when any contact/address field is populated.
- IDs come from existing application lookups. Header aliases require explicit
  `ColumnMappingJson`, e.g. `{"FirstName":"Given name"}`. Unmapped columns block
  Employee confirmation; the API does not infer field meanings or discard data.
- CSV dates must be `yyyy-MM-dd`. Excel numeric dates are interpreted using the
  workbook's 1900/1904 date system, then stored as canonical dates in the draft.
  Keep employee codes and phone numbers as text, preserving leading zeros.
- Do not include TenantId, employee audit IDs, passwords or permission grants.
  Tenant and actor are obtained from the authenticated session.

## Pattern configuration

Existing GET `/api/Tenant/get-employee-code-pattern` remains available.

POST `/api/Tenant/add-employee-code-pattern` creates a missing pattern. PUT
`/api/Tenant/update-employee-code-pattern` changes an existing pattern. Both use
the established permission pipeline and `TENANT_EMPLOYEE_CODE` module. POST
requires Add; PUT requires Update. Use the actual module/operation IDs from the
current permission context.

```json
{
  "moduleId": 29,
  "operationId": 2,
  "pattern": {
    "prefix": "EMP",
    "separator": "-",
    "runningNumberLength": "4",
    "includeYear": true,
    "includeMonth": false,
    "includeDepartment": false
  },
  "confirm": false
}
```

IDs in this example are illustrative. First submit `confirm:false`. Display
every employee's current/proposed code and joining date, including the Admin.
Show row errors and disable Apply unless `canCommit` is true. Submit the same
pattern with `confirm:true` and the returned `previewHash` after user approval.
HTTP 409 requires a new preview; never silently confirm a refreshed preview.

The backend preserves existing tenant validation: 1–10 letters for Prefix,
separator `_`, `/` or `-`, and running-number length 3–7. The empty-separator UI
hint does not match this existing backend contract. Month format is `JAN` through
`DEC`; department component uses the existing numeric DepartmentId convention.

Original joining date supplies year/month. Historic employees with missing or
unrecognized code/date information block recoding; the API does not invent dates.
Changes update employee codes, not employee identity, login, roles or related IDs.
Inactive employees are included. Archived employees retain their codes, which
cannot be reused. Host aggregate updates reject pattern edits that would bypass
this preview/approval flow; unchanged pattern fields remain accepted there.

## Employee import flow

All routes are under `/api/Employee/bulk` and use `EMP_LIST` through the existing
Employee permission behavior. Add/Import permits mutations; View also permits
read/template actions. Permissions are checked again by the worker.

| Method | Route suffix           | UI purpose                                      |
| ------ | ---------------------- | ----------------------------------------------- |
| POST   | `/preview`             | Upload XLSX/CSV or pasted data and save a draft |
| POST   | `/confirm`             | Approve the saved draft and queue now or later  |
| GET    | `/jobs/{jobId}`        | Poll progress and row results                   |
| GET    | `/jobs`                | List this caller's imports                      |
| POST   | `/retry`               | Retry failed rows, preserving created rows      |
| POST   | `/cancel`              | Stop remaining work at a batch boundary         |
| GET    | `/template`            | Download the CSV header template                |
| GET    | `/jobs/{jobId}/report` | Download CSV results and corrections            |
| POST   | `/send-invitations`    | Explicitly send pending/failed invitations      |

Preview is multipart/form-data: `File` **or** `PastedText`, `ModuleId`,
`OperationId`, optional `SheetName`, `ColumnMappingJson` and client `RequestId`.
For the workbook supplied here, `SheetName=Employees` is required because it has
two worksheets. Reuse RequestId only to retry identical input; corrections need
a new RequestId.

Display `jobId`, `errors`, `rows`, `readyCount`, `existingCount`, `invalidCount`,
`canCommit`. For each employee show source `EmployeeCode` beside
`proposedEmployeeCode`. Matching supplied codes are preserved. Missing or
nonmatching codes receive a proposal using the selected tenant pattern. Existing
accounts are skipped and are never overwritten or reactivated by import.

Confirmation body:

```json
{
  "jobId": "<saved-job-uuid>",
  "moduleId": 8,
  "operationId": 1
}
```

Optional `scheduledAtUtc` queues a future run. Confirmation accepts no replacement
rows. A changed pattern/counter/capacity or reference conflict returns 409 and
requires a fresh preview. Approved numbers are reserved at confirmation so other
account creation cannot consume them. Cancelled jobs can leave sequence gaps.
Workers revalidate capacity, references and approved codes before each insertion.

Account, login, role, initial image and supplied contact commit together per row.
Job progress commits with the batch. Failed inserts roll back their complete row;
already-created rows are never recreated on retry. Reports contain the approved
code and actual row result; internal Employee IDs and invitation claim IDs are
removed from public responses.

## Capacity and invitations

Initial Tenant Admin counts as one MaxUsers seat. Suspended employees retain their
seat; non-soft-deleted Employee records count. Host users do not consume tenant
seats. A valid active subscription and active plan with positive capacity are
required. The worker checks again if capacity changes after confirmation.

Import creates accounts without sending mail. After reviewing results, offer
**Send invitations**. Send JobId, ModuleId, OperationId and optional `rowNumbers`
(up to 100). An omitted row selection processes at most 100 eligible rows.

| Invitation status | UI behavior                                                     |
| ----------------- | --------------------------------------------------------------- |
| Pending           | Account created; invitation can be sent                         |
| Sending           | Claimed by a dispatch request; do not send again                |
| Sent              | Delivery service reported success; skipped on repeated requests |
| Failed            | Show correction/retry action for invitations only               |
| DeliveryUnknown   | Check email delivery logs before another send                   |
| NotRequired       | Account unavailable/inactive or already has a password          |

Tokens are generated at dispatch, using the existing 30-minute password setup
flow. They are not stored in the import report. Concurrent send actions claim
each eligible row once. An interrupted Sending or uncertain delivery is not
automatically retried; SMTP delivery cannot be made exactly-once by a database
transaction. No real invitation emails are authorized by running the automated
acceptance tests.

## Acceptance to record

Record exact test counts and failures in `AI_ASSISTED_BULK_IMPORT_REFERENCE.md` and
the automation README. Before marking deployed acceptance complete, verify the
actual authenticated API upload, preview, confirm, worker report and database
rows. Do not reuse the earlier master-import passes as Employee-import evidence.
