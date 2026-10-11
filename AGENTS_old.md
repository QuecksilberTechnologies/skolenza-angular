# AGENTS.md

This file provides guidance to coding agents (Claude Code, Codex) when working with code in this repository. Claude Code reaches it through `CLAUDE.md`.

## Mandatory Angular authorization and locked-fix rule

- Do not edit, format, generate, build, test, install dependencies in, or otherwise change this Angular workspace unless the user explicitly authorizes Angular work in the current request.
- Backend work, an API issue, a related feature name, or an existing UI consumer does not imply permission to touch Angular.
- When Angular work is explicitly authorized, first read the canonical backend `LOCKED_FIXES.md` registry (backend repo [QuecksilberTechnologies/axionPro.be](https://github.com/QuecksilberTechnologies/axionPro.be), branch `main_branch`, repo root; raw: https://raw.githubusercontent.com/QuecksilberTechnologies/axionPro.be/main_branch/LOCKED_FIXES.md) and run every applicable pre-change gate before editing. If that registry is unavailable, stop and ask the user instead of guessing locked behavior.
- Do not change, unlock, weaken, or retire a locked behavior without explicit user authorization. Rerun the applicable locked Angular tests after the authorized change and record failures, skips, and deployed status honestly.

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

> **Design rationale:** See [SPEC.MD](./.claude/SPEC.MD) for cross-cutting policy the code can't explain on its own — architecture principles, security posture, error-handling strategy, UI-library provenance, and the roadmap. Day-to-day working rules are the `.claude/docs/` files listed below; read them before changing code.

> **Backend API:** Swagger docs at https://axionpro-api.onrender.com/swagger/index.html

@.claude/docs/commands.md
@.claude/docs/architecture.md
@.claude/docs/angular-standards.md
@.claude/docs/state-management.md
@.claude/docs/accessibility.md
@.claude/docs/ui-copy.md
@.claude/docs/behavioral-guidelines.md

> **Permission matrix:** the role/employee permission wiring lives in the `permission-matrix`
> skill (`.agents/skills/permission-matrix/SKILL.md`), loaded on demand.

> **Forms & validation:** the Signal Forms + zod schema convention lives in the `signal-forms`
> skill (`.agents/skills/signal-forms/SKILL.md`), loaded on demand.

## Agent skills

Skills live once, under `.agents/skills/` — Codex reads them there. Claude Code reads
`.claude/skills/`, a gitignored set of links into `.agents/skills/`: after adding a skill, run
`bash scripts/link-skills.sh`.

### Issue tracker

GitHub Issues on `QuecksilberTechnologies/axionpro-app`, via the `gh` CLI.
See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, each label string equal to its name.
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root.
See `docs/agents/domain.md`.
