---
name: commit
description: Create well-formatted conventional commits, splitting into atomic commits when needed
argument-hint: '[--no-verify]'
allowed-tools: Bash(git:*), Bash(bun run:*), Bash(ng:*)
disable-model-invocation: true
---

# Commit

Create one or more conventional commits from the current changes.

## Steps

1. Unless `--no-verify` is passed, run pre-commit checks and stop on failure (ask whether to fix or proceed):
   - `bun run lint`
   - `bun run build`
2. Run `git status` to see staged files:
   - If files are already staged, commit ONLY those files.
   - If nothing is staged, stage all modified and new files.
3. Run `git diff --staged` to understand the changes.
4. If the diff contains multiple distinct logical changes, propose splitting into separate commits and stage/commit each group separately.
5. Write the commit message(s) per the format below.

## Commit Message Format

```
<emoji> <type>(<scope>): <description>

Co-Authored-By: Sujeet Jaiswara <sujeetjaiswara2012@gmail.com>
```

- **Scope** (optional): feature folder name, e.g. `feat(departments): ...`, `fix(leaves): ...`
- Imperative, present tense: "add feature", not "added feature"
- First line under 72 characters, no trailing period
- Exactly one emoji, prefixed, matching the type:

| Emoji | Type | Use for |
|---|---|---|
| ✨ | `feat` | New feature |
| 🐛 | `fix` | Bug fix |
| 🚑️ | `fix` | Critical hotfix |
| 📝 | `docs` | Documentation |
| 💄 | `style` | Formatting / UI styling |
| ♻️ | `refactor` | Code refactoring |
| ⚡️ | `perf` | Performance |
| ✅ | `test` | Tests |
| 🔧 | `chore` | Tooling, config |
| ➕ / ➖ | `chore` | Add / remove dependency |
| 👷 | `ci` | CI/CD |
| ⏪️ | `revert` | Revert changes |
| ♿️ | `feat` | Accessibility |
| 🔒️ | `fix` | Security fix |

### Examples

```
✨ feat(employees): add bulk import from xlsx
🐛 fix(attendance): resolve duplicate check-in on slow network
♻️ refactor(departments): move optimistic updates into store
📝 docs: update permission matrix notes in SPEC.MD
🔧 chore(vercel): print Angular error log when build fails
```
