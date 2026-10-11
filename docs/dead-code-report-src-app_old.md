# Dead Code Report — `src/app`

Date: 2026-06-07
Scope: `src/app`
Tools: `knip`, project-wide `grep`, manual verification.

## Method note

`knip` (run without a config file) flagged **195 "unused files"**, but ~130 of
these are component `.css` files referenced via Angular `styleUrl`. Because no
`knip.json` exists, the Angular plugin does not resolve `styleUrl`/`templateUrl`
references — these are **false positives**. Same for the 3 "unused dependencies"
(`primeicons` imported in `styles.css`, `chart.js` used by `project-burndown`,
`tailwindcss-primeui` used by Tailwind/PrimeUI config). All CSS/dep flags were
discarded.

## Findings

| Confidence               | Item                                                 | Location                                                                                                                         | Type                  | Evidence                                                                                                           |
| ------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| ✅ Safe                  | `EmployeeImagesApi`                                  | `core/services/employee-images-api.ts` (whole file) + barrel re-export `core/services/index.ts`                                  | service class         | zero injects/imports project-wide                                                                                  |
| ✅ Safe                  | `EmployeePersonalAPI`                                | `core/services/employee-personal-api.ts` (whole file) + barrel re-export                                                         | service class         | zero injects/imports                                                                                               |
| ✅ Safe                  | `PoliciesApi`                                        | `core/services/policies-api.ts` (whole file) + barrel re-export                                                                  | service class         | zero injects/imports                                                                                               |
| ✅ Safe                  | `AssignAssetDialog`                                  | `shared/components/asset/assign-asset-dialog/` (ts/html/css/spec) + barrel re-export `shared/components/index.ts`                | component             | selector `app-assign-asset-dialog` used in no template; only its own spec references it                            |
| ✅ Safe                  | `core/index.ts`                                      | whole file (3 lines)                                                                                                             | barrel                | `@core` bare barrel imported nowhere                                                                               |
| ✅ Safe                  | `host/editions/index.ts`                             | whole file (1 line)                                                                                                              | barrel                | imported nowhere                                                                                                   |
| ⚠️ Risky                 | `deprecated/` folder                                 | `src/app/deprecated/**` (18 files: column-value-loader, coming-soon, hr-activity-card, leave-breakdown-card, interfaces, models) | components/interfaces | zero external refs — but folder _deliberately named_ deprecated; may be kept on purpose. Needs owner confirmation. |
| ⚠️ Risky                 | 44 unused exported types                             | `shared/interfaces/**`, `features/**/models`                                                                                     | interfaces/enums      | zero refs, but likely reserved API-shape models; bulk removal needs review                                         |
| ⚠️ Risky                 | barrel re-export lines (e.g. `AttendanceApi`)        | `core/services/index.ts`                                                                                                         | re-export             | class alive, only barrel line unused; barrel is public-API surface                                                 |
| ⚠️ Skip (not dead)       | `SKIP_LOADING` export                                | `loading-interceptor.ts:6`                                                                                                       | const                 | used internally at line 12 — only the `export` keyword is redundant                                                |
| ⚠️ Skip                  | 161 empty `.css` files                               | feature/shared components                                                                                                        | styles                | 0-byte but referenced via `styleUrl` — removing requires editing each component (scope creep)                      |
| ⚠️ Skip (false positive) | `chart.js`, `primeicons`, `tailwindcss-primeui` deps | `package.json`                                                                                                                   | dependency            | primeicons in `styles.css`, chart.js in project-burndown, primeui in Tailwind config                               |

## Action taken

### Pass 1 — 6 ✅ Safe items

3 API service files (`EmployeeImagesApi`, `EmployeePersonalAPI`, `PoliciesApi`),
1 dead component (`AssignAssetDialog`), 2 orphan barrel files (`core/index.ts`,
`host/editions/index.ts`) + their barrel re-export lines.

### Pass 2 — unused exported types (user-requested)

Triaged all 53 knip "unused exported type" hits by repo-wide reference count.
**15 truly dead types removed:**

- Single-interface removals: `AppliedAssetFilter`, `ExperienceDetailForm`,
  `GetEmployeeInfoRequest`, `GetActiveEmployeeInfoRequest`, `GetAttendanceReq`,
  `LeaveRequest`, `ReportTypeForm`, `UpdateProfileImageReq`, `ITicketPriority`,
  `ITicketStatus`, `ModuleData` (+ its commented-out mock).
- Whole files deleted (all exports dead — orphaned by the deleted API services):
  `employees/employee-image.ts`, `employees/employee-personal.ts`,
  `policies/policy.ts`, `common/log-error.ts`, `tickets/models/enums.ts`
  (`TicketStatus`/`MessageType`/`ThreadEntityType`).
- Barrel lines cleaned in `shared/interfaces/index.ts` and `tickets/models/index.ts`.
- Orphaned `FormControl` import removed from `report-type.ts`.

**29 NOT removed — knip false positives.** These exports are never _imported_
elsewhere but ARE consumed in-file by a live parent interface (e.g.
`ITicketAttachment` used by `ITicketDetail`, `UpdateBulkReqSec` by `UpdateBulkReq`,
`HolidayType`/`MessageCategory`/`SalaryComponentType` by their record types, etc.).
Removing them would break compilation. Left in place.

### Pass 3 — empty CSS files (user-requested)

160 zero-byte `.css` files removed, each paired component's `styleUrl`/`styleUrls`
line deleted (scripted, all single-entry patterns, 0 skipped).

## Verification

- `bun run build` — green (only pre-existing CommonJS bailout warnings).
- `bun run lint` — all files pass.
- `bun run test` — 17 failed / 249 passed. Baseline on clean tree (changes
  stashed) = **17 failed / 250 passed** (the 1-test delta is the deleted
  `assign-asset-dialog.spec.ts`). The 17 failures are pre-existing ng22-migration
  breakages, **not** introduced by this cleanup.
- Re-searched every deleted symbol — zero references remain.
