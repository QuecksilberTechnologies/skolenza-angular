# AGENTS.md

Guidance for coding agents (Claude Code, Codex) working in this repository. Claude Code reaches it
through `CLAUDE.md`.

You are an expert in TypeScript, Angular, and scalable web application development. You write
functional, maintainable, performant, and accessible code following Angular and TypeScript best
practices.

## Mandatory rules

### Angular authorization

- Do not edit, format, generate, build, test, install dependencies in, or otherwise change this
  Angular workspace unless the user explicitly authorizes Angular work in the current request.
- Backend work, an API issue, a related feature name, or an existing UI consumer does not imply
  permission to touch Angular.

### Locked fixes

- When Angular work is authorized, first read the canonical backend `LOCKED_FIXES.md` registry and
  run every applicable pre-change gate before editing.
  - Repo: [QuecksilberTechnologies/Skolenza.be](https://github.com/QuecksilberTechnologies/Skolenza.be),
    branch `main_branch`, repo root
  - Raw: https://raw.githubusercontent.com/QuecksilberTechnologies/Skolenza.be/main_branch/LOCKED_FIXES.md
- If the registry is unavailable, stop and ask the user. Do not guess locked behavior.
- Do not change, unlock, weaken, or retire a locked behavior without explicit user authorization.
- After an authorized change, rerun the applicable locked Angular tests. Record failures, skips,
  and deployed status honestly.

### Documentation lifecycle

- Record every new decision, implementation status, and test result in current Skolenza Markdown
  files.
- The AxionPro `*_old.md` reference files were removed. If legacy behavior is reused, recover the
  source from git history, cite it, and write the accepted Skolenza decision in a current document.

## References

- **Backend API:** Swagger docs at https://Skolenza-api.onrender.com/swagger/index.html
- **Design rationale:** [SPEC.md](./.claude/SPEC.md) covers cross-cutting policy the code can't
  explain on its own: architecture principles, security posture, error-handling strategy, and
  UI-library provenance.

## Working rules

Day-to-day rules live in `.claude/docs/`. Read them before changing code:

@.claude/docs/commands.md
@.claude/docs/architecture.md
@.claude/docs/angular-standards.md
@.claude/docs/state-management.md
@.claude/docs/accessibility.md
@.claude/docs/ui-copy.md
@.claude/docs/behavioral-guidelines.md

## Agent skills

Skills live once, under `.agents/skills/`, where Codex reads them. Claude Code reads
`.claude/skills/`, a gitignored set of links into `.agents/skills/`. After adding a skill, run
`bash scripts/link-skills.sh`.

## Project workflow

- **Issue tracker:** GitHub Issues on `QuecksilberTechnologies/Skolenza-app`, via the `gh` CLI.
- **Triage labels:** the five canonical roles, each label string equal to its name.
- **Domain docs:** single-context, `CONTEXT.md` and `docs/adr/` at the repo root (not yet created).
