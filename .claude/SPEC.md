# Skolenza Frontend: Technical Specification

Design rationale and cross-cutting policy the code cannot explain on its own. Anything readable from
the repo (stack versions, folder tree, guard list, naming) stays out: read `package.json`,
`tsconfig.json`, and `src/app/` for those.

Migrated from the AxionPro `SPEC_old.MD` (removed; see git history). This file holds the accepted
Skolenza decisions.

## Where the rules live

One rule, one place. This file links to the docs below instead of restating their rules.

| Topic                                                      | File                                      |
| ---------------------------------------------------------- | ----------------------------------------- |
| Layers, API service shape, routing gates, UI library rules | `.claude/docs/architecture.md`            |
| Signal Store patterns                                      | `.claude/docs/state-management.md`        |
| Angular/TypeScript standards                               | `.claude/docs/angular-standards.md`       |
| Forms and zod schemas                                      | This file, section 4                      |
| Accessibility                                              | `.claude/docs/accessibility.md`           |
| User-facing copy                                           | `.claude/docs/ui-copy.md`                 |
| Build, test, lint, e2e commands                            | `.claude/docs/commands.md`                |
| Locked behavior and pre-change gates                       | Backend `LOCKED_FIXES.md` (see AGENTS.md) |

## 1. Overview

- **Project:** Skolenza, enterprise SPA, PWA-ready.
- **Backend:** ASP.NET Core, separate repo `QuecksilberTechnologies/Skolenza.be`.
- **API base:** `environment.apiUrl` (`https://skolenza-api.onrender.com/api` in production).
- **Swagger:** https://skolenza-api.onrender.com/swagger/index.html

## 2. Architecture principles

- Standalone components only, no NgModules.
- API-driven: no business logic duplicated in the frontend.
- Signal-first state. RxJS only at API and resource boundaries.
- Feature-based structure, lazy-loaded everywhere.

## 3. State management

NgRx Signal Store (`@ngrx/signals`), not classic NgRx. Patterns and reference stores:
`.claude/docs/state-management.md`.

## 4. Forms

- Signal Forms for new forms. Existing Reactive Forms (`NonNullableFormBuilder`) stay; migrate
  opportunistically, not in bulk. Never Template-driven.
- Signal Form validation lives in a colocated zod schema (`<component>.schema.ts`) wired through
  `validateStandardSchema()`. Example: `features/attendance-policies/attendance-policy-form/`.
- `shared/validators/` serves the remaining Reactive Forms only.

## 5. Security

- JWT authentication through `core/interceptors/auth-interceptor.ts`.
- UI rendering and routes gated by role and by the permission matrix.
- No sensitive logic in the frontend. The backend is the authority.

## 6. Error handling

- `core/interceptors/error-interceptor.ts` for HTTP errors; global `ErrorHandler` registered in
  `app.config.ts` for app errors.
- User feedback as Optimus toasts through `showMessage()` on the `Common` service
  (`core/services/common.ts`).
- Feature-level error state lives in the feature store.

## 7. UI library

`@openng/optimus-ui` v2, a PrimeNG-compatible fork. Theme preset: `core/skolenza-preset.ts`.
Authoring rules: `.claude/docs/architecture.md`.

The app migrated off PrimeNG; no `primeng`, `primeuix`, or `primeicons` package remains. Import
map, for reading archived code under `docs/archived/` only:

| Old                      | New                                        |
| ------------------------ | ------------------------------------------ |
| `primeng/<module>`       | `@openng/optimus-ui/<module>`              |
| `primeng/api`            | `@openng/optimus-ui/api`                   |
| `@primeuix/themes`       | `@openng/optimus-ui-themes`                |
| `primeicons`             | `@openng/icons`                            |
| `tailwindcss-primeui`    | `@openng/optimus-ui-tailwindcss`           |
| `PrimeNG` config service | `Optimus` from `@openng/optimus-ui/config` |

## 8. Roadmap

No Skolenza roadmap accepted yet. The AxionPro list (SSR/ISR, micro frontends, AI attendance and
leave prediction, Capacitor APK) from the old spec is not adopted.
