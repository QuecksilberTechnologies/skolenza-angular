# Architecture

Angular 22 SPA, **zoneless** — `zone.js` is not a dependency at all (v21+ default). In tests that
means no `fakeAsync`/`tick`: use `await TestBed.inject(ApplicationRef).whenStable()` or awaited
promises, and `takeUntilDestroyed()` outside an injection context needs an explicit `DestroyRef`.

Layers under `src/app/`:

| Layer                    | Rule                                                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `core/services/*-api.ts` | Pure HTTP wrappers. No state, no loading flags                                                                                   |
| `core/stores/`           | App-wide signal stores, `providedIn: 'root'` — auth, layout, lookup, notification, checkin, current-user-permissions, aside-menu |
| `features/<feature>/`    | Flat per feature: `x.ts` / `x.html` / `x.css` / `x.store.ts` / `x.spec.ts`                                                       |
| `layout/`                | App shell — header, aside menu                                                                                                   |
| `shared/`                | Presentational components, interfaces, pipes, validators, utilities. Must NOT import from `features/`                            |

Retired components live outside `src/` in `docs/archived/` (paths kept relative to the repo root, see
`docs/archived/README.md`). That folder is inert — excluded from build, lint, format, and tests.
Don't extend it; don't delete from it unasked.

## API service shape

Every `*-api.ts` extends `BaseService` (`core/services/base-service.ts`) and composes the full URL
from `environment.apiUrl` — there is no base-URL interceptor. Copy the shape from any existing
`core/services/*-api.ts`.

`BaseService` supplies `handleError()` (unwraps the API envelope, ASP.NET `ProblemDetails`, and
`errors: string[]` model-validation shapes), `makeHttpParams()`, and `handleHttpContext()` for the
`SKIP_AUTH` token. This class is the mocking boundary in tests.

## Routing & access control

Root `app.routes.ts` → lazy `features/features.routes.ts` (`loadComponent` everywhere). Two
independent gates, sometimes both on one route:

- `roleTypeGuard([...])` — coarse, by `roleTypeId` (`0=Host, 1=Admin, 2=Employee, 3=Manager`)
- `hasModulePermissionGuard('Employees')` — fine-grained, off the permission matrix

`moduleKey` strings must match the backend's `moduleName` case-insensitively. Menu items in
`layout/app-aside-menu/app-aside-menu.ts` soft-gate through `canAccessOrUnknown(moduleKey)` so
untracked legacy modules stay visible; action buttons and destructive ops hard-gate through
`canAccess` / `canPerform`.

## UI library

`@openng/optimus-ui` v2 is a PrimeNG-compatible fork: `p-*` selectors, `pi pi-*` icon classes,
`--p-*` theme tokens. Theme preset in `core/axion-preset.ts`, dark mode via the `.dark` selector.

- `styleClass` is deprecated → use the native `class` attribute on Optimus components. Overlays
  whose panel moves to `body` (`p-tieredmenu [popup]`, `p-contextMenu`, `p-confirmDialog`, `p-drawer`)
  leave the host `class` behind: style the panel through `[pt]="{ root: { class: '…' } }"` or a
  global rule on the component's root class (`.p-confirmdialog`), never `styleClass`
- Tailwind v4 important modifier goes **after** the utility: `pl-10!`, never `!pl-10`
- `showTransitionOptions` / `hideTransitionOptions` are non-functional (animations are native CSS)
- Optimus resolves projected templates **by reference name** (`#empty`, `#item`, `#selectedItem`,
  `#content`, `#header`, `#headless`, `#title`) — these names are the library's API and must not be
  renamed. Because a name may appear only once per template, a template hosting several of the same
  Optimus component must delegate to a wrapper that owns the marker: `shared/components/`
  `select-field`, `country-select`, `status-dot-select`, `section-card`, `headless-drawer`,
  `asset/asset-status-select`. Prefer the plain inputs first — `optionLabel`, `dropdownIcon`,
  `panelStyleClass="select-option-truncate"` — which remove most markers outright. Wrappers reach
  the surrounding form via `viewProviders: [{ provide: ControlContainer, useFactory: () =>
inject(ControlContainer, { skipSelf: true }) }]` plus a `controlName` input, so callers keep
  using `formControlName`. Do NOT reach for the legacy `pTemplate="..."` syntax.
