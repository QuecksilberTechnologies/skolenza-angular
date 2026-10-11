# Tenant Policy API handoff

For one-by-one request and response examples for all 37 operations, see
[TENANT_POLICY_ENDPOINT_CATALOG.md](TENANT_POLICY_ENDPOINT_CATALOG.md).
For the beginner-friendly business order and the purpose of each API, see
[TENANT_POLICY_API_FLOW_HINGLISH.md](TENANT_POLICY_API_FLOW_HINGLISH.md).

## Availability and authentication

The local API now exposes the generic policy foundation under `/api/TenantPolicy`.
Every request requires a valid tenant JWT. Every request also carries `moduleId`
and `operationId`; resolve those values from the authenticated menu/permission
response. Never hard-code the illustrative numeric values below. A valid user
without the requested operation receives 403. Invalid, expired, or stale
authentication receives 401.

The APIs derive `TenantId`, actor employee and role from the authenticated token.
The UI must not send TenantId or AddedById. All database reads and writes are
tenant-filtered.

Each endpoint group is bound to its seeded leaf module. A valid `View` grant from
Policy Types cannot be reused to read Policy Audit. Definitions, Assignments,
Exceptions, Approvals, Acknowledgements and Audit must each send the ModuleId
resolved for that exact leaf. `SUBMIT` uses Policy Definitions; `APPROVE`,
`REJECT`, `PUBLISH` and `ARCHIVE` use Policy Approvals.

## Endpoints

| Method | Route | Operation | Purpose |
| --- | --- | --- | --- |
| GET | `/api/TenantPolicy/lookups` | View | Categories, statuses, rule types and document types |
| GET | `/api/TenantPolicy/types` | View | Active/inactive tenant policy types |
| POST | `/api/TenantPolicy/types` | Add | Create policy type |
| PUT | `/api/TenantPolicy/types/{id}` | Update | Update policy type |
| PATCH | `/api/TenantPolicy/types/{id}/status` | Active/Inactive | Change policy type status |
| GET | `/api/TenantPolicy` | View | Paged policy list |
| GET | `/api/TenantPolicy/{id}` | View | Policy, selected version, rules and applicability |
| POST | `/api/TenantPolicy` | Add | Create policy and version 1 draft atomically |
| PUT | `/api/TenantPolicy/{policyId}/versions/{versionId}` | Update | Replace editable draft rules and applicability atomically |
| POST | `/api/TenantPolicy/{policyId}/versions/clone` | Add | Clone an existing version into the next draft |
| POST | `/api/TenantPolicy/versions/{versionId}/transition` | Submit/Approve/Reject/Publish/Archive | Lifecycle transition |
| GET | `/api/TenantPolicy/resolve` | View | Preview effective published policies for one employee |
| POST | `/api/TenantPolicy/assignments` | Assign | Idempotently assign a published version to employees |
| DELETE | `/api/TenantPolicy/assignments/{id}` | Remove | Deactivate an assignment |
| POST | `/api/TenantPolicy/exceptions` | Add | Submit an employee exception |
| POST | `/api/TenantPolicy/exceptions/{id}/decision` | Approve/Reject | Decide exception |
| POST | `/api/TenantPolicy/acknowledgements` | Acknowledge | Employee acknowledges an assigned policy |
| POST | `/api/TenantPolicy/documents` | Upload | Upload PDF/DOC/DOCX document as multipart form data |
| GET | `/api/TenantPolicy/versions/{versionId}/documents` | View | List active documents with temporary URLs |
| DELETE | `/api/TenantPolicy/documents/{documentId}` | Delete | Soft-delete metadata and remove stored object |
| GET | `/api/TenantPolicy/{policyId}/audit` | View | Read newest-first policy audit evidence |
| GET | `/api/TenantPolicy/approval-stages` | View | List global/category approval stages |
| POST | `/api/TenantPolicy/approval-stages` | Add | Create an approval stage |
| PUT | `/api/TenantPolicy/approval-stages/{id}` | Update | Update an approval stage |
| DELETE | `/api/TenantPolicy/approval-stages/{id}` | Delete | Disable an approval stage |
| GET | `/api/TenantPolicy/versions/{versionId}/approval-progress` | View | Counts and completion for mandatory stages |
| GET | `/api/TenantPolicy/versions/{versionId}/assignments` | View | List active and removed assignments |
| GET | `/api/TenantPolicy/versions/{versionId}/exceptions` | View | List policy exceptions and decisions |
| GET | `/api/TenantPolicy/versions/{versionId}/acknowledgements` | View | List assigned/viewed/acknowledged evidence |
| POST | `/api/TenantPolicy/bulk/{target}/preview` | Import | Upload CSV/XLSX and create an unconfirmed draft |
| POST | `/api/TenantPolicy/bulk/{target}/confirm` | Import | Queue a valid preview for the worker |
| GET | `/api/TenantPolicy/bulk/{target}/jobs/{jobId}` | View | Poll one job |
| GET | `/api/TenantPolicy/bulk/{target}/jobs` | View | List current-tenant jobs for this target |
| POST | `/api/TenantPolicy/bulk/{target}/retry` | Import | Retry failed rows through a fresh job |
| POST | `/api/TenantPolicy/bulk/{target}/cancel` | Import | Cancel or request cancellation |
| GET | `/api/TenantPolicy/bulk/{target}/template` | View | Download exact CSV headers |
| GET | `/api/TenantPolicy/bulk/{target}/jobs/{jobId}/report` | View | Download final row report |

## Complete create example

```json
{
  "moduleId": 101,
  "operationId": 1,
  "policyTypeId": 12,
  "policyCode": "MH-CASUAL-LEAVE",
  "policyName": "Maharashtra Casual Leave",
  "summary": "Casual leave for Maharashtra locations",
  "ownerDepartmentId": 4,
  "defaultCurrencyCode": "INR",
  "effectiveFrom": "2027-01-01",
  "effectiveTo": null,
  "changeSummary": "Initial version",
  "rules": [
    {
      "policyRuleTypeId": 2,
      "ruleName": "Annual entitlement",
      "ruleOrder": 1,
      "ruleConfiguration": "{\"days\":12,\"unit\":\"DAY\"}"
    },
    {
      "policyRuleTypeId": 5,
      "ruleName": "Sandwich rule",
      "ruleOrder": 2,
      "ruleConfiguration": "{\"includeWeeklyOff\":true,\"includeHoliday\":true}"
    }
  ],
  "applicability": [
    {
      "applicabilityMode": 1,
      "countryId": 1,
      "stateId": 22,
      "tenantLocationId": 5,
      "employeeTypeId": 7,
      "priority": 500,
      "effectiveFrom": "2027-01-01",
      "effectiveTo": null
    }
  ]
}
```

`ruleConfiguration` and exception `overrideConfiguration` are JSON object strings.
Arrays and scalar JSON values are rejected. Dates use ISO `yyyy-MM-dd`.
`applicabilityMode` is `1=Include`, `2=Exclude`. Manual assignment has highest
precedence. The API then selects the most specific match (employee,
location/locality, district, state, country, employee type,
department/designation, tenant default). At the same specificity, the lowest
numeric `priority` wins and exclusion wins a tie.

Representative success:

```json
{
  "isSucceeded": true,
  "message": "Policy draft created successfully.",
  "data": {
    "id": 42,
    "code": "MH-CASUAL-LEAVE",
    "name": "Maharashtra Casual Leave",
    "versionId": 73,
    "versionNumber": 1,
    "statusId": 1,
    "status": "Draft",
    "effectiveFrom": "2027-01-01",
    "rules": [],
    "applicability": []
  },
  "errors": []
}
```

## Lifecycle

Supported action strings are `SUBMIT`, `APPROVE`, `REJECT`, `PUBLISH`, and
`ARCHIVE`. The permitted transitions are Draft/Rejected → Under Review →
Approved → Published → Archived, with Under Review → Rejected. When mandatory
approval stages exist, each `APPROVE` records immutable stage history. The caller
must hold `approverRoleId`, the same employee cannot approve the stage twice, and
`minimumApprovals` is required before the next stage. `REJECT` ends the current
cycle; a later `SUBMIT` starts a fresh count after that rejection. With no configured
stage, one direct approval preserves the simple flow. Invalid transitions
return 409. Publishing makes that version current and removes `IsCurrent` from the
previous version in the same transaction. Published versions are immutable;
clone a version to edit it.

```json
{
  "moduleId": 105,
  "operationId": 28,
  "policyVersionId": 73,
  "action": "PUBLISH",
  "comments": "Approved by HR and Legal"
}
```

Approval-stage create example:

```json
{
  "moduleId": 105,
  "operationId": 1,
  "policyCategoryId": 1,
  "stageName": "HR Review",
  "stageOrder": 1,
  "approverRoleId": 12,
  "minimumApprovals": 2,
  "isMandatory": true
}
```

Set `policyCategoryId` to `null` for a tenant-wide stage. `approverRoleId=null`
allows any caller who already has the endpoint's Approve permission. Category and
role references are validated, stage order is unique within the same category,
and delete disables the stage to preserve historical foreign keys.

## Assignment and acknowledgement

```json
{
  "moduleId": 103,
  "operationId": 11,
  "policyVersionId": 73,
  "employeeIds": [201, 202],
  "effectiveFrom": "2027-01-01",
  "effectiveTo": null,
  "isMandatory": true
}
```

The response returns `inserted` and `existing`; retrying the same version,
employee and start-date does not create duplicates. A removed matching assignment
is reactivated instead of inserting a conflicting duplicate. Assignment also
creates missing acknowledgement rows with Assigned status in the same transaction.
Acknowledgement is allowed
only for the authenticated employee and only when an active assignment exists.

## Durable bulk import

Allowed `{target}` values are `types`, `definitions`, and `assignments`. Each
target uses the existing durable upload → preview → confirm → worker → report
pipeline. Resolve ModuleId from Policy Types, Policy Definitions, or Policy
Assignments respectively, and resolve Import/View OperationId from the current
authenticated menu. Never store numeric permission IDs in UI constants.

Preview uses multipart form data:

```text
file: <CSV or XLSX>
moduleId: <current leaf ModuleId>
operationId: <current Import OperationId>
mappingJson: {}                 # optional source-header mapping
```

Copyable template examples:

```csv
PolicyTypeCode,PolicyName,PolicyCategoryCode,Description,DefaultCurrencyCode,IsActive
LEAVE,Leave Policy,LEAVE,Leave and holiday rules,INR,true
```

```csv
PolicyCode,PolicyName,PolicyTypeCode,EffectiveFrom,EffectiveTo,Summary,DefaultCurrencyCode,RulesJson,ApplicabilityJson
MH-CASUAL-LEAVE,Maharashtra Casual Leave,LEAVE,2027-01-01,,Maharashtra permanent staff,INR,"[{""policyRuleTypeId"":2,""ruleName"":""Annual entitlement"",""ruleOrder"":1,""ruleConfiguration"":""{\""days\"":12,\""unit\"":\""DAY\""}""}]","[{""applicabilityMode"":1,""countryId"":1,""stateId"":22,""employeeTypeId"":7,""priority"":500,""effectiveFrom"":""2027-01-01"",""effectiveTo"":null}]"
```

```csv
PolicyCode,VersionNumber,EmployeeCode,EffectiveFrom,EffectiveTo,IsMandatory
MH-CASUAL-LEAVE,1,QT/2026/0201,2027-01-01,,true
```

JSON arrays inside CSV cells use doubled CSV quotes. Definition import creates
policy version 1 as Draft and never publishes automatically. Assignment import
accepts only a Published version and creates a missing Assigned acknowledgement
in the same transaction.

```json
{
  "moduleId": 103,
  "operationId": 13,
  "jobId": "49f4d194-6df7-4147-9eb9-3f3d7cab13b3"
}
```

Use that body for confirm, retry, or cancel as applicable. Poll until terminal.
Statuses are Draft, Queued, Running, Completed, CompletedWithErrors, Failed,
CancelRequested, and Cancelled. Draft/Queued jobs cancel immediately. A Running
job stops at the worker's next safe boundary. Terminal jobs cannot be cancelled.
After a terminal status, download the report and show each row's Created,
Existing, Failed, or reactivated result; confirm alone does not mean rows exist.

Preview checks required fields, ISO dates, booleans, JSON shape, active rule
types, tenant ownership, geography hierarchy, duplicate source rows and existing
records. The worker repeats validation immediately before each row write.
Existing definitions and assignments are skipped. An inactive, non-deleted
Policy Type is reactivated only when CSV `IsActive=true`.

## Persistence and current limits

Data remains until explicitly archived, deactivated or soft-deleted according to
the relevant endpoint. Policy identity is in `Policy`; versions in `PolicyVersion`;
rules and targeting in `PolicyRule` and `PolicyApplicability`; operational records
in `PolicyAssignment`, `PolicyException`, `PolicyAcknowledgement`; immutable
change evidence in `PolicyChangeAudit`.

Document upload uses multipart/form-data fields `moduleId`, `operationId`,
`policyVersionId`, `policyDocumentTypeId`, `documentTitle`, `languageCode`,
`isEmployeeVisible`, and `file`. Maximum size is 10 MB and allowed extensions are
PDF, DOC, and DOCX. The API calculates SHA-256, stores the object, persists only
the object key, and returns a temporary URL. Published/archived version documents
are immutable.

Local implementation includes every endpoint group listed above, including
approval-stage administration, progress and durable CSV/XLSX policy bulk upload.
Compilation and focused contract/regression tests pass. PostgreSQL bulk lifecycle
testing and deployed authenticated acceptance remain unverified because no policy
test database connection was configured in this session; UI release must wait for
those checks.

## Error examples

```json
{ "isSucceeded": false, "message": "The selected module is not a policy module.", "data": null, "errors": [], "errorCode": "FORBIDDEN" }
```

```json
{ "isSucceeded": false, "message": "Action PUBLISH is invalid for the current policy status.", "data": null, "errors": [], "errorCode": "CONFLICT" }
```
