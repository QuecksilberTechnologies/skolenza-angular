---
name: sk-clean-code
description: Refactor code for readability and maintainability — naming, structure, duplication, typing, modern Angular patterns
argument-hint: '[file | component | service | feature]'
allowed-tools: Read, Grep, Glob, Edit, Bash
disable-model-invocation: true
---

# Clean Code

Refactor for readability and maintainability, behavior-preserving only: **$ARGUMENTS**

No target above? Use the one the user named with the skill; if none, ask.

If no argument is given, ask which file, component, or feature to clean before proceeding.

Note: this command improves code quality without changing behavior. For deleting unused code use `/sk-remove-dead-code`; for speed use `/sk-optimize-performance`.

## Step 1 — Analyze

Read the target and its callers, then identify issues:

### Naming

- Vague names: `data`, `temp`, `flag`, `handle()`, `doStuff()`, `item2`
- Names that lie — `getUser()` that also mutates state, `isValid` holding an error message
- Non-standard abbreviations; inconsistent terms for the same concept across files
- Booleans not phrased as predicates (`active` → `isActive`); files not kebab-case, classes not PascalCase

### Functions & Structure

- Functions doing more than one thing — mixed levels of abstraction in one body
- Long functions that need section comments to navigate → extract named functions
- Deep nesting (>2 levels) → guard clauses, early returns
- Long parameter lists (>3) → options object with a typed interface
- Boolean flag parameters switching behavior → split into two functions
- Magic numbers and strings → named constants

### Duplication & Abstraction

- Copy-pasted logic across files → extract to shared utility or service
- Near-duplicates differing in one value → parameterize
- Premature abstraction — single-use generics, wrappers that only delegate, interfaces with one implementation and no test seam
- Utilities reimplementing existing project helpers or standard APIs

### Typing

- `any`, implicit `any`, unjustified `as` casts and non-null assertions (`!`)
- Missing return types on exported functions
- Stringly-typed values that should be union types or enums
- Interfaces duplicated instead of imported from models; types defined far from where they belong

### Angular Patterns

- Constructor injection → `inject()`
- `@Input()`/`@Output()` decorators → `input()` / `output()` functions
- `*ngIf`/`*ngFor` → `@if` / `@for` control flow
- Logic in components that belongs in services; HTTP calls made directly from components
- Lifecycle hook bodies that should be `computed()` or `effect()`
- State scattered across class fields → consolidated signals
- Components doing too much → split container/presentational where it clarifies

### Comments & Hygiene

- Comments explaining *what* instead of *why* — delete or replace with better names
- Stale comments contradicting the code; commented-out code blocks
- `console.log` leftovers, unused imports, TODOs without context
- Missing JSDoc on exported/public functions where intent isn't obvious

## Step 2 — Report

Before changing anything, present findings as a prioritized table:

| Priority | Issue | Location  | Impact                 | Fix |
| -------- | ----- | --------- | ---------------------- | --- |
| P0/P1/P2 | ...   | file:line | 🔴 High/🟠 Med/🟡 Low | ... |

- **P0** — actively misleading (lying names, stale comments, `any` hiding bugs) — fix now
- **P1** — friction for the next reader (duplication, nesting, legacy patterns) — fix in this pass
- **P2** — style polish — note for backlog

Wait for confirmation before applying fixes unless the user said "fix everything".

## Step 3 — Refactor

- One refactor at a time, smallest safe steps; keep each independently revertible
- Renames must update all references — including templates, specs, and route configs
- Update tests for renames/moves, but never change what a test asserts
- Match existing project conventions over personal preference
- Do not add features, fix unrelated bugs, or change behavior — if a real bug surfaces, report it separately instead of silently fixing it

## Step 4 — Verify

- Run `ng build`, full test suite, and lint — all must pass
- Diff review: confirm every change is naming, structure, or typing — zero behavior changes
- Summarize: issues fixed, patterns modernized, any P2 items and discovered bugs deferred

## Rules

- Behavior-preserving is the contract — identical inputs must produce identical outputs
- Clarity beats cleverness; if a "clean" version is harder to follow, keep the plain one
- Don't abstract until the third occurrence — duplication is cheaper than the wrong abstraction
- Never introduce `any` or loosen types to make a refactor compile
