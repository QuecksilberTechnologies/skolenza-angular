---
name: sk-bundle-size-root-cause
description: Find the root cause of an Angular build/bundle size increase — which commit, import, or dependency made the bundle grow
argument-hint: '[chunk name | "initial" | commit range e.g. v1.2..HEAD]'
allowed-tools: Read, Grep, Glob, Bash
disable-model-invocation: true
---

# Find Bundle Size Increase Root Cause

Diagnose why the Angular build output grew, for: **$ARGUMENTS**

No target above? Use the one the user named with the skill; if none, ask.

If no argument is given, ask what was observed — which chunk grew, by how much, and since when (last release, specific commit, "sometime this month") — before proceeding.

## Step 1 — Measure the Current State

Establish facts before guessing:

- Run a production build and capture per-chunk sizes:

  ```bash
  bun run build -- --configuration production --stats-json
  ```

- Record: initial bundle total, each lazy chunk, and styles — raw and transfer size
- Compare against the Angular budget warnings in `angular.json` and any previously recorded sizes (CI logs, previous `stats.json`)
- Identify WHICH output grew: initial bundle, a specific lazy chunk, styles, or polyfills — the culprit class differs for each

## Step 2 — Analyze Composition

Open the stats and find what's inside the grown chunk:

```bash
bunx source-map-explorer dist/**/browser/*.js
# or
bunx webpack-bundle-analyzer dist/**/stats.json
# Angular ESBuild output:
bunx esbuild-visualizer --metadata dist/**/stats.json
```

Look for the usual suspects:

### Dependency Bloat

- A new or updated dependency pulling in large transitive packages
- Duplicate packages at different versions (`bun why <pkg>`) — two copies of the same lib bundled
- Full-library imports breaking tree-shaking: `import * as _ from 'lodash'`, `import moment`, full `rxjs` paths, entire icon packs, full chart libraries
- CommonJS dependencies that can't tree-shake (check build warnings for "CommonJS or AMD dependencies")

### Lazy-Loading Regressions

- A previously lazy route changed to an eager import — one `import { X }` at the top of a shared file can pull an entire feature into the initial bundle
- A shared module/component importing something feature-specific, dragging it into every chunk
- Barrel files (`index.ts`) re-exporting heavy modules, defeating code splitting
- `@defer` blocks removed or their dependencies referenced eagerly elsewhere

### Code & Assets

- Large generated code, inlined JSON/data files, base64-inlined assets
- Global styles importing a whole framework or font set into `styles.css`
- Source maps or dev artifacts accidentally shipped in the production config

## Step 3 — Bisect to the Cause

If composition analysis doesn't make the cause obvious, find the exact commit:

```bash
# Build sizes across the suspect range
git bisect start <bad-commit> <good-commit>
# At each step: bun install --frozen-lockfile && bun run build -- --configuration production
# Compare main chunk size; mark good/bad accordingly
```

- Check `bun.lock` diffs in the suspect range first — dependency bumps are the most common cause and faster to spot than bisecting
- For each suspect commit, identify the exact import line that introduced the growth

## Step 4 — Report & Recommend

Present the root cause analysis:

| Finding | Evidence | Size impact | Fix |
| ------- | -------- | ----------- | --- |
| ...     | chunk/module path, commit | +X KB | ... |

For each cause, propose the targeted fix:

- Full import → named/deep import or tree-shakeable alternative
- Eager feature pull-in → restore `loadComponent`/`loadChildren`, break the offending import, or split the barrel file
- Heavy dependency → lighter alternative (e.g. date-fns over moment), `@defer` it, or lazy-load on first use
- Duplicate versions → dedupe via resolution/override in `package.json`
- Then: update `angular.json` budgets to current healthy size so CI catches the next regression at PR time

Apply fixes only after confirmation, and re-run the production build after each fix to verify the recovered size.

## Rules

- Measure, don't guess — every claimed cause must be backed by stats output or a bisected commit
- Compare transfer (gzip/brotli) size for user impact, raw size for analysis — state which you're quoting
- One variable at a time when bisecting — same Bun version, `bun install --frozen-lockfile` not plain `bun install`
- Never "fix" by raising budgets — budgets change only after the cause is understood and accepted
- If multiple causes contribute, report all with individual size impact, largest first
