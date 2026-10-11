# 🧹 Junk & Deprecated Files Report

> ## ✅ Applied 2026-08-17
>
> Tiers **1b, 1, 2, 3 and 4 are done**. Tier 5 is still open — every item there needs a
> product or owner decision first.
>
> Nothing was deleted. Every removed file was `git mv`'d into
> [`docs/archived/`](./archived/), keeping its path relative to the repository root; see
> [`docs/archived/MANIFEST.txt`](./archived/MANIFEST.txt). Strip the `docs/archived/` prefix
> to restore one.
>
> **Verified:** `bun run lint` clean · `bun run build` and
> `bun run build --configuration production` succeed · `bun run test` 200 files / 592 tests
> pass (down from 204 / 596 — exactly the four archived specs) · `bun run e2e` 67/67 pass.
>
> ### Seven corrections found while applying it
>
> | #   | This report said                                                  | Actually                                                                                                                                                                                                                       |
> | --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
> | 1   | 26 live `console.log`                                             | **30** (+10 commented). Missed `deprecated/models/base.ts:3`; also 2 `console.info` in `app.ts` that are intentional                                                                                                           |
> | 2   | `tenants.ts:111,117,123`                                          | `tenants.ts:119,125,131`                                                                                                                                                                                                       |
> | 3   | All are plain line deletions                                      | **10 sites** left an empty loop / callback / method or an orphan `const`/param. Handlers that only logged now surface the existing "not yet implemented" message; `NotificationPopup` lost an `ngOnInit` that did nothing else |
> | 4   | `.claude/settings.local.json` lists `primeng`                     | Already `["angular-cli"]`. No action taken                                                                                                                                                                                     |
> | 5   | `teams/men.jpg` is the only broken teams path                     | `projects-stats-card.component.html:18` also builds `images/teams/` paths and is live. `1.jpg`–`6.jpg` all existed; no literal `6.jpg` anywhere, so archiving it was safe                                                      |
> | 6   | `lint-staged` `*.scss` glob is broken                             | A glob matching few files is not broken. **Left as is**                                                                                                                                                                        |
> | 7   | `angular.json` `allowedCommonJsDependencies` names wrong packages | All 6 resolve as transitives of `angularx-qrcode`/`jspdf`. **Left as is**                                                                                                                                                      |
>
> ### ⚠️ One asset was archived wrongly — fixed 2026-08-17
>
> `public/images/logo-dark.svg` was **not** dead. It was named only through a template string
> interpolation, which reference-counting by literal string cannot see:
>
> ```html
> [ngSrc]="`images/logo-${isDarkMode() ? 'dark' : 'light'}.svg`"
> ```
>
> Archiving it broke the logo in dark mode on every auth page. This is the same failure class
> the report already hit once with `images/teams/${avatar}` (correction #5) — **treat the
> "zero inbound references" evidence in Tier 1 as unreliable for assets specifically.**
>
> A follow-up sweep for dynamically-built asset paths found three sites with that ternary
> (`auth-header-logo.html:7`, `app-logo.html:16`, `payslip-viewer.html:7`), plus a fourth,
> pre-existing bug: `app-logo.html:35` asked for `images/logo-${…}.png`, and neither
> `logo-dark.png` nor `logo-light.png` has ever existed. All four now use a static
> `ngSrc="images/logo-light.svg"`. `logo-dark.svg` stays archived because it was a byte-for-byte
> copy of `logo-light.svg` (same blob `ca6c6de2…`), so the ternary was choosing between two
> identical files.
>
> The other archived assets were each re-checked against dynamic references and are genuinely
> dead: `profile-default.png` (avatar fallbacks use `appAvatarColor` initials), `teams/6.jpg`
> (`projects-stats-card` hardcodes `1.jpg`–`5.jpg`), `icon-48x48.png`, both `data/*.json`
> files, and the four `occasions/` images.
>
> ### Two Tier 3 items that needed more than a config edit
>
> - **`tsconfig.json` `ignoreDeprecations`** was not a band-aid — it suppressed the TS 6
>   deprecation error for `baseUrl`, and `baseUrl` was load-bearing because 58 files imported
>   `environments/environment` bare (plus `main.ts` importing `app/app`). Both are now
>   migrated: a new `@env/*` alias replaces the bare specifier, `main.ts` uses a relative
>   path, every `paths` entry is re-rooted at `./src/`, and `baseUrl` and `ignoreDeprecations`
>   are both gone. `angular.json` `fileReplacements` still swaps
>   `environment.ts` → `environment.development.ts` through the alias — verified by building
>   `--configuration development` and confirming the bundle carries `production: false`.
>   `experimentalDecorators` was removed too.
> - **The skills de-dupe** kept `.agents/skills/angular-developer` and untracked the
>   symlinked `.claude/` copy. A fresh clone will not have the symlink and must recreate it;
>   `.gitignore` says so.
>
> ### Guard rails added so this does not recur
>
> `eslint.config.js` gains `no-console` (allowing `info`/`warn`/`error`) plus an
> `ignores: ['docs/archived/**']`, and `.prettierignore` lists `docs/archived/`. Both ignores
> are required: `lint-staged` globs `*.ts` unanchored and hands ESLint explicit paths, which
> bypasses the lint target's `lintFilePatterns`.
>
> ### Follow-up — `src/app/deprecated/` is gone
>
> The first pass archived only part of that folder, leaving `hr-activity-card/` and
> `leave-breakdown-card/` (3 files each) inside `src/`, where they still compiled, linted and
> ran as specs. Both are now archived too and the empty `src/app/deprecated/` tree was removed;
> `MANIFEST.txt` and the `src/app/` layer table in `CLAUDE.md` are updated to match.
>
> Their only remaining reference is `dashboard-admin.html:37-53`, where both `@defer` blocks
> sit **inside HTML comments** next to an explicit "Don't remove commented code" note —
> `dashboard-admin.ts` never imported either class. Left untouched.
>
> Side effect: `ActivityHeatmapCell` and `LeaveBreakdown` in `@shared/interfaces` are now
> referenced only from `docs/archived/`. They are dead exports, kept so the archived files stay
> type-resolvable if restored.

**Date:** 2026-08-15
**Scope:** whole repository (excluding `node_modules`, `dist`, `.angular`, `.git`)
**Method:** reference-counting every candidate across `src/`, `e2e/`, `public/` and config —
by file path, class name, and component selector, **including references buried in comments**.
`git ls-files` used for tracked-vs-disk checks.

**Previous audits:** [`dead-code-report-src-app.md`](./dead-code-report-src-app.md) (2026-06-07) and
[`perf-audit-employee-components.md`](./perf-audit-employee-components.md) (2026-06-07).
Their deferred items remain unresolved and are re-listed here; the dead-code report's
dependency analysis has since gone stale (see Tier 5).

> ⚠️ **Two dependencies that look dead are load-bearing** — `chart.js` and `temporal-polyfill`
> have zero direct imports in `src/` but are required transitively. See
> [Keep — verified required](#-keep--verified-required-despite-looking-unused).

---

## 📊 Summary

| Tier  | Category                           | Items                         | Risk               |
| ----- | ---------------------------------- | ----------------------------- | ------------------ |
| 🔴 1b | Debug logging in production code   | 26 calls (3 leak secrets/PII) | Security           |
| 🟢 1  | Zero-reference deletions           | ~38 files                     | None               |
| 🟡 2  | Duplicated content in git          | ~42 files                     | Low                |
| 🟠 3  | Broken / stale references & config | 9                             | Already broken     |
| 🔵 4  | Dependencies                       | 5 (2 near-misses)             | Low                |
| ⚪ 5  | Needs an owner decision            | 16 groups                     | Do not auto-delete |

---

## 🔴 Tier 1b — Debug logging left in production code

**Do this first.** 26 live `console.log` calls remain in non-spec source, plus 10 commented-out
ones in `layout.ts:61-93`. Three of them leak secrets or PII to the browser console on real
user flows — treat as a security fix, not cleanup.

| 🚨  | Location                                                                                   | Leak                                                             |
| --- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| 🔑  | `features/authentication/registration/registration-verify/registration-verify.ts:44`       | `console.log('🔑 Token:', this.token)` — prints an auth token    |
| 🔑  | `features/authentication/set-password/set-password.ts:75`                                  | same pattern — prints an auth token                              |
| 🕵️  | `features/user-menu/employee-profile/employee-identity-info/employee-identity-info.ts:130` | `console.log(employeeSensitive)` — prints sensitive employee PII |

The remaining 23 are noise:

`attendance-api.ts:58,80` · `navigations-api.ts:43,79` · `assets-management.ts:215` ·
`tenants.ts:111,117,123` · `leave-balance-manage-dialog.ts:116` ·
`policy-mapping-leave-type.ts:128` · `policy-type-map-detail.ts:94` ·
`new-project-dialog.ts:163` · `ticket-lists.ts:289` · `employee-education-form.ts:204` ·
`employee-files-info.ts:125` · `employee-profile.ts:75` · `apps-popup.ts:37,51,64` ·
`message-popup.ts:132` · `notification-popup.ts:35` · `upsert-asset-dialog.ts:219` ·
`verification-settings.ts:76`

> 💡 Add a `no-console` ESLint rule allowing `error`/`warn` so this does not recur.
> The 14 existing `console.error` / `console.warn` calls are legitimate and should stay.

---

## 🟢 Tier 1 — Zero-risk deletions

~38 tracked files, each verified to have **zero** inbound references — comments included.
That last check is what separates these from the parked widgets in Tier 5.

> 🔍 Reachability was checked three ways per component: selector in any template, class name
> anywhere (matching `export class` **and** `export default class`), and directory/file-stem
> for lazy `loadComponent` routes. Own-file and own-spec references were excluded — a spec
> keeping its own dead subject "alive" is the classic false negative here.

### 🗑️ Dead components & types

| File                                                                          | Evidence                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/deprecated/components/column-value-loader/` (3 files)                | Selector `app-column-value-loader` and class `ColumnValueLoader` appear nowhere                                                                                                                                     |
| `src/app/deprecated/components/coming-soon/` (2 files)                        | Selector `app-coming-soon` in 0 templates. Its intended replacement `coming-soon-overlay` is dead too — see below                                                                                                   |
| `src/app/deprecated/interfaces/team.ts`, `team-filters.ts`, `models/base.ts`  | Zero references. `base.ts:3` also holds a stray `console.log('ok')`                                                                                                                                                 |
| `src/app/features/projects/ui/project-status-badge.ts` (`ProjectStatusBadge`) | Selector `app-project-status-badge` in no template; class referenced only by its own barrel line `features/projects/ui/index.ts:4`. Delete the file **and** the barrel line                                         |
| `src/app/layout/app-header/apps-popup/` (3 files)                             | `export default class AppsPopup`. Selector `app-apps-popup` in 0 templates, class imported nowhere, no lazy-load by path. Sibling `notification-popup` **is** used (`app-header.html:134`) — this one is not        |
| `src/app/layout/app-header/message-popup/` (3 files)                          | `export default class MessagePopup`. Same evidence. This is also the only consumer of the broken `images/teams/men.jpg` path — see Tier 3                                                                           |
| `src/app/features/learning/ld-stub/ld-stub.ts` (`LdStub`)                     | Orphan placeholder page. No route, no barrel, no template loads it                                                                                                                                                  |
| `src/app/shared/components/coming-soon-overlay/` (3 files)                    | Selector `app-coming-soon-overlay` in 0 templates; the only reference is its own barrel line `shared/components/index.ts:3`. **Both** coming-soon components are dead — the "replacement" was never wired up either |
| `src/app/shared/components/asset/upsert-asset-dialog/file-upload-backup.text` | Tracked backup dump of an old `onUpload()` method, saved with a `.text` extension so no tool ever loads it. 1524 bytes, zero references                                                                             |

### 🏷️ Unused exported types

Swept all 582 exported types under `shared/interfaces` and `features` — these 6 are the only orphans:

| Type                    | Location                                         |
| ----------------------- | ------------------------------------------------ |
| `SummaryCard`           | `shared/interfaces/dashboard-admin.ts:1`         |
| `AddOkrCommentRequest`  | `shared/interfaces/okr.ts:161`                   |
| `PmsListRequest`        | `shared/interfaces/performance/pms-request.ts:4` |
| `NewProjectTask`        | `shared/interfaces/projects/project-task.ts:39`  |
| `GetTasksRequest`       | `shared/interfaces/tasks.ts:113`                 |
| `AddTaskCommentRequest` | `shared/interfaces/tasks.ts:132`                 |

### 🖼️ Dead assets

| File                                                              | Evidence                                                                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `public/images/Occasions/` — 4 files                              | Case-duplicate of `public/images/occasions/`, identical git blob SHAs. On Windows only one materializes; both are tracked |
| `public/images/occasions/` — 4 files                              | Zero references — `occasions-card.component.ts:20-36` hardcodes Unsplash URLs instead                                     |
| `public/data/policies.json`, `public/data/policy-categories.json` | Zero references in `src/` or `e2e/`                                                                                       |
| `public/images/logo-dark.svg`                                     | Zero references                                                                                                           |
| `public/images/profile-default.png`                               | Zero references                                                                                                           |
| `public/images/teams/6.jpg`                                       | Zero references (`1.jpg`–`5.jpg` are used)                                                                                |
| `public/icons/icon-48x48.png`                                     | Absent from `manifest.webmanifest`, referenced nowhere                                                                    |

### 📄 Orphan style & type files

| File                                                                           | Evidence                                                                                                               |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `src/app/features/projects/list-view/list-view.component.scss`                 | 0 bytes, no `styleUrl`/`styleUrls` points at it                                                                        |
| `src/app/features/assets-management/assign-asset-popup/assign-asset-popup.css` | 378 bytes; the component declares no `styleUrl` for it                                                                 |
| `src/app/features/employees/employees.css`                                     | 0 bytes but **is** referenced (`employees.ts:107`) — delete the file _and_ the `styleUrl` line together, or leave both |
| `src/types.d.ts`                                                               | 0 bytes. Matched by `tsconfig.spec.json` `src/**/*.d.ts` but contributes nothing                                       |

---

## 🟡 Tier 2 — Duplicated content in git

| Item                                                                              | Evidence                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 👯 `.agents/skills/angular-developer/**` vs `.claude/skills/angular-developer/**` | **39 files tracked at both paths with identical blob SHAs.** On disk `.claude/skills/angular-developer` is a symlink into `.agents/`, so git stores the tree twice. Keep one path; `git rm --cached` and gitignore the other |
| 📑 `docs/hrms-feature-gap-report.html` (47 KB)                                    | Rendered duplicate of `docs/hrms-feature-gap-report.md` (14 KB) — same report, same date                                                                                                                                     |
| 🤖 `.gemini/GEMINI.md`                                                            | Stale fork of `CLAUDE.md`. Still says _"Prefer Reactive forms instead of Template-driven"_, superseded by the Signal Forms rule at `CLAUDE.md:29`. Missing the Role/Permissions and Behavioral Guidelines sections entirely  |
| 📝 `llm.txt`                                                                      | 14 lines of generic boilerplate ("Use TypeScript", "Run tests after changes") superseded by `CLAUDE.md` (158 lines) + `.claude/SPEC.MD` (302 lines). Its only unique content is two pointers to `docs/llms/*.txt`            |
| 🔧 `.gemini/commands/commit.toml`                                                 | Duplicates `.claude/commands/commit.md` — same `/commit` workflow, different serialization. Two copies to keep in sync                                                                                                       |
| 📚 `docs/llms/ng-llms.txt`, `docs/llms/optimus-llms.txt` (22 KB)                  | Vendored third-party LLM doc dumps, referenced **only** from `llm.txt:13-14`. Overlaps the 39-file `.claude/skills/angular-developer/references/` tree                                                                       |

---

## 🟠 Tier 3 — Broken references (already failing at runtime)

| Item                                                               | Evidence                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🖼️ `src/index.html:27,37`                                          | `og:image` / `twitter:image` point at `images/logo-light.png`. Only `logo-light.svg` exists                                                                                                                                                                                                               |
| 👤 `layout/app-header/message-popup/message-popup.ts:47,67,90,115` | `avatar: 'men.jpg'` rendered via `images/teams/${avatar}`; `public/images/teams/` contains only `1.jpg`–`6.jpg`. Moot in practice — the component itself is dead (Tier 1), so deleting it resolves this                                                                                                   |
| ⚙️ `ngsw-config.json`                                              | Prefetches `/index.csr.html`. No SSR configured — no `server.ts`, `main.server.ts`, or SSR builder in `angular.json`. That file never exists in the build output                                                                                                                                          |
| 🚫 `.prettierignore`                                               | Ignores `.codex`, `.cursor`, `.github`, `build`, `.tmp`, `storybook-static`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` — none exist (project uses `bun.lock`). `.vscode` is listed twice                                                                                                         |
| 🎨 `package.json:22` (`lint-staged`)                               | Globs `*.scss`; only 2 `.scss` files exist and one is Tier 1 junk                                                                                                                                                                                                                                         |
| 🔒 `.claude/settings.local.json:51-54`                             | `enabledMcpjsonServers: ["angular-cli", "primeng"]` — `.mcp.json` defines only `angular-cli`, and **PrimeNG is entirely gone** from the codebase (zero `primeng` / `primeicons` / `primeui` hits in `src/`, `package.json`, or `styles.css`). Also allows an MCP tool for a plugin that is not configured |
| 🧬 `tsconfig.json:5,12`                                            | `ignoreDeprecations: "6.0"` and `experimentalDecorators: true` — legacy carry-overs. Angular 22 + TS 6 need neither; `ignoreDeprecations` is a suppression band-aid                                                                                                                                       |
| 📦 `.gitignore:33`                                                 | Ignores `/.angular/cache` rather than `/.angular` — a non-cache subdir would slip through                                                                                                                                                                                                                 |
| 🔐 `.prettierignore` misses `bun.lock`                             | It ignores three lockfiles that do not exist while the one that does (`bun.lock`, 183 KB) is left formattable                                                                                                                                                                                             |

---

## 🔵 Tier 4 — Dependencies

| Item                                            | Evidence                                                                                                                                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🗑️ `playwright-ng-schematics` (devDep)          | One-shot `ng add` schematic collection. Zero references outside `package.json` / `bun.lock`; `angular.json` `schematicCollections` lists only `angular-eslint`. Safe to remove                                                                         |
| 📦 `@ngrx/signals` in `devDependencies`         | Imported by production stores — belongs in `dependencies`                                                                                                                                                                                              |
| 🔁 `postcss` (devDep, explicit pin)             | `.postcssrc.json` only uses `@tailwindcss/postcss`. `postcss` itself arrives transitively as an optional peer of `@angular/build`; the direct pin is redundant                                                                                         |
| ⚠️ `@openng/optimus-ui@1.0.1` peer range        | Declares `peerDependencies: @angular/* ^21.0.0` while the app runs Angular `^22.1.1`. Silent peer mismatch across the entire UI kit — worth tracking with the vendor                                                                                   |
| ⚠️ `angular.json` `allowedCommonJsDependencies` | Lists `qrcode` and `html2canvas`; actual deps are `angularx-qrcode` and `html2canvas-pro`. All 6 entries do resolve in the tree, so they likely cover transitive CommonJS imports. **Low confidence — verify with a production build before touching** |

### ✅ Keep — verified required despite looking unused

| Dependency            | Why it must stay                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chart.js`            | No direct `from 'chart.js'` import in `src/`, but `@openng/optimus-ui/chart` does `import Chart from 'chart.js/auto'` **without declaring it as a peer or dependency**. 6 components use `ChartModule` (`host-chart-card`, `ld-chart-card`, `okr-chart-card`, `pms-trend-chart`, `leave-graph-card`, `project-burndown`). Removing it breaks the build — an undeclared implicit coupling, not dead weight |
| `temporal-polyfill`   | Zero references in `src/`, but declared as a dependency by `@fullcalendar/core`, `@fullcalendar/angular` and `fullcalendar` (all `^1.0.1`)                                                                                                                                                                                                                                                                |
| `tslib`               | `tsconfig.json:13` sets `importHelpers: true`                                                                                                                                                                                                                                                                                                                                                             |
| `jsdom`               | DOM environment for the `@angular/build:unit-test` vitest runner                                                                                                                                                                                                                                                                                                                                          |
| `fullcalendar`        | Imported bare in 3 files                                                                                                                                                                                                                                                                                                                                                                                  |
| `source-map-explorer` | Used by the `analyze` script                                                                                                                                                                                                                                                                                                                                                                              |

> ⚠️ **Correction:** an earlier draft of this report listed `chart.js` and `temporal-polyfill`
> as removable. Both are load-bearing — see the table above. `bun remove` on either would
> break the build.

### 🧼 Also clean

No `tslint`, `protractor`, `karma`, `moment`, `@angular/flex-layout`, `rxjs-compat`,
`node-sass`, `request`, or `jest`. No `tslint.json`, `.eslintrc*`, `karma.conf.js`,
`protractor.conf.js`, `.browserslistrc`, or `.env` files. All npm scripts resolve
(`analyze` → correct `outputPath`, `e2e` → `playwright.config.ts`, `prepare` → `.husky/pre-commit`).
All `angular.json` paths exist, including the three `@fullcalendar/angular` CSS files.

---

## ⚪ Tier 5 — Needs an owner decision, not a deletion

| Item                                                                                                                | Evidence                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⛔ `src/app/deprecated/components/hr-activity-card/` and `leave-breakdown-card/` (6 files)                          | **Do not delete without asking.** Both are referenced from `dashboard-admin.html:37-53`, inside `@defer` blocks that are commented out under an explicit `<!-- Note: Don't remove commented code -->` marker at line 35. These were parked on purpose. Either restore them (uncomment + add to `dashboard-admin.ts` imports) or get sign-off to drop the components _and_ the parked markup |
| 🪞 Two live components share the selector `app-leave-history`                                                       | `features/leaves/leave-history/leave-history.ts:24` and `features/user-menu/employee-profile/employee-leave-info/leave-history/leave-history.ts:9`. Different components, same tag — whichever is imported wins, silently. Rename one                                                                                                                                                       |
| 🔀 `core/services/attendance-api.ts` (`AttendanceApi`) vs `features/attendance/attendance-api.ts` (`AttendanceAPI`) | Two live services for one domain, names differing only by casing. Neither talks to the real backend — one is localStorage-backed, the other reads `data/attendance.json`                                                                                                                                                                                                                    |
| 🧪 15 services still reading `public/data/*.json`                                                                   | `tasks-api.ts`, `learning-api.ts`, `performance-management-api.ts`, `projects-api.ts`, `okr-api.ts`, `leave-api.ts`, `holidays-api.ts`, `payroll-api.ts` and others carry `TODO: API — swap each method for real HTTP`. Not junk — unfinished                                                                                                                                               |
| 🌐 6 dashboard components hardcoding Unsplash URLs                                                                  | `anniversary-card`, `birthday-card`, `calendar-card`, `occasions-card`, `on-leave-card`, `project-views` — 17 external image URLs in production code. This is _why_ `public/images/occasions/` is dead                                                                                                                                                                                      |
| 🧫 150 of 190 `*.spec.ts` files                                                                                     | Contain a single `it('should create')` block and nothing else — CLI scaffolding, no assertions of value                                                                                                                                                                                                                                                                                     |
| ✏️ `src/app/shared/components/dashboad/`                                                                            | Folder name is a typo for `dashboard`                                                                                                                                                                                                                                                                                                                                                       |
| 🏷️ 22 files use the legacy `*.component.ts` suffix                                                                  | `.claude/SPEC.MD:98-104` mandates `departments.ts` style. All 22 sit in two places: `features/projects/**` (13) and `shared/components/dashboad/**` (9). Mechanical rename, but touches imports repo-wide                                                                                                                                                                                   |
| 🧹 `kanban-empty-state.component.ts:6` sets `standalone: true`                                                      | Only occurrence in the repo; redundant in v20+ per `CLAUDE.md:16`. One-line fix                                                                                                                                                                                                                                                                                                             |
| 🧹 `ticket-agent-add-dialog.ts:1,34` imports `CommonModule`                                                         | Only occurrence; no `ngIf`/`ngFor` used anywhere, so it is pure dead weight                                                                                                                                                                                                                                                                                                                 |
| 🏗️ ~32 API services hold state, violating `CLAUDE.md:52-53`                                                         | `designations-api.ts`, `holidays-api.ts`, `roles-api.ts`, `projects-api.ts`, `dashboard-api.ts`, `subscriptions-api.ts`, `employee-api.ts`, `tenants-api.ts` each duplicate a Signal Store that already exists, and carry the explicitly forbidden `add*Signal` / `remove*Signal` helpers. Real debt, but a migration — not a deletion                                                      |
| 🪞 11 components mirror store state into local signals via `effect()`                                               | Violates `CLAUDE.md:51`. Worst: `dashboard-admin.ts:87-97` (3 effects), `employees.ts:164-178` (3 effects)                                                                                                                                                                                                                                                                                  |
| 📋 Template-driven forms, forbidden by `CLAUDE.md:29`                                                               | 34 files use `ngModel`, 46 import `FormsModule`. 7 are true two-way `[(ngModel)]`; `permission-matrix.html` alone has 8 bindings                                                                                                                                                                                                                                                            |
| 💬 Commented-out code blocks                                                                                        | `holidays-api.ts` (22 lines) · `leave-type-mapping-dialog.ts` (19) · `navigations-api.ts` (14) · `okr-api.ts` (12) · `layout.ts` (9) · `apps-popup.ts` (8)                                                                                                                                                                                                                                  |
| 🔌 `SKIP_LOADING` (`core/interceptors/loading-interceptor.ts:6`)                                                    | Exported `HttpContextToken`, but no caller anywhere ever sets it — only `loading-interceptor.ts:12` reads it. Either the `export` is redundant or the skip feature was never wired up. Flagged in the 2026-06-07 audit, still unresolved                                                                                                                                                    |
| 🔒 `.claude/settings.local.json` is tracked                                                                         | Machine-local permissions/hooks file, normally gitignored — see also the stale `primeng` MCP entry in Tier 3                                                                                                                                                                                                                                                                                |
| 📄 `docs/dead-code-report-src-app.md` — **partly stale**                                                            | Its deferred items are all still present, so the open-todo half is live. But its dependency analysis has rotted: it discusses `primeicons` and `tailwindcss-primeui` as live deps (both gone from `package.json`) and claims `chart.js` is "used by `project-burndown`", which now imports `@openng/optimus-ui/chart` instead. Refresh or retire                                            |
| 📄 `docs/perf-audit-employee-components.md` — **accurate but abandoned**                                            | Every finding still reproduces (`verification-settings.ts:76` `console.log`, 3 mirroring `effect()` blocks). Ends with _"No fixes applied yet — awaiting confirmation on P1 scope"_ — a decision two months cold                                                                                                                                                                            |

---

## ✅ Verified clean — not junk

Checked and found **zero** occurrences of: `@NgModule` · `*ngIf` / `*ngFor` / `*ngSwitch` ·
`ngClass` / `ngStyle` · `@Input()` / `@Output()` / `@HostBinding` / `@HostListener` / `@ViewChild` ·
constructor parameter injection · `signal.mutate()` · `HttpClientModule` / `BrowserModule` /
`RouterModule.forRoot` / `ComponentFixtureAutoDetect`.

Also verified healthy:

- 🎯 **317 of 319** components set `ChangeDetectionStrategy.OnPush` (the 2 exceptions are inline test hosts in spec files)
- 📁 No `*-old` / `*-legacy` / `*-v1` / `*.bak` / `*copy*` files — but note `file-upload-backup.text` in Tier 1, which those globs miss
- 🏷️ No `@deprecated` JSDoc, no `TODO: remove`, no `HACK` / `XXX` markers
- 🧾 No untracked scratch files, no committed build output; repo is 11 MiB packed
- 🔗 All `tsconfig` path aliases resolve and are used — `@core/*` (328), `@shared/*` (547), `@tickets/*` (8), `@layout/*` (3)
- 📐 All `angular.json` asset / style / tsconfig paths exist on disk
- 🧭 All `<app-*>` template tags have a defining component — no unknown-element markup
- 🧩 Every store, API service, pipe, directive, guard, interceptor and strategy has a real consumer
- 🧱 Every **component** was re-swept for reachability including `export default` classes; the only orphans are the 6 listed in Tier 1. `TaskDialogComponent` and `ColorPickerPanel` look orphaned by class name but are alive via same-directory siblings (`open-task-dialog.ts`, `color-picker.html:39`)
- ⚙️ Service worker genuinely wired (`app.config.ts:38`, `angular.json:59`)
- 🌍 i18n in perfect parity — all 7 locales (`ar`, `de`, `en`, `es`, `fr`, `hi`, `zh`) carry the same 10 keys, all 10 used, none missing. Only 1 component uses `TranslatePipe` so far
- 🎨 Empty `.css` files largely cleaned since the last audit — 1 remaining of the 161 previously flagged

---

## 🚀 Suggested execution order

| #   | Step                                                                                                                                           | Verify                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 0️⃣  | **Tier 1b** — strip the 3 token/PII logs, then the other 23                                                                                    | `grep -rn "console\.log" src --include=*.ts \| grep -v spec` returns nothing                     |
| 1️⃣  | **Tier 1** — delete the listed files + the `ui/index.ts` barrel line                                                                           | `bun run build` succeeds, `bun run test` passes                                                  |
| 2️⃣  | **Tier 2** — pick one skills path, `git rm --cached` + gitignore the other; drop the duplicate report and stale instruction files              | `git ls-files \| wc -l` drops by ~39 (from 1262)                                                 |
| 3️⃣  | **Tier 3** — fix or remove each broken reference                                                                                               | No 404s in the network panel for `logo-light.png` and `teams/men.jpg`                            |
| 4️⃣  | **Tier 4** — `bun remove playwright-ng-schematics`, move `@ngrx/signals` to `dependencies`. **Do not touch `chart.js` or `temporal-polyfill`** | `bun run build --configuration production` succeeds; chart widgets and the calendar still render |
| 5️⃣  | **Tier 5** — report only                                                                                                                       | Each item needs a product/owner call first                                                       |

### 🧪 Verification checklist

- [ ] `bun run build` and `bun run build --configuration production` — no missing-file or budget errors
- [ ] `bun run test` — all 190 spec files still pass
- [ ] `bun run lint` — no new violations
- [ ] `bun run e2e` — `login.spec.ts` and `plan.spec.ts` pass
- [ ] Manual: employee dashboard (occasions / anniversary / on-leave cards) and the message popup render without broken images
