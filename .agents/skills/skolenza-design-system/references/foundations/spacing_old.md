[← Index](../README.md) · [← Typography](./typography.md)

# Spacing

> **Ownership:** T0 — Foundations · **Status:** Normative
> **Related:** [Grid](./grid.md) · [Typography](./typography.md) · [Tokens](../tokens/README.md)

---

## 1. Base unit

```
--spacing: 0.25rem   →   0.25 × 13px = 3.25px
```

Tailwind v4's spacing step is `0.25rem`, which at the [13px root](./typography.md#2-the-13px-root) is
**3.25px**. Every spacing value in the app is an integer multiple of this. There are no `px` spacing
literals and no odd values.

---

## 2. Spacing scale

| Token | Tailwind | rem | **px @ 13px root** | Usage |
| --- | --- | --- | --- | --- |
| `space-0` | `0` | 0 | 0 | Reset. Collapsing a default gap |
| `space-1` | `1` | 0.25 | **3.25** | Icon-to-label inside a chip; hairline separation |
| `space-1_5` | `1.5` | 0.375 | **4.88** | Chip internal gap (`gap-1.5`), badge padding |
| `space-2` | `2` | 0.5 | **6.5** | **Default inline gap** — filter bar items, button groups, icon+text |
| `space-2_5` | `2.5` | 0.625 | **8.13** | Chip horizontal padding (`px-2.5`) |
| `space-3` | `3` | 0.75 | **9.75** | **Table cell padding** (`px-3 py-3`); page margin on mobile (`m-3`); avatar-to-text gap |
| `space-4` | `4` | 1 | **13** | **Default block gap** — stat-card grid gap, page margin ≥ `sm` (`m-4`), card internal padding |
| `space-5` | `5` | 1.25 | **16.25** | Dialog body padding |
| `space-6` | `6` | 1.5 | **19.5** | Section separation inside a long form |
| `space-8` | `8` | 2 | **26** | Drawer content padding; major section break |
| `space-10` | `10` | 2.5 | **32.5** | Empty-state top/bottom padding |
| `space-12` | `12` | 3 | **39** | Empty-state vertical padding (`py-12`); full-page state |
| `space-16` | `16` | 4 | **52** | Hero / onboarding block spacing |

> **Only these steps are approved.** `gap-7`, `p-9`, arbitrary `p-[13px]` — all rejected in review.

---

## 3. Layout spacing

| Context | Value | Token | Note |
| --- | --- | --- | --- |
| Page gutter, `< sm` | `m-3` | `space-3` (9.75px) | `employees.html`: `class="m-3 … sm:m-4"` |
| Page gutter, `≥ sm` | `m-4` | `space-4` (13px) | |
| Content column ↔ sidebar | `border-e` only | — | Separation is a 1px border, not whitespace |
| Header height | `4.6rem` | `layout-header-h` (59.8px) | Content shell is `h-[calc(100vh-4.6rem)]` |
| Sidebar width, expanded | `max-w-xs` = 20rem | `layout-sidebar-w` (260px) | |
| Sidebar width, collapsed | `65px` | `layout-sidebar-w-collapsed` | Fixed px — an icon rail must not scale with the root |
| Between major page blocks | `space-4` | | Stats row → table card |

See [Grid → App shell metrics](./grid.md#6-app-shell-metrics) for the full diagram.

---

## 4. Component spacing

| Component | Padding | Gap | Source |
| --- | --- | --- | --- |
| Card (`p-card`) | `--p-card-body-padding` (default `1.25rem`) | — | Aura |
| Stat card inner | `p-2` | `gap-3` `sm:gap-4` | `employee-stats.html` |
| Table header cell | `px-3 py-3` | `gap-2` (label ↔ sort icon) | `employees.html` |
| Table body cell | `px-3 py-3` | `gap-2` | Overrides the global `6px 5px` for list pages |
| Table caption / filter bar | `0 0 0.8rem` bottom | `gap-2` | `.p-datatable .p-datatable-header` |
| Form field | `px-3 py-2` (`--p-form-field-padding`) | — | Aura; `sm` = `px-2.5 py-1.5` |
| List option | `px-3 py-2` | `2px` between options | `--p-list-option-padding` |
| Navigation item | `px-3 py-2` | `gap-2` | `--p-navigation-item-*` |
| Popover | `p-3` (`0.75rem`) | — | `--p-overlay-popover-padding` |
| Modal | `p-5` (`1.25rem`) | — | `--p-overlay-modal-padding` |
| Chip | `px-2.5 py-1` | `gap-1.5` | `employees.html` role chip |
| Empty state | `py-12` | `mb-4` icon → title, `mb-1` title → sub | `table-empty-message.html` |
| Table loader | `p-[4.8rem]` | `gap-3` | `table-loader.html` |

---

## 5. Content spacing

| Relationship | Value | Rationale |
| --- | --- | --- |
| Label → its control | `space-1` (3.25px) | Tight binding; they are one unit |
| Control → its help / error text | `space-1` (3.25px) | Same — the message belongs to the field |
| Field → next field (vertical form) | `space-4` (13px) | |
| Fieldset → next fieldset | `space-6` (19.5px) | 1.5× the field gap, so grouping is unambiguous |
| Card heading → card body | `space-3` (9.75px) | |
| Primary value → caption line | `0` | The caption's own line-height provides the separation (see the name/email cell) |
| Paragraph → paragraph | `space-3` (9.75px) | |
| Icon → adjacent label | `space-2` (6.5px), or `space-1_5` inside a chip | |

### The proximity law

**The gap *inside* a group must be strictly smaller than the gap *around* it.** If a form section
reads as ambiguous, the fix is almost always to increase the outer gap, not decrease the inner one.

---

**Next:** [Grid →](./grid.md)
