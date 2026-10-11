# Bulk upload: UI integration and tested development samples

Start here: [Bulk API scenario guide](BULK_API_SCENARIOS.md) — all five modules,
mandatory fields, request examples, storage/retention, completion and cancellation.

Validated on 10–11 September 2026 against https://axionpro-api.onrender.com.
Swagger: https://axionpro-api.onrender.com/swagger/index.html.
The user identifies this as the development server; Render labels its environment
Production. The authorized test tenant is Quecksilber Technologies, tenant 8.
Credentials and tokens are intentionally absent from this handoff.

## Current result

**FINAL release acceptance COMPLETE (11 September):** Employee migration/restart,
CSV create/paste replay, DB/report reconciliation, pattern recoding/restore, and
EmployeeType CRUD plus all four menu grants passed on live commit `2c91b6eb`.
See `EMPLOYEE_IMPORT_UI.md` and `results/employee-pattern-final-db.json`.
Older pending checkpoint paragraphs below are retained as history only.

11 September continuation: EmployeeType manual CRUD and all four menu grants now
pass. Employee CSV import created two records; paste replay skipped both; report
and DB match including contact/account records. Employee migration/restart complete.
Only the legacy Admin code recoding correction deployment/live confirmation remains
pending. See `EMPLOYEE_IMPORT_UI.md` and the main reference for current evidence;
older pending checkpoints below are historical.

| Master       | XLSX upload and worker         | CSV replay                  | Pasted CSV replay           | DB/report comparison |
| ------------ | ------------------------------ | --------------------------- | --------------------------- | -------------------- |
| Department   | PASS: 2 created                | PASS: 2 existing, 0 created | PASS: 2 existing, 0 created | PASS                 |
| Designation  | PASS: 2 created                | PASS: 2 existing, 0 created | PASS: 2 existing, 0 created | PASS                 |
| Role         | PASS: 2 created                | PASS: 2 existing, 0 created | PASS: 2 existing, 0 created | PASS                 |
| EmployeeType | PASS: 2 created (11 September) | PASS: 2 existing, 0 created | PASS: 2 existing, 0 created | PASS                 |

Twelve live import flows passed with zero failures. Seven additional HTTP validation
checks passed. Read-only reconciliation matched all twelve completed jobs and eight
created master records to the downloaded CSV reports, including IDs, names,
descriptions/remarks, role types, Designation parents and tenant ownership.

Historical blocker, resolved for bulk acceptance on 11 September: module 79 (`TENANT_EMPLOYEE_TYPES`) had no
TenantEnabledModule entry for tenant 8. It was absent from this user's my-menu;
the authenticated template request returned 403. This was a blocked acceptance
test at that checkpoint. Host needed to synchronize the tenant's
active-plan entitlements through the existing flow, then grant Add/View through
the existing role-permission flow. Current authenticated my-menu includes Add,
Update and View; the three EmployeeType bulk flows and DB verification now pass.
Delete is still absent from my-menu, and live update/delete CRUD acceptance remains
pending the current deployment and the existing Delete permission grant.

## Files and upload order

| Order | Excel file              | Worksheet    | Endpoint base       | Mapping                                 |
| ----- | ----------------------- | ------------ | ------------------- | --------------------------------------- |
| 1     | `01-department.xlsx`    | Department   | `/api/Department`   | Canonical headers auto-map              |
| 2     | `02-designation.xlsx`   | Designation  | `/api/Designation`  | Explicit mapping below                  |
| 3     | `03-role.xlsx`          | Role         | `/api/Role`         | Canonical headers auto-map              |
| 4     | `04-employee-type.xlsx` | EmployeeType | `/api/EmployeeType` | Canonical headers; entitlement required |

Each file has one sheet, one header row and two data rows. Matching `.csv` files
are supplied. To test paste, paste the CSV file's complete text, including headers.
Department must complete before its Designations are previewed.

Designation `ColumnMappingJson`:

```json
{ "DesignationName": "DesName", "DepartmentName": "Dept" }
```

Description and IsActive retain canonical headers and auto-map. AI is disabled;
DesName and Dept are not guessed. Display mapped sample values for user review.
The same Manager name in the two sample Departments is intentional and valid.

All sample names start with `UIQA-20260910-`. The six created records remain in
the development tenant for UI verification. Re-uploading the same samples now
should skip existing records. Change names only when deliberately testing new
creation; update Designation parent names consistently. No employees were assigned
to the sample roles/types, and no role permissions were granted by import.

## UI flow and API calls

1. Use the application's existing login and authentication interceptor. Load
   `GET /api/Navigation/my-menu`. Resolve the module and allowed operation IDs
   from that response. Hide/disable unavailable actions with the existing UI
   permission mechanism; the backend enforces the same permissions.
2. Choose one source: XLSX, CSV or pasted text. Show sheet selection for multiple
   worksheets. Render source headers, target mapping, sample values and unmapped
   columns. Do not map TenantId, actor IDs, primary keys or system flags.
3. Submit preview as multipart form data. Show global errors, row errors, source
   row numbers, Ready and Existing counts. A successful response envelope can still
   contain an invalid preview. Enable Confirm only when `data.canCommit === true`.
4. Ask the user to review the saved preview and explicitly confirm. The UI may
   offer run now or a future UTC schedule. Confirmation queues a job; it does not
   mean inserts have already finished.
5. Poll job detail every 2–5 seconds until terminal status. Display processedRows,
   totalRows, createdCount, existingCount, failedCount and errors. Restore progress
   through history if the user closes/reopens the screen.
6. Download the report as a Blob, show Created/Existing/Failed outcomes and refresh
   the existing master list. Retry and Cancel use the existing job endpoints.

IDs observed for this tenant only: Department 25, Designation 26, Role 27,
Add operation 1, View operation 4. These are test evidence, not frontend constants.
EmployeeType module 79 exists globally but is not currently granted to this tenant.

### Preview

`POST {base}/bulk/preview`, Authorization bearer token, multipart form:

| Field             | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| ModuleId          | Allowed module ID from my-menu                         |
| OperationId       | Allowed Add or Import operation ID                     |
| File              | Selected `.xlsx` or `.csv`, OR use PastedText          |
| PastedText        | Header and data rows; do not also send File            |
| RequestId         | Client UUID; reuse only for exactly unchanged input    |
| SheetName         | Exact worksheet name when workbook has multiple sheets |
| ColumnMappingJson | JSON string; Designation example above                 |

Let the browser set the multipart boundary; do not manually set Content-Type.
Corrected input/mapping needs a new RequestId and new preview. There is no API to
edit rows in a saved draft. Do not submit a JSON row array to preview.

```typescript
const form = new FormData();
form.append('ModuleId', String(moduleId));
form.append('OperationId', String(addOperationId));
form.append('RequestId', crypto.randomUUID());
form.append('File', file);
if (mapping) {
  form.append('ColumnMappingJson', JSON.stringify(mapping));
}
const preview = await firstValueFrom(http.post<any>(`${base}/bulk/preview`, form));
// Render preview.data and errors. Wait for explicit user confirmation.
```

### Confirm and poll

`POST {base}/bulk/confirm`, JSON:

```json
{
  "jobId": "saved-preview-job-id",
  "moduleId": 25,
  "operationId": 1,
  "scheduledAtUtc": null
}
```

Use actual IDs. Null schedule means eligible now; a future UTC timestamp means
not before that time. Past schedules are rejected. The Render Free instance may
sleep; scheduled execution requires the API to be awake.

`GET {base}/bulk/jobs/{jobId}?ModuleId={moduleId}&OperationId={viewOperationId}`

Job states: Draft=1, Queued=2, Running=3, Completed=4,
CompletedWithErrors=5, Failed=6, Cancelled=7. Stop polling at 4–7.
Row states: Ready=1, Existing=2, Invalid=3, Created=4, Failed=5.
Use `processed` to distinguish preview matches from processed matches.

### Other actions

| Method | Route                             | Notes                                                      |
| ------ | --------------------------------- | ---------------------------------------------------------- |
| GET    | `{base}/bulk/jobs`                | ModuleId, OperationId, pageNumber, pageSize; summary array |
| GET    | `{base}/bulk/template`            | ModuleId, OperationId; CSV file                            |
| GET    | `{base}/bulk/jobs/{jobId}/report` | ModuleId, OperationId; CSV file                            |
| POST   | `{base}/bulk/retry`               | JobId, ModuleId, OperationId, optional ScheduledAtUtc      |
| POST   | `{base}/bulk/cancel`              | JobId, ModuleId, OperationId                               |

Retry is for Failed/CompletedWithErrors, not Completed/Cancelled. Created rows are
retained. Cancel stops pending work at a batch boundary; it does not undo commits.
Job access is limited to the same tenant and uploading actor.

Reports contain RowNumber, Status, RecordId, Values and Errors. Values is a quoted
JSON CSV cell. Download responses are files, not the normal JSON success envelope.
Handle JSON error responses separately. Reports are not input templates.

## Validation outcomes tested on this server

| Case                                | Preview/UI expectation    | Actual response                   |
| ----------------------------------- | ------------------------- | --------------------------------- |
| Designation aliases without mapping | Confirm disabled          | canCommit=false; confirm HTTP 400 |
| Duplicate Department rows           | Both duplicates invalid   | canCommit=false; confirm HTTP 400 |
| Missing Department name             | Show required-field error | canCommit=false; confirm HTTP 400 |
| Designation with unknown Department | Show parent error         | canCommit=false; confirm HTTP 400 |
| Anonymous template request          | Require sign-in           | HTTP 401                          |
| EmployeeType without entitlement    | No usable module/action   | HTTP 403                          |
| View used for preview/create        | Deny mutation             | HTTP 403                          |

The four invalid drafts remain unconfirmed. No corresponding master records were
created. General limits: 5 MiB input, 5,000 rows, 64 columns; XLSX expansion 25 MiB.
Formulas, merged cells and external worksheet links are rejected. IsActive accepts
true/false; blank means true. Existing active matches are skipped; existing values
are not updated. Inactive/ambiguous matches are errors. The worker revalidates
permissions/current records before inserts and reports later conflicts.

Full field lengths, all DTOs, scheduling, ownership and error contracts are in
`../AI_ASSISTED_BULK_IMPORT_REFERENCE.md`. Do not treat this live run as new proof
of concurrency, crash recovery, retry/cancel or cross-tenant authenticated denial:
those existing isolated tests were not repeated. Angular screens were not built
or tested during this backend acceptance run.

## Evidence and commands

`results/live-summary.json`: nine successful import flows and EmployeeType blocker.
`results/validation-summary.json`: seven HTTP validation outcomes.
`results/db-verification.json`: nine report-to-DB reconciliations.
`results/db-sample-records.json`: only sample master rows and matching jobs.
Each successful master/source also has its actual preview JSON, job JSON and CSV
report. These are fixtures for UI development, not fabricated response examples.

Scripts read credentials from `AXIONPRO_TEST_LOGIN_ID` and
`AXIONPRO_TEST_LOGIN_PASSWORD` process variables. Configure them securely; do not
put secrets into source control. PowerShell 7 is required.

Do not rerun already passed cases for this handoff. After entitlement/grant setup,
run only the remaining master:

```powershell
pwsh -File docs/bulk-upload/run-live.ps1 -Masters EmployeeType
```

`run-live.ps1` creates/imports the named samples and persists evidence.
`check-validation.ps1` creates invalid drafts and checks HTTP rejection behavior.
`verify-db.ps1` performs only read-only report-to-database reconciliation using
the configured target connection. The DB script is an operator check, not frontend
code; never send DB credentials to the UI.

## Remaining release acceptance

All four master bulk flows now have live evidence. EmployeeType manual CRUD
update/delete acceptance remains pending; Delete is absent from the current menu.
Employee import and pattern endpoints still need deployment, migration and live
acceptance. The 11 September Render build of `3387971` failed during publish;
the response DTO mismatch was corrected locally. User requested finishing local
work before another deployment. Passed master imports must not be rerun.
Retain sample data for UI review; any later cleanup should target only the named
UIQA records and their jobs through an approved cleanup workflow.

## Employee import handoff

Employee template: [05-employees.xlsx](05-employees.xlsx), [CSV](05-employees.csv).
See [Employee UI and testing guide](EMPLOYEE_IMPORT_UI.md) for its nine routes,
pattern preview/approval, field mapping, seat capacity and separate invitations.
77 focused automated cases passed. This Employee phase is not deployed or live-HTTP
accepted yet; the earlier master-import acceptance above remains separate.
