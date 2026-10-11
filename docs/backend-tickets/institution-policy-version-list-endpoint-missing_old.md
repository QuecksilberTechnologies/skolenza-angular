# Nothing enumerates a policy's versions, so a cloned draft is unreachable once the user navigates away

**Component:** AxionPro API - `TenantPolicy` controller
**Severity:** Blocker - clone creates a draft the client can never find again
**Reported:** 2026-09-20
**Environment:** `https://axionpro-api.onrender.com`

## Summary

`POST /api/TenantPolicy/{policyId}/versions/clone` creates the next Draft version and returns its
id. That response is the only time any client ever sees that id. No endpoint lists a policy's
versions, and the paged policy list exposes exactly one version reference - the current one.

Publishing makes a version current and clears `IsCurrent` from the previous version
(`TENANT_POLICY_API.md`, Lifecycle). A newly cloned Draft is therefore **not** current: the
previously published version still is. So the list keeps pointing at the published version, and the
draft has no route into it.

Lose the response - refresh, navigate back, close the tab - and the draft is orphaned. It still
exists, still occupies its version number, and can never be edited, submitted or published.

## The gap

Of the 37 operations in `docs/specs/TENANT_POLICY/TENANT_POLICY_ENDPOINT_CATALOG.md`, the ones that
return a version id are:

| Endpoint                                    | Version id returned                  |
| ------------------------------------------- | ------------------------------------ |
| 6. `GET /` (paged list)                     | `currentVersionId` only              |
| 7. `GET /{id}`                              | the current version only             |
| 8. `POST /`                                 | the version 1 it just created        |
| 10. `POST /{policyId}/versions/clone`       | the draft it just created            |
| 11. `POST /versions/{versionId}/transition` | the version the caller already named |

Every other version-scoped endpoint _takes_ a `versionId` and never supplies one. There is no
`GET /{policyId}/versions`.

## Reproduce

1. Create a policy, take version 1 through SUBMIT → APPROVE → PUBLISH.
2. `POST /api/TenantPolicy/{policyId}/versions/clone` with `sourceVersionId` = version 1. Note the
   new `versionId` in the response, then discard it.
3. `GET /api/TenantPolicy?pageNumber=1&pageSize=20`. The row for this policy reports
   `currentVersionId` = version 1 and `status: "Published"`.
4. `GET /api/TenantPolicy/{policyId}`. Returns version 1.

**Expected:** some call returns both versions, with their ids, numbers and statuses.
**Actual:** nothing does. Version 2 is unaddressable.

## Impact

In the web app the policy list is the only entry point into a version. Every row action - open
workspace, edit, and the whole lifecycle menu - targets `currentVersionId`. After a clone:

- the list keeps showing the published version;
- **Edit** opens the published version's detail, which the form then refuses as non-editable;
- nothing links to the new draft.

The documented version-history screen (`TENANT_POLICY_UI_PLANNING.md` screen 5,
`/app/policies/:id/versions` - "Compare, clone and inspect immutable versions") cannot be built at
all without this endpoint, which is why it is absent from the shipped routes.

Clone is effectively a one-shot action that must be completed in a single uninterrupted sitting.

## Suggested fix

**`GET /api/TenantPolicy/{policyId}/versions`**, returning every version of the policy, newest
first, each with at minimum:

```json
{
  "versionId": 74,
  "versionNumber": 2,
  "statusId": 1,
  "status": "Draft",
  "effectiveFrom": "2028-01-01",
  "effectiveTo": null,
  "changeSummary": "2028 revision",
  "isCurrent": false
}
```

`moduleId` / `operationId` resolve against Policy Definitions with `View`, like the other reads on
that leaf. Paging is optional - version counts are small - but harmless if added.

## Verifying the fix

1. Run the repro above through step 2, discarding the clone response.
2. `GET /{policyId}/versions`. Expect two rows: version 1 Published with `isCurrent: true`, and
   version 2 Draft with `isCurrent: false`.
3. In the web app, build the version-history screen against it and confirm a cloned draft is
   reachable after a full page refresh, and can then be edited, submitted and published.

## Related

- `docs/backend-tickets/tenant-policy-version-scoped-read-missing.md` - having the ids is only half
  of it; reading what a version _is_ needs a version-scoped detail endpoint too.

## Client-side references

- `src/app/features/tenant-policies/policy-definitions/policy-definitions.ts` (`openWorkspace`, `actionMenuItems`)
- `src/app/features/tenant-policies/policy-version-workspace/clone-version-dialog/clone-version-dialog.ts`
- `src/app/features/tenant-policies/tenant-policies.routes.ts` (no `versions` route)
- `src/app/shared/interfaces/tenant-policy/tenant-policy-definition.ts:9` (`currentVersionId`)
