[← Index](../README.md) · [← Spacing](./spacing.md)

# Grid & Layout

> **Ownership:** T0 — Foundations · **Status:** Normative
> **Source of truth:** `src/app/layout/layout.html`, `src/app/layout/layout.css`, `src/styles.css`
> **Related:** [Spacing](./spacing.md) · [Typography](./typography.md) · [List page pattern](../patterns/list-page.md)

---

## 1. Responsive breakpoints

Tailwind v4 defaults. **Media-query `rem` resolves against 16px**, not the 13px root — so these are
the real pixel values regardless of the density setting. See
[Typography → the 13px root](./typography.md#2-the-13px-root).

| Token | Prefix | Min-width | Device class | What changes at this breakpoint |
| --- | --- | --- | --- | --- |
| `bp-xs` | *(none)* | 0 | Phone portrait | Single column; filters stack (`flex-col`); page gutter `m-3`; paginator wraps and centres (`@media (max-width: 639.98px)`) |
| `bp-sm` | `sm:` | **640px** | Phone landscape / small tablet | Page gutter → `m-4`; stat cards go 2-up (`sm:max-w-[calc(50%-0.5rem)]`); type steps up (`sm:text-3xl!`) |
| `bp-md` | `md:` | **768px** | Tablet portrait | Wider card gaps; secondary table columns return |
| `bp-lg` | `lg:` | **1024px** | Laptop / tablet landscape | **The layout pivot.** Sidebar becomes static and pushes content instead of overlaying; filter bar goes horizontal (`lg:flex-row`); selects get `lg:min-w-52`; action buttons stop being full-width |
| `bp-xl` | `xl:` | **1280px** | Desktop | Stat cards go 4-up; the table shows all columns without horizontal scroll |
| `bp-2xl` | `2xl:` | **1536px** | Wide desktop | Content max-width caps; extra whitespace goes to the gutters |

### 1024px is the boundary that matters

Below it the sidebar is `position: absolute; z-index: 15; transform: translateX(-100%)` with a scrim.
At and above it the sidebar is in flow and only its `max-width` animates between `20rem` and `65px`.

```css
@media (min-width: 1024px) {
  .app-aside-menu.menu-collapsed { min-width: 65px; max-width: 65px; overflow: hidden; }
}

@media (max-width: 1023px) {
  .app-aside-menu { position: absolute; z-index: 15; transform: translateX(-100%); }
  .app-aside-menu.menu-collapsed { transform: translateX(0); }
  .mobile-overlay { position: fixed; inset: 0; z-index: 14; }
}
```

---

## 2. Container widths

| Token | Max-width | px @ 13px | Applies to |
| --- | --- | --- | --- |
| `container-full` | `100%` | — | **Default.** List pages, dashboards — data wants the width |
| `container-wide` | `90rem` | 1170 | Wide-desktop cap for dashboards, so a 4K monitor doesn't stretch a table to 3000px |
| `container-content` | `48rem` | 624 | Long-form reading: policy text, release notes, help |
| `container-form` | `40rem` | 520 | Single-column forms — a field wider than this is harder to scan, not easier |
| `container-dialog-sm` | `28rem` | 364 | Confirmation dialogs: applied globally by `.p-confirmdialog` in `src/styles.css`; templates set no width |
| `container-dialog-md` | `38rem` | 494 | Standard form dialog (matches the version-update dialog) |
| `container-drawer` | `40rem` | 520 | Filter drawer at `sm:` and up (`sm:min-w-[40rem]`); full-width below |
| `container-table-min` | `60rem` | 780 | `[tableStyle]="{'min-width':'60rem'}"` — below this the table scrolls horizontally rather than crushing columns |

---

## 3. Columns

| Layout | Columns | Definition |
| --- | --- | --- |
| **Page grid** | 12 | `grid grid-cols-12` with `gap-4`. Use for dashboards and form layouts |
| **Stat row** | 4 (flex, not grid) | `flex flex-wrap gap-4` with each card `flex-1 min-w-[calc(50%-0.5rem)] sm:min-w-[180px]` — 1-up → 2-up → 4-up **without a single media query** |
| **Form grid** | 12 | Field spans: full = 12, half = 6, third = 4. Below `md:` everything collapses to 12 |
| **Table** | content-driven | Not a grid. Widths are `max-w-*` caps per column with `truncate` |

**Approved column spans:** 12, 6, 4, 3, 2. A 5- or 7-column span is a sign the layout wants a
different breakpoint, not a different span.

---

## 4. Gutters

| Token | Value | px @ 13px | Where |
| --- | --- | --- | --- |
| `gutter-tight` | `gap-2` | 6.5 | Filter bar, button groups, chip rows |
| `gutter-default` | `gap-4` | 13 | Page grid, stat cards, card grids |
| `gutter-loose` | `gap-6` | 19.5 | Dashboard sections on wide screens |
| `gutter-form` | `gap-x-4 gap-y-4` | 13 / 13 | Form grid. Row gap ≥ column gap, **never** less |

---

## 5. Margins

| Token | Value | px | Where |
| --- | --- | --- | --- |
| `margin-page-xs` | `m-3` | 9.75 | Page content, `< sm` |
| `margin-page-sm` | `m-4` | 13 | Page content, `≥ sm` |
| `margin-section` | `mb-4` | 13 | Between page-level blocks |
| `margin-safe-bottom` | `pb-8` | 26 | Bottom of a scrolling form, so the last field clears a sticky action bar |

---

## 6. App shell metrics

```
┌──────────────────────────────────────────────────────────────┐
│ aside  260px (20rem) · 65px collapsed · absolute below 1024px │
│ border-e 1px zinc-200 / zinc-800                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ header  4.6rem (59.8px) · sticky top-0 · z-10         │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │ content  h-[calc(100vh-4.6rem)]                       │    │
│  │          overflow-y-auto · [scrollbar-gutter:stable]  │    │
│  │   margin m-3 / sm:m-4                                 │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

`scrollbar-gutter: stable` on the content column is **load-bearing**: without it, every transition
between a short and a tall page shifts the layout by the scrollbar width.

The shell itself is `h-screen overflow-hidden` — the page owns its scroll, never the shell. See
[List page → R1](../patterns/list-page.md#2-the-rules-this-page-encodes).

---

## 7. Scrollbars

Global, in `src/styles.css`:

- 5px wide, transparent track, `rgba(0,0,0,0.05)` thumb rising to `0.15` on hover
- Dark theme mirrors with `rgba(255,255,255,0.05)` → `0.15`
- `scrollbar-width: thin` for Firefox
- `.no-scrollbar` hides it entirely where a custom control replaces it

---

**Next:** [Elevation →](./elevation.md)
