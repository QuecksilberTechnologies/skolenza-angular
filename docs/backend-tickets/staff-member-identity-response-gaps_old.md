# The identity list omits the uploaded file and the tab's verified flag

**Component:** AxionPro API - `Employee/Sensitive` controller
**Severity:** Major - uploaded identity proofs cannot be opened, and the tab's review state cannot be shown
**Reported:** 2026-10-03
**Environment:** `https://axionpro-api.onrender.com`

## Summary

The Swagger description of `GET /api/Employee/Sensitive/get` lists the item DTO
(`GetEmployeeIdentityResponseDTO`: `Id`, `EmployeeId`, `CountryCode`, `CountryName`,
`IdentityCategoryName`, `IdentityCategoryDocumentId`, `DocumentCode`, `DocumentName`, `Description`,
`IsMandatory`, `EmployeeIdentityId`, `IdentityValue`, `IsVerified`, `IsEditAllowed`,
`HasIdentityUploaded`, `EffectiveFrom`, `EffectiveTo`, `IsActive`). Three gaps block the Identity
tab:

1. **No uploaded file.** `POST /Create` accepts the proof as `identityDocumentFile`, but the GET
   reports only `hasIdentityUploaded: true`, with no path, URL or file name. Other profile sections
   already return theirs: experience items carry `documents[]` with `filePath` and `fileName`, and
   the web app lists them as links.
2. **No tab-level verified flag.** Other profile tabs return `isInfoVerified`, which drives the
   header's "Review: Verified / Pending" and the admin "Mark as verified" toggle. The identity DTO
   has none.
3. **Undocumented response schema.** The GET declares `200: OK` with no schema. The DTO exists only
   in the description text, so generated clients and reviewers cannot rely on it.

## Reproduce

1. `POST /api/Employee/Sensitive/Create` for one employee and one document (e.g. PAN Card), with
   `identityValue` and an `identityDocumentFile` PDF.
2. As an admin, mark the Identity tab verified (`tabInfoType` = Identity) through the profile access
   endpoint the other tabs use.
3. `GET /api/Employee/Sensitive/get?EmployeeId=<id>&CountryNationalityId=<country>`.

**Expected:** the PAN Card item says where the uploaded file lives, and the response shows the tab
is verified.
**Actual:** the item has `hasIdentityUploaded: true` and nothing else about the file. Nothing in the
response says the tab is verified.

## Impact

- The tab can show an "Uploaded" badge but cannot let an admin open the proof to check it. Verifying
  an identity without seeing the document is a guess.
- After an admin marks the tab verified, a page reload shows "Review: Pending" again. The web app
  now keeps the toggle's result until a full page refresh, but it cannot read the stored value.

## Suggested fix

Add to each item of `GET /api/Employee/Sensitive/get`:

| Field            | Type           | Notes                                                                |
| ---------------- | -------------- | -------------------------------------------------------------------- |
| `filePath`       | string \| null | Same shape as experience `documents[].filePath`; null when no upload |
| `fileName`       | string \| null | Original upload name, for the link text                              |
| `isInfoVerified` | boolean        | The tab-level verified flag, as other profile tabs return it         |

- Identity proofs are sensitive. If files are served from public storage today, prefer a
  short-lived signed URL over a permanent public path, and apply the same `Employee/Sensitive`
  authorization that guards the GET.
- Keep `hasIdentityUploaded` for backward compatibility. It should equal `filePath != null`.
- `isInfoVerified` may instead live on the envelope (next to `completionPercentage`), since it is
  per employee and tab rather than per document. Either works for the client. Please say which.
- Declare the response schema in Swagger.

## Please also confirm

`DELETE /delete` is described as deleting "an **editable** identity record". Does it, or `Create`,
refuse an admin's write when the record's `isEditAllowed` is false? The web app now lets admins and
managers edit whatever "Allow employee to edit" says, because that toggle is meant to lock the
employee. If the API refuses, the user sees an error toast.

## Verifying the fix

1. Repeat the repro: the item returns a non-null `filePath` and `fileName`, and `isInfoVerified` is
   true.
2. Open `filePath` with the same bearer token: the uploaded PDF downloads.
3. Open it without a token, or as an employee of another tenant: access is denied (or the signed
   URL has expired).
4. An item with no upload returns `filePath: null`, `fileName: null`, `hasIdentityUploaded: false`.
5. Unverify the tab: the next GET returns `isInfoVerified: false`.

## Client-side follow-up (after the API ships)

- Add `filePath`, `fileName` (and `isInfoVerified`, wherever it lands) to `EmployeeSensitive` /
  `GetEmployeeSensitiveRes`.
- Render a paperclip link with the file name in the row's default slot of `app-profile-list-item`
  for uploaded rows, reusing `app-profile-document-list`.
- Seed the page's `isInfoVerified` signal from the response instead of from the last toggle.

## Client-side references

- `src/app/shared/interfaces/employees/sensitive.ts` (`EmployeeSensitive` mirrors the DTO above)
- `src/app/core/services/employee-identity-api.ts` (`/Employee/Sensitive/get`, `/create`, `/delete`)
- `src/app/features/user-menu/employee-profile/employee-identity-info/employee-identity-info.ts` (`isInfoVerified` signal, `headerEditAllowed`)
- `src/app/shared/components/profile/profile-document-list/profile-document-list.ts` (`filePath`, `fileName`)
- `src/app/shared/components/profile/profile-block-actions/profile-block-actions.ts` (`roleTypeId` edit rule)
