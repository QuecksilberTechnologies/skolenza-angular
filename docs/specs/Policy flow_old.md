# Tenant Policy flow

The compliance/document policy engine: `src/app/features/tenant-policies/`, backed by the single
`TenantPolicy` controller through `core/services/tenant-policy-api.ts`. Mounted at `/tenant-policies`
(`features.routes.ts`), gated coarsely by `adminManager`; everything finer gates per leaf, see
[Permissions](#permissions).

Deeper API reference lives in `docs/specs/TENANT_POLICY/`. Open review notes:
`docs/todo/policy-flow-spec-review.md`.

## Which "policy" this is

Three unrelated policy silos share the word. Do not cross-wire them.

| Silo                          | Path                            | API                                            | What it is                                                            |
| ----------------------------- | ------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| **Tenant Policy** (this doc)  | `features/tenant-policies/`     | `tenant-policy-api.ts`                         | Versioned compliance policies: approval, applicability, documents     |
| Leave / insurance policy types | `features/policies/`            | `policy-type-api.ts`, `policies-insurance-api.ts` | Leave and insurance mapping masters. Owns the `/policies` route prefix |
| Attendance policies           | `features/attendance-policies/` | `attendance-policy-api.ts`                     | Shift and attendance rules                                            |

`PolicyType` exists as a distinct entity in silo 1 **and** silo 2. In this document `PolicyType`
always means `TenantPolicyType` (`GET /TenantPolicy/types`).

## Actors

| Actor                     | Does                                                             |
| ------------------------- | ---------------------------------------------------------------- |
| Tenant admin              | Seeds types and approval stages, authors drafts, imports in bulk |
| Approver (role per stage) | Approves or rejects a version under review                       |
| Publisher                 | Publishes an approved version, archives a published one          |
| Employee                  | Acknowledges an assigned policy; subject of assignments/exceptions |

## Phase 1 - setup, once per tenant

Ordered. Each step's output is the next step's required input.

```
1. Seed lookups          GET  /lookups          -> categories, statuses, ruleTypes, documentTypes
2. PolicyType            POST /types            -> needs a categoryId from step 1
3. PolicyApprovalStage   POST /approval-stages  -> ordered gates, optional policyCategoryId
```

Seeds are read-only and backend-owned. One `GET /lookups` call returns all four lists
(`TenantPolicyLookups`). `PolicyStatus` is among them, but the statuses themselves form the state
machine in [Phase 3](#phase-3---version-lifecycle).

An approval stage with `policyCategoryId: null` is global; a category-scoped stage applies only to
that category's policies. Each stage carries `stageOrder`, `approverRoleId`, `minimumApprovals`
and `isMandatory`.

## Phase 2 - authoring

Creating a Policy creates its first PolicyVersion in the same call. Rules and applicability rows are
nested in that same body - there are no separate rule or applicability endpoints.

```
POST /TenantPolicy                 Policy + PolicyVersion v1 (Draft) + PolicyRule[] + PolicyApplicability[]
PUT  /TenantPolicy/{id}            edit - Draft and Rejected versions only
POST /{policyId}/versions/clone    new Draft version from an existing one
```

`policy-definition-form.schema.ts` is the shape of record.

**PolicyRule** - `policyRuleTypeId` (from the `ruleTypes` lookup), `ruleName`, and
`ruleConfiguration`: a JSON **object** string such as `{"days":12}`. Arrays and scalar JSON values
are rejected by the backend; the zod schema enforces the same rule client-side.

**PolicyApplicability** - the targeting rows. `applicabilityMode` is `1 = Include`, `2 = Exclude`.
A row narrows by any combination of country / state / tenant location / employee type. The API also
accepts district, locality, department, designation, employee, gender, work arrangement, employment
status and minimum service days; this UI does not edit those yet and carries existing values through
unchanged on update. `priority` breaks ties between matching rows. `effectiveFrom` is required,
`effectiveTo` optional.

Every write requires a `changeSummary`. That string is what the change audit records.

## Phase 3 - version lifecycle

One endpoint drives all of it: `POST /versions/{versionId}/transition` with an `action`.

```
          SUBMIT                APPROVE            PUBLISH            ARCHIVE
  Draft ---------> Under Review ---------> Approved -------> Published -------> Archived
    ^                    |
    |       REJECT       v
    +---------------- Rejected
             (edit, then SUBMIT again)
```

| Action    | Legal from       | Result       |
| --------- | ---------------- | ------------ |
| `SUBMIT`  | Draft, Rejected  | Under Review |
| `APPROVE` | Under Review     | Approved     |
| `REJECT`  | Under Review     | Rejected     |
| `PUBLISH` | Approved         | Published    |
| `ARCHIVE` | Published        | Archived     |

Only **Draft** and **Rejected** versions are editable (`EDITABLE_STATUSES` in
`policy-definition-form.ts`). Published versions are immutable - change one by cloning a new Draft.

Approval stages are consumed between `SUBMIT` and `PUBLISH`. Per-stage tallies come from
`GET /versions/{versionId}/approval-progress`: `approvalCount` against `minimumApprovals`, plus
`isComplete`. That endpoint is the approval-history surface; the client has no separate history
entity.

The transition's `operationId` resolves against a **capitalised** operation name (`Submit`,
`Approve`, `Publish`, `Archive`), not the uppercase `action` value. See
`TENANT_POLICY_LIFECYCLE_OPERATION_NAME`.

## Phase 4 - employee-side

All four live in the version workspace, `/tenant-policies/:policyId/versions/:versionId`.

| Entity                | Write                                                  | Read                                          | Notes                                                                                                              |
| --------------------- | ------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| PolicyAssignment      | `POST /assignments`, `DELETE /assignments/{id}`        | `GET /versions/{versionId}/assignments`       | Takes `employeeIds[]`. Idempotent per employee: a repeat counts as `existing`, not `inserted`                      |
| PolicyException       | `POST /exceptions`, `POST /exceptions/{id}/decision`   | `GET /versions/{versionId}/exceptions`        | Per-employee override. `overrideConfiguration` is a JSON object string, same rule as `ruleConfiguration`           |
| PolicyAcknowledgement | `POST /acknowledgements`                               | `GET /versions/{versionId}/acknowledgements`  | Employee confirms they read it                                                                                     |
| PolicyDocument        | `POST /documents` (multipart), `DELETE /documents/{id}` | `GET /versions/{versionId}/documents`         | Typed by the `documentTypes` lookup                                                                                |

## Resolution

`GET /resolve?employeeId&effectiveDate` answers "which published versions apply to this employee on
this date". Read-only and deliberately ungated beyond module access - a read-only session still has
every right to ask.

Each `TenantPolicyResolution` carries a `resolutionSource` naming why that version won:

- `APPLICABILITY` - matched by an applicability row
- `ASSIGNMENT` - explicitly assigned to the employee
- `EXCEPTION` - an approved per-employee exception

Surfaced by `policy-definitions/resolve-policies-dialog/`.

## Bulk import

Three targets: `types`, `definitions`, `assignments`. One wizard for all three -
`policy-bulk-import.ts` adapts each onto the shared bulk-import component.

```
template -> upload -> preview -> confirm -> job -> report
                         ^                   |
                         +------ retry ------+   (or cancel)
```

| Step                         | Endpoint                                                              |
| ---------------------------- | --------------------------------------------------------------------- |
| Download template            | `GET /bulk/{target}/template`                                         |
| Preview (validate, no write) | `POST /bulk/{target}/preview`                                         |
| Confirm                      | `POST /bulk/{target}/confirm`                                         |
| Retry failed rows            | `POST /bulk/{target}/retry`                                           |
| Cancel                       | `POST /bulk/{target}/cancel`                                          |
| Job list / detail            | `GET /bulk/{target}/jobs`, `GET /bulk/{target}/jobs/{jobId}`          |
| Error report                 | `GET /bulk/{target}/jobs/{jobId}/report`                              |

Writes gate on the `Import` operation, reads on `View`. Assignment import requires the target
version to already be **Published**.

## Audit

`GET /{policyId}/audit` returns the PolicyChangeAudit trail for a policy across all its versions.
Read-only, behind its own permission leaf. The `changeSummary` from each write is what it records.

## Routes

| Route                                           | Screen                                                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/tenant-policies`                              | Policy list: create, edit, import, transition, resolve                                               |
| `/tenant-policies/types`                        | PolicyType master                                                                                    |
| `/tenant-policies/approval-stages`              | PolicyApprovalStage master                                                                           |
| `/tenant-policies/:policyId/versions/:versionId` | Version workspace: assignments, exceptions, acknowledgements, documents, approval progress, audit    |

The workspace is reached from a row action, not the menu. Opening it is ungated; each tab inside
reads through its own leaf.

## Permissions

`hasModulePermissionGuard` is **not** used here. Gating is per action, via
`FeaturePageStore.canPerformOrUnknown(moduleCode, operation)`.

| Module code                      | Covers                           | Operations used in code                      |
| -------------------------------- | -------------------------------- | -------------------------------------------- |
| `TENANT_POLICY_TYPES`            | Policy types                     | Add, Update, status change                   |
| `TENANT_POLICY_DEFINITIONS`      | Policies, versions, documents    | Add, Update, Import, Submit, Upload, Delete  |
| `TENANT_POLICY_APPROVALS`        | Lifecycle decisions and stages   | Approve, Reject, Publish, Archive            |
| `TENANT_POLICY_ASSIGNMENTS`      | Assignments                      | Add, Import, Delete                          |
| `TENANT_POLICY_EXCEPTIONS`       | Exceptions                       | Add, Approve, Reject                         |
| `TENANT_POLICY_ACKNOWLEDGEMENTS` | Acknowledgements                 | Add                                          |
| `TENANT_POLICY_AUDIT`            | Audit trail                      | read                                         |

Note the split: `Submit` belongs to `TENANT_POLICY_DEFINITIONS` (the author pushes their own draft
out), while `Approve` / `Reject` / `Publish` / `Archive` belong to `TENANT_POLICY_APPROVALS`.

`TenantPolicy` is absent from `MODULE_OPERATION_ROUTES`, so nothing stamps `moduleId` /
`operationId` automatically. Every call site resolves both from the authenticated menu and passes
them explicitly (`TenantPolicyContextRequest`).

## Out of scope - the leave engine

The leave engine is a separate system and is **not** part of this flow. Nothing named
`EmployeeLeavePolicyMapping`, `EmployeeLeaveBalance` or `LeaveBalanceTransaction` exists in the
client. What does exist, under other names:

- `features/policies/leave-employee-policy-map/` - employee to leave-policy mapping
- `features/policies/policy-mapping-leave-type/` - leave-type mapping
- `features/leaves/leave-requests/leave-balances/` - balances, via `core/services/leave-api.ts`

A leave-balance *transaction* ledger has no client-side counterpart at all. Unscoped until someone
writes a spec for it.
