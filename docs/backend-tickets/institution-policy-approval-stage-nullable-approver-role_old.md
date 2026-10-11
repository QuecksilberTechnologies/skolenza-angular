# Confirm `approverRoleId: null` on approval stages, and publish it in the contract

**Component:** AxionPro API - `TenantPolicy` controller, `/api/TenantPolicy/approval-stages`
**Severity:** Blocker for the client - the documented open stage cannot currently be created from the UI
**Reported:** 2026-09-20
**Environment:** `https://axionpro-api.onrender.com`

## Summary

`TENANT_POLICY_API.md` states, under the approval-stage create example:

> Set `policyCategoryId` to `null` for a tenant-wide stage. `approverRoleId=null` allows any caller
> who already has the endpoint's Approve permission.

So a stage with no approver role is a documented, meaningful configuration: the gate exists and
counts approvals, but any holder of the Approve grant may satisfy it.

Two things block a client from using it.

1. The swagger shape for `approverRoleId` on `AddPolicyApprovalStageRequestDTO` /
   `UpdatePolicyApprovalStageRequestDTO` needs confirming as nullable. Only the prose above says so;
   the endpoint catalogue's examples (26, 27) always send a role.
2. `GET /approval-stages` needs to be explicit that `approverRoleId` comes back `null` for such a
   stage, so a client can round-trip one it did not create.

Without that confirmation in the contract the client has typed the field as required, and the UI now
forces a role on every stage - the open stage is unreachable.

## Reproduce

```bash
curl -X POST 'https://axionpro-api.onrender.com/api/TenantPolicy/approval-stages' \
  -H 'authorization: Bearer <tenant token>' \
  -H 'content-type: application/json' \
  -d '{ "moduleId": <Policy Approvals>, "operationId": <Add>,
        "policyCategoryId": null, "stageName": "Any approver",
        "stageOrder": 1, "approverRoleId": null,
        "minimumApprovals": 1, "isMandatory": true }'
```

**Expected:** the stage is created and `GET /approval-stages` returns it with
`approverRoleId: null`.

Then submit a version into that stage and approve it as a caller who holds Approve on Policy
Approvals but holds no particular role, to confirm the "any caller" semantics the doc describes.

## Impact

A tenant that wants a single "one approval from anyone who may approve" gate has to invent a role
and grant it, purely to satisfy a field the API says it can omit. Any stage created that way through
another channel also cannot be edited from the UI: the edit dialog would refuse to save it without a
role.

## Suggested fix

1. Confirm the behaviour, and mark `approverRoleId` nullable on both request DTOs and on
   `PolicyApprovalStageDTO` in the swagger document.
2. Add a worked example to `TENANT_POLICY_ENDPOINT_CATALOG.md` (endpoints 25-27) showing the
   `approverRoleId: null` stage in both the create body and the list response, so the nullable case
   is visible next to the role-bound one.
3. State what "any caller with the Approve permission" means for `minimumApprovals > 1` - in
   particular whether the same employee is still blocked from approving the stage twice, as they are
   for a role-bound stage.

## Verifying the fix

1. Create the stage from the repro above; read it back and confirm `approverRoleId: null`.
2. Submit a version in that category and approve it with a caller holding only the Approve grant.
   Expect the approval to count.
3. With `minimumApprovals: 2`, confirm the documented duplicate-approver rule.
4. In the web app, the approval-stage dialog offers an "Any approver" option, saves it, and reopens
   the saved stage without demanding a role.

## Client-side follow-up

This ticket is the backend half. The client fix, once the contract confirms it:

- `src/app/shared/interfaces/tenant-policy/tenant-policy-approval.ts:12` - `approverRoleId` is typed
  `number`; make it `number | null` on `TenantPolicyApprovalStage` and on both request interfaces.
- `src/app/features/tenant-policies/policy-approval-stages/approval-stage-dialog/approval-stage-dialog.schema.ts:16`
  - drop the `.refine` that makes it required, mirroring how `policyCategoryId` already allows null.
- `src/app/features/tenant-policies/policy-approval-stages/policy-approval-stages.ts` (`roleName`)
  - render "Any approver" for a null role rather than falling through to the `-` placeholder.
