# No endpoint reads one named policy version, so a version workspace cannot render its own header

**Component:** AxionPro API - `TenantPolicy` controller, `GET /api/TenantPolicy/{id}`
**Severity:** Blocker - the version workspace shows a different version's status than the one it is operating on
**Reported:** 2026-09-20
**Environment:** `https://axionpro-api.onrender.com`

## Summary

Every version-scoped read in the module takes a `versionId`: documents, assignments, exceptions,
acknowledgements and approval progress all hang off `/versions/{versionId}/...`. The one read that
returns a version's own identity - status, version number, effective dates, change summary - does
not. `GET /api/TenantPolicy/{id}` is keyed on the **policy** and returns whichever version is
current.

A client holding a `versionId` therefore has no way to ask what that version _is_.

## The gap

From `docs/specs/TENANT_POLICY/TENANT_POLICY_ENDPOINT_CATALOG.md`:

| Endpoint                                          | Keyed on   | Returns                                                    |
| ------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| 7. `GET /{id}`                                    | policy id  | policy + **current** version + its rules and applicability |
| 15. `GET /versions/{versionId}/assignments`       | version id | that version's assignments                                 |
| 18. `GET /versions/{versionId}/exceptions`        | version id | that version's exceptions                                  |
| 20. `GET /versions/{versionId}/acknowledgements`  | version id | that version's acknowledgements                            |
| 22. `GET /versions/{versionId}/documents`         | version id | that version's documents                                   |
| 29. `GET /versions/{versionId}/approval-progress` | version id | that version's approval progress                           |

Endpoint 7's only inputs are `moduleId` and `operationId`. There is no `versionId` path segment and
no `versionId` query parameter.

The catalogue describes endpoint 7 as returning "Policy, selected version, rules and applicability",
but nothing in the request selects a version.

## Impact

The UI route is `/app/tenant-policies/:policyId/versions/:versionId`. Its six tabs read through the
version, its summary header reads through endpoint 7. The two disagree whenever the routed version
is not the current one.

Reproduce in the web app:

1. Open a Published policy's version workspace.
2. **Clone version**, supply an effective date and a change summary. The API creates the next Draft
   and the client navigates to it.
3. The header still reads `v1`, `Published`, the old effective dates and the old change summary.
   The tabs below it are all showing the new Draft's data.

Status is what tells a user what they may do with a version. A header reading **Published** over a
Draft's tabs invites Assign and Acknowledge, which the API then rejects, and conceals that the draft
is editable. The reverse case - a Draft header over a published version's evidence - is equally
reachable by opening an older version id directly.

There is no client-side workaround. The version's status exists only in a response the client cannot
request.

## Suggested fix

Either:

- **`GET /api/TenantPolicy/{policyId}/versions/{versionId}`**, returning the same
  `PolicyDetail` shape endpoint 7 already returns, for that exact version. This matches the shape of
  every other version-scoped read in the module.
- or an optional **`versionId` query parameter on `GET /{id}`**, defaulting to the current version
  so existing callers are unaffected.

The first is preferable: it keeps "read a version" consistent with the five endpoints that already
key on `/versions/{versionId}`, and leaves endpoint 7 meaning exactly one thing.

Either way the response should carry the requested version's `versionId`, `versionNumber`,
`statusId`, `status`, `effectiveFrom`, `effectiveTo`, `changeSummary`, `rules` and `applicability`.

## Verifying the fix

1. Create a policy, publish version 1, then clone it into a Draft version 2.
2. Read version 1 by id. Expect `versionNumber: 1`, `status: "Published"`.
3. Read version 2 by id. Expect `versionNumber: 2`, `status: "Draft"`, and the cloned rules and
   applicability.
4. In the web app, repeat the clone repro above. The header must read `v2` / `Draft` immediately
   after the navigation, and must match the tabs for any version id opened directly.

## Related

- `docs/backend-tickets/tenant-policy-version-list-endpoint-missing.md` - the companion gap: nothing
  enumerates a policy's versions, so a client cannot discover the version ids this endpoint would take.

## Client-side references

- `src/app/features/tenant-policies/policy-version-workspace/policy-version-workspace.store.ts:75`
  (`detailResource`, keyed on `policyId`)
- `src/app/features/tenant-policies/policy-version-workspace/policy-version-workspace.html:7-95`
  (the summary header)
- `src/app/core/services/tenant-policy-api.ts` (`getPolicy`)
