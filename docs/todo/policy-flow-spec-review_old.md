# Policy flow spec - review

**Document:** `docs/specs/Policy flow.md`
**Reviewed against:** `src/app/features/tenant-policies/`, `src/app/core/services/tenant-policy-api.ts`,
`src/app/shared/interfaces/tenant-policy/`
**Date:** 2026-09-20
**Status:** open - rewrite drafted, findings below are what drove it

The original doc was a 22-line entity tree grouped into five lifecycle buckets. Every entity it
lists does have UI and API behind it, so coverage is not the problem. The problem is that the
document describes _what exists_ and never _how it moves_.

---

## 1. Blocking - the document is not a flow

### 1.1 No transitions, no actors, no ordering

An indented entity list cannot answer: who creates what, in what order, what blocks what. A reader
handed this file cannot build or review the feature from it. The title promises a flow and the
content is an inventory.

**Fix:** replace the tree with a state machine, an ordered setup sequence, and an
entity/route/endpoint table.

### 1.2 `PolicyStatus` filed as a seed, hiding the only real flow

The doc lists `PolicyStatus` under SEED alongside `PolicyCategory` and `PolicyRuleType`. It is a
lookup table, but the statuses form the version lifecycle, driven by one endpoint
(`POST /versions/{versionId}/transition`). Actual machine, from
`policy-definitions.ts:140-195`:

```
Draft --SUBMIT--> Under Review --APPROVE--> Approved --PUBLISH--> Published --ARCHIVE--> Archived
                       |
                       +--REJECT--> Rejected --(edit, SUBMIT again)--> Under Review
```

Editable statuses are `Draft` and `Rejected` only (`policy-definition-form.ts:51`). Published
versions are immutable; you clone a new Draft. None of this is in the doc.

---

## 2. Missing - entire subsystems

### 2.1 Bulk import absent

Shipped in commit `69f2510f`. Nine endpoints
(`template`/`preview`/`confirm`/`retry`/`cancel`/`jobs`/`jobs/{id}`/`report`), three targets
(`types`, `definitions`, `assignments`), one shared wizard adapter in
`features/tenant-policies/policy-bulk-import.ts`. Zero mention in the spec.

Also undocumented: assignment import requires the target version to already be **Published**
(`policy-bulk-import.ts:95`).

### 2.2 Resolution not described

`GET /resolve?employeeId&effectiveDate` plus `resolutionSource` (`APPLICABILITY` | `ASSIGNMENT` |
`EXCEPTION`), shipped in `a8854f5b`. The doc has no resolution concept at all, yet this is the
question the whole engine exists to answer.

### 2.3 No permission model

`hasModulePermissionGuard` is deliberately not used here; gating is per action through
`canPerformOrUnknown(moduleCode, operation)` across seven module codes:

| Module code                      | Operations                                  |
| -------------------------------- | ------------------------------------------- |
| `TENANT_POLICY_TYPES`            | Add, Update, status                         |
| `TENANT_POLICY_DEFINITIONS`      | Add, Update, Import, Submit, Upload, Delete |
| `TENANT_POLICY_APPROVALS`        | Approve, Reject, Publish, Archive           |
| `TENANT_POLICY_ASSIGNMENTS`      | Add, Import, Delete                         |
| `TENANT_POLICY_EXCEPTIONS`       | Add, Approve, Reject                        |
| `TENANT_POLICY_ACKNOWLEDGEMENTS` | Add                                         |
| `TENANT_POLICY_AUDIT`            | read                                        |

Non-obvious and worth writing down: `Submit` sits on `TENANT_POLICY_DEFINITIONS` while the other
four lifecycle actions sit on `TENANT_POLICY_APPROVALS`. Also that `TenantPolicy` is absent from
`MODULE_OPERATION_ROUTES`, so every call site must pass `moduleId`/`operationId` itself.

### 2.4 No route map

`/tenant-policies`, `/tenant-policies/types`, `/tenant-policies/approval-stages`,
`/tenant-policies/:policyId/versions/:versionId`.

---

## 3. Ambiguity that will cause wrong code

### 3.1 Three policy silos, one word

| Silo                           | Path                            | API                        |
| ------------------------------ | ------------------------------- | -------------------------- |
| Tenant Policy (this spec)      | `features/tenant-policies/`     | `tenant-policy-api.ts`     |
| Leave / insurance policy types | `features/policies/`            | `policy-type-api.ts`       |
| Attendance policies            | `features/attendance-policies/` | `attendance-policy-api.ts` |

`PolicyType` is a distinct entity in silo 1 **and** silo 2, with separate APIs. `features.routes.ts:340`
already carries a comment apologising for the collision. The spec must say which one it means.

### 3.2 Magic numbers with no legend

`applicabilityMode: 1 | 2` = Include / Exclude
(`shared/interfaces/tenant-policy/tenant-policy-definition.ts:62`). The doc names
`PolicyApplicability` and stops.

Same gap for `PolicyRule`: `ruleConfiguration` must be a JSON **object** string - arrays and scalars
are rejected backend-side. Undocumented.

### 3.3 `ApprovalHistory` vs `approval-progress`

The doc calls it `PolicyApprovalHistory`; the client surface is
`GET /versions/{versionId}/approval-progress` returning per-stage `approvalCount` against
`minimumApprovals`. Either reconcile the names or state that one is the read model of the other.

---

## 4. The leave-engine bucket is aspirational

`EmployeeLeavePolicyMapping`, `EmployeeLeaveBalance` and `LeaveBalanceTransaction` grep to **zero**
hits in `src/`. What actually exists, under different names:

- `features/policies/leave-employee-policy-map/`
- `features/policies/policy-mapping-leave-type/`
- `features/leaves/leave-requests/leave-balances/` (via `core/services/leave-api.ts`)

`Recommended LeaveBalanceTransaction` - the word "Recommended" is undefined. Proposed? Unbuilt?
A ledger has no client counterpart at all.

**Fix:** drop the bucket from this spec (it is a separate system) or mark it `TODO - unscoped`.

---

## Actions

- [x] Rewrite `docs/specs/Policy flow.md` as state machine + phased setup + entity/route/endpoint
      table (findings 1.1, 1.2, 2.1-2.4, 3.1-3.3, 4)
- [ ] Decide whether the leave engine gets its own spec, or stays out of scope
- [x] Confirm `PolicyApprovalHistory` naming with the backend - entity or read model. Settled: the
      live swagger has **no** `approval-history` path. `GET /versions/{versionId}/approval-progress`
      is the only client surface, so `PolicyApprovalHistory` is the stored entity and
      `approval-progress` is its read model. Spec should say exactly that
- [x] Wire the remaining `TenantPolicyApplicabilityInput` fields into the definition form - eleven
      of thirteen done. See "Applicability fields" below for the two that stay API-only and why
- [x] Confirm the write endpoint actually persists them. Settled: `PolicyApplicabilityInputDTO` in
      the live swagger binds **all** thirteen, including `localityId`, `workArrangementType`,
      `employmentStatus` and `minimumServiceDays` (`minimum: 0`). The worked example in
      `TENANT_POLICY_API.md` is just partial - it is not the contract
- [ ] Get a value legend for `workArrangementType` and `employmentStatus`. Both are plain nullable
      `int32` in the swagger with no `$ref` enum, so there is nothing to build a select from
- [ ] Confirm the `GET /Location/Locality/option` response field names. Swagger types its `200` as
      bare `OK`; `shared/interfaces/locations/locality.ts` assumes the `<entity>Name` shape the
      other `/Location` option endpoints use. Blank labels in the locality select means it is wrong

---

## Applicability fields - what is editable, and what is not

`TenantPolicyApplicabilityInput` carries 13 targeting dimensions, and the swagger's
`PolicyApplicabilityInputDTO` accepts all 13 on write. The definition form edits 11; the other 2
are still read/round-tripped only.

| Field                 | Editable | Source                                                     |
| --------------------- | -------- | ---------------------------------------------------------- |
| `applicabilityMode`   | yes      | Local constant, `1=Include` / `2=Exclude`                  |
| `countryId`           | yes      | `LookupStore.countries`                                    |
| `stateId`             | yes      | `LocationsApi.getStates`, per-row cascade off country      |
| `districtId`          | yes      | `LocationsApi.getDistricts`, per-row cascade off state     |
| `localityId`          | yes      | `LocationsApi.getLocalities`, per-row cascade off district |
| `tenantLocationId`    | yes      | `TenantLocationApi.getTenantLocations`                     |
| `employeeTypeId`      | yes      | `LookupStore.employeeTypes`                                |
| `departmentId`        | yes      | `LookupStore.departmentOptions`                            |
| `designationId`       | yes      | `DesignationsApi.getDesignationOptions`, tenant-wide       |
| `employeeId`          | yes      | `injectEmployeeOptions()`, non-numeric ids dropped         |
| `genderId`            | yes      | `LookupStore.genders`                                      |
| `minimumServiceDays`  | yes      | Plain number input, `min=0`, whole numbers                 |
| `workArrangementType` | **no**   | Nullable `int32`, no `$ref` enum, no value legend anywhere |
| `employmentStatus`    | **no**   | Nullable `int32`, no `$ref` enum, no value legend anywhere |

The two unwired fields are not dropped: they round-trip through `applicabilityDetailToInput` and go
back on the next save exactly as they came, so a row seeded by bulk import or by the backend keeps
its targeting even though this form cannot show it.

`GET /Location/Locality/option` was already in `docs/api-gap-report.md` as an uncalled endpoint;
`LocationsApi.getLocalities` is the first caller. Its sibling `GET /Location/LocalityType/option`
(City / Town / Village / Other) is still uncalled and is not needed here.

`employeeId` is `number` on this input while `EmployeeFilterOption.employeeId` is a `string` - the
same mismatch `resolve-policies-dialog.ts` guards with `Number.isFinite`. The picker filters out
anyone without a numeric id rather than offering them and letting the save fail.
