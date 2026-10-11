---
name: sk-write-tests
description: Write meaningful unit and component tests for Angular code — services, components, pipes, guards, interceptors
argument-hint: '[file | component | service | feature]'
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
disable-model-invocation: true
---

# Write Tests

Write meaningful tests for: **$ARGUMENTS**

No target above? Use the one the user named with the skill; if none, ask.

If no argument is given, ask which file, component, or feature to test before proceeding.

## Step 1 — Understand

Before writing any test:

- Read the target code and every dependency it injects or imports
- Identify the public behavior — what callers and templates rely on, not internals
- Check existing specs for the project's conventions: mocking style, helpers, `TestBed` patterns (runner is Vitest, see `.claude/docs/commands.md`)
- List the behaviors worth testing: happy path, edge cases, error paths, boundary values
- Skip what's not worth testing: trivial getters, framework behavior, third-party code

## Step 2 — Plan

Present a test plan before writing:

| # | Behavior under test | Type | Cases |
| - | ------------------- | ---- | ----- |
| 1 | ...                 | unit/component | happy, error, edge |

Wait for confirmation unless the user said "just write them".

## Step 3 — Write

### General

- One behavior per test; name tests `should <expected behavior> when <condition>`
- Arrange–Act–Assert structure, visually separated
- Test through the public API — never call private methods or poke private state
- Each test independent: no shared mutable state, no order dependence
- Use factory functions for test data (`createEmployee(overrides)`) — no giant inline fixtures
- Strong typing throughout — no `any` in specs

### Services

- Mock injected dependencies at the boundary (`provide: X, useValue: mock`)
- HTTP: use `provideHttpClientTesting` + `HttpTestingController`; verify no outstanding requests in teardown
- Test business logic thoroughly — this is where most cases belong
- Cover error propagation: failed requests, invalid input, empty results

### Components

- Use `TestBed` with the standalone component directly; mock services, not child rendering, unless interaction matters
- Test behavior through the DOM: set inputs (`fixture.componentRef.setInput`), click buttons, read rendered output
- Assert on what the user sees — rendered text, disabled states, emitted outputs — not on internal signals
- Cover the state matrix: loading, success, empty, error
- Use `fixture.detectChanges()`/`await fixture.whenStable()` correctly with signals and async

### Pipes, Guards, Interceptors

- Pipes: pure input→output tables, including null/undefined/boundary values
- Guards: `TestBed.runInInjectionContext` with mocked router/auth state; test allow, deny, and redirect
- Interceptors: assert request mutation and error handling via `HttpTestingController`

### RxJS & Async

- Zoneless app: use Vitest fake timers (`vi.useFakeTimers()`), `await TestBed.inject(ApplicationRef).whenStable()`, or marble testing over real timers
- Test debounce/retry/cancellation logic explicitly
- Never use arbitrary `setTimeout` waits in tests

## Step 4 — Verify

- Run the new specs — all must pass
- Temporarily break the implementation mentally (or via mutation) — would each test catch it? Delete tests that can't fail
- Run the full suite to confirm nothing else broke
- Run lint on new spec files
- Summarize: behaviors covered, cases per behavior, and anything intentionally not tested with reasons

## Rules

- Test behavior, not implementation — a refactor that preserves behavior must not break tests
- No snapshot tests as a substitute for real assertions
- No `xit`/`fit`/skipped tests left behind
- Coverage is a byproduct, not a goal — never write assertion-free tests to inflate numbers
- If the code is untestable as written (hidden dependencies, static calls), report it and propose the minimal refactor instead of writing bad tests
