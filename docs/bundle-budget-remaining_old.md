# Remaining initial-bundle budget overage

**Status:** open, not started. Follow-up to the Sentry lazy-load fix (commit `1404e79e`).

## Where things stand

`bun run build` fails the `initial` budget in `angular.json` (`maximumError: "1MB"`):

- Before: 1.10 MB initial, 96.46 kB over budget.
- After lazy-loading `@sentry/angular` (`src/main.ts`, `src/app/core/services/global-error-handler.ts`):
  1.01 MB initial, **8.78 kB over budget**.

No further eager-but-shouldn't-be-eager imports were found - the Sentry fix was the only clean,
low-risk win. Everything below requires a larger, riskier change and was intentionally left for
later.

## What's left in the initial bundle (verified via `bun run analyze`)

| Chunk           | Raw size         | What it is                                                                                                                                                                                           |
| --------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| unnamed chunk   | 254.00 kB        | RxJS core (`Zn`/`ti` unsubscription-error helpers confirmed in source) - required by Router/HttpClient/Forms, not reducible without dropping framework features                                      |
| `styles-*.css`  | 217.76 kB        | Global stylesheet - see breakdown below                                                                                                                                                              |
| `main-*.js`     | 152.27 kB        | App entry                                                                                                                                                                                            |
| unnamed chunk   | 127.65 kB        | Angular core/common/router framework code (contains `ɵɵ` Ivy instructions)                                                                                                                           |
| unnamed chunk   | 99.99 kB         | Our own eager core code - imports from the RxJS and Angular-core chunks; contains `userType===Host` style checks, i.e. auth/permissions store or guard code reachable from `app.config.ts` providers |
| everything else | ~120 kB combined | Small interceptors/guards/providers, no single large offender                                                                                                                                        |

`styles-*.css` (217.76 kB, counts toward the `initial` budget) is built from `src/styles.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter...');
@import 'tailwindcss';
@import '@openng/icons/openng-icons.css'; /* full icon-set CSS, not tree-shaken */
@import '@openng/optimus-ui-tailwindcss'; /* full Optimus UI theme CSS, not tree-shaken */
```

Plus ~300 lines of hand-written global overrides in the same file (`.p-datatable`, `.pms-reviews-table`,
`.employee-action-menu`, focus-ring tokens, etc.) - these are small individually, not the driver.

No `tailwind.config.*` exists (Tailwind v4 CSS-first config, no explicit `@source` restriction found).
The two `@openng/*` imports are prebuilt CSS from the UI library, not something Tailwind's purge can
touch - they are the likely bulk of the 217.76 kB, but this wasn't measured in isolation.

## Why nothing further was done

- `ConfirmationService`, `DialogService`, `MessageService` are eagerly provided in `app.config.ts`
  and injected in 90+ files, including `app.ts` and `layout/app-header/app-header.ts` (always
  loaded). Moving their providers out of the eager root config would break global dialogs/toasts
  for every lazy feature that expects them - not safe without redesigning how those are wired.
- The two unnamed framework/RxJS chunks (254 kB + 127.65 kB) are Angular/RxJS itself - no
  actionable reduction without removing Router/HttpClient/Forms usage.
- The 99.99 kB own-code chunk is auth/permissions infrastructure needed on every route (guards,
  interceptors) - candidate for scrutiny but needs a proper trace of exactly which store/service
  it is (not identified precisely - source maps for this chunk were broken, see below) before
  deciding whether any of it can be trimmed or deferred.
- Trimming `@openng/optimus-ui-tailwindcss` / `@openng/icons` CSS would need either an upstream
  library option for a scoped/smaller CSS build, or manually curating which Optimus component
  styles are imported - both are bigger changes with real visual-regression risk across the whole
  app, out of scope for a quick budget fix.

## Tooling note

`bun run analyze` (`source-map-explorer`) failed to produce a full combined HTML report for this
build - most generated chunks report broken/mismatched source maps ("Your source map refers to
generated column Infinity..."), and worker files (`ngsw-worker.js`, `safety-worker.js`,
`worker-basic.min.js`) have no source maps at all. Only per-chunk inspection (raw grep on the
minified output for tell-tale strings) worked. Fixing source maps for this build (or finding a
config that gets `source-map-explorer` past those errors) would make the next optimization pass
much faster.

## Suggested next steps (not started)

1. Fix `bun run analyze` source maps (or find a workaround) so the actual byte breakdown of the
   217.76 kB CSS bundle and the 99.99 kB own-code chunk can be measured directly instead of
   inferred.
2. Once measured, decide whether `@openng/optimus-ui-tailwindcss` / `@openng/icons` support a
   scoped import (only the components actually used) - check the package's docs/exports for that
   option before assuming a rewrite is needed.
3. Identify exactly which store/guard makes up the 99.99 kB own-code chunk and check whether any
   part of it (e.g. a rarely-hit permission check) can be split into a lazily-loaded piece without
   changing guard behavior on the eager route chain.
4. Only if 1-3 don't close the gap: revisit whether the root-provided `DialogService` /
   `ConfirmationService` / `MessageService` trio can be restructured (e.g. provided at the layout
   level instead of app root) without breaking any of their 90+ call sites - audit every call site
   first, this is the riskiest option.
