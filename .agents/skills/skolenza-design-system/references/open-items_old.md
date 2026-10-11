[← Index](./README.md)

# Open items

> **Status:** Backlog · **Related:** [Accessibility](./accessibility.md) · [Governance](./governance.md)

Every entry below is a **verified** gap between this specification and `axionpro-app` today. Each was
confirmed by reading the code, and each carries a concrete fix. Closing an item means changing the
code, not the document.

---

## Accessibility — blocking

| ID | Finding | Fix | Detail |
| --- | --- | --- | --- |
| **A11Y-01…08** | Eight measured contrast and focus failures | Per-row fixes | [Accessibility → Contrast audit](./accessibility.md#4-contrast-audit) |

These block the next release. `.claude/docs/accessibility.md` requires AXE-clean and WCAG AA
minimums, so these are bugs rather than enhancements.

---

## Design system debt

| ID | Area | Finding | Action |
| --- | --- | --- | --- |
| **DS-01** | Colour | Hard-coded hexes in `get-employee-progress-color-pipe.ts`, `get-new-joiner-badge-pipe.ts`, `get-status-tag-pipe.ts`, `get-priority-tag-pipe.ts`, `avatar-color.ts` | Move to `@theme` tokens. The pipes return token *names*; CSS resolves the value. `get-status-tag-pipe` and `get-priority-tag-pipe` also carry comments that contradict their values (`#D2E3FC` commented "gray-500") |
| **DS-02** | Colour | `get-status-tag-pipe` / `get-priority-tag-pipe` use a Material-derived pastel set that appears nowhere else in this system | Re-map onto `color-semantic-*` and `color-neutral-*` |
| **DS-03** | Motion | No `prefers-reduced-motion` block anywhere; `html { scroll-behavior: smooth }` is set globally with no opt-out | Add the block from [Motion → Reduced motion](./foundations/motion.md#4-reduced-motion) to `src/styles.css` |
| **DS-04** | Border | `--p-inputtext-focus-ring-width: 1px` contradicts its own inline comment, which argues for 2px on WCAG 2.4.11 grounds | Set `2px` on inputtext / select / textarea |
| **DS-06** | Typography | Font loaded via `@import url()` at the top of `styles.css` — render-blocking behind CSS parse | `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html`, or self-host the variable file |
| **DS-07** | Shadows | Bare `shadow` (the Tailwind v3 name) still in use after the v4 rename | Migrate to `shadow-sm` when touching a file |
| **DS-08** | Icons | Both `text-xl!` and `!text-3xl` present | Trailing `!` is the Tailwind v4 form; normalise |
| **DS-09** | Z-index | `z-index: 14` / `15` hand-written in `layout.css` | Emit as `--z-scrim` / `--z-drawer` |
| **DS-10** | Colour | `dark.surface.0` is `#ffffff` in both `AxionPreset` and the Aura base — a white "surface 0" in dark mode is almost certainly unintended | Verify; likely should be `{zinc.950}` |
| **DS-11** | Typography | `text-xs` (9.75px) used for content a user must read, not just chips | Audit; promote to `text-sm` where the string carries meaning |
| **DS-12** | Layout | Global `.p-datatable` cell padding (`6px 5px`) is overridden per-page with `!px-3 !py-3` | Move list-page padding into a `@utility data-table-dense` and drop the `!` overrides |
| **DS-14** | API | 165 deprecated `styleClass` bindings across 73 templates (row menus, drawers, avatars, badges) | Plain host → `class`. Panel moved to `body` → `[pt]="{ root: { class: '…' } }"` (see list-page R20). Fix when touching the file |

---

## Triage

| Priority | Items | Rationale |
| --- | --- | --- |
| **P0 — before release** | A11Y-01 … A11Y-08, DS-03, DS-04 | WCAG AA failures; the project's own accessibility policy requires them closed |
| **P1 — next sprint** | DS-01, DS-02, DS-10 | Colour correctness and tokenisation; DS-10 may be a live visual bug in dark mode |
| **P2 — opportunistic** | DS-07, DS-08, DS-09, DS-11, DS-12, DS-14 | Consistency debt. Fix when touching the file, per [Governance §2](./governance.md#2-change-process) |
| **P3 — performance** | DS-06 | Real, but measure the render-block cost before scheduling |

---

## How to close an item

1. Fix the code in `axionpro-app`.
2. Re-run the audit for that item (contrast measurement, AXE, or a visual diff).
3. Delete the row from this file **in the same PR**.
4. If the fix changes a token, update [`tokens/`](./tokens/README.md) and the relevant foundation
   document too.

A row that is fixed in code but still listed here, or listed here but silently dropped from code, is
itself a defect — see the source-of-truth rule in the [index](./README.md).
