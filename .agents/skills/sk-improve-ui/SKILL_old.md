---
name: sk-improve-ui
description: Audit and improve visual UI of an Angular component or feature — consistency, spacing, typography, Tailwind usage, polish
argument-hint: '[component | feature | route | "full app"]'
allowed-tools: Read, Grep, Glob, Edit, Bash
disable-model-invocation: true
---

# Improve UI

Run a structured visual UI audit and apply improvements for: **$ARGUMENTS**

No target above? Use the one the user named with the skill; if none, ask.

If no argument is given, ask which component, feature, or screen to audit before proceeding.

Note: this command targets visual design and styling. For behavior, flows, and accessibility, use `/sk-improve-ux`.

## Step 1 — Audit

Analyze the target templates and styles, and identify UI issues:

### Consistency

- Same element styled differently across screens (buttons, inputs, cards, badges, tables)
- Mixed border radii, shadow styles, or border colors for the same component type
- Inconsistent icon sizes or icon sets in the same context
- Repeated Tailwind class combinations that should be a shared component or `@apply`-free extracted component

### Spacing & Layout

- Arbitrary values (`p-[13px]`, `mt-[7px]`) instead of the Tailwind spacing scale
- Inconsistent gaps — `gap-2` here, `gap-3` there for the same pattern
- Missing breathing room — cramped sections, no padding hierarchy between page/section/card
- Misaligned elements — mixed alignment in the same row/column, uneven grid columns
- Magic-number widths/heights where flex/grid sizing would adapt better

### Typography

- More than ~4 font sizes in one screen without hierarchy logic
- Headings not following a consistent scale (`text-2xl` page title, `text-lg` section, etc.)
- Inconsistent font weights for the same semantic level
- Poor line height/length on body text (`leading-*`, `max-w-prose` for long text)
- Truncation missing where overflow breaks layout (`truncate`, `line-clamp-*`)

### Color & Tokens

- Hardcoded hex/rgb values instead of design tokens / theme variables
- Off-palette one-off colors (`bg-[#3b7ddd]`) instead of the project palette
- Inconsistent semantic colors — success/warning/danger differing across screens
- Text contrast too low (`text-gray-400` on white for body text)
- Hover/focus/active states missing or inconsistent across interactive elements

### Visual Hierarchy & Polish

- Primary action not visually dominant — competing buttons of equal weight
- Missing visual grouping — related fields/cards not grouped by proximity or borders
- Tables: missing row hover, uneven column alignment (numbers not right-aligned), no zebra/divider strategy
- Skeletons/spinners visually inconsistent with final content layout
- Missing transitions where state changes feel abrupt (use sparingly — `transition-colors`, not everything)
- Empty/error states unstyled compared to the rest of the screen

### Tailwind Hygiene

- Custom CSS that duplicates existing utilities
- `!important` or specificity hacks
- Inline `style=""` attributes that aren't dynamically computed
- Dead classes left in templates
- Class soup — extremely long class lists that should be extracted to a shared component

## Step 2 — Report

Before changing anything, present findings as a prioritized table:

| Priority | Issue | Location  | Impact                 | Fix |
| -------- | ----- | --------- | ---------------------- | --- |
| P0/P1/P2 | ...   | file:line | 🔴 High/🟠 Med/🟡 Low | ... |

- **P0** — broken or unreadable UI (overflow, contrast, misalignment that breaks scanning) — fix now
- **P1** — visible inconsistency or hierarchy problems — fix in this pass
- **P2** — polish — note for backlog

Wait for confirmation before applying fixes unless the user said "fix everything".

## Step 3 — Apply Fixes

- Fix issues one at a time, highest priority first
- Establish the pattern once, then apply it everywhere — don't fix one button and leave its siblings
- Tailwind utilities only; stick to the spacing scale and project design tokens
- Extract a shared component when the same styling repeats 3+ times
- Don't change behavior, copy, or component logic — visual changes only

## Step 4 — Verify

- Run `ng build` and existing tests; confirm both pass
- Check the affected screens at mobile, tablet, and desktop widths
- Confirm hover/focus/disabled states render correctly on changed elements
- Summarize: issues found, issues fixed, components extracted, and any P2 items deferred

## Rules

- Consistency beats novelty — match the app's existing design language, don't introduce a new one
- Never use arbitrary pixel values when a scale token exists
- No new colors outside the project palette without explicit approval
- No custom CSS unless Tailwind genuinely cannot express it
