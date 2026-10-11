# AxionPro HRMS Frontend – Technical Specification

Scope note: this file holds the **design rationale and cross-cutting policy** that the code cannot
explain on its own. Anything reconstructible by reading the repo (stack versions, folder tree, guard
list, naming conventions) has deliberately been left out — read `package.json`, `tsconfig.json`, and
`src/app/` for those. Day-to-day working rules live in `.claude/docs/`, which is loaded into every
session:

| Topic | File |
|---|---|
| Layers, API service shape, request pipeline, routing gates, UI library rules | `.claude/docs/architecture.md` |
| Signal Store patterns and rules | `.claude/docs/state-management.md` |
| Forms & validation (zod schema policy) | `.claude/docs/forms.md` |
| Angular/TypeScript standards | `.claude/docs/angular-standards.md` |
| Build, test, lint, e2e commands | `.claude/docs/commands.md` |
| Permission matrix wiring | `.claude/skills/permission-matrix/SKILL.md` (loaded on demand) |

---

## 1. Overview

| Field | Value |
|---|---|
| **Project Name** | AxionPro HRMS |
| **Type** | Enterprise Web Application (SPA + PWA ready) |

### Backend

- ASP.NET Core (separate repo)
- API Base: `https://axionpro-be.onrender.com`
- Swagger: `https://axionpro-be.onrender.com/swagger/index.html`

---

## 2. Architecture Principles

- SPA with standalone components (no NgModules)
- API-driven — no business logic duplication in frontend
- Signal-first reactive state; RxJS only at API/resource boundaries
- Feature-based modular structure with lazy loading everywhere

Layer responsibilities, the `BaseService` API-service contract, the interceptor order, and the two
route gates are documented in `.claude/docs/architecture.md`. Do not restate them here — one rule,
one place.

---

## 3. State Management

**NgRx Signal Store** (`@ngrx/signals`) — NOT classic NgRx.

The store composition pattern (`withState` / `withProps` + `rxResource` / `withComputed` /
`withMethods`), the `patchState`-only rule, and where optimistic updates belong are all in
`.claude/docs/state-management.md`. Reference implementations:
`features/departments/departments.store.ts` and
`features/assets-management/asset-category/asset-category.store.ts`.

---

## 4. Forms

**Signal Forms** for all new forms. Existing Reactive Forms (`NonNullableFormBuilder`) stay as-is —
migrate opportunistically, not in bulk. Never Template-driven.

All validation lives in a colocated **zod** schema wired through `validateStandardSchema()` — see
`.claude/docs/forms.md` for the convention and its accepted tradeoffs. The legacy validators in
`shared/validators/` serve the remaining Reactive forms only; new Signal Forms do not use them.

---

## 5. Security

- JWT-based authentication (auth interceptor)
- Role + permission-based UI rendering and route guards
- No sensitive logic in frontend

---

## 6. Error Handling

- `error-interceptor` + `global-error-handler` for API/app errors
- Toast notifications via Optimus (`Common.showMessage`)
- Feature-level error states in stores

---

## 7. UI Library

The UI library is `@openng/optimus-ui` (v2), a PrimeNG-compatible fork: `p-*` selectors,
`pi pi-*` icon classes, and `--p-*` theme tokens are unchanged from PrimeNG. Theme preset lives in
`core/axion-preset.ts`.

The live authoring rules — `class` instead of the deprecated `styleClass`, Tailwind v4's trailing
`!` modifier, non-functional `showTransitionOptions`/`hideTransitionOptions`, and the
projected-template-by-reference-name constraint — are in `.claude/docs/architecture.md`.

**Historical note.** The app migrated off PrimeNG; no `primeng`, `primeuix`, or `primeicons` package
remains. Old imports map as `primeng/<module>` → `@openng/optimus-ui/<module>`, `primeng/api` →
`@openng/optimus-ui/api`, `@primeuix/themes` → `@openng/optimus-ui-themes`, `primeicons` →
`@openng/icons`, `tailwindcss-primeui` → `@openng/optimus-ui-tailwindcss`, and the `PrimeNG` config
service → `Optimus` from `@openng/optimus-ui/config`. Kept only for reading archived code under
`docs/archived/`.

---

## 8. Future Enhancements

- SSR / ISR support
- Micro frontend architecture
- AI-based insights (attendance/leave prediction)
- Mobile APK via Capacitor
