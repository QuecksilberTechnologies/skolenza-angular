---
name: sk-improve-ux
description: Audit and improve UX of an Angular component, feature, or flow — accessibility, feedback states, forms, navigation
argument-hint: '[component | feature | route | "full app"]'
allowed-tools: Read, Grep, Glob, Edit, Bash
disable-model-invocation: true
---

# Improve UX

Run a structured UX audit and apply improvements for: **$ARGUMENTS**

No target above? Use the one the user named with the skill; if none, ask.

If no argument is given, ask which component, feature, or user flow to audit before proceeding.

## Step 1 — Audit

Analyze the target code and identify UX issues:

### Feedback & States

- Missing loading states — spinners/skeletons while data loads (`@defer` placeholders, loading signals)
- Missing empty states — blank screens instead of helpful "no data yet" guidance with a call to action
- Missing error states — silent failures, raw error messages, or no retry option
- No optimistic updates or progress indication for slow actions
- Buttons not disabled during submission — double-submit risk
- Missing success confirmation after actions (toast, inline message)

### Forms & Validation

- Validation errors shown only on submit instead of on blur/touch
- Vague error messages ("Invalid input") instead of actionable ones ("Date must be in the future")
- Missing required-field indicators
- No unsaved-changes guard (`canDeactivate`) on dirty forms
- Labels missing or replaced by placeholder-only inputs
- Long forms without grouping, steps, or sensible tab order
- Missing input affordances — date pickers, autocomplete, proper `type`/`inputmode` attributes

### Accessibility

- Interactive elements that aren't buttons/links (clickable `<div>`s)
- Missing `aria-label` on icon-only buttons
- Form controls without associated labels
- Insufficient color contrast; color as the only signal (e.g. status by color alone)
- Missing keyboard navigation — focus traps, no visible focus ring, dialogs not focus-managed
- Missing `alt` text on meaningful images
- Live updates not announced (`aria-live` for toasts, async results)

### Navigation & Flow

- Dead ends — pages without a clear next action or way back
- Missing breadcrumbs or page titles on deep routes
- Destructive actions without confirmation dialogs
- Confirmation dialogs for trivial, easily reversible actions (dialog fatigue)
- Lost state on back navigation — filters, scroll position, pagination not preserved
- Missing deep-linkable URLs — state held in memory instead of query params

### Content & Clarity

- Jargon or technical terms where plain language works
- Inconsistent terminology for the same concept across screens
- Missing date/number formatting (raw ISO dates, unformatted numbers)
- Truncated content with no way to see the full value (tooltip, expand)
- Tables without sorting/filtering where users need to find rows

### Responsiveness & Layout

- Layout breaking or unusable at common breakpoints
- Touch targets smaller than ~44px on mobile
- Layout shift while content loads (unsized images, late-rendering blocks)
- Horizontal scroll on tables without a mobile strategy

## Step 2 — Report

Before changing anything, present findings as a prioritized table:

| Priority | Issue | Location  | Impact                 | Fix |
| -------- | ----- | --------- | ---------------------- | --- |
| P0/P1/P2 | ...   | file:line | 🔴 High/🟠 Med/🟡 Low | ... |

- **P0** — blocks or misleads users (data loss, silent failure, inaccessible flow) — fix now
- **P1** — causes friction or confusion — fix in this pass
- **P2** — polish — note for backlog

Wait for confirmation before applying fixes unless the user said "fix everything".

## Step 3 — Apply Fixes

- Fix issues one at a time, highest priority first
- Keep changes minimal and scoped to UX — no unrelated refactors
- Use modern Angular APIs: standalone components, signals, `@if`/`@for`/`@defer`, Reactive Forms
- Style with Tailwind utilities only; follow the existing design tokens and spacing scale
- Reuse existing shared components (buttons, dialogs, toasts) — don't invent parallel ones

## Step 4 — Verify

- Run `ng build` and existing tests; confirm both pass
- Walk through the affected flow: loading → success, loading → error, empty data, keyboard-only
- Summarize: issues found, issues fixed, and any P2 items deferred

## Rules

- Never remove information or actions users rely on in the name of "cleanliness"
- Accessibility fixes are never P2 — minimum P1
- Every async action must have visible loading, error, and success states
- Match existing app conventions; consistency beats local perfection
