# HRMS Feature Gap Report — Core + 2026 Trends

Date: 2026-08-04
Scope: `src/app`, `public/data`, `package.json`, `angular.json`
Method: full route/API/model inventory, project-wide `grep`, manual verification against the live Swagger surface.

AxionPro is a multi-tenant HRMS SaaS (Angular 22, Optimus UI, NgRx Signal Store, .NET backend at `axionpro-api.onrender.com`). This report audits what exists, what is mock-only, what is missing from a commercial HRMS, and which 2026-era capabilities are absent.

---

## 1. Current state snapshot

Legend — ✅ live backend · 🟨 UI built, mock JSON in `public/data/` · 🔶 stub/read-only · ❌ absent

| Module                                                        | Status  | Evidence                                                                                     |
| ------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| Auth (login/forgot/reset/OTP)                                 | ✅      | `core/services/auth-api.ts` → `/Auth/*`                                                      |
| Tenant registration + host console                            | ✅ / 🔶 | `features/host/tenants` (CRUD is `// TODO` at `tenants.ts:105-122`)                          |
| Subscription + billing UI                                     | ✅      | `/Subscription/*`, `features/subscription/`                                                  |
| Employee + 10 profile sections                                | ✅      | `/Employee/*`, `/Employee/{Bank,Contact,Dependent,Education,Experience,Sensitive,Insurance}` |
| Departments / Designations / Reporting Types / Employee Types | ✅      | `/Department`, `/Designation`, `/ReportingType`, `/EmployeeType`                             |
| Roles + permission matrix (RBAC)                              | ✅      | `/Role`, `/UserModuleRolePermission`                                                         |
| Assets (+ category/type/status/assign)                        | ✅      | `/Asset/*`                                                                                   |
| Policies + Insurance + mappings                               | ✅      | `/PolicyType`, `/Insurance`, `/PolicyTypeInsuranceMap`                                       |
| Leave **configuration** (types, rules, policy map)            | ✅      | `/Leave`, `/LeaveRule`, `/PolicyMappingLeaveType`                                            |
| Leave **transactions** (apply/approve/balance)                | 🟨      | `data/leaves/*.json`                                                                         |
| Attendance                                                    | 🟨      | `data/attendance.json`, no guard on route                                                    |
| Holidays                                                      | 🟨      | real CRUD commented out in `holidays-api.ts`                                                 |
| Payroll (overview/structure/payslip/tax)                      | 🟨      | `data/payroll/*.json`; `payroll-tax-settings.ts:148` TODO                                    |
| Performance (goals/reviews/feedback/1:1)                      | 🟨      | `data/pms-*.json`, API marked MOCK-ONLY                                                      |
| OKR                                                           | 🟨      | real HTTP written but commented out in `okr-api.ts`                                          |
| Learning & Development (11 pages)                             | 🟨      | `data/learning/*.json`                                                                       |
| Tasks + Projects (kanban/gantt/calendar)                      | 🟨      | `data/tasks/*.json`, `data/projects.json`                                                    |
| Tickets — config CRUD                                         | ✅      | `/TicketClassification`, `/Ticket/TicketHeader`, `/Ticket/TicketType`                        |
| Tickets — runtime list/detail/agents                          | 🟨      | `data/tickets.json`, `ticket-agents-summary.json`                                            |
| Notifications                                                 | 🟨      | `core/stores/notification.store.ts` — 5 hardcoded items                                      |
| Settings (brand/appearance/lang/notify)                       | 🟨      | `MOCK_SETTINGS` constant                                                                     |
| Host dashboard                                                | 🔶      | 4 hardcoded numbers                                                                          |

**11 of 25 feature areas are entirely mock-backed. 41 JSON files in `public/data/`.**

---

## 2. Missing core HRMS modules

Priority — 🔴 blocks go-live · 🟠 expected in any commercial HRMS · 🟡 mid-market expectation · 🟢 differentiator

| #   | Module                                                                                              | Pri | Why it matters                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | 🔁 **Approval workflow engine** (multi-level, delegation, escalation, SLA)                          | 🔴  | Leave, expense, timesheet, asset, exit all need it. Each feature currently invents its own. Single highest-leverage gap. |
| 2   | 🎯 **Recruitment / ATS** (requisition, posting, pipeline, interviews, offers)                       | 🔴  | Whole hire-side of the employee lifecycle absent.                                                                        |
| 3   | 🚀 **Onboarding / preboarding** (checklists, task assignment, doc collection, buddy)                | 🔴  | Employee record exists; the process to create it does not.                                                               |
| 4   | 🚪 **Offboarding / exit & separation** (resignation, clearance, F&F, exit interview)                | 🔴  | No exit path.                                                                                                            |
| 5   | 🧾 **Statutory compliance & payroll engine** (PF/ESI/PT/TDS, Form 16, challans, FBP)                | 🔴  | Payroll UI exists but no run engine, no statutory outputs.                                                               |
| 6   | 📍 **Attendance capture** (geofence, biometric/device sync, selfie, IP restriction, regularization) | 🔴  | Only a table view today; no punch source.                                                                                |
| 7   | 🕵️ **Audit log / activity trail** (who changed what, immutable)                                     | 🔴  | Zero matches for `audit` in `src/`. Compliance blocker.                                                                  |
| 8   | ⏱️ **Timesheets** (project/client time, billable hours, approval)                                   | 🟠  | Projects module exists but tracks no time.                                                                               |
| 9   | 🌓 **Shift & roster management** (shift master, rotation, swap, night allowance)                    | 🟠  | Attendance without shifts cannot compute late/OT correctly.                                                              |
| 10  | 💸 **Expense & reimbursement claims** (categories, receipt OCR, limits, payout)                     | 🟠  | Common top-3 requested HRMS module.                                                                                      |
| 11  | ⏳ **Overtime / comp-off**                                                                          | 🟠  | Follows shift + attendance.                                                                                              |
| 12  | 🌳 **Org chart / reporting hierarchy visualization**                                                | 🟠  | `ReportingType` master exists, no tree UI.                                                                               |
| 13  | 🔍 **Employee directory / people search**                                                           | 🟠  | No cross-employee lookup for end users.                                                                                  |
| 14  | 📄 **Document management + e-signature** (offer letter, contract templates, versioning, retention)  | 🟠  | `files-info` upload is TODO (`employee-files-info.ts:124`).                                                              |
| 15  | 📈 **Reports & analytics builder** (ad-hoc, scheduled, drill-down, export)                          | 🟠  | `report-type` is master data only, not a report builder.                                                                 |
| 16  | 📢 **Announcements / company feed / policy acknowledgement**                                        | 🟡  | No internal comms surface.                                                                                               |
| 17  | ✅ **Probation & confirmation tracking**                                                            | 🟡  | Lifecycle state machine missing.                                                                                         |
| 18  | 🎁 **Benefits administration** (beyond insurance: NPS, meal card, enrolment windows)                | 🟡  |                                                                                                                          |
| 19  | 🏅 **Rewards & recognition / points / badges**                                                      | 🟡  | Engagement lever.                                                                                                        |
| 20  | 📋 **Surveys, pulse & eNPS**                                                                        | 🟡  |                                                                                                                          |
| 21  | ⚖️ **Grievance & disciplinary case management**                                                     | 🟡  | Tickets ≠ HR cases (confidentiality model differs).                                                                      |
| 22  | 🌍 **Multi-country payroll, multi-currency, multi-legal-entity**                                    | 🟡  | Required to sell outside one country.                                                                                    |
| 23  | 🎫 **Helpdesk SLA / escalation / CSAT**                                                             | 🟡  | Tickets have no SLA clock.                                                                                               |
| 24  | ✈️ **Travel & business trip management**                                                            | 🟢  | Pairs with expenses.                                                                                                     |
| 25  | 🪜 **Succession & workforce planning / headcount budget**                                           | 🟢  |                                                                                                                          |
| 26  | 👷 **Contractor / gig / deskless workforce**                                                        | 🟢  |                                                                                                                          |
| 27  | 🔧 **Asset lifecycle** (procurement, depreciation, AMC, return workflow)                            | 🟢  | Asset CRUD exists, lifecycle does not.                                                                                   |

---

## 3. Missing platform / SaaS capabilities

| #   | Capability                                                                      | Pri | Current state                                                                                        |
| --- | ------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------------------------------------------- |
| 1   | 🔐 **MFA / 2FA** (TOTP, passkeys)                                               | 🔴  | Zero matches for `mfa\|2fa\|totp` in `src/`. OTP exists only for password reset.                     |
| 2   | 🪪 **SSO — OIDC / SAML / Google / Microsoft**                                   | 🔴  | No auth lib in `package.json`. Enterprise deal-blocker.                                              |
| 3   | ⏲️ **Session / idle timeout, JWT `exp` check**                                  | 🔴  | `isAuthenticated()` is just `!!token` (`auth-api.ts:116`).                                           |
| 4   | 📥 **Bulk import (CSV/Excel in)**                                               | 🔴  | `ld-admin.ts:62` calls `notImplemented('CSV import')`. Tenant-migration blocker.                     |
| 5   | 🔔 **Notification backend + email/SMS/WhatsApp/push**                           | 🔴  | Store is hardcoded; no `SwPush`.                                                                     |
| 6   | 💳 **Payment gateway** (Stripe/Razorpay), dunning, usage metering, tax invoices | 🔴  | Billing UI with no payment SDK.                                                                      |
| 7   | ⚙️ **CI pipeline**                                                              | 🔴  | No `.github/`, no GitLab/Azure config.                                                               |
| 8   | 🏢 **Tenant resolution** (subdomain / custom domain / tenant switcher)          | 🟠  | Tenant read only from the localStorage login blob.                                                   |
| 9   | 🛡️ **Tenant scoping in interceptor**                                            | 🟠  | `TenantId` passed manually per call — easy to forget, cross-tenant leak risk.                        |
| 10  | 🚧 **Permission structural directive** (`*hasPermission`) + route guards        | 🟠  | Only 4 templates gate anything; guard used on 3 modules; `attendance` route has **no guard at all**. |
| 11  | 📡 **Realtime transport** (SignalR / WebSocket)                                 | 🟠  | None. Kanban, tickets, notifications all need it.                                                    |
| 12  | 🔎 **Global search / command palette (⌘K)**                                     | 🟠  | None.                                                                                                |
| 13  | 🚨 **Error telemetry** (Sentry / AppInsights)                                   | 🟠  | `global-error-handler.ts` logs to console only.                                                      |
| 14  | ↔️ **RTL support**                                                              | 🟠  | `ar.json` ships but no `dir` handling; `<html lang="en">` hardcoded.                                 |
| 15  | 🌐 **i18n coverage**                                                            | 🟠  | ~15 of ~600 templates translated. No `LOCALE_ID` / `registerLocaleData`.                             |
| 16  | 🕰️ **Timezone correctness**                                                     | 🟠  | Picker stored but never applied; `temporal-polyfill` installed and unused.                           |
| 17  | 🧪 **Test depth**                                                               | 🟠  | 180 specs but **zero** for interceptors, guards, core stores; 2 e2e specs.                           |
| 18  | ♿ **Automated a11y (axe) + a11y helpers**                                      | 🟠  | `CLAUDE.md` mandates WCAG AA; no `@axe-core`, no LiveAnnouncer/FocusTrap/skip-link.                  |
| 19  | 🔌 **Public API + webhooks + integration marketplace**                          | 🟠  | Slack/Teams/Google Cal/Zoom/accounting integrations all absent.                                      |
| 20  | 📜 **Data residency, GDPR DSAR/export/erasure, retention policy**               | 🟠  | None.                                                                                                |
| 21  | 📊 **Excel export**                                                             | 🟡  | No `xlsx`/`exceljs`; CSV export is ad-hoc per feature.                                               |
| 22  | 🚩 **Product analytics + feature flags**                                        | 🟡  | Neither present.                                                                                     |
| 23  | 👥 **SCIM provisioning / directory sync**                                       | 🟡  | None.                                                                                                |
| 24  | 📱 **Native mobile / deskless app**                                             | 🟡  | PWA only; Playwright tests desktop Chrome only.                                                      |
| 25  | 🖥️ **SSR / hydration**                                                          | 🟢  | No `@angular/ssr`. Acceptable for an internal-facing app.                                            |
| 26  | 📴 **Offline data strategy**                                                    | 🟢  | Service worker caches assets only, no `dataGroups`.                                                  |

---

## 4. 2026 trend features

All absent — there is **zero AI/LLM code in `src/`** and no AI SDK in `package.json`.

| #   | Trend feature                                                                                                      | Pri | Note                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------ | --- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 💬 **HR copilot / conversational assistant** (policy Q&A over docs, "how many leaves left?")                       | 🔴  | Baseline expectation for a 2026 HRMS.                                                                            |
| 2   | ⚖️ **Pay transparency & pay-equity / gender-gap analytics**                                                        | 🔴  | EU Pay Transparency Directive transposition deadline **June 2026** — hard regulatory driver.                     |
| 3   | 📕 **EU AI Act compliance for HR AI** (high-risk classification, explainability, human-in-the-loop, model logging) | 🔴  | HR use-cases are Annex III high-risk; obligations bite **Aug 2026**. Must ship _with_ any AI feature, not after. |
| 4   | 🧬 **Skills ontology / skills inference / skills-based talent architecture**                                       | 🔴  | The dominant 2026 HR paradigm — jobs decomposed into skills.                                                     |
| 5   | 📄 **AI resume parsing, screening & candidate matching**                                                           | 🔴  | Core of a 2026 ATS.                                                                                              |
| 6   | 🗣️ **Ask-your-data NL analytics** (natural language → chart/report)                                                | 🟠  | Substitutes for the missing report builder.                                                                      |
| 7   | 🕹️ **Agentic workflow automation** (auto-onboarding, auto-nudge, auto-triage tickets)                              | 🟠  | Beyond rules — agents that execute multi-step HR ops.                                                            |
| 8   | 🛠️ **No-code workflow / form builder for tenant admins**                                                           | 🟠  | Turns core gap #1 into a product differentiator.                                                                 |
| 9   | 🏪 **Internal talent marketplace** (gigs, stretch projects, mentorship matching)                                   | 🟠  | Depends on the skills ontology.                                                                                  |
| 10  | 🎓 **AI learning recommendations + adaptive paths + AI course generation**                                         | 🟠  | L&D module already built — cheapest place to add AI.                                                             |
| 11  | 📉 **Predictive attrition / flight-risk scoring**                                                                  | 🟠  |                                                                                                                  |
| 12  | ✍️ **AI-drafted performance reviews + bias detection in review text**                                              | 🟠  | PMS module exists; drop-in fit.                                                                                  |
| 13  | 🏢 **Hybrid work: desk/room booking, office-day planning, in-office attendance policy**                            | 🟠  |                                                                                                                  |
| 14  | 💼 **Slack / Teams employee-experience layer** (apply leave, approve, punch in from chat)                          | 🟠  |                                                                                                                  |
| 15  | 🔑 **Passwordless auth / passkeys (WebAuthn)**                                                                     | 🟠  | Pairs with platform gap #1.                                                                                      |
| 16  | 📝 **AI job-description & offer-letter generation**                                                                | 🟠  |                                                                                                                  |
| 17  | 😊 **Sentiment / engagement analysis from feedback & surveys**                                                     | 🟡  |                                                                                                                  |
| 18  | 🌱 **ESG / DEI / CSRD workforce reporting**                                                                        | 🟡  |                                                                                                                  |
| 19  | 💰 **Total rewards statement** (full comp + benefits value view)                                                   | 🟡  |                                                                                                                  |
| 20  | 🏦 **Earned wage access / on-demand pay**                                                                          | 🟡  |                                                                                                                  |
| 21  | 🧘 **Wellbeing, burnout detection, workload signals**                                                              | 🟡  | Derivable from tasks/attendance data already modeled.                                                            |
| 22  | 🎙️ **Voice + mobile-first deskless UX**                                                                            | 🟡  |                                                                                                                  |
| 23  | 🗓️ **AI interview scheduling + notes/transcript summarization**                                                    | 🟡  |                                                                                                                  |
| 24  | 🤝 **Manager copilot for 1:1s / continuous listening**                                                             | 🟡  |                                                                                                                  |
| 25  | 📈 **Usage-based / hybrid billing + in-product upgrade paths**                                                     | 🟡  |                                                                                                                  |
| 26  | 🎖️ **Verifiable credentials / digital certificate wallet**                                                         | 🟢  | L&D certificates already exist.                                                                                  |

---

## 5. Recommended sequencing

### Phase 0 — de-risk (before any new module)

1. Replace mock JSON with real APIs for Attendance, Leave transactions, Holidays, Payroll.
   _Verify:_ no file in `public/data/` is read by a store other than `aside-menu.json`.
2. Audit log + tenant-scoping interceptor + session timeout + MFA.
   _Verify:_ e2e test proves a cross-tenant request is rejected and an idle session logs out.
3. CI pipeline + guard/interceptor/store unit tests + axe in Playwright.
   _Verify:_ pipeline green on PR.

### Phase 1 — close the lifecycle

Approval workflow engine → Onboarding → Offboarding → Recruitment/ATS.
_Verify:_ each module drives an end-to-end flow through the shared engine, not its own.

### Phase 2 — operational HR

Timesheets · Shifts/Roster · Overtime · Expenses · Attendance capture (geofence/biometric) · Statutory payroll engine.

### Phase 3 — differentiate

HR copilot · skills ontology · pay-equity analytics with EU AI Act guardrails · talent marketplace · Slack/Teams layer · no-code workflow builder.

---

## 6. Re-verifying this inventory

- `rg "public/data" src/` — every mock-backed store.
- `rg "TODO|notImplemented|Coming soon" src/` — stubs.
- Compare `moduleKey` values in `public/data/aside-menu.json` against guards in `src/app/features/features.routes.ts` — reveals ungated routes (`attendance` has none).
