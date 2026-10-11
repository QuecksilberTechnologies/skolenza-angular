# Bulk upload scenario guide — UI developer

Current implementation verified: 11 September 2026. Examples explanatory hain;
names/IDs ko apne logged-in tenant ke actual values se replace karein.
Base URL: `https://axionpro-api.onrender.com`.
Swagger: `/swagger/index.html`. Har protected call mein existing login ka
`Authorization: Bearer <access-token>` header lagega.

## 1. User ko format aur API kaise pata chalegi?

User module select karega → template download → file/paste → preview → approval
→ confirm → progress → final report. Department pehle import karein, phir uski
Designation; Employee se pehle required masters aur employee-code pattern ready hon.

| User selection | API base (`{base}` below) | Required data columns           | Optional columns              |
| -------------- | ------------------------- | ------------------------------- | ----------------------------- |
| Department     | `/api/Department`         | DepartmentName                  | Description, Remark, IsActive |
| Designation    | `/api/Designation`        | DesignationName, DepartmentName | Description, IsActive         |
| Role           | `/api/Role`               | RoleName, RoleType              | Remark, IsActive              |
| EmployeeType   | `/api/EmployeeType`       | TypeName                        | Description, Remark, IsActive |
| Employee       | `/api/Employee`           | See section 3                   | See section 3                 |

`GET /api/Navigation/my-menu` se selected module aur allowed operation IDs lein.
Preview/confirm/retry/cancel ko granted **Add or Import** chahiye; reads/template
ko View bhi allowed hai. Employee module `EMP_LIST` hai. IDs frontend mein tenant
independent constants na banayein. Missing entitlement/grant par existing permission
flow se access enable hoga; import permissions bypass nahi karta.

**Template API:** `GET {base}/bulk/template?ModuleId=<module>&OperationId=<read-operation>`.
Result downloadable CSV header hai; required/optional annotations ya reference-ID
catalog nahi. Required rules is guide mein hain; actual values existing master/lookup
APIs se lein, aur preview validation authoritative hai. Existing Excel templates
isi folder mein hain; Employee workbook mein `SheetName=Employees` bhejein.

## 2. Har master ka input aur result example

CSV ka first row header hoga. Yehi table Excel cells mein ya CSV/tab-separated
paste mein de sakte hain. Assume example names tenant mein pehle exist nahi karte.

**Department:** `/api/Department/bulk/preview`

```csv
DepartmentName,Description,Remark,IsActive
Engineering,Product development,Head office,true
```

Preview: Ready. Confirm + worker: `axionpro.Department` mein Engineering insert.
Same existing name dobara upload: Existing/skip; Description overwrite nahi hogi.

**Designation:** `/api/Designation/bulk/preview`

```csv
DesignationName,DepartmentName,Description,IsActive
Developer,Engineering,Software developer,true
```

Engineering isi tenant mein exactly one active Department hona chahiye. Worker
`axionpro.Designation` mein uska DepartmentId resolve karke insert karega.
Parent missing/inactive ho to preview invalid; pehle Department correct karein.

**Role:** `/api/Role/bulk/preview`

```csv
RoleName,RoleType,Remark,IsActive
Project Member,2,Project employee role,true
```

RoleType: Admin=1, Employee=2, Manager=3. Worker `axionpro.Role` mein row banayega.
Role import permission grants assign nahi karta. Existing same name ka different
RoleType ho to error; role ko silently change nahi karega.

**EmployeeType:** `/api/EmployeeType/bulk/preview`

```csv
TypeName,Description,Remark,IsActive
Contractor,Contract staff,Project based,true
```

Worker `axionpro.EmployeeType` mein insert karega. Existing Contractor skip hoga.
EmployeeType CRUD aur my-menu grants existing permission flow ke through hain.

Master IsActive optional hai; supplied value `true`/`false` rakhein (default true).
Name limit Role 100 characters; other three 255. Description limit Department/
Designation 500, EmployeeType 255. Remark Department/Role 200, EmployeeType 255.
Duplicate input rows invalid hain; existing DB match ka matlab overwrite nahi.

## 3. Employee input example

**Mandatory 12 columns:** FirstName, LastName, OfficialEmail, DateOfBirth,
DateOfOnBoarding, GenderId, CountryId, DepartmentId, DesignationId, EmployeeTypeId,
HasPermanent, IsActive.

**Optional:** EmployeeCode, RoleId, MiddleName, MobileNumber, ContactName,
ContactNumber, AlternateNumber, ContactEmail, ContactCountryId, StateId,
DistrictId, HouseNo, Street, LandMark, Address.
Any contact/address value dene par **ContactNumber mandatory** ho jata hai.

```csv
EmployeeCode,FirstName,LastName,OfficialEmail,DateOfBirth,DateOfOnBoarding,GenderId,CountryId,DepartmentId,DesignationId,EmployeeTypeId,RoleId,HasPermanent,IsActive,MobileNumber,ContactNumber,Address
QT/2026/0145,Asha,Sharma,asha@example.invalid,1995-04-12,2026-07-24,1,1,6,6,7,24,true,true,9876543210,9876543210,"House 12, Main Road"
```

IDs illustrative hain: active same-tenant Department/Designation/EmployeeType/Role
select karein; Designation selected Department ki honi chahiye. Gender/Country aur
optional location IDs lookup se lein. RoleId blank ho to existing Employee-role
default use hota hai. Import arbitrary extra columns ko employee-related tables
mein auto-save nahi karta; supported 27 fields hi use karein.

Dates CSV mein `yyyy-MM-dd`, boolean `true`/`false`; `24/07/2018` ki jagah
`2018-07-24` dein. Excel numeric dates supported hain. Codes/phones Excel mein Text
rakhein taaki leading zero na mite. MobileNumber Employee mein; supplied primary
personal contact/address EmployeeContact mein jata hai.

Matching supplied code preserve hota hai; missing/nonmatching code ka proposed code
preview mein dikhta hai. Year/month original joining date se aata hai. Preserved
sequences 0145 aur 0200 hon to next generated number 0201. Existing accounts skip
hote hain, overwrite/reactivate nahi. Confirm sequence reserve karta hai; cancellation
se numbering gaps reh sakte hain. Capacity mein initial Admin aur suspended,
non-soft-deleted employees bhi count hote hain.

## 4. Exact API sequence — sabhi five modules ke liye

Neeche Department example mein ModuleId=25, Add=1, View=4 **observed test-tenant
values** hain. Har selected module ke actual grants use karein.

### A. Upload / paste and preview

`POST /api/Department/bulk/preview`, body **multipart/form-data**:

| Property           | Required?                          | Example / rule                                                             |
| ------------------ | ---------------------------------- | -------------------------------------------------------------------------- |
| ModuleId           | Yes                                | 25                                                                         |
| OperationId        | Yes                                | 1 (granted Add/Import)                                                     |
| File OR PastedText | Exactly one                        | File: `01-department.xlsx`; paste: CSV including header                    |
| SheetName          | For multi-sheet XLSX               | `Department`; Employee sample: `Employees`                                 |
| ColumnMappingJson  | When headers need explicit mapping | `{"DepartmentName":"Dept"}` (target → source)                              |
| RequestId          | Optional, recommended UUID         | Same UUID only for exact unchanged request; corrected input needs new UUID |

Browser FormData ko multipart boundary khud set karne dein. File and PastedText
dono mat bhejein. Accepted upload `.xlsx`/UTF-8 `.csv`; paste comma/tab delimited.
Limits: 5 MB source, 25 MB expanded XLSX, 5,000 data rows, 64 columns, 4,000
characters per cell; field-specific limits additionally apply. CSV comma-containing
address quotes mein rakhein. AI mapping disabled hai; unknown meanings guess nahi honge.

Illustrative response `data` excerpt:

```json
{
  "jobId": "11111111-1111-4111-8111-111111111111",
  "readyCount": 1,
  "existingCount": 0,
  "invalidCount": 0,
  "errors": [],
  "confirmationAvailable": true,
  "canCommit": true
}
```

Actual response ke `sourceColumns`, `columnMapping`, `rows`, row errors aur Employee
`proposedEmployeeCode` bhi UI dikhaye. Preview successful HTTP response ke andar
invalid data ho sakta hai: Confirm sirf `data.canCommit === true` par enable karein.
Draft DB mein save hota hai; abhi business/master records insert nahi hue.
Example: Dept header map missing → mapping correct karke new RequestId se preview.

### B. User approval → confirm

`POST /api/Department/bulk/confirm`, JSON:

```json
{
  "moduleId": 25,
  "operationId": 1,
  "jobId": "11111111-1111-4111-8111-111111111111"
}
```

These three properties required hain. Optional `scheduledAtUtc` future UTC ISO
timestamp hai, e.g. `2026-12-01T10:00:00Z` if still future when called; omit to run
now. Confirm replacement rows accept nahi karta. Result normally Queued hai,
**insertion finished nahi**. Repeated confirm existing job status return karta hai;
Cancelled/completed job ko restart nahi karta. Employee stale pattern/counter or
conflict par 409 aaye to fresh preview aur fresh user approval chahiye.

### C. Progress / history

`GET /api/Department/bulk/jobs/11111111-1111-4111-8111-111111111111?ModuleId=25&OperationId=4`

UI every 2–5 seconds poll kar sakti hai. Worker permissions, references aur conflicts
dobara check karke batches insert karta hai. Schedule earliest eligible time hai;
worker availability/Render sleep ke karan exact finish time guaranteed nahi.

Illustrative completed response `data` excerpt:

```json
{
  "status": 4,
  "totalRows": 1,
  "processedRows": 1,
  "createdCount": 1,
  "existingCount": 0,
  "failedCount": 0
}
```

| Job status            | Meaning / UI action                                    |
| --------------------- | ------------------------------------------------------ |
| 1 Draft               | Waiting for approval                                   |
| 2 Queued              | Waiting for worker/schedule                            |
| 3 Running             | Processing; continue polling                           |
| 4 Completed           | Finished successfully; rows can be Created or Existing |
| 5 CompletedWithErrors | Finished with row failures; show report/retry          |
| 6 Failed              | Job failed; show error and report/retry                |
| 7 Cancelled           | Stopped; show partial results if any                   |

Stop polling on **4/5/6/7**; only HTTP 200 or processed count se completion infer
mat karein. Row statuses separately: Ready=1, Existing=2, Invalid=3, Created=4,
Failed=5. Example: replay completes with createdCount=0, existingCount=1; valid success.

History: `GET {base}/bulk/jobs?ModuleId=25&OperationId=4&PageNumber=1&PageSize=20`.
PageNumber >=1, PageSize 1–100. Jobs are scoped to **same tenant AND creating user**;
dusre admin ke jobs automatically visible nahi. Screen close/reopen se job cancel nahi hoti.

### D. Final report and retry

`GET {base}/bulk/jobs/{jobId}/report?ModuleId=25&OperationId=4` returns CSV file,
not JSON. Columns: RowNumber, Status, RecordId, Values, Errors; Employee adds
ProposedEmployeeCode, InvitationStatus, InvitationError. Employee internal IDs are
hidden; code/email se authorized DB reconciliation karein. Final status ke baad
download karein; earlier report current progress snapshot hai.

Example: 3 rows → 1 Created, 1 Existing, 1 Failed. Created row destination table mein
hai, Existing unchanged hai, Failed row ka error report mein hai. Source row number
se user original spreadsheet locate karega.

`POST {base}/bulk/retry` takes same JSON properties as confirm, optional future
ScheduledAtUtc. Only Failed/CompletedWithErrors jobs eligible. Created rows dobara
insert nahi hote; failed/incomplete work retry hota hai. Corrected cell data bhejna
ho to file correct karke **new preview/job** banayein; retry old saved data use karta hai.

## 5. Cancellation: kis API ke baad mana hai?

`POST {base}/bulk/cancel` with required ModuleId, OperationId, JobId (same JSON
shape as confirm). **Confirm cancellation cutoff nahi hai.**

| Current stage                            | Cancel behavior                 | Data impact                                               |
| ---------------------------------------- | ------------------------------- | --------------------------------------------------------- |
| Before preview                           | UI selection clear karein       | Server draft not created yet                              |
| Draft                                    | Cancel allowed                  | No business inserts; saved job becomes Cancelled          |
| Queued / future schedule                 | Cancel allowed                  | Remaining work stops if worker has not already progressed |
| Running                                  | Cancel at batch boundary        | Already committed rows remain; current batch may finish   |
| Completed / CompletedWithErrors / Failed | Cancel no longer changes status | Completed inserts remain; no rollback                     |
| Cancelled                                | No further change               | Cannot confirm/retry to resume; new preview required      |

Example: running job mein 100 records already committed hain. User Cancel clicks;
active batch lock release hone tak request wait kar sakti hai, aur aur rows commit
ho sakti hain. Cancelled response milne par remaining processing stops; committed
records delete nahi hote. Agar worker pehle finish ho gaya, response Completed bhi
ho sakta hai. **Returned status check karein; HTTP success ko cancellation success
mat samjhein.** No bulk undo/delete endpoint exists for imported records.

## 6. Data kahan aur kab tak rahega?

| Stage/data                                            | Storage                                                                                                   | Lifetime / cancellation effect                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Uploaded file parsing                                 | Request memory                                                                                            | Original XLSX/CSV file bulk workflow disk/DB mein archive nahi karta                   |
| Saved preview and results                             | `axionpro.BulkImportJob`: PreviewJson, InputHash, owner, status/counters                                  | Parsed row values/errors retained; no implemented TTL/automatic purge                  |
| Confirmed queue                                       | Same BulkImportJob row                                                                                    | Schedule/progress persists across API restarts; available worker resumes eligible work |
| Department / Designation / Role / EmployeeType insert | Respective `axionpro.Department`, `Designation`, `Role`, `EmployeeType`                                   | Normal business records; no bulk expiry; cancellation does not remove them             |
| Employee successful row                               | `axionpro.Employee`, `LoginCredential`, `UserRole`, `EmployeeImage`; supplied contact → `EmployeeContact` | Related creation atomic per row; no bulk expiry; normal existing lifecycle applies     |
| Employee approved numbering                           | `axionpro.EmployeeCodePattern` counter, approved codes in job preview                                     | Confirm reserves numbers; cancellation does not recycle them                           |
| Cancelled/failed/completed job                        | BulkImportJob remains                                                                                     | Status change is not deletion; source personal data remains in PreviewJson             |
| Downloaded report                                     | Generated from saved job; downloaded copy on user's device                                                | Server job retained as above; local copy user manages                                  |

There is currently **no fixed “7/30 days” retention**, cleanup API or automatic
purge in this workflow. Business-record deletion is governed by existing CRUD and
dependencies; it is separate from bulk cancellation.

## 7. Employee-only actions: code pattern and invitations

Pattern dekhna: `GET /api/Tenant/get-employee-code-pattern` using existing permission
contract. Missing pattern: `POST /api/Tenant/add-employee-code-pattern`; existing
pattern: `PUT /api/Tenant/update-employee-code-pattern`. Use TENANT_EMPLOYEE_CODE
module and Add/Update respectively. Update illustrative body:

```json
{
  "moduleId": 29,
  "operationId": 2,
  "pattern": {
    "prefix": "QT",
    "separator": "/",
    "runningNumberLength": "4",
    "includeYear": true,
    "includeMonth": false,
    "includeDepartment": false
  },
  "confirm": false
}
```

Preview mein all existing non-deleted employees (Admin and inactive included)
ke old/new codes review karein. Same body with `confirm:true` plus returned
`previewHash` apply karega, when canCommit true. Original joining 2018-07-24 wale
Admin ka example `QT/2018/0001`; Employee identities/login IDs unchanged.
Pattern prefix 1–10 letters, separator `_`/`/`/`-`, number length 3–7.
Pattern apply synchronous approval flow hai; bulk JobId/cancel applicable nahi.
Apply ke baad correction ke liye another pattern preview/approval chahiye.

Employee confirm **email send nahi karta**. Completed/CompletedWithErrors job ke
created accounts ke liye optional explicit action:

`POST /api/Employee/bulk/send-invitations`

```json
{
  "moduleId": 8,
  "operationId": 1,
  "jobId": "11111111-1111-4111-8111-111111111111",
  "rowNumbers": [2]
}
```

Use actual Employee job UUID and source rowNumbers. RowNumbers optional, max 100;
omitted selection dispatches at most 100 eligible rows. Pending/Failed eligible,
Sent not resent; Sending/DeliveryUnknown need delivery-log review. Inactive/already
set-up accounts can be NotRequired. Tokens generated at dispatch; validity 30 minutes.
Sent email recall/cancel endpoint nahi; bulk Cancel sent email undo nahi karta.

## 8. Verified evidence and scope

Department/Designation/Role/EmployeeType: live XLSX create + CSV/paste existing-skip
and DB/report checks passed. Employee: live CSV create (2), paste skip (2), account/
contact DB reconciliation and all-employee pattern update/restore passed. Employee
XLSX parsing and missing-pattern add success automated tests se covered; real
invitation delivery live tested nahi. Documentation-only update mein tests repeat nahi kiye.

Detailed evidence: [Employee handoff](EMPLOYEE_IMPORT_UI.md), [sample/readme](README.md),
[final summary](results/employee-final-summary.json). This guide describes current
behavior; older WIP entries in historical docs do not override FINAL acceptance.
