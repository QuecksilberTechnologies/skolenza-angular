# Commands

Package manager is **bun** (`packageManager: bun@1.3.11`) — use `bun install`, not npm.

## Unit tests (Vitest via the `@angular/build:unit-test` builder)

There is no `vitest.config.ts` — filtering goes through builder flags:

```bash
bun run test                                                            # whole suite (jsdom, no browser)
bun run test -- --include src/app/core/stores/auth.store.spec.ts        # single spec file
bun run test -- --include "src/app/core/stores/**"                      # a directory
bun run test -- --filter "AuthStore"                                    # regex on suite/test name
bun run test -- --coverage
bun run test -- --watch
```

Global mocks (`matchMedia`, `IntersectionObserver`, `ResizeObserver`) live in `src/test-setup.ts`,
wired via `angular.json` → `test.options.setupFiles`.

## E2E (Playwright)

```bash
bun run e2e                  # headless; auto-starts the dev server (webServer in playwright.config.ts)
bun run e2e:ui               # interactive
bun run e2e -- e2e/login.spec.ts
```

E2E never hits the real backend — every response is mocked at the network layer by glob-matched
routes in `e2e/fixtures/*-mocks.ts` (`auth-mocks.ts`, `module-mocks.ts`, `operation-mocks.ts`,
`plan-mocks.ts`), so the real API host is irrelevant.
