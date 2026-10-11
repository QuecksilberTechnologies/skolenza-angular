# Tenant Policy API flow — zero-level Hinglish guide

Ye document UI developer ko ye samjhane ke liye hai ki Tenant Policy ki kaunsi
API kis kaam ke liye hai aur normal business flow mein APIs kis order mein call
hongi. Exact request/response payloads ke liye
[Tenant Policy endpoint catalogue](TENANT_POLICY_ENDPOINT_CATALOG.md) dekhein.

## 1. Sabse pehle basic meaning

- **Policy Type** ek master/category hai, jaise Leave Policy ya Attendance Policy.
- **Policy** actual business policy hai, jaise Maharashtra Casual Leave.
- **Policy Version** us policy ka revision hai. Nayi policy ke saath Version 1
  Draft create hota hai.
- **Rule** batata hai employee ko kya entitlement/restriction milegi.
- **Applicability** batati hai policy kin employees, locations, departments ya
  doosre groups par apply hogi.
- **Approval Stage** batata hai publish karne se pehle kis role ki kitni approvals
  chahiye.
- **Resolve** kisi employee/date ke liye effective Published policies calculate
  karta hai. Ye assignment create nahi karta.
- **Assignment** Published version ko employee ko explicitly assign karta hai.
- **Acknowledgement** employee ke policy accept karne ka evidence hai.

Base route:

```text
/api/TenantPolicy
```

Har request ke saath valid tenant JWT bhejein:

```http
Authorization: Bearer <tenant-access-token>
```

`moduleId` aur `operationId` authenticated menu/permission response se dynamically
resolve karein. Documentation ke numeric IDs sirf examples hain; UI constants
mein hard-code na karein. API token se TenantId, current employee aur role nikalti
hai. UI `TenantId` ya `AddedById` na bheje.

## 2. Short answer: policy create se assignment tak exact order

Normal one-by-one happy path:

```text
Authenticated menu/permissions
  -> GET /lookups
  -> GET /types
  -> POST /types                         (sirf type missing ho to)
  -> GET /approval-stages
  -> POST /approval-stages               (sirf setup missing ho to)
  -> POST /                              (Policy + Version 1 Draft)
  -> GET /{policyId}                     (saved draft verify)
  -> PUT /{policyId}/versions/{versionId} (correction ho to)
  -> POST /documents                     (optional attachment)
  -> POST /versions/{versionId}/transition, action=SUBMIT
  -> GET /versions/{versionId}/approval-progress
  -> POST /versions/{versionId}/transition, action=APPROVE
     (required stages/approvers ke hisaab se repeat)
  -> POST /versions/{versionId}/transition, action=PUBLISH
  -> GET /resolve                        (employee/date par result check)
  -> POST /assignments                   (manual assignment required ho to)
  -> GET /versions/{versionId}/assignments
  -> POST /acknowledgements              (employee action)
  -> GET /versions/{versionId}/acknowledgements
  -> GET /{policyId}/audit
```

Mandatory lifecycle:

```text
Draft -> Under Review -> Approved -> Published -> Archived
                  \-> Rejected -> Under Review
```

Draft ko direct Publish nahi kar sakte. Manual assignment sirf Published version
par hoti hai.

## 3. Kaunsa module kis API group ke liye hai

Har leaf module ka apna `moduleId` use hoga. Ek leaf ka View/operation permission
doosre leaf par reuse nahi hoga.

| API group/action | Menu/permission leaf |
| --- | --- |
| Lookups aur Policy Type CRUD | Policy Types |
| Policy list, detail, create, update, clone, resolve, documents | Policy Definitions |
| `SUBMIT` transition | Policy Definitions |
| Approval stages, progress, `APPROVE`, `REJECT`, `PUBLISH`, `ARCHIVE` | Policy Approvals |
| Assignment create/remove/list | Policy Assignments |
| Exception create/decision/list | Policy Exceptions |
| Acknowledge/list | Policy Acknowledgements |
| Audit list | Policy Audit |

Invalid/expired token par `401`; valid token lekin required permission na hone par
`403`; invalid lifecycle transition par `409` milega.

## 4. Screen open aur master setup APIs

### 4.1 `GET /lookups`

**Kaam:** Policy form ke dropdowns ke liye categories, statuses, rule types aur
document types lana.

**Kab call karein:** Policy Type ya Policy Editor screen load par.

**Next:** `GET /types`.

### 4.2 `GET /types`

**Kaam:** Tenant ke active/inactive Policy Types lana.

**Kab call karein:** Policy Type list aur Policy Editor ke type dropdown mein.

**Next:** Required type mil gaya to policy create karein; nahi mila to
`POST /types`.

### 4.3 `POST /types`

**Kaam:** Leave, Attendance jaise Policy Type master ko create karna.

**Output ka use:** Response ka type `id`, `POST /api/TenantPolicy` ke
`policyTypeId` mein jayega.

### 4.4 `PUT /types/{id}`

**Kaam:** Existing Policy Type ka code/name/description/category/currency update
karna.

### 4.5 `PATCH /types/{id}/status`

**Kaam:** Policy Type ko active ya inactive karna. Ye actual Policy Version ko
publish/archive nahi karta.

## 5. Approval setup APIs

### 5.1 `GET /approval-stages`

**Kaam:** Global ya category-specific approval stages dekhna.

**Kab call karein:** Approval setup screen aur submit confirmation se pehle.

### 5.2 `POST /approval-stages`

**Kaam:** Approval stage banana, jaise HR Review ya Legal Review.

Important fields:

- `stageOrder`: stage kis order mein chalega.
- `approverRoleId`: kaunsa role approve kar sakta hai; `null` ho to endpoint ka
  Approve permission rakhne wala caller approve kar sakta hai.
- `minimumApprovals`: stage complete karne ke liye required approval count.
- `isMandatory`: stage required hai ya nahi.
- `policyCategoryId`: category-specific stage; `null` ka matlab tenant-wide stage.

### 5.3 `PUT /approval-stages/{id}`

**Kaam:** Stage ka name, order, role, minimum approvals ya active status update
karna.

### 5.4 `DELETE /approval-stages/{id}`

**Kaam:** Stage ko disable karna. Historical approval references preserve rehte
hain.

## 6. Policy Draft APIs

### 6.1 `POST /api/TenantPolicy`

**Kaam:** Ek transaction mein Policy identity, Version 1 Draft, rules aur
applicability create karna.

**Is response se save karein:**

- `id` = `policyId`
- `versionId` = current draft version ID
- `versionNumber`
- `status`

**Next:** `GET /{policyId}` se saved data verify karein.

Rules:

- Dates `yyyy-MM-dd` format mein hon.
- `ruleConfiguration` JSON object ki string ho; scalar/array accepted nahi hai.
- `applicabilityMode`: `1=Include`, `2=Exclude`.

### 6.2 `GET /api/TenantPolicy`

**Kaam:** Paged Policy list dikhana.

**Use:** Policy list/dashboard search, type/status filters aur pagination.

### 6.3 `GET /api/TenantPolicy/{id}`

**Kaam:** Ek Policy ki selected/current version, rules aur applicability lana.

**Use:** Editor, detail page, review page aur saved draft verification.

### 6.4 `PUT /{policyId}/versions/{versionId}`

**Kaam:** Editable Draft ki details, rules aur applicability atomically replace
karna.

**Important:** Ye Draft edit API hai. Published version immutable hai.

**Next:** Data ready ho to transition API se `SUBMIT`.

### 6.5 `POST /{policyId}/versions/clone`

**Kaam:** Existing version ko copy karke next version ka naya Draft banana.

**Kab use karein:** Published policy badalni ho. Published version ko direct edit
na karein.

Example flow:

```text
Published Version 1 -> Clone -> Draft Version 2 -> Submit -> Approve -> Publish
```

## 7. Documents APIs

### 7.1 `POST /documents`

**Kaam:** Draft Policy Version par PDF/DOC/DOCX document upload karna.

**Request:** `multipart/form-data`; maximum size 10 MB.

Fields: `moduleId`, `operationId`, `policyVersionId`, `policyDocumentTypeId`,
`documentTitle`, `languageCode`, `isEmployeeVisible`, `file`.

### 7.2 `GET /versions/{versionId}/documents`

**Kaam:** Version ke active documents aur temporary download URLs lana.

### 7.3 `DELETE /documents/{documentId}`

**Kaam:** Document metadata soft-delete aur stored object remove karna.

Published/Archived version documents immutable hain. Current deployed environment
mein successful document storage S3 access-key failure se blocked report hua hai;
UI failure ko saved state na dikhaye.

## 8. Lifecycle transition API

Sab lifecycle actions ek hi route se hote hain:

```http
POST /versions/{versionId}/transition
```

Body ka `action` decide karta hai kaam:

| Action | Kaam | Valid result |
| --- | --- | --- |
| `SUBMIT` | Draft/Rejected version review ke liye bhejna | Under Review |
| `APPROVE` | Current approval stage ki approval record karna | Next stage/Approved |
| `REJECT` | Current review cycle reject karna | Rejected |
| `PUBLISH` | Approved version ko effective/current banana | Published |
| `ARCHIVE` | Published version retire karna | Archived |

`SUBMIT` Policy Definitions module use karta hai. `APPROVE`, `REJECT`, `PUBLISH`
aur `ARCHIVE` Policy Approvals module use karte hain.

### Approval rules

- Mandatory stages order mein complete hote hain.
- Caller ko configured `approverRoleId` hold karna hoga.
- Same employee same stage ko do baar approve nahi kar sakta.
- `minimumApprovals` complete hone ke baad next stage aata hai.
- `REJECT` current cycle end karta hai; next `SUBMIT` fresh approval count start
  karta hai.
- Koi approval stage configured na ho to simple direct approval supported hai.
- Publish previous current version ka `IsCurrent` same transaction mein remove
  karta hai.

### `GET /versions/{versionId}/approval-progress`

**Kaam:** Har mandatory stage ka required count, current approval count aur
completion status dikhana.

**Kab call karein:** Approval inbox/detail open par aur har approve/reject ke baad.

## 9. Applicability aur Resolve

### `GET /resolve`

**Kaam:** Given `employeeId` aur `effectiveDate` par kaunsi Published policies
effective hain, calculate karna.

**Ye kya nahi karti:** Assignment row create nahi karti.

Resolution precedence:

```text
Manual assignment
  -> Employee
  -> Location/locality
  -> District
  -> State
  -> Country
  -> Employee type
  -> Department/designation
  -> Tenant default
```

Same specificity par lowest numeric priority wins; priority tie mein Exclude wins.
Response ka `resolutionSource` batata hai result manual assignment se aaya ya
applicability se.

## 10. Assignment APIs

### 10.1 `POST /assignments`

**Kaam:** Ek Published Policy Version ko one or more employees ko manually assign
karna.

**Kab call karein:** Publish ke baad, jab explicit employee assignment chahiye.

Behavior:

- Sirf Published version accepted hai.
- Same version + employee + start date repeat hone par duplicate nahi banta.
- Response `inserted` aur `existing` count deta hai.
- Removed matching assignment milne par woh reactivate hota hai.
- Missing acknowledgement row same transaction mein `Assigned` status se banti
  hai.

**Next:** `GET /versions/{versionId}/assignments` se verify karein.

### 10.2 `GET /versions/{versionId}/assignments`

**Kaam:** Version ki active aur removed assignment rows dikhana.

### 10.3 `DELETE /assignments/{assignmentId}`

**Kaam:** Assignment deactivate/remove karna. Policy ya history delete nahi hoti.

## 11. Exception APIs

Exception main create/publish/assign flow ka mandatory step nahi hai. Ye temporary
employee-specific override ke liye hai.

### `POST /exceptions`

**Kaam:** Employee ke liye exception request create karna. `overrideConfiguration`
JSON object ki string honi chahiye.

### `POST /exceptions/{exceptionId}/decision`

**Kaam:** Exception approve ya reject karna. Body ka `approve` true/false decision
batata hai.

### `GET /versions/{versionId}/exceptions`

**Kaam:** Version ki exceptions aur unke decision/status dikhana.

## 12. Acknowledgement APIs

### `POST /acknowledgements`

**Kaam:** Logged-in employee apni assigned policy acknowledge karta hai.

Rules:

- Active assignment required hai.
- Employee sirf apni acknowledgement kar sakta hai.
- Optional `evidenceJson` source/device jaise evidence rakh sakta hai.

### `GET /versions/{versionId}/acknowledgements`

**Kaam:** Assigned, viewed aur acknowledged date/time evidence dikhana.

## 13. Audit API

### `GET /{policyId}/audit`

**Kaam:** Newest-first immutable policy change evidence dikhana: action, before
data, after data, actor, date/time, entity aur version.

Policy Audit leaf ka apna View permission use karein.

## 14. Saari 37 APIs ka quick purpose catalogue

| # | Method aur route | Seedha purpose |
| --- | --- | --- |
| 1 | `GET /lookups` | Policy dropdown masters lana |
| 2 | `GET /types` | Policy Types list karna |
| 3 | `POST /types` | Policy Type banana |
| 4 | `PUT /types/{id}` | Policy Type update karna |
| 5 | `PATCH /types/{id}/status` | Policy Type active/inactive karna |
| 6 | `GET /` | Paged Policy list lana |
| 7 | `GET /{id}` | Policy/version/rules/applicability detail lana |
| 8 | `POST /` | Policy + Version 1 Draft create karna |
| 9 | `PUT /{policyId}/versions/{versionId}` | Editable Draft replace/update karna |
| 10 | `POST /{policyId}/versions/clone` | Existing version se next Draft banana |
| 11 | `POST /versions/{versionId}/transition` | Submit/Approve/Reject/Publish/Archive |
| 12 | `GET /resolve` | Employee/date ki effective policies calculate karna |
| 13 | `POST /assignments` | Published version manually assign karna |
| 14 | `DELETE /assignments/{assignmentId}` | Assignment deactivate karna |
| 15 | `GET /versions/{versionId}/assignments` | Version assignments list karna |
| 16 | `POST /exceptions` | Employee exception submit karna |
| 17 | `POST /exceptions/{exceptionId}/decision` | Exception approve/reject karna |
| 18 | `GET /versions/{versionId}/exceptions` | Exceptions aur decisions list karna |
| 19 | `POST /acknowledgements` | Employee policy acknowledge karna |
| 20 | `GET /versions/{versionId}/acknowledgements` | Acknowledgement evidence list karna |
| 21 | `POST /documents` | Policy document upload karna |
| 22 | `GET /versions/{versionId}/documents` | Version documents list karna |
| 23 | `DELETE /documents/{documentId}` | Document delete karna |
| 24 | `GET /{policyId}/audit` | Policy audit evidence lana |
| 25 | `GET /approval-stages` | Approval stages list karna |
| 26 | `POST /approval-stages` | Approval stage banana |
| 27 | `PUT /approval-stages/{id}` | Approval stage update karna |
| 28 | `DELETE /approval-stages/{id}` | Approval stage disable karna |
| 29 | `GET /versions/{versionId}/approval-progress` | Stage-wise approval progress lana |
| 30 | `GET /bulk/{target}/template` | Exact CSV headers/template download |
| 31 | `POST /bulk/{target}/preview` | CSV/XLSX validate karke Draft job banana |
| 32 | `POST /bulk/{target}/confirm` | Valid preview ko worker queue mein bhejna |
| 33 | `GET /bulk/{target}/jobs/{jobId}` | Ek bulk job ka progress poll karna |
| 34 | `GET /bulk/{target}/jobs` | Target ke tenant jobs list karna |
| 35 | `POST /bulk/{target}/retry` | Failed rows ka fresh retry job banana |
| 36 | `POST /bulk/{target}/cancel` | Draft/Queued cancel ya Running cancellation request |
| 37 | `GET /bulk/{target}/jobs/{jobId}/report` | Final row-wise CSV report download |

## 15. Bulk import flow

Allowed `{target}` values:

- `types`: Policy Type imports
- `definitions`: Policy + Version 1 Draft imports
- `assignments`: Published version assignment imports

Exact order:

```text
GET  /bulk/{target}/template
  -> POST /bulk/{target}/preview
  -> UI preview errors/duplicates dikhaye
  -> POST /bulk/{target}/confirm
  -> GET  /bulk/{target}/jobs/{jobId} repeatedly poll
  -> terminal status ke baad
  -> GET  /bulk/{target}/jobs/{jobId}/report
  -> retryable failed rows hon to POST /bulk/{target}/retry
```

Statuses:

```text
Draft, Queued, Running, Completed, CompletedWithErrors,
Failed, CancelRequested, Cancelled
```

Important:

- Preview database rows create hone ka proof nahi hai.
- Confirm sirf job queue karta hai; success tab maanein jab terminal job/report
  row result verify ho.
- Definition import Draft banata hai, auto-publish nahi karta.
- Assignment import sirf Published version accept karta hai.
- Assignment import missing Assigned acknowledgement bhi create karta hai.
- Retry original job/report ko edit nahi karta; fresh job banata hai.
- Running cancel next safe worker boundary par effect leta hai.

## 16. UI screen-to-API mapping

| UI screen | Main APIs |
| --- | --- |
| Policy Types | `GET/POST/PUT /types`, `PATCH /types/{id}/status`, `GET /lookups` |
| Policy List | `GET /` |
| Policy Editor | `GET /lookups`, `GET /types`, `POST /`, `GET /{id}`, `PUT /{policyId}/versions/{versionId}`, document APIs |
| Version History | `GET /{id}`, `POST /{policyId}/versions/clone` |
| Applicability Preview | `GET /resolve` |
| Approval Setup | Approval-stage CRUD APIs |
| Approval Inbox | Transition API + approval-progress API |
| Assignments | `POST /assignments`, assignment list/remove, assignment bulk APIs |
| Exceptions | Exception create/decision/list APIs |
| Acknowledgements | Acknowledge/list APIs |
| Audit | `GET /{policyId}/audit` |
| Bulk dialog | Template, preview, confirm, poll, retry, cancel, report APIs |

## 17. UI ko kaunse IDs sambhalne hain

- `policyTypeId`: Policy Type create/list response se.
- `policyId`: Policy create response ka `id`.
- `versionId`: Policy create/detail/clone response ka version ID.
- `assignmentId`: Assignment list response se remove ke liye.
- `exceptionId`: Exception create/list response se decision ke liye.
- `documentId`: Document upload/list response se delete ke liye.
- `jobId`: Bulk preview response se confirm/poll/retry/cancel/report ke liye.
- `moduleId`/`operationId`: Authenticated menu/permission response se; kabhi
  hard-code nahi karne.

## 18. Current verification status

- All 37 routes deployed Swagger mein exposed hain.
- Authenticated business flow Policy Type CRUD, Draft create/read/update,
  Submit/Approve/Publish, assignment/resolve, exception, acknowledgement, audit,
  clone aur reject/resubmit tak pass report hua hai.
- Policy Type, Definition aur Assignment bulk imports ke live persistence evidence
  available hain.
- Document success flow configured S3 access-key rejection ki wajah se blocked hai.
- Terminal bulk job cancellation fix local hai; deployment pending report hua hai.
- Successful Retry flow genuine failed worker row milne tak pending hai.

Detailed contracts aur evidence:

- [Tenant Policy API handoff](TENANT_POLICY_API.md)
- [Tenant Policy endpoint catalogue](TENANT_POLICY_ENDPOINT_CATALOG.md)
- [Tenant Policy UI planning](TENANT_POLICY_UI_PLANNING.md)
- [Deployed business-flow evidence](../testing/policy/live-business-flow/2026-09-16.md)
- [Bulk-import evidence](../testing/policy/bulk-import/2026-09-16.md)
