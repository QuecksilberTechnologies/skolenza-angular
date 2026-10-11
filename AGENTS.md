# AGENTS_old.md

This file provides guidance to coding agents (Claude Code, Codex) when working with code in this repository. Claude Code reaches it through `CLAUDE_old.md`.

## Mandatory Angular authorization and locked-fix rule

- Do not edit, format, generate, build, test, install dependencies in, or otherwise change this Angular workspace unless the user explicitly authorizes Angular work in the current request.
- Backend work, an API issue, a related feature name, or an existing UI consumer does not imply permission to touch Angular.
- When Angular work is explicitly authorized, first read the canonical backend `LOCKED_FIXES.md` registry (backend repo [QuecksilberTechnologies/Skolenza.be](https://github.com/QuecksilberTechnologies/Skolenza.be), branch `main_branch`, repo root; raw: https://raw.githubusercontent.com/QuecksilberTechnologies/Skolenza.be/main_branch/LOCKED_FIXES.md) and run every applicable pre-change gate before editing. If that registry is unavailable, stop and ask the user instead of guessing locked behavior.
- Do not change, unlock, weaken, or retire a locked behavior without explicit user authorization. Rerun the applicable locked Angular tests after the authorized change and record failures, skips, and deployed status honestly.

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

> **Design rationale:** See [SPEC.MD](./.claude/SPEC_old.MD) for cross-cutting policy the code can't explain on its own — architecture principles, security posture, error-handling strategy, UI-library provenance, and the roadmap. Day-to-day working rules are the `.claude/docs/` files listed below; read them before changing code.

> **Backend API:** Swagger docs at https://Skolenza-api.onrender.com/swagger/index.html

@.claude/docs/commands_old.md
@.claude/docs/architecture_old.md
@.claude/docs/angular-standards_old.md
@.claude/docs/state-management_old.md
@.claude/docs/accessibility_old.md
@.claude/docs/ui-copy_old.md
@.claude/docs/behavioral-guidelines_old.md

> **Permission matrix:** the role/staffMember permission wiring lives in the `permission-matrix`
> skill (`.agents/skills/permission-matrix/SKILL_old.md`), loaded on demand.

> **Forms & validation:** the Signal Forms + zod schema convention lives in the `signal-forms`
> skill (`.agents/skills/signal-forms/SKILL_old.md`), loaded on demand.

## Agent skills

Skills live once, under `.agents/skills/` — Codex reads them there. Claude Code reads
`.claude/skills/`, a gitignored set of links into `.agents/skills/`: after adding a skill, run
`bash scripts/link-skills.sh`.

### Issue tracker

GitHub Issues on `QuecksilberTechnologies/Skolenza-app`, via the `gh` CLI.
See `docs/agents/issue-tracker_old.md`.

### Triage labels

The five canonical roles, each label string equal to its name.
See `docs/agents/triage-labels_old.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root.
See `docs/agents/domain_old.md`.

## Skolenza documentation lifecycle

- Files ending in _old.md are read-only AxionPro reference material. Do not update them for Skolenza implementation work.
- Record every new decision, implementation status and test result only in current Skolenza Markdown files without the _old suffix.
- If legacy behavior is reused, cite the _old.md source and write the accepted Skolenza decision in a current document.


