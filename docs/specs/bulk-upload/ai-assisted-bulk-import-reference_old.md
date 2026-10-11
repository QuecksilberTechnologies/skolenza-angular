# AxionPro bulk import: implementation reference and UI handoff

Updated: 2026-09-10. Read this file before continuing bulk-import work in any session.
Maintain user decisions, implementation sequence and COMPLETE / WIP / PENDING status.
Follow AGENTS.md, Employee handler/repository conventions, regions, comments,
endpoint documentation, existing permission pipelines, constants, enums and mappings.
Ask before implementing unclear business rules. COMPLETE below means the stated
backend scope, not all future bulk modules or production deployment.

Navigation: [Calling flow](#user-and-api-calling-flow) · [Endpoint contract](#endpoints-8-per-master-32-bulk-routes-total) · [All request/response examples](#copyable-request-and-response-examples-for-every-bulk-action) · [EmployeeType examples](#employeetype-manual-creation-and-bulk-examples) · [Local/production setup](#local-and-production-deployment-same-api-project) · [Progress](#implementation-sequence-and-status).

## Approved decisions and current scope

- Department, Designation, Role and EmployeeType now support CSV/XLSX/paste, manual mapping,
  saved preview, explicit confirmation, durable background execution, job history,
  retry, cancellation, templates and result reports.
- **AI is disabled by user decision.** No provider credentials/calls are required.
  Natural-language extraction, PDF/images and AI mapping are deferred.
- Each Designation belongs to a Department. The user confirmed that Manager can
  exist independently in IT, HR and Sales. Identity is tenant + department +
  trimmed, case-insensitive designation name. Department and Role names are unique
  per tenant among non-deleted records.
- Import creates missing masters and skips matching active records. It does not
  update descriptions, reactivate records, assign employees, grant permissions or
  replace the defaults created during tenant onboarding.
- Department must finish before Designation referencing it is previewed. Role is
  independent. Missing parents require correction; they are not silently created.
  IT and Information Technology are not automatically treated as the same name.
- Tenant/actor come from authenticated context. Existing module permission
  behaviors authorize HTTP commands. The worker rechecks the same persisted
  permission function per batch. No Host bypass is introduced.
- Angular bulk screens are not implemented in this backend task. This document
  supplies their API contract and integration sequence.

## User and API calling flow

1. Open the master and obtain ModuleId/OperationId through the existing tenant
   menu/permission flow. Optionally download its CSV template.
2. Select CSV/XLSX or paste an Excel table. Choose the worksheet when needed.
   Map source headers to supported fields. Canonical headers match automatically;
   arbitrary names such as Dept require explicit mapping.
3. POST preview. Render global errors, source row numbers, mapped values, existing
   matches and row errors. Preview persists a draft; no master records are created.
4. Enable Confirm only when data.canCommit is true. Any invalid row prevents the
   entire draft from being confirmed. Correct the input/mapping and submit a new
   preview with a new RequestId; there is no in-place draft/row-edit endpoint.
5. Show final counts and execution choices: **Run now in background** or
   **Schedule for later**. Wait for explicit user confirmation.
6. POST confirm with the saved JobId. HTTP 200 means accepted/already confirmed,
   not that all rows have been inserted.
7. Poll job detail every 2-5 seconds until terminal status; back off for network
   errors. Closing the page leaves server work running. Restore through history.
8. Show Created / Existing / Failed counts and errors, download report, retry
   eligible failures or upload corrected data. Refresh the existing master list.
   Complete Department before moving to its Designations.

Both execution choices use the background worker. Run now is eligible at the
next poll; scheduled time is a not-before time, not a completion deadline.
There is **no automatic traffic measurement or low-traffic detector**. For off-peak
execution, let the user select a local time and convert it to UTC before sending.

## Endpoints: 8 per master, 32 bulk routes total

Bases: `/api/Department`, `/api/Designation`, `/api/Role`, `/api/EmployeeType`.
EmployeeType additionally has `/add`, `/get`, `/option` (35 current-phase routes including those three).
All routes require authentication and ModuleId + OperationId. Use real tenant-menu
IDs; operation IDs are not necessarily equal to operation-type enum values.
Mutations need an active Add or Import operation and its existing grant. Reads
also accept a granted View operation. Wrong-module and denied requests are rejected
by existing permission behaviors before the handler executes.

| Method | Suffix                    | Input                                  | Successful result                             |
| ------ | ------------------------- | -------------------------------------- | --------------------------------------------- |
| POST   | /bulk/preview             | multipart form                         | ApiResponse with saved preview                |
| POST   | /bulk/confirm             | JSON job request                       | ApiResponse with queued/current job           |
| GET    | /bulk/jobs/{jobId}        | permission query                       | ApiResponse with job and complete row results |
| GET    | /bulk/jobs                | permission query + pageNumber/pageSize | ApiResponse with newest-first summary array   |
| POST   | /bulk/retry               | JSON job request                       | ApiResponse with requeued job                 |
| POST   | /bulk/cancel              | JSON job request                       | ApiResponse with current/cancelled job        |
| GET    | /bulk/template            | permission query                       | Raw CSV header template                       |
| GET    | /bulk/jobs/{jobId}/report | permission query                       | Raw CSV row-result report                     |

Job access is scoped to **the same tenant and uploading actor**, not every HR user
in the tenant. A foreign/missing job returns 404. Detail/report use the route JobId.
History defaults to pageNumber=1/pageSize=20; pageSize must be 1-100. Its data is
an array with preview=null in each summary; no total-count pagination metadata
is supplied. Request subsequent pages until one is shorter than pageSize.

## Upload and mapping contract

| Preview form field    | Meaning                                                            |
| --------------------- | ------------------------------------------------------------------ |
| ModuleId, OperationId | Required existing permission identifiers                           |
| File                  | One .csv or .xlsx; supply File OR PastedText                       |
| PastedText            | Header plus comma/tab-delimited rows; alternative to File          |
| RequestId             | Optional client UUID; recommended for retrying an unchanged upload |
| SheetName             | Exact XLSX sheet name; required for multiple-sheet workbooks       |
| ColumnMappingJson     | JSON string mapping canonical target field to source header        |

The same RequestId with the same source bytes/text, sheet and mapping returns its
saved preview. Changed input with that ID returns 409. Use a new UUID when correcting
anything. Confirmation accepts no replacement rows. Plain JSON row-array ingestion
is not implemented; JSON is used for actions and the column mapping.

| Master       | Required columns                | Optional columns              |
| ------------ | ------------------------------- | ----------------------------- |
| Department   | DepartmentName                  | Description, Remark, IsActive |
| Designation  | DesignationName, DepartmentName | Description, IsActive         |
| Role         | RoleName, RoleType              | Remark, IsActive              |
| EmployeeType | TypeName                        | Description, Remark, IsActive |

IsActive accepts true/false; blank/absent means true. Department/Designation names
allow 255 characters, RoleName 100, Description 500 and Remark 200. For EmployeeType,
TypeName, Description and Remark each allow 255 characters. RoleType follows
existing ConstantValues: Admin=1, Employee=2, Manager=3. It is a type identifier,
not a grant of permissions. Arbitrary new RoleTypes cannot be imported.

Audit IDs, TenantId, primary keys and system-default flags are server-assigned;
do not expose them as mapped fields. Optional text may remain empty/null. This
master-import contract is separate from the earlier SQL module-seed request.

Limits: 5 MiB file, 25 MiB expanded XLSX, 5,000 data rows, 64 columns, 4,000
characters per cell, 1,000 ZIP entries. CSV must be valid UTF-8. Headers must exist
and be unique; row widths must agree. Formulas, merged cells, external worksheet
relationships and Excel error cells are rejected. Export formula results as
values first. Legacy .xls, macro workbooks, PDF and images are unsupported.

Names are trimmed/case-insensitive. Duplicate source identities invalidate all
involved rows. Inactive/ambiguous existing records are errors. Existing active
records are skipped even when optional descriptions differ; an existing Role with
a different RoleType is an error. Designation needs one active same-tenant parent.

Department sample:

```csv
DepartmentName,Description,Remark,IsActive
IT,Information technology,Initial import,true
HR,Human resources,Initial import,true
```

After those Departments exist, Designation sample:

```csv
DesignationName,DepartmentName,Description,IsActive
Manager,IT,IT team manager,true
Manager,HR,HR team manager,true
IT-Manager,IT,Technical operations,true
```

Role sample:

```csv
RoleName,RoleType,Remark,IsActive
Support Executive,2,Imported employee role,true
Area Manager,3,Imported manager role,true
```

For source headers Job Title, Dept, Enabled, ColumnMappingJson is:

```json
{ "DesignationName": "Job Title", "DepartmentName": "Dept", "IsActive": "Enabled" }
```

Unknown targets and reusing one source column for multiple targets are rejected.
Unmapped columns are ignored; make this visible in the UI. The saved preview includes
its mapping. The UI can load an older job and offer its mapping when the current
headers match. No separate mapping-profile endpoint or automatic cross-upload
mapping selection is implemented.

## Preview response and confirmation

Use the existing ApiResponse envelope: isSucceeded, message, data, errors and
optional metadata. Row-validation errors may be inside a successful preview;
inspect canCommit, not only HTTP status/isSucceeded. JSON enums are numeric.
Canonical dictionary keys retain their field spelling.

Illustrative preview (optional envelope metadata omitted):

```json
{
  "isSucceeded": true,
  "message": "Draft saved. Review and confirm to queue import. No master records have been created.",
  "errors": [],
  "data": {
    "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
    "master": 1,
    "sourceColumns": ["DepartmentName"],
    "columnMapping": { "DepartmentName": "DepartmentName" },
    "errors": [],
    "rows": [
      {
        "processed": false,
        "rowNumber": 2,
        "values": { "DepartmentName": "IT" },
        "status": 1,
        "existingId": null,
        "departmentId": null,
        "errors": []
      }
    ],
    "readyCount": 1,
    "existingCount": 0,
    "invalidCount": 0,
    "isValid": true,
    "confirmationAvailable": true,
    "canCommit": true
  }
}
```

Master enum: Department=1, Designation=2, Role=3, EmployeeType=4. A parsed invalid preview can
have JobId with canCommit=false. Parsing/mapping syntax errors may instead return
400 without a saved draft. Missing required mappings appear as preview errors.
An existing-only valid preview can be confirmed and finishes with skipped rows.

POST `/api/Department/bulk/confirm` (replace illustrative permission IDs from menu):

```json
{
  "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
  "moduleId": 25,
  "operationId": 1,
  "scheduledAtUtc": null
}
```

For later execution use a future ISO-8601 UTC timestamp; a past time returns 400.
Repeating Confirm on a non-draft returns its current state without changing the
schedule or creating another job. Retry accepts the same shape. Cancel needs only
jobId, moduleId and operationId.

## Progress, retry, cancellation and download

Job fields: jobId, master, status, createdAtUtc, updatedAtUtc, scheduledAtUtc,
totalRows, processedRows, createdCount, existingCount, failedCount, error, preview.
Detail/actions include preview/results; history contains summaries. Times are UTC.

| Job status          | Value | UI action                                              |
| ------------------- | ----- | ------------------------------------------------------ |
| Draft               | 1     | Review; confirm when canCommit; cancel                 |
| Queued              | 2     | Waiting for time/worker; poll or cancel                |
| Running             | 3     | Processing batches; poll or cancel                     |
| Completed           | 4     | Stop polling; show report/results                      |
| CompletedWithErrors | 5     | Stop polling; show failures; retry/new upload          |
| Failed              | 6     | Stop polling; show job error; resolve cause then retry |
| Cancelled           | 7     | Stop polling; show already committed records           |

Row status: Ready=1, Existing=2, Invalid=3, Created=4, Failed=5. The processed flag
distinguishes a preview match from a processed row. Job existingCount counts only
processed matches; preview existingCount also includes initial matches. Use
processedRows/totalRows for progress; failed attempts count as processed.

Retry is allowed only for Failed/CompletedWithErrors. It requeues the saved data
and refreshes the current actor's permission identifiers. Created rows are never
inserted again. Failed/pending rows are revalidated; progress may decrease as failed
rows reset for retry. If a matched Department was replaced after preview, create
a new preview to approve the new parent. Changed values require a new upload.

Cancel takes effect at a batch boundary. A currently locked batch may finish first;
committed rows remain. Cancel is not undo. Cancelled jobs cannot be retried; a new
preview will match/skip already created records.

Template/report routes return text/csv files, not ApiResponse JSON. Download as
Blob and handle JSON error responses through existing frontend error handling.
Report columns: RowNumber, Status (text), RecordId, Values (JSON cell), Errors.
All rows are included with CSV quoting and spreadsheet formula protection. The
report is for review; it is not directly re-importable as a template.

## Frontend request example

Use existing authentication/interceptors/error handling. Let the browser set the
multipart Content-Type boundary. This is contract pseudocode, not a frontend change.

```typescript
const base = '/api/Department';
const requestId = crypto.randomUUID(); // keep for retrying unchanged input
const form = new FormData();
form.append('ModuleId', String(moduleId));
form.append('OperationId', String(addOrImportOperationId));
form.append('RequestId', requestId);
form.append('File', selectedFile); // OR PastedText; never both
form.append('ColumnMappingJson', JSON.stringify({ DepartmentName: 'Dept' }));
// form.append('SheetName', selectedSheetName); // when applicable
const preview = await firstValueFrom(
  http.post<ApiResponse<BulkPreview>>(`${base}/bulk/preview`, form),
);

// Render preview/errors. Wait for explicit user confirmation.
// Only confirm when preview.data.canCommit is true.
const job = await firstValueFrom(
  http.post<ApiResponse<BulkJob>>(`${base}/bulk/confirm`, {
    jobId: preview.data.jobId,
    moduleId,
    operationId: addOrImportOperationId,
    scheduledAtUtc: selectedLocalDate ? selectedLocalDate.toISOString() : null,
  }),
);

const params = { moduleId, operationId: readOperationId };
// Poll until status is 4, 5, 6 or 7; unsubscribe on page close.
const progress = await firstValueFrom(
  http.get<ApiResponse<BulkJob>>(`${base}/bulk/jobs/${job.data.jobId}`, { params }),
);
const report = await firstValueFrom(
  http.get(`${base}/bulk/jobs/${job.data.jobId}/report`, {
    params,
    responseType: 'blob',
  }),
);
```

Build UI types from the DTO fields above. Refresh existing master `/get` and
`/option` endpoints with their current permissions and request contracts.

## Durable background configuration and deployment

Apply to the intended database, in order, before serving bulk routes:

1. `database-scripts/EnforceDesignationDepartmentScope.sql`
2. `database-scripts/AddDurableMasterBulkImport.sql`
3. `database-scripts/AddTenantEmployeeTypes.sql`
4. `database-scripts/SeedTenantEmployeeTypeModule.sql`

All four scripts are transactional and rerunnable. The first rejects missing/cross-tenant
Department references or duplicate scoped Designations. The second adds the durable
queue and live-name unique indexes for Department/Role. Conflicting existing data
requires explicit review; no silent merge/delete/reset occurs. Back up the intended
database and use `psql -v ON_ERROR_STOP=1 -f <script>` during deployment.

Deploy the updated API with its existing database connection configured securely.
The worker uses ConnectionStrings:DefaultConnection, the same database as the API.
No broker, separate scheduler or AI provider is required. Enable after migration:

```powershell
$env:BulkImport__WorkerEnabled = 'true'
$env:BulkImport__PollIntervalSeconds = '5'
$env:BulkImport__BatchSize = '50'
$env:BulkImport__BatchTimeoutSeconds = '60'
# Configure existing ConnectionStrings__DefaultConnection securely for this host.
```

| Setting             | Default                      | Range / effect                                                                          |
| ------------------- | ---------------------------- | --------------------------------------------------------------------------------------- |
| WorkerEnabled       | true in API appsettings.json | Enabled for local/production through inherited API configuration; can override to false |
| PollIntervalSeconds | 5                            | 1-300; one batch attempted per tick                                                     |
| BatchSize           | 50                           | 1-200 rows per transaction                                                              |
| BatchTimeoutSeconds | 60                           | 5-300; interrupted batch rolls back                                                     |

Settings are host-wide, validated at startup; restart after configuration changes.
Disabled workers leave jobs queued. Use an always-on API/service host: a sleeping
IIS application or scale-to-zero host cannot process until it wakes. Multiple
instances are supported using PostgreSQL FOR UPDATE SKIP LOCKED. No per-tenant
worker settings are implemented.

The axionpro.BulkImportJob table stores tenant/actor, permission identifiers,
source hash, normalized preview JSON, status, schedule, cursor and audit timestamps.
Raw workbooks are not retained. Drafts/history persist; automatic retention/purge
is not implemented.

Each batch locks a due job, rechecks permissions/current masters and commits master
inserts plus job progress in one transaction. Row savepoints isolate expected
constraint/reference failures. A tenant/master advisory lock serializes competing
imports; unique indexes also protect concurrent manual creation. A crash rolls back
the uncommitted batch and a new worker scope resumes from committed progress.
Designation parent references are rechecked/locked before insertion.

Expected row failures yield CompletedWithErrors; permission loss yields Failed.
Infrastructure errors/timeouts roll back, are logged and retry on the next poll.
**There is no retry-attempt ceiling, dead-letter queue or persisted infrastructure
error detail.** Persistent database/configuration errors can leave a job queued or
running with unchanged updatedAtUtc; operators must inspect worker logs and fix
the cause. Automated alerting/traffic-aware scheduling are not implemented.
Worker configuration is supplied in this API project. Development and Production
use their corresponding API connection settings. The migration runner has been
executed against the isolated test database only; no external production deployment
or production database mutation is claimed.

## Errors and frontend acceptance

Existing error envelope: 400 invalid input/schedule; 401 invalid login; 403 wrong
module/action or denied permission; 404 inaccessible job; 409 changed-source
RequestId reuse or ineligible Retry. Oversized requests can return server/proxy 413. Unexpected errors use existing middleware. Confirm HTTP 200 is not an all-rows
success signal.

Frontend acceptance after integration must cover upload/paste/manual mapping,
multi-sheet selection, disabled confirmation for invalid rows, same Manager in
different Departments, confirmation network retry, scheduling with UTC conversion,
page refresh/close, partial failure/retry/cancel/report, stale parents and denied
permissions. Those authenticated HTTP and Angular end-to-end checks remain PENDING.
Backend route contracts, permission behaviors, real database and hosted-worker
execution are covered by automation below.

## Implementation sequence and status

| Sequence | Work                                                                              | Status                                                 |
| -------- | --------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1        | Save user rules and continuing reference                                          | COMPLETE                                               |
| 2        | Inspect Department/Designation/Role ownership and flows                           | COMPLETE                                               |
| 3        | Department-scoped Designation validation and DB constraint                        | COMPLETE                                               |
| 4        | CSV/XLSX/paste, manual mapping and scoped preview                                 | COMPLETE                                               |
| 5        | Durable draft, RequestId replay and explicit confirmation                         | COMPLETE                                               |
| 6        | Run-now/scheduled worker, resume and permission recheck                           | COMPLETE                                               |
| 7        | Job history/detail, Retry, Cancel, templates and reports                          | COMPLETE                                               |
| 8        | Current backend automation and consolidated UI handoff                            | COMPLETE                                               |
| 9        | Angular screens and authenticated end-to-end acceptance                           | UI DEVELOPER RESPONSIBILITY — backend handoff complete |
| 10       | AI assistance                                                                     | DEFERRED — user explicitly disabled                    |
| 11       | Tenant-owned EmployeeType create/list/options, bulk, migration, onboarding        | COMPLETE                                               |
| 11a      | Environment-specific worker configuration, migration runner and release packaging | COMPLETE — tested with isolated database               |
| 12       | Applicable location/policy definitions and assignment flows                       | PENDING — verify dependencies/rules                    |
| 13       | Employee bulk preview/import using existing onboarding rules                      | PENDING                                                |
| 14       | Manager/role/policy assignments, invitations/device enrollment as applicable      | PENDING — verify module-specific rules                 |

Next backend work, after this phase, is the applicable location/policy dependency
analysis. Existing RoleType constants remain authoritative. Preserve the initial
employee/super-admin created by host tenant creation and self-registration; verify
duplicate/login/invitation rules before Employee import. Do not treat future
proposals or unresolved rules as authorization to invent new behavior.

### EmployeeType: approved ownership and implemented migration

User confirmed that each tenant creates EmployeeTypes according to its needs.
The application does not prepopulate all six global types for every tenant.

- Existing EmployeeType rows referenced by employees/history/policies are copied
  for their owning tenants and those references are remapped transactionally.
- Employee and old/new type-history references use Employee.TenantId; allowance
  mappings use Designation.TenantId; leave/unstructured mappings use their TenantId.
  Associated legacy menu rows are copied with the referenced types. Unresolvable
  or cross-tenant references fail the migration instead of being guessed.
- Legacy null-tenant catalogue rows remain only for bootstrap/history compatibility;
  tenant list/options/preview never expose them. Tenant-owned type names are unique
  after trim/case normalization. Database triggers reject cross-tenant assignments
  and moving a type's ownership.
- Existing super-admin onboarding is preserved using only one tenant-owned
  Permanent type. CreateTenant resolves its new ID instead of assigning shared ID=1.
  Other types are explicitly created/imported by the tenant. No custom type silently
  acquires permission grants or legacy menu assignments.
- `/api/EmployeeType/get` now reads the database instead of a hard-coded list.
  `/option` returns active, non-deleted types for the current tenant. Both now need
  ModuleId/OperationId; update existing employee/tenant form lookup calls accordingly.
- `/add` creates a type manually; the same eight bulk routes support larger lists.
  No EmployeeType update/delete endpoint is introduced in this creation/import phase.
- Existing Employee create/update handlers verify active same-tenant EmployeeType.
  Permission authorization stays in the existing pipeline. Database checks also
  cover old policy/reference writers during tenant-specific migration.
- Module code: TENANT_EMPLOYEE_TYPES, with existing Add/View/Import operations and
  Department-equivalent plan coverage. The seed does not insert role grants.
  Existing tenants use their established entitlement synchronization and role
  permission assignment flow. New onboarding uses the existing plan/module setup.
- RoleType is unchanged: Admin=1, Employee=2, Manager=3. There is no arbitrary
  RoleType bulk-creation endpoint.

## Automated validation record

Tests are in existing axionpro.automationtests/Unit: BulkImportPreviewTests,
BulkImportPermissionTests, DesignationDepartmentDatabaseTests and
DurableBulkImportDatabaseTests. Real database tests use an isolated workforce-backup
clone named axionpro_bulk_test, all four migrations/seeds, persisted permission checks and
existing AutoMapper. Coverage includes actual writes, separate worker scopes,
hosted-worker startup, parallel workers, confirmation replay, scheduled execution,
interrupted-transaction recovery, changed parents/permissions, retry and cancel.

```powershell
# Set AXIONPRO_BULK_TEST_CONNECTION to the isolated axionpro_bulk_test database.
dotnet test axionpro.automationtests/axionpro.automationtests.csproj --no-restore --disable-build-servers --filter 'Category=BulkImport|Category=BulkImportDatabase' --logger 'trx;LogFileName=bulk-import.trx' --results-directory artifacts/bulk-import
dotnet test axionpro.automationtests/axionpro.automationtests.csproj --no-build --no-restore --filter 'FullyQualifiedName~RecentDeviceEmployeeApiContractTests|FullyQualifiedName~TenantDeviceConfigurationPermissionBehaviorTests' --logger 'trx;LogFileName=bulk-regression.trx' --results-directory artifacts/bulk-import
dotnet build AxionPro.sln --no-restore --disable-build-servers
```

2026-09-10 final current-phase validation:

- **88 bulk tests passed, 0 failed, 0 skipped**, including tenant EmployeeType
  creation, isolation, duplicate handling, onboarding, cross-tenant DB rejection,
  durable import and environment-selected migration replay.
- **119 Device/Employee/permission regression tests passed**, no failures/skips.
- Release publish succeeded. All four SQL files and the migration runner are
  present in artifacts/publish/axionpro.api/database-scripts.
- The runner was also executed successfully from the published package using
  Production selection with the connection explicitly overridden to the isolated
  test database. Repeated migrations created no duplicate types/modules.
- Build/publish retain existing warnings. No external production database was
  modified and Angular UI end-to-end execution is owned by the UI integration phase.

Earlier baseline evidence (superseded by the expanded result above):

- Final expanded bulk suite: **71 passed, 0 failed, 0 skipped**, including template
  contracts, report escaping/formula protection and actor-scoped history.
- Device/Employee and permission regression suite: **119 passed, 0 failed, 0 skipped**.
- Both migrations successfully reapplied on the isolated database.
- Full solution build: **0 errors, 10 existing warnings** on the final incremental
  build (including existing dependency vulnerability warnings).
- Initial final-run attempt had 47 passes and 19 database failures because the
  isolated PostgreSQL service was stopped. Restarting it and rerunning produced
  a 66-pass result; five additional template/report/history checks then brought the
  suite to 71 passes. Infrastructure failures were not counted as passes.
- Results: artifacts/bulk-import/bulk-import.trx and bulk-regression.trx.
- Missing fixture configuration is explicitly skipped, never a pass. Durable tests
  clean their uniquely named committed jobs/records; designation tests roll back.
  No live production data was modified.

## Local and production deployment: same API project

WorkerEnabled=true is now supplied in axionpro.api/appsettings.json. Standard
ASP.NET Core configuration chooses appsettings.Development.json locally and
appsettings.Production.json in Production, with environment overrides taking
precedence. No separate background-service project or server is required.

The release includes these four SQL files and ApplyBulkImportMigrations.ps1 under
its database-scripts directory. The runner works from the repository and published
API output. PowerShell 7+ and PostgreSQL psql are required. It resolves the selected
API connection, including Development user secrets when running from the source
project and ConnectionStrings__DefaultConnection. For other custom configuration
providers, supply the same connection environment override to both runner and API.
It never prints passwords/connection strings; -ValidateOnly makes no DB connection.

Local sequence, from repository root:

```powershell
# Optional read-only configuration check:
pwsh -NoProfile -File database-scripts/ApplyBulkImportMigrations.ps1 -Environment Development -ValidateOnly
# Apply to the Development connection (or its explicit environment override):
pwsh -NoProfile -File database-scripts/ApplyBulkImportMigrations.ps1 -Environment Development -PsqlPath 'C:/Program Files/PostgreSQL/18/bin/psql.exe'
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project axionpro.api --no-launch-profile
```

Production release sequence:

```powershell
dotnet publish axionpro.api/axionpro.api.csproj -c Release -o artifacts/publish/axionpro.api
# Transfer the published release through the existing deployment process.
# On its host, from the published API directory with the intended connection configured:
pwsh -NoProfile -File database-scripts/ApplyBulkImportMigrations.ps1 -Environment Production -PsqlPath 'C:/Program Files/PostgreSQL/18/bin/psql.exe'
# Configure the existing IIS/service host environment as Production, then restart it.
```

Drain/stop the old API and its worker before the EmployeeType ownership migration,
then migrate and start the new version. The old version must not serve unscoped
EmployeeType lists or write shared IDs after the schema/data change. Do not start
the new API against an unmigrated schema. Migrations deliberately run
as a deployment command, not silently from API startup. Each SQL file is atomic;
if one fails, later files are not run. Earlier successful files remain applied and
are safe to rerun after correcting the reported problem. Take the normal database
backup before migration. Do not substitute the broad production module seed, which
contains unrelated reset operations.

For existing tenants, Host uses the existing POST
/api/Tenant/sync-active-plan-entitlements with its encrypted TenantId and current
Host permission context. Then grant TENANT_EMPLOYEE_TYPES through the existing
role-permission UI/API. This new seed creates module/operation/plan metadata only;
it does not bypass role authorization. Refresh login/menu/options after rollout,
particularly because old shared EmployeeType IDs have been remapped. A local or
production profile name in a test does not mean an external production DB was changed.

## Copyable request and response examples for every bulk action

The examples below show one-row Department imports. The same body/response shape
applies to Designation, Role and EmployeeType by changing the route base, master
value, input fields and actual module/operation IDs. The complete field contracts
and sample input for each master are above; EmployeeType examples follow below.
IDs and timestamps are illustrative, not deployment constants. Get/menu supplies
real permission IDs. Authentication is the existing Bearer/session mechanism.
Success messages for job actions are currently empty strings; show UI text based
on status instead of depending on a message string.

### 1. Preview: POST /api/Department/bulk/preview

Content-Type: multipart/form-data with browser-generated boundary. Example form:

```text
ModuleId: 25
OperationId: 1
RequestId: 974a3d15-a7a6-4969-a823-28709ec3a348
PastedText: DepartmentName
IT
```

PastedText contains a real newline. For Excel, replace PastedText with the File
binary field; optionally send SheetName and ColumnMappingJson. Never send both.
Response HTTP 200:

```json
{
  "isSucceeded": true,
  "message": "Draft saved. Review and confirm to queue import. No master records have been created.",
  "data": {
    "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
    "master": 1,
    "sourceColumns": ["DepartmentName"],
    "columnMapping": {
      "DepartmentName": "DepartmentName"
    },
    "errors": [],
    "rows": [
      {
        "processed": false,
        "rowNumber": 2,
        "values": {
          "DepartmentName": "IT"
        },
        "status": 1,
        "existingId": null,
        "departmentId": null,
        "errors": []
      }
    ],
    "readyCount": 1,
    "existingCount": 0,
    "invalidCount": 0,
    "isValid": true,
    "confirmationAvailable": true,
    "canCommit": true
  },
  "errors": []
}
```

### 2. Confirm: POST /api/Department/bulk/confirm

Content-Type: application/json. Run-now request:

```json
{
  "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
  "moduleId": 25,
  "operationId": 1,
  "scheduledAtUtc": null
}
```

For scheduling, change scheduledAtUtc to a future UTC value. On confirmation
response the server sets status=2; no master row has necessarily been committed:

```json
{
  "isSucceeded": true,
  "message": "",
  "data": {
    "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
    "master": 1,
    "status": 2,
    "createdAtUtc": "2026-09-10T10:00:00Z",
    "updatedAtUtc": "2026-09-10T10:01:00Z",
    "scheduledAtUtc": "2026-09-10T10:01:00Z",
    "totalRows": 1,
    "processedRows": 0,
    "createdCount": 0,
    "existingCount": 0,
    "failedCount": 0,
    "error": null,
    "preview": {
      "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
      "master": 1,
      "sourceColumns": ["DepartmentName"],
      "columnMapping": {
        "DepartmentName": "DepartmentName"
      },
      "errors": [],
      "rows": [
        {
          "processed": false,
          "rowNumber": 2,
          "values": {
            "DepartmentName": "IT"
          },
          "status": 1,
          "existingId": null,
          "departmentId": null,
          "errors": []
        }
      ],
      "readyCount": 1,
      "existingCount": 0,
      "invalidCount": 0,
      "isValid": true,
      "confirmationAvailable": false,
      "canCommit": false
    }
  },
  "errors": []
}
```

### 3. Progress/detail: GET /api/Department/bulk/jobs/{jobId}

```http
GET /api/Department/bulk/jobs/974a3d15-a7a6-4969-a823-28709ec3a348?moduleId=25&operationId=4
```

Example completed response, HTTP 200:

```json
{
  "isSucceeded": true,
  "message": "",
  "data": {
    "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
    "master": 1,
    "status": 4,
    "createdAtUtc": "2026-09-10T10:00:00Z",
    "updatedAtUtc": "2026-09-10T10:01:05Z",
    "scheduledAtUtc": "2026-09-10T10:01:00Z",
    "totalRows": 1,
    "processedRows": 1,
    "createdCount": 1,
    "existingCount": 0,
    "failedCount": 0,
    "error": null,
    "preview": {
      "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
      "master": 1,
      "sourceColumns": ["DepartmentName"],
      "columnMapping": {
        "DepartmentName": "DepartmentName"
      },
      "errors": [],
      "rows": [
        {
          "processed": true,
          "rowNumber": 2,
          "values": {
            "DepartmentName": "IT"
          },
          "status": 4,
          "existingId": 501,
          "departmentId": null,
          "errors": []
        }
      ],
      "readyCount": 0,
      "existingCount": 0,
      "invalidCount": 0,
      "isValid": true,
      "confirmationAvailable": false,
      "canCommit": false
    }
  },
  "errors": []
}
```

### 4. History: GET /api/Department/bulk/jobs

```http
GET /api/Department/bulk/jobs?moduleId=25&operationId=4&pageNumber=1&pageSize=20
```

Example HTTP 200 response. An empty history returns data: []:

```json
{
  "isSucceeded": true,
  "message": "",
  "data": [
    {
      "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
      "master": 1,
      "status": 4,
      "createdAtUtc": "2026-09-10T10:00:00Z",
      "updatedAtUtc": "2026-09-10T10:01:05Z",
      "scheduledAtUtc": "2026-09-10T10:01:00Z",
      "totalRows": 1,
      "processedRows": 1,
      "createdCount": 1,
      "existingCount": 0,
      "failedCount": 0,
      "error": null,
      "preview": null
    }
  ],
  "errors": []
}
```

### 5. Retry: POST /api/Department/bulk/retry

Only status 5 or 6 is eligible. After fixing the cause, send:

```json
{
  "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
  "moduleId": 25,
  "operationId": 1,
  "scheduledAtUtc": null
}
```

Example response for a previously failed one-row job requeued now. If earlier rows
were already Created, their statuses/IDs and createdCount remain present:

```json
{
  "isSucceeded": true,
  "message": "",
  "data": {
    "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
    "master": 1,
    "status": 2,
    "createdAtUtc": "2026-09-10T10:00:00Z",
    "updatedAtUtc": "2026-09-10T10:01:00Z",
    "scheduledAtUtc": "2026-09-10T10:01:00Z",
    "totalRows": 1,
    "processedRows": 0,
    "createdCount": 0,
    "existingCount": 0,
    "failedCount": 0,
    "error": null,
    "preview": {
      "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
      "master": 1,
      "sourceColumns": ["DepartmentName"],
      "columnMapping": {
        "DepartmentName": "DepartmentName"
      },
      "errors": [],
      "rows": [
        {
          "processed": false,
          "rowNumber": 2,
          "values": {
            "DepartmentName": "IT"
          },
          "status": 1,
          "existingId": null,
          "departmentId": null,
          "errors": []
        }
      ],
      "readyCount": 1,
      "existingCount": 0,
      "invalidCount": 0,
      "isValid": true,
      "confirmationAvailable": false,
      "canCommit": false
    }
  },
  "errors": []
}
```

### 6. Cancel: POST /api/Department/bulk/cancel

Request:

```json
{
  "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
  "moduleId": 25,
  "operationId": 1
}
```

Example response cancelling before the first batch. For a running job, committed
row counts can be non-zero and remain after cancellation:

```json
{
  "isSucceeded": true,
  "message": "",
  "data": {
    "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
    "master": 1,
    "status": 7,
    "createdAtUtc": "2026-09-10T10:00:00Z",
    "updatedAtUtc": "2026-09-10T10:01:00Z",
    "scheduledAtUtc": "2026-09-10T10:01:00Z",
    "totalRows": 1,
    "processedRows": 0,
    "createdCount": 0,
    "existingCount": 0,
    "failedCount": 0,
    "error": null,
    "preview": {
      "jobId": "974a3d15-a7a6-4969-a823-28709ec3a348",
      "master": 1,
      "sourceColumns": ["DepartmentName"],
      "columnMapping": {
        "DepartmentName": "DepartmentName"
      },
      "errors": [],
      "rows": [
        {
          "processed": false,
          "rowNumber": 2,
          "values": {
            "DepartmentName": "IT"
          },
          "status": 1,
          "existingId": null,
          "departmentId": null,
          "errors": []
        }
      ],
      "readyCount": 1,
      "existingCount": 0,
      "invalidCount": 0,
      "isValid": true,
      "confirmationAvailable": false,
      "canCommit": false
    }
  },
  "errors": []
}
```

### 7. Template: GET /api/Department/bulk/template

```http
GET /api/Department/bulk/template?moduleId=25&operationId=4
```

HTTP 200, Content-Type text/csv; charset=utf-8. Download name Department-template.csv:

```csv
DepartmentName,Description,Remark,IsActive
```

Designation template: DesignationName,DepartmentName,Description,IsActive.
Role template: RoleName,RoleType,Remark,IsActive.
EmployeeType template: TypeName,Description,Remark,IsActive.
The download contains headers only; use existing lookup APIs for reference values.

### 8. Report: GET /api/Department/bulk/jobs/{jobId}/report

```http
GET /api/Department/bulk/jobs/974a3d15-a7a6-4969-a823-28709ec3a348/report?moduleId=25&operationId=4
```

HTTP 200, Content-Type text/csv; charset=utf-8, UTF-8 BOM; download name
Department-import-974a3d15-a7a6-4969-a823-28709ec3a348.csv. Example body:

```csv
RowNumber,Status,RecordId,Values,Errors
2,Created,501,"{""DepartmentName"":""IT""}",""
```

### Invalid preview and corrections

A preview with row errors still returns isSucceeded=true if the preview was
successfully parsed/saved. For a blank required name, that row has status=3,
errors=["DepartmentName is required."], invalidCount=1, isValid=false and
canCommit=false. Display global data.errors and each row.errors separately.
A required parent mismatch in Designation identifies the source row and requires
creating/selecting an active Department before a NEW preview. Do not submit Confirm
and hope that invalid rows will be ignored.

A request-level 400/401/403/404/409 is different: use existing central error handling.
Do not parse it as a job or advance the wizard. Refresh authentication for 401;
check permissions for 403; reload/reselect a job for 404; new RequestId or eligible
job status is needed for 409. A failed background job is returned by successful
GET with job status=6 and job.error, not necessarily by an HTTP error.

## EmployeeType manual creation and bulk examples

Use the actual module ID whose code is TENANT_EMPLOYEE_TYPES. The examples use
moduleId=80 only as an illustration; never hard-code it. /get and /option now need
permission query parameters; UserEmployeeId/TenantId cannot select another tenant.

### POST /api/EmployeeType/add

Request:

```json
{
  "moduleId": 80,
  "operationId": 1,
  "typeName": "Seasonal",
  "description": "Seasonal workers",
  "remark": "Defined by tenant HR",
  "isActive": true
}
```

HTTP 200 response (the response DTO retains legacy BaseRequest fields; ignore its row-level paging/sort fields):

```json
{
  "isSucceeded": true,
  "message": "EmployeeType created.",
  "data": {
    "id": 601,
    "typeName": "Seasonal",
    "description": "Seasonal workers",
    "remark": "Defined by tenant HR",
    "isActive": true,
    "pageNumber": 0,
    "pageSize": 0,
    "sortBy": null,
    "sortOrder": "desc",
    "userEmployeeId": null
  },
  "errors": []
}
```

Duplicate active/non-deleted names in the same tenant return 409 (trim/case
insensitive); another tenant may use Seasonal independently. Inactive records
still reserve their names. This is Add, so View/Import alone cannot call /add;
bulk mutations accept granted Add or Import as described above.

### GET /api/EmployeeType/get

```http
GET /api/EmployeeType/get?moduleId=80&operationId=4&pageNumber=1&pageSize=20
```

HTTP 200 response includes inactive non-deleted records too. Use envelope paging:

```json
{
  "isSucceeded": true,
  "message": "Employee types fetched successfully.",
  "data": [
    {
      "id": 601,
      "typeName": "Seasonal",
      "description": "Seasonal workers",
      "remark": "Defined by tenant HR",
      "isActive": true,
      "pageNumber": 0,
      "pageSize": 0,
      "sortBy": null,
      "sortOrder": "desc",
      "userEmployeeId": null
    }
  ],
  "errors": [],
  "pageNumber": 1,
  "pageSize": 20,
  "totalRecords": 1,
  "totalPages": 1
}
```

### GET /api/EmployeeType/option

```http
GET /api/EmployeeType/option?moduleId=80&operationId=4
```

HTTP 200 response contains only active, non-deleted tenant types:

```json
{
  "isSucceeded": true,
  "message": "Employee types fetched successfully.",
  "data": [
    {
      "id": 601,
      "typeName": "Seasonal"
    }
  ],
  "errors": []
}
```

An empty options list is a successful data: []; show Create EmployeeType/import
when allowed, not a fake shared fallback list.

### POST /api/EmployeeType/bulk/preview

Multipart request:

```text
ModuleId: <TENANT_EMPLOYEE_TYPES module ID from menu>
OperationId: <granted Add or Import operation ID>
RequestId: <new UUID retained for unchanged-request network retry>
File: employee-types.xlsx (binary)
SheetName: EmployeeTypes
ColumnMappingJson: {"TypeName":"Employment category","Description":"Notes"}
```

Alternatively paste/use a CSV:

```csv
TypeName,Description,Remark,IsActive
Seasonal,Seasonal workers,HR-defined,true
Apprentice,Training programme,HR-defined,true
```

The preview response has master=4, values keys TypeName/Description/Remark/IsActive,
and the same saved-preview fields illustrated above. Existing Seasonal is status=2
with its ID; new Apprentice is status=1 with existingId=null. Duplicate uploaded
rows or invalid fields are status=3. Confirm that JobId using
/api/EmployeeType/bulk/confirm. Progress, history, retry, cancel, template and report
use /api/EmployeeType with the exact shared suffixes/contracts above.

On Department/Designation/Role screens, existing lookup refresh calls remain as
before. On Employee forms, load tenant EmployeeType options and submit their current
IDs; shared IDs from before migration must not remain in browser caches.

## Header-alias clarification and next target validation

User requested behavior confirmation/documentation before the next deployment
instruction. No actual target migration or API restart was executed in this review.
The full continuing validation matrix is now saved in
[automation README](../axionpro.automationtests/README.md#bulk-validation-checklist-read-before-every-bulk-import-session).
Read it in subsequent sessions alongside this document.

DesignationName, designation name and Designation_Name auto-map after header
normalization. DesName, design name and DesignationType require explicit manual
mapping, for example {"DesignationName":"DesName","DepartmentName":"Dept"}.
A source called DesignationType is not assumed to mean a designation name; inspect
its values before mapping. AI/semantic guessing remains disabled. Missing required
mapping prevents confirmation. Mapped names are checked against the tenant's active
Department and existing scoped Designations; existing matches are skipped.

Filename is not a module selector: any .xlsx/.csv name is allowed, while the endpoint
selects the master. Raw uploads are not saved as renamed documents; BulkImportJob
stores normalized rows, mappings and results. This handoff remains named
AI_ASSISTED_BULK_IMPORT_REFERENCE.md and test instructions remain in
axionpro.automationtests/README.md.

The new alias/canonical-header tests exercise CSV, XLSX and pasted tables against
controlled master fixtures. They do not substitute for the next authenticated
actual-target database and deployed-API acceptance run. Preview cannot guarantee
that no later concurrent change occurs; the worker revalidates, constraints protect
identities and row/job results expose conflicts.

2026-09-10 header clarification validation: **18 focused tests passed, 0 failed,
0 skipped** (3 custom aliases + 3 canonical spellings, each across CSV/XLSX/paste).
Custom aliases failed without mapping and matched the existing scoped Manager record
after explicit mapping; canonical headers auto-matched. Artifact:
artifacts/bulk-import/bulk-header-mapping.trx. Prior full backend result remains
88 bulk + 119 regression passes; that full suite was not rerun for this test/doc-only
change. Actual target migration/restart and authenticated acceptance remain pending.

### Target acceptance follow-up (2026-09-10)

- User authorized completing the current four-master scope, migration/restart,
  remaining tests and documentation before moving to another bulk module.
- User instructed that already tested cases must not be rerun. Existing TRX
  artifacts are retained as evidence; no previously passed suite was rerun.
- Development and Production migration-runner `-ValidateOnly` checks succeeded.
  Both resolve to the same remote Render database, `workforcedb_34hi_duis`.
  These checks do not connect to the database or apply migrations.
- Target acceptance is WIP, blocked on identifying the intended API URL/service
  host and authorized test tenant/account. No local dotnet/API/IIS worker process
  or AXIONPRO live-test environment settings were found in this session.
- Migration/restart approval is already granted; do not request it again.
  Resolve the target host/environment before backup, draining its worker,
  migration and restart. Authenticated upload/preview/confirm/report and persisted
  row verification remain PENDING, not passed. No target database was changed.

### Production execution (2026-09-10, supersedes the blocker above)

- Identified live API: https://axionpro-api.onrender.com. Render Production service:
  `srv-d6n5vpi4d50c73d9urn0`, repository `QuecksilberTechnologies/axionPro.be`,
  branch `main_branch`. User signed in to Render and authorized continuation.
- COMPLETE: PostgreSQL custom-format backup saved outside the repository at
  `C:/Users/qtech/AppData/Local/AxionPro/Backups/workforcedb-pre-bulk-20260910-205535.dump`
  (788002 bytes). Archive listing and full archive read succeeded; a database
  restore was not performed. SHA256:
  `E793375F4BD7A7A21BF300D6EC7C953A76E34ABB942DD4CDF93891F059D7D02C`.
- COMPLETE: read-only target preflight found zero missing/foreign Designation
  parents and zero duplicate identity groups for Designation, Department and Role.
- COMPLETE: Render displayed Suspended before migrations. All four scripts ran
  through the Production migration runner and committed successfully. EmployeeType
  migration updated two Employee references; no test bulk records were inserted.
- COMPLETE: post-migration reads confirmed BulkImportJob, EmployeeType.TenantId,
  zero cross-tenant Employee/EmployeeType references and zero bulk jobs.
- COMPLETE: service resumed and manual latest-commit deployment succeeded for
  `d2754cd984e8edf2570d310e556fda68a8eb7716`, deployment
  `dep-dahcpf7qj5pc73a6mu1g`. Render displayed `Deploy succeeded | Live`.
  Actual Swagger returned all 32 bulk routes (8 per master); runtime logs showed
  the worker polling BulkImportJob. No authenticated import was inferred from this.
  Render is a Free instance and can sleep when inactive; scheduled work requires
  the API to be awake. No paid-plan or billing change was made.
- PENDING: authenticated upload/preview/confirm/worker/report and DB-result checks.
  Active tenants are Quecksilber Technologies (8) and SkyFruit (9), each with one
  active login. Neither is assumed to be an authorized test tenant without an
  identified login/session. Render authentication does not authenticate a tenant.
- Previous 18 header, 88 bulk and 119 regression passes were not rerun.
