---
name: sk-remove-dead-code
description: Find and safely remove dead code — unused exports, imports, components, styles, dependencies
argument-hint: '[file | feature | folder | "full app"]'
allowed-tools: Read, Grep, Glob, Edit, Bash
disable-model-invocation: true
---

# Remove Dead Code

Find and safely remove dead code in: **$ARGUMENTS**

No target above? Use the one the user named with the skill; if none, ask.

If no argument is given, ask whether to scan a specific feature, folder, or the full app before proceeding.

## Step 1 — Detect

Scan the target and identify dead code. Verify every candidate with a project-wide search before flagging it — never trust a single file's view.

### TypeScript / Angular

- Unused imports and unused local variables
- Exported functions, classes, types, and constants with zero references outside their file
- Components, directives, and pipes never referenced in any template or route
- Services never injected anywhere
- Routes pointing to components that are unreachable from navigation
- Unused `input()`/`output()` properties on components
- Dead branches — conditions that can never be true, code after early returns
- Commented-out code blocks
- Unused enum members, interface fields no longer read anywhere
- Old feature-flag branches where the flag is permanently on/off

### Templates & Styles

- Template references to removed component members
- Unused CSS classes and styles in component stylesheets
- Custom CSS that duplicates existing Tailwind utilities
- Orphaned asset files (images, icons) no longer referenced

### Project Level

- Dependencies in `package.json` never imported (`npx depcheck`)
- Unused environment config keys
- Orphaned files — modules not imported by anything reachable from `main.ts`
- Stale barrel exports (`index.ts` re-exporting deleted symbols)
- Detection tools to run where available: `npx knip`, `npx depcheck`, `ng build` warnings, `tsc --noUnusedLocals --noUnusedParameters`

## Step 2 — Report

Before deleting anything, present findings as a table:

| Confidence | Item | Location  | Type                     | Evidence |
| ---------- | ---- | --------- | ------------------------ | -------- |
| ✅Safe/⚠️Risky | ...  | file:line | import/export/component/dep/... | zero refs found / only ref is X |

- **✅ Safe** — zero references confirmed by project-wide search; remove in this pass
- **⚠️ Risky** — possibly used dynamically (string-based routing, reflection, DI tokens, external consumers, public API) — list but do NOT remove without explicit confirmation

Wait for confirmation before deleting unless the user said "remove everything safe".

## Step 3 — Remove

- Delete in dependency order: usages first, then declarations, then files, then `package.json` entries
- Remove the entire dead unit — don't leave empty files, empty barrel exports, or orphaned tests for deleted code
- One logical group per change (e.g. "remove unused export X and its tests") so each is independently revertible
- Never delete: public API surface consumed outside the repo, database migrations, generated files, or anything flagged ⚠️ Risky

## Step 4 — Verify

- Run `ng build` — must pass with no new warnings
- Run the full test suite — must pass
- Run lint — must pass
- Re-search each deleted symbol name to confirm nothing references it
- Summarize: items removed, lines deleted, dependencies dropped, and risky items left for review

## Rules

- A project-wide reference search is mandatory before every deletion — string-search template files too, since Angular templates reference members by name
- Watch for dynamic usage: `loadComponent` string paths, DI injection tokens, `@Inject()`, reflection, JSON config referencing class names
- When in doubt, classify as ⚠️ Risky and ask — never guess
- Deletion only; never "improve" surviving code in the same pass
