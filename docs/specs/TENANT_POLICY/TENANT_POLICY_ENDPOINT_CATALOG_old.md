# Tenant Policy endpoint catalogue

Base URL: `https://axionpro-api.onrender.com/api/TenantPolicy`

All endpoints require `Authorization: Bearer <tenant-access-token>`. Resolve
`moduleId` and `operationId` dynamically from the authenticated menu. IDs below
are illustrative. Every normal JSON response uses:

```json
{ "isSucceeded": true, "message": "...", "data": {}, "errors": [] }
```

The deployed commit `ddeb4d7e` exposes all 37 operations in Swagger. On
2026-09-16, route/authentication smoke returned 401 for 35 operations without a
token. The two multipart operations returned 415 when deliberately sent JSON.
This proves deployment and route/content-type registration; it is not an
authenticated business-flow pass.

## Lookups and policy types

### 1. GET `/lookups`

Input query:

```json
{ "moduleId": 101, "operationId": 4, "isActive": true }
```

Output sample:

```json
{ "isSucceeded": true, "message": "Policy lookups retrieved successfully.", "data": { "categories": [{ "id": 1, "code": "LEAVE", "name": "Leave" }], "statuses": [{ "id": 1, "code": "DRAFT", "name": "Draft" }], "ruleTypes": [{ "id": 2, "code": "ENTITLEMENT", "name": "Entitlement" }], "documentTypes": [{ "id": 1, "code": "POLICY", "name": "Policy Document" }] }, "errors": [] }
```

### 2. GET `/types`

Input query:

```json
{ "moduleId": 101, "operationId": 4, "isActive": true }
```

Output sample:

```json
{ "isSucceeded": true, "message": "Policy types retrieved successfully.", "data": [{ "id": 12, "code": "LEAVE", "name": "Leave Policy", "description": "Leave rules", "categoryId": 1, "currencyCode": "INR", "isActive": true }], "errors": [] }
```

### 3. POST `/types`

Input body:

```json
{ "moduleId": 101, "operationId": 1, "policyTypeCode": "LEAVE", "policyName": "Leave Policy", "description": "Leave and holiday rules", "policyCategoryId": 1, "defaultCurrencyCode": "INR" }
```

Output sample:

```json
{ "isSucceeded": true, "message": "Policy type created successfully.", "data": { "id": 12, "code": "LEAVE", "name": "Leave Policy", "description": "Leave and holiday rules", "categoryId": 1, "currencyCode": "INR", "isActive": true }, "errors": [] }
```

### 4. PUT `/types/{id}`

Input body (`id` comes from path):

```json
{ "moduleId": 101, "operationId": 2, "policyTypeCode": "LEAVE", "policyName": "Leave Policy", "description": "Updated description", "policyCategoryId": 1, "defaultCurrencyCode": "INR", "isActive": true }
```

Output: same `PolicyType` object as create, message `Policy type updated successfully.`

### 5. PATCH `/types/{id}/status`

```json
{ "moduleId": 101, "operationId": 9, "isActive": false }
```

```json
{ "isSucceeded": true, "message": "Policy type status updated successfully.", "data": true, "errors": [] }
```

## Policy definitions and versions

### 6. GET `/`

Input query:

```json
{ "moduleId": 102, "operationId": 4, "pageNumber": 1, "pageSize": 20, "policyTypeId": 12, "statusId": 1, "search": "leave" }
```

Output sample:

```json
{ "isSucceeded": true, "message": "Policies retrieved successfully.", "data": [{ "id": 42, "code": "MH-CASUAL-LEAVE", "name": "Maharashtra Casual Leave", "policyTypeId": 12, "isActive": true, "currentVersionId": 73, "versionNumber": 1, "status": "Draft" }], "errors": [], "pageNumber": 1, "pageSize": 20, "totalRecords": 1, "totalPages": 1 }
```

### 7. GET `/{id}`

```json
{ "moduleId": 102, "operationId": 4 }
```

```json
{ "isSucceeded": true, "message": "Policy retrieved successfully.", "data": { "id": 42, "code": "MH-CASUAL-LEAVE", "name": "Maharashtra Casual Leave", "summary": "Casual leave", "policyTypeId": 12, "ownerDepartmentId": 4, "defaultCurrencyCode": "INR", "versionId": 73, "versionNumber": 1, "statusId": 1, "status": "Draft", "effectiveFrom": "2027-01-01", "effectiveTo": null, "changeSummary": "Initial version", "rules": [{ "id": 81, "ruleTypeId": 2, "name": "Annual entitlement", "order": 1, "configuration": "{\"days\":12}" }], "applicability": [{ "id": 91, "mode": 1, "priority": 500, "countryId": 1, "stateId": 22, "districtId": null, "localityId": null, "tenantLocationId": 5, "employeeTypeId": 7, "departmentId": null, "designationId": null, "employeeId": null, "genderId": null, "workArrangementType": null, "employmentStatus": null, "minimumServiceDays": null, "effectiveFrom": "2027-01-01", "effectiveTo": null }] }, "errors": [] }
```

### 8. POST `/`

```json
{ "moduleId": 102, "operationId": 1, "policyTypeId": 12, "policyCode": "MH-CASUAL-LEAVE", "policyName": "Maharashtra Casual Leave", "summary": "Casual leave", "ownerDepartmentId": 4, "defaultCurrencyCode": "INR", "effectiveFrom": "2027-01-01", "effectiveTo": null, "changeSummary": "Initial version", "rules": [{ "policyRuleTypeId": 2, "ruleName": "Annual entitlement", "ruleOrder": 1, "ruleConfiguration": "{\"days\":12,\"unit\":\"DAY\"}" }], "applicability": [{ "applicabilityMode": 1, "countryId": 1, "stateId": 22, "tenantLocationId": 5, "employeeTypeId": 7, "priority": 500, "effectiveFrom": "2027-01-01", "effectiveTo": null }] }
```

Output: the complete Policy detail object shown for endpoint 7; message
`Policy draft created successfully.`

### 9. PUT `/{policyId}/versions/{versionId}`

Input: same fields as endpoint 8. Path supplies both IDs; body IDs are ignored.
Output: updated Policy detail; message `Policy draft updated successfully.`

### 10. POST `/{policyId}/versions/clone`

```json
{ "moduleId": 102, "operationId": 1, "sourceVersionId": 73, "effectiveFrom": "2028-01-01", "changeSummary": "2028 revision" }
```

Output: cloned Policy detail with next version in Draft; message
`Policy version cloned as draft.`

### 11. POST `/versions/{versionId}/transition`

```json
{ "moduleId": 105, "operationId": 20, "action": "SUBMIT", "comments": "Ready for review" }
```

Allowed action values: `SUBMIT`, `APPROVE`, `REJECT`, `PUBLISH`, `ARCHIVE`.
Output: updated Policy detail; message `Policy lifecycle action completed successfully.`

### 12. GET `/resolve`

```json
{ "moduleId": 102, "operationId": 4, "employeeId": 201, "effectiveDate": "2027-01-15" }
```

```json
{ "isSucceeded": true, "message": "Effective policies resolved successfully.", "data": [{ "policyId": 42, "policyVersionId": 73, "policyCode": "MH-CASUAL-LEAVE", "policyName": "Maharashtra Casual Leave", "priority": 500, "resolutionSource": "APPLICABILITY" }], "errors": [] }
```

## Assignments, exceptions and acknowledgements

### 13. POST `/assignments`

```json
{ "moduleId": 103, "operationId": 11, "policyVersionId": 73, "employeeIds": [201, 202], "effectiveFrom": "2027-01-01", "effectiveTo": null, "isMandatory": true }
```

```json
{ "isSucceeded": true, "message": "Policy assignments processed successfully.", "data": { "inserted": 2, "existing": 0 }, "errors": [] }
```

### 14. DELETE `/assignments/{assignmentId}`

```json
{ "moduleId": 103, "operationId": 12 }
```

```json
{ "isSucceeded": true, "message": "Policy assignment removed successfully.", "data": true, "errors": [] }
```

### 15. GET `/versions/{versionId}/assignments`

```json
{ "moduleId": 103, "operationId": 4 }
```

```json
{ "isSucceeded": true, "message": "Policy assignments retrieved successfully.", "data": [{ "id": 301, "policyVersionId": 73, "employeeId": 201, "assignmentSource": 1, "effectiveFrom": "2027-01-01", "effectiveTo": null, "isMandatory": true, "isActive": true }], "errors": [] }
```

### 16. POST `/exceptions`

```json
{ "moduleId": 104, "operationId": 1, "policyVersionId": 73, "employeeId": 201, "exceptionType": 1, "overrideConfiguration": "{\"allowRemoteAttendance\":true}", "reason": "Temporary medical accommodation", "effectiveFrom": "2027-02-01", "effectiveTo": "2027-02-28" }
```

```json
{ "isSucceeded": true, "message": "Policy exception submitted successfully.", "data": 401, "errors": [] }
```

### 17. POST `/exceptions/{exceptionId}/decision`

```json
{ "moduleId": 104, "operationId": 21, "approve": true }
```

```json
{ "isSucceeded": true, "message": "Policy exception decision saved successfully.", "data": true, "errors": [] }
```

### 18. GET `/versions/{versionId}/exceptions`

```json
{ "moduleId": 104, "operationId": 4 }
```

```json
{ "isSucceeded": true, "message": "Policy exceptions retrieved successfully.", "data": [{ "id": 401, "policyVersionId": 73, "employeeId": 201, "exceptionType": 1, "overrideConfiguration": "{\"allowRemoteAttendance\":true}", "reason": "Temporary medical accommodation", "effectiveFrom": "2027-02-01", "effectiveTo": "2027-02-28", "approvalStatusId": 2, "isActive": true }], "errors": [] }
```

### 19. POST `/acknowledgements`

```json
{ "moduleId": 106, "operationId": 30, "policyVersionId": 73, "evidenceJson": "{\"acceptedFrom\":\"WEB\"}" }
```

```json
{ "isSucceeded": true, "message": "Policy acknowledged successfully.", "data": true, "errors": [] }
```

### 20. GET `/versions/{versionId}/acknowledgements`

```json
{ "moduleId": 106, "operationId": 4 }
```

```json
{ "isSucceeded": true, "message": "Policy acknowledgements retrieved successfully.", "data": [{ "id": 501, "policyVersionId": 73, "employeeId": 201, "status": 3, "assignedDateTime": "2027-01-01T10:00:00Z", "viewedDateTime": "2027-01-02T10:00:00Z", "acknowledgedDateTime": "2027-01-02T10:05:00Z" }], "errors": [] }
```

## Documents and audit

### 21. POST `/documents`

Multipart input:

```text
moduleId=102
operationId=<Upload operation>
policyVersionId=73
policyDocumentTypeId=1
documentTitle=Maharashtra Leave Policy
languageCode=en
isEmployeeVisible=true
file=<PDF, DOC or DOCX; 1 byte–10 MB>
```

```json
{ "isSucceeded": true, "message": "Policy document uploaded successfully.", "data": { "id": 601, "policyVersionId": 73, "documentTypeId": 1, "title": "Maharashtra Leave Policy", "originalFileName": "leave-policy.pdf", "contentType": "application/pdf", "fileSizeBytes": 248320, "languageCode": "en", "isEmployeeVisible": true, "url": "https://temporary-object-url" }, "errors": [] }
```

### 22. GET `/versions/{versionId}/documents`

```json
{ "moduleId": 102, "operationId": 4 }
```

Output `data` is an array of the document object from endpoint 21.

### 23. DELETE `/documents/{documentId}`

```json
{ "moduleId": 102, "operationId": 3 }
```

```json
{ "isSucceeded": true, "message": "Policy document deleted successfully.", "data": true, "errors": [] }
```

### 24. GET `/{policyId}/audit`

```json
{ "moduleId": 107, "operationId": 4 }
```

```json
{ "isSucceeded": true, "message": "Policy audit retrieved successfully.", "data": [{ "id": 701, "policyId": 42, "policyVersionId": 73, "entityName": "Policy", "entityId": 42, "actionName": "CREATE", "beforeData": null, "afterData": "{}", "changedById": 1, "changedDateTime": "2027-01-01T10:00:00Z", "correlationId": null }], "errors": [] }
```

## Approval stages and progress

### 25. GET `/approval-stages`

```json
{ "moduleId": 105, "operationId": 4, "policyCategoryId": 1, "isActive": true }
```

```json
{ "isSucceeded": true, "message": "Policy approval stages retrieved successfully.", "data": [{ "id": 801, "policyCategoryId": 1, "stageName": "HR Review", "stageOrder": 1, "approverRoleId": 12, "minimumApprovals": 2, "isMandatory": true, "isActive": true }], "errors": [] }
```

### 26. POST `/approval-stages`

```json
{ "moduleId": 105, "operationId": 1, "policyCategoryId": 1, "stageName": "HR Review", "stageOrder": 1, "approverRoleId": 12, "minimumApprovals": 2, "isMandatory": true }
```

Output: approval-stage object from endpoint 25; message
`Policy approval stage created successfully.`

### 27. PUT `/approval-stages/{id}`

```json
{ "moduleId": 105, "operationId": 2, "policyCategoryId": 1, "stageName": "HR and Legal Review", "stageOrder": 1, "approverRoleId": 12, "minimumApprovals": 2, "isMandatory": true, "isActive": true }
```

Output: updated stage object; message `Policy approval stage updated successfully.`

### 28. DELETE `/approval-stages/{id}`

```json
{ "moduleId": 105, "operationId": 3 }
```

```json
{ "isSucceeded": true, "message": "Policy approval stage disabled successfully.", "data": true, "errors": [] }
```

### 29. GET `/versions/{versionId}/approval-progress`

```json
{ "moduleId": 105, "operationId": 4 }
```

```json
{ "isSucceeded": true, "message": "Policy approval progress retrieved successfully.", "data": [{ "stageId": 801, "stageName": "HR Review", "stageOrder": 1, "minimumApprovals": 2, "approvalCount": 1, "isComplete": false }], "errors": [] }
```

## Durable bulk endpoints

`{target}` is exactly `types`, `definitions`, or `assignments`. Types use Policy
Types ModuleId, definitions use Policy Definitions ModuleId, and assignments use
Policy Assignments ModuleId.

### 30. GET `/bulk/{target}/template`

```json
{ "moduleId": 101, "operationId": 4 }
```

Output is `text/csv`, for example:

```csv
PolicyTypeCode,PolicyName,PolicyCategoryCode,Description,DefaultCurrencyCode,IsActive
```

### 31. POST `/bulk/{target}/preview`

Multipart input:

```text
moduleId=<target leaf ModuleId>
operationId=<Import OperationId>
columnMappingJson={}    # optional target-field to source-header JSON
file=<CSV or XLSX>
pastedText=<tabular text> # optional alternative to file
sheetName=<sheet name>   # optional XLSX sheet selection
```

Output sample:

```json
{ "isSucceeded": true, "message": "Policy import preview saved successfully.", "data": { "jobId": "49f4d194-6df7-4147-9eb9-3f3d7cab13b3", "master": 12, "sourceColumns": ["PolicyTypeCode", "PolicyName", "PolicyCategoryCode"], "columnMapping": { "PolicyTypeCode": "PolicyTypeCode" }, "errors": [], "rows": [{ "rowNumber": 2, "status": 1, "existingId": null, "willReactivate": false, "errors": [] }] }, "errors": [] }
```

### 32. POST `/bulk/{target}/confirm`

```json
{ "moduleId": 101, "operationId": 13, "jobId": "49f4d194-6df7-4147-9eb9-3f3d7cab13b3" }
```

```json
{ "isSucceeded": true, "message": "Policy import action completed successfully.", "data": { "jobId": "49f4d194-6df7-4147-9eb9-3f3d7cab13b3", "status": 2, "statusName": "Queued", "totalRows": 1, "processedRows": 0 }, "errors": [] }
```

### 33. GET `/bulk/{target}/jobs/{jobId}`

```json
{ "moduleId": 101, "operationId": 4 }
```

Output: job object from endpoint 32 with current counts and row results.

### 34. GET `/bulk/{target}/jobs`

```json
{ "moduleId": 101, "operationId": 4, "pageNumber": 1, "pageSize": 20 }
```

Output: array/paged list of current tenant and target job objects.

### 35. POST `/bulk/{target}/retry`

```json
{ "moduleId": 101, "operationId": 13, "jobId": "49f4d194-6df7-4147-9eb9-3f3d7cab13b3" }
```

Output: new queued retry job object. Retry is valid only for retryable failed
rows and never edits the original report.

### 36. POST `/bulk/{target}/cancel`

```json
{ "moduleId": 101, "operationId": 13, "jobId": "49f4d194-6df7-4147-9eb9-3f3d7cab13b3" }
```

Output: Cancelled for Draft/Queued, or CancelRequested for Running. Terminal jobs
return a conflict/error and cannot be cancelled.

### 37. GET `/bulk/{target}/jobs/{jobId}/report`

```json
{ "moduleId": 101, "operationId": 4 }
```

Output is `text/csv`:

```csv
RowNumber,Status,Errors
2,Created,
```

## Common error samples

```json
{ "isSucceeded": false, "message": "Authentication is required.", "data": null, "errors": [], "errorCode": "UNAUTHORIZED" }
```

```json
{ "isSucceeded": false, "message": "You do not have permission to perform this action.", "data": null, "errors": [], "errorCode": "FORBIDDEN" }
```

```json
{ "isSucceeded": false, "message": "The selected module is not valid for this policy action.", "data": null, "errors": [], "errorCode": "FORBIDDEN" }
```

## Current verification status

- PASS: all 37 operations are deployed; authenticated route-ID binding now works.
- PASS: Policy Type CRUD/status; policy draft create/read/update; ordered
  submit/approve/publish; assignment/resolve; exception approval;
  acknowledgement; audit; clone; reject/resubmit/approve.
- PASS: Policy Type, Definition and Assignment durable imports have live target
  persistence evidence. A repeat assignment reports `Existing`.
- BLOCKED: document upload/list/delete. Render S3 rejects the configured access
  key before policy metadata is written. UI should show the API failure and must
  not claim the document was saved.
- FIXED LOCALLY, DEPLOYMENT PENDING: cancelling a terminal bulk job now returns
  conflict instead of successful no-op.
- PENDING: successful Retry path needs a genuine failed worker row.

Full evidence: [deployed real-data flow](../testing/policy/live-business-flow/2026-09-16.md)
and [bulk import](../testing/policy/bulk-import/2026-09-16.md).
