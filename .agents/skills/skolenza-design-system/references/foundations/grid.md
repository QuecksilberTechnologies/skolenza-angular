[← Index](../README.md) · [← Spacing](./spacing.md)

# Grid & Layout

> Ported from AxionPro `grid_old.md` (removed; see git history). Verified against Skolenza code on 2026-10-15.
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
| `bp-sm` | `sm:` | **640px** | Phone landscape / small tablet | Page gutter → `m-4`; stat cards go 2-up (`sm:max-w-[calc(50%-0.5rem)]`); type steps up (`sm:text-3xl!`); filter drawer gets `sm:min-w-[40rem]` |
| `bp-md` | `md:` | **768px** | Tablet portrait | Form grids go 2-up (`md:grid-cols-2`); sub-header description appears (`md:block`) |
| `bp-lg` | `lg:` | **1024px** | Laptop / tablet landscape | **The layout pivot.** Sidebar becomes static and pushes content instead of overlaying; sub-header becomes sticky (`lg:sticky lg:top-[55px]`); filter bar goes horizontal (`lg:flex-row`); selects get `lg:min-w-52`; stat cards drop the 2-up cap (`lg:max-w-none`) and sit 4-up |
| `bp-xl` | `xl:` | **1280px** | Desktop | No shell change; the table shows all columns without horizontal scroll |
| `bp-2xl` | `2xl:` | **1536px** | Wide desktop | No shell change. A content max-width cap is proposed (`container-wide`), not implemented |

### 1024px is the boundary that matters

Below it the sidebar is an absolute drawer with a scrim, and `.menu-collapsed` means **open**. At and
above it the sidebar is in flow and only its `max-width` animates between `20rem` and `65px`.

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
| `container-wide` | `90rem` | 1170 | Proposed wide-desktop cap for dashboards (not used yet) |
| `container-content` | `48rem` | 624 | Long-form reading: policy text, release notes, help |
| `container-form` | `40rem` | 520 | Single-column forms — a field wider than this is harder to scan, not easier |
| `container-dialog-sm` | `28rem` | 364 | Confirmation dialogs: `--container-dialog-sm` in `@theme`, applied globally by `.p-confirmdialog` (with `max-width: 90vw`); templates set no width |
| `container-dialog-md` | `38rem` | 494 | Standard form dialog (matches the version-update dialog opened in `src/app/app.ts`) |
| `container-drawer` | `40rem` | 520 | Filter drawer at `sm:` and up (`sm:min-w-[40rem]`); full-width below |
| `container-table-min` | `60rem` | 780 | `[tableStyle]="{ 'min-width': '60rem' }"` — below this the table scrolls horizontally rather than crushing columns |

---

## 3. Columns

| Layout | Columns | Definition |
| --- | --- | --- |
| **Page / form grid** | 1 → 2 → 3 | `grid grid-cols-1 gap-4 md:grid-cols-2` (the dominant pattern), or `sm:`/`md:grid-cols-3`. Full-width fields span with `md:col-span-2`. There is no 12-column grid in the codebase |
| **Stat row** | 4 (flex, not grid) | `flex flex-wrap gap-4` with each card `flex-1 min-w-[calc(50%-0.5rem)] sm:max-w-[calc(50%-0.5rem)] sm:min-w-[180px] lg:max-w-none` — 2-up → 4-up with prefixes only, no hand-written media query |
| **Table** | content-driven | Not a grid. Widths are `max-w-*` caps per column with `truncate` |

**Approved column counts:** 1, 2, 3, 4. Five or more means the content wants a different breakpoint.

---

## 4. Gutters

| Token | Value | px @ 13px | Where |
| --- | --- | --- | --- |
| `gutter-tight` | `gap-2` | 6.5 | Filter bar, button groups, chip rows |
| `gutter-default` | `gap-4` | 13 | Page grid, stat cards, card grids, form grids |
| `gutter-loose` | `gap-6` | 19.5 | Dashboard sections on wide screens |
| `gutter-form` | `gap-4` | 13 / 13 | Form grid. Row gap ≥ column gap, **never** less |

---

## 5. Margins

| Token | Value | px | Where |
| --- | --- | --- | --- |
| `margin-page-xs` | `m-3` | 9.75 | Page content, `< sm` |
| `margin-page-sm` | `m-4` | 13 | Page content, `≥ sm` |
| `margin-section` | `mb-4` | 13 | Between page-level blocks |
| `margin-safe-bottom` | `pb-8` | 26 | Proposed: bottom of a scrolling form so the last field clears a sticky action bar. Unused today; `app-form-action-bar` is itself `sticky bottom-0` on pages |

---

## 6. App shell metrics

```
┌──────────────────────────────────────────────────────────────┐
│ aside  260px (20rem) · 65px collapsed · absolute below 1024px │
│ border-e 1px zinc-200 / zinc-800 · z-10                       │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ header  h-[55px] · sticky top-0 · z-10                │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │ column  flex-1 · overflow-y-auto                      │    │
│  │         [scrollbar-gutter:stable]                     │    │
│  │   page  h-[calc(100vh-4.6rem)] · m-3 / sm:m-4         │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

`scrollbar-gutter: stable` on the content column is **load-bearing**: without it, every transition
between a short and a tall page shifts the layout by the scrollbar width.

The shell (`<main>`) is `h-screen overflow-hidden` — it never scrolls; the content column does, and
list pages add their own `h-[calc(100vh-4.6rem)] overflow-y-auto` wrapper. See
[List page → R1](../patterns/list-page.md#2-the-rules-this-page-encodes).

---

## 7. Scrollbars

Global, in `src/styles.css`:

- 5px wide (and 5px tall), transparent track, `rgba(0,0,0,0.05)` thumb rising to `0.15` on hover
- Dark theme mirrors with `rgba(255,255,255,0.05)` → `0.15`
- Firefox: `scrollbar-width: thin` with `scrollbar-color: rgba(0,0,0,0.1)` (dark `rgba(255,255,255,0.1)`)
- `.no-scrollbar` hides it entirely where a custom control replaces it

---

**Next:** [Elevation →](./elevation.md)
