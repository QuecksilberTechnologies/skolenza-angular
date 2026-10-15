[← Index](./README.md)

# Open items

> Ported from AxionPro `open-items_old.md` (removed; see git history). Verified against Skolenza code on 2026-10-15.

> **Status:** Backlog · **Related:** [Accessibility](./accessibility.md) · [Governance](./governance.md)

Every entry below is a **verified** gap between this specification and the Skolenza code today. Each
was re-confirmed by reading the code on the date above, and each carries a concrete fix. Closing an
item means changing the code, not the document.

---

## Accessibility — blocking

| ID | Finding | Fix | Detail |
| --- | --- | --- | --- |
| **A11Y-01…08** | Measured contrast and focus failures | Per-row fixes | [Accessibility → Contrast audit](./accessibility.md#4-contrast-audit) is the live list; re-check each row there |
| **A11Y-09** | `get-new-joiner-badge-pipe.ts` paints white text on `-500` fills: `#ffffff` on `#22c55e` 2.28:1, on `#3b82f6` 3.68:1, on `#f59e0b` 2.15:1 (10px text, needs 4.5:1) | Use `-700` fills (or tinted `-50` bg + `-700` text) via classes, not inline hex | Rendered in `features/staff-members/staff-members.html` |
| **A11Y-10** | Status / priority tags in `features/projects/list-view/list-view.component.html` force `dark:text-white!` over the pastel inline backgrounds: 1.14–1.35:1 in dark mode | Fold into DS-02 | — |

These block the next release. `.claude/docs/accessibility.md` requires AXE-clean and WCAG AA
minimums, so these are bugs rather than enhancements.

---

## Design system debt

| ID | Area | Finding | Action |
| --- | --- | --- | --- |
| **DS-01** | Colour | Hard-coded hexes in `shared/pipes/get-new-joiner-badge-pipe.ts`, `get-status-tag-pipe.ts`, `get-priority-tag-pipe.ts` and `shared/directives/avatar-color.ts` (16-entry palette). The progress pipe is **fixed**: `get-staff-member-progress-color-pipe.ts` now delegates to `shared/utilities/progress-tone.ts` (`-700` / red `-600` stroke; text and bar classes `-700` light, `-400` dark) | Move the rest to `@theme` tokens. The pipes return token *names*; CSS resolves the value. `get-status-tag-pipe` and `get-priority-tag-pipe` still carry comments that contradict their values (`#D2E3FC` commented "gray-500") |
| **DS-02** | Colour | `get-status-tag-pipe` / `get-priority-tag-pipe` use a Material-derived pastel set that appears nowhere else in this system | Re-map onto `color-semantic-*` and `color-neutral-*` |
| **DS-03** | Motion | No `prefers-reduced-motion` block anywhere in `src/styles.css`; `html { scroll-behavior: smooth }` is set globally with no opt-out | Add the block from [Motion → Reduced motion](./foundations/motion.md#4-reduced-motion) to `src/styles.css` |
| **DS-04** | Border | `--p-inputtext-focus-ring-width`, `--p-select-focus-ring-width` and `--p-textarea-focus-ring-width` are all `1px !important` in `src/styles.css`, contradicting the inline comment that argues for 2px on WCAG 2.4.11 grounds | Set `2px` on inputtext / select / textarea |
| **DS-06** | Typography | Inter loaded via `@import url()` on line 1 of `src/styles.css`, render-blocking behind CSS parse; `src/index.html` has no preconnect | `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html`, or self-host the variable file |
| **DS-07** | Shadows | Bare `shadow` (the Tailwind v3 name) still in use after the v4 rename, e.g. the stat cards in `staff-member-stats` and `asset-stats` | Migrate to `shadow-sm` when touching a file |
| **DS-08** | Important modifier | Both forms present: trailing `text-xl!` (69 uses) and leading `!px-3` / `!py-3` / `!py-2` (hundreds, mostly table cells) | Trailing `!` is the Tailwind v4 form; normalise |
| **DS-09** | Z-index | `z-index: 15` (`.app-aside-menu`) / `14` (`.mobile-overlay`) hand-written in `src/app/layout/layout.css` | Emit as `--z-drawer` / `--z-scrim` |
| **DS-11** | Typography | `text-xs` (9.75px) used for content a user must read, not just chips | Audit; promote to `text-sm` where the string carries meaning |
| **DS-12** | Layout | Global `.p-datatable` cell padding (`6px 5px`) is overridden per-page with `!px-3 !py-3` | Move list-page padding into a `@utility data-table-dense` and drop the `!` overrides |
| **DS-14** | API | 161 deprecated `styleClass` bindings across 73 templates (row menus, drawers, avatars, badges), including the reference page's `p-tieredmenu`, `p-contextMenu` and `p-drawer` | Plain host → `class`. Panel moved to `body` → `[pt]="{ root: { class: '…' } }"` (see list-page R20). Fix when touching the file |
| **DS-15** | Copy | Reference page copy carries a rename artifact: "No staffMembers found", "Add StaffMember", "StaffMember Code" in `features/staff-members/staff-members.html` | Use "No staff members found", "Add Staff Member", "Staff Member Code" |

### Closed

| ID | Was | Resolution |
| --- | --- | --- |
| **DS-10** | `dark.surface.0` is `#ffffff` in the preset | **Not a defect.** Aura's dark scheme uses `{surface.0}` as the *text* colour (`text.color`, `formField.color`), not a background, so white is correct. Keep it. Note `SkolenzaPreset` uses a zinc surface ramp in light and slate in dark |
| **DS-01 (progress pipe)** | Progress pipe returned `-500` text colours | Fixed via `shared/utilities/progress-tone.ts` |

---

## Triage

| Priority | Items | Rationale |
| --- | --- | --- |
| **P0 — before release** | A11Y-01 … A11Y-10, DS-03, DS-04 | WCAG AA failures; the project's own accessibility policy requires them closed |
| **P1 — next sprint** | DS-01, DS-02, DS-15 | Colour correctness and tokenisation; visible copy defect on the reference page |
| **P2 — opportunistic** | DS-07, DS-08, DS-09, DS-11, DS-12, DS-14 | Consistency debt. Fix when touching the file, per [Governance §2](./governance.md#2-change-process) |
| **P3 — performance** | DS-06 | Real, but measure the render-block cost before scheduling |

---

## How to close an item

1. Fix the code in this repo.
2. Re-run the audit for that item (contrast measurement, AXE, or a visual diff).
3. Delete the row from this file **in the same PR**.
4. If the fix changes a token, update [`tokens/`](./tokens/README.md) and the relevant foundation
   document too.

A row that is fixed in code but still listed here, or listed here but silently dropped from code, is
itself a defect — see the source-of-truth rule in the [index](./README.md).
