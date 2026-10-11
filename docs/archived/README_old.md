# Archived files

Files retired by the cleanup described in
[`docs/junk-and-deprecated-report.md`](../junk-and-deprecated-report.md), applied **2026-08-17**.

Nothing here was deleted — every file kept its path relative to the repository root, prefixed
with `docs/archived/`. To restore one, strip that prefix:

```sh
git mv docs/archived/src/app/... src/app/...
```

## Why this folder is inert

- `tsconfig.app.json` / `tsconfig.spec.json` scope to `src/**`, so nothing here compiles.
- `angular.json` build assets read from `public/`, and its lint target from `src/**`.
- `ng test` discovers specs with `cwd: src/`.
- `eslint.config.js` ignores `docs/archived/**`; `.prettierignore` lists `docs/archived/`.

Both of those last two entries are load-bearing: `lint-staged` globs `*.ts` unanchored and
passes ESLint explicit paths, which bypasses `lintFilePatterns`. Without them, committing
would auto-fix and reformat every archived file.

## Contents

See `MANIFEST.txt` in this folder for the full list of moved paths.
