# Exception `approvalStatusId` has no published legend, so decided exceptions cannot be told apart from pending ones

**Component:** AxionPro API - `TenantPolicy` controller, `GET /api/TenantPolicy/versions/{versionId}/exceptions`
**Severity:** Blocker - the exceptions list cannot show a decision, and the UI lets a decided exception be re-decided
**Reported:** 2026-09-20
**Environment:** `https://axionpro-api.onrender.com`

## Summary

`GET /versions/{versionId}/exceptions` returns `approvalStatusId` as a bare integer:

```json
{
  "id": 401,
  "policyVersionId": 73,
  "employeeId": 201,
  "exceptionType": 1,
  "overrideConfiguration": "{\"allowRemoteAttendance\":true}",
  "reason": "Temporary medical accommodation",
  "effectiveFrom": "2027-02-01",
  "effectiveTo": "2027-02-28",
  "approvalStatusId": 2,
  "isActive": true
}
```

Nothing publishes what `2` means. `GET /api/TenantPolicy/lookups` returns `categories`, `statuses`,
`ruleTypes` and `documentTypes` - and its `statuses` are policy **version** statuses (Draft, Under
Review, Approved, Published, Archived), not exception approval statuses. The swagger types the field
as a plain `int32` with no `$ref` enum. Neither `TENANT_POLICY_API.md` nor
`TENANT_POLICY_ENDPOINT_CATALOG.md` gives a value legend.

`exceptionType` on the same object has the same problem: `int32`, no enum, no legend.

## Impact

The client cannot render a decision state, so the exceptions tab currently shows `isActive` in its
"State" column - which is a soft-delete flag, not an approval outcome. A pending exception, an
approved one and a rejected one are indistinguishable to the user.

The knock-on defect is worse: because the client has nothing to gate on, the Approve and Reject
buttons stay enabled on every row, and `POST /exceptions/{id}/decision` can be fired repeatedly
against an already-decided exception. Whether that mutates the record or is rejected server-side is
also undocumented.

`exceptionType` being unlabelled means the submit form asks the user to type a raw integer, with no
indication of what values are valid or what they mean.

## Suggested fix

Extend the `lookups` response with the two missing code lists, alongside the four it already
carries:

```json
{
  "categories":            [ ... ],
  "statuses":              [ ... ],
  "ruleTypes":             [ ... ],
  "documentTypes":         [ ... ],
  "exceptionApprovalStatuses": [ { "id": 1, "code": "PENDING",  "name": "Pending"  },
                                 { "id": 2, "code": "APPROVED", "name": "Approved" },
                                 { "id": 3, "code": "REJECTED", "name": "Rejected" } ],
  "exceptionTypes":            [ { "id": 1, "code": "...", "name": "..." } ]
}
```

Values above are illustrative - the point is that the client reads them rather than hard-coding
them, the same rule the module already applies to ModuleId and OperationId.

Also worth confirming and documenting: what `POST /exceptions/{id}/decision` does when the exception
is already decided. A `CONFLICT` there would let the client fail cleanly even before the lookup
lands.

## Verifying the fix

1. `GET /api/TenantPolicy/lookups`. Expect the two new code lists.
2. Submit an exception, read the version's exceptions, and confirm its `approvalStatusId` matches
   the published Pending entry.
3. Approve it, re-read, and confirm the id matches the published Approved entry.
4. Call the decision endpoint again on the same exception and confirm the documented behaviour.
5. In the web app, the exceptions tab shows Pending / Approved / Rejected, and the Approve and
   Reject buttons are disabled on any row that is no longer pending.

## Client-side follow-up

This ticket is the backend half. The client fix, which lands once the lookup exists:

- `src/app/features/tenant-policies/policy-version-workspace/policy-version-workspace.html:404-424`
  - replace the `isActive` tag with the approval state and gate the two decision buttons on it.
- `src/app/features/tenant-policies/policy-version-workspace/policy-exception-dialog/policy-exception-dialog.ts`
  - swap the raw `FormNumber` for `exceptionType` to a select over the lookup.
- `src/app/shared/interfaces/tenant-policy/tenant-policy-type.ts` - extend `TenantPolicyLookups`.
