[← Index](./README.md)

# Introduction

> **Ownership:** T0 — Foundations · **Status:** Normative
> **Related:** [Governance](./governance.md) · [Accessibility](./accessibility.md) · [Foundations](./foundations/color.md)

---

## 1. Purpose

AxionPro is a multi-tenant HRMS. Every tenant renders the same application under **their own brand
colour**, and every screen is a dense, data-heavy work surface used for hours a day by HR admins,
managers and employees.

The design system exists to make three things true at once:

1. **A tenant can recolour the product without a designer ever touching it.** The primary palette is
   generated at runtime from a single hex value the tenant stores; nothing in the codebase may
   hard-code a brand colour.
2. **A new feature page looks and behaves like an existing one without negotiation.** The Employees
   page is the reference implementation; new list pages copy its anatomy rather than invent one.
3. **Accessibility is a build-time property, not a review-time opinion.** `angular-eslint`'s
   `templateAccessibility` config runs on every `.html`, and AXE checks gate the UI.

---

## 2. Goals

| # | Goal | How it is measured |
| --- | --- | --- |
| G1 | One visual language across 20+ feature modules | New feature PRs introduce **zero** new colour hexes, radii or shadows |
| G2 | Runtime tenant theming with no rebuild | Brand hex → full 50–950 primary ramp via `palette()`; no `#hex` literals in feature code |
| G3 | WCAG 2.2 AA on every surface, both themes | AXE clean; the [contrast audit](./accessibility.md#4-contrast-audit) has zero open failures |
| G4 | High information density without fatigue | 13px root, 3.25px spacing step, ≤ 24px vertical rhythm in tables |
| G5 | Predictable page anatomy | Every list page = stats row → filter bar → table card → drawer/menu overlays |
| G6 | Performance budget respected | ≤ 500 kB initial bundle (warn) / 1 MB (error); ≤ 4 kB per component stylesheet |
| G7 | Tokens are the only styling API | Feature CSS files stay near-empty; styling happens through Tailwind utilities + `--p-*` tokens |

---

## 3. Design principles

### P1 — Tokens before values

Never write a colour, radius, shadow or duration literal in a component. Reach for a Tailwind utility
backed by `@theme`, or a `--p-*` token. If neither exists, the correct move is to add a token to
[`tokens/`](./tokens/README.md) first, not to inline a value.

### P2 — Density is a feature, not an accident

The 13px root is deliberate: an HR admin scanning 50 employees should see 50 rows, not 20. Density is
bought with *spacing and type scale*, never by shrinking hit targets below 32×32 px or dropping
contrast.

### P3 — The brand colour is data

`primary.*` is tenant-supplied and can be any hue. No component may assume the brand is blue, may
assume `primary-500` is dark enough for white text, or may pair `primary` against `primary` for
meaning. Semantic state (success / warning / error / info) is *never* expressed with `primary`.

### P4 — Light and dark are two designs, not one design with an invert

Light mode carries hierarchy with **shadows**; dark mode carries it with **borders and surface steps**
(`dark:shadow-none dark:border-zinc-800`). This is already the app's convention — keep it. See
[Elevation](./foundations/elevation.md).

### P5 — Progressive disclosure over dense chrome

Three inline filters stay on the bar; everything else moves into the filter drawer behind a count
badge. Row actions collapse into an overflow menu. The default view is the calm view.

### P6 — Every asynchronous state is designed

Loading, empty, error and permission-denied are first-class visual states with dedicated components
(`app-table-loader`, `app-table-empty-message`, `*-stats-loader`, skeletons). A spinner over a blank
page is a defect.

### P7 — Accessible by construction

Focus rings are tokenised, not removed. Icon-only controls carry `aria-label`. Colour is never the
sole carrier of meaning — status chips pair colour with an icon and a text label. See
[Accessibility](./accessibility.md).

### P8 — Composition over configuration

Optimus resolves projected templates *by reference name* (`#title`, `#content`, `#empty`, `#header`,
`#headless`), and a name may appear only once per template. When a page needs two of the same
component, wrap it (`app-section-card`, `app-select-field`, `app-headless-drawer`) rather than
fighting the library.

---

## 4. Brand attributes

| Attribute | Meaning | Design consequence |
| --- | --- | --- |
| **Professional** | Enterprise HR data, often legally sensitive | Restrained palette, no decorative gradients, no illustration-heavy empty states |
| **Efficient** | Built for repetition — 200 rows a day | Compact rhythm, sticky header, keyboard-reachable actions, context menus on rows |
| **Trustworthy** | Payroll, identity documents, verification | Explicit states, confirm dialogs for destructive actions, no ambiguous iconography |
| **Adaptive** | White-labelled per tenant | Brand-agnostic neutrals (zinc), runtime-generated primary ramp, tenant favicon + logo |
| **Calm** | Long sessions, low visual noise | Soft 5px scrollbars, hover-revealed secondary actions, muted secondary text |
| **Precise** | Numbers and dates are the content | Tabular data left-aligned, numerics `font-semibold`, truncation with tooltip rather than wrap |

---

## 5. User experience philosophy

- **Scan, then act.** Every list page opens with a four-card statistics row that answers "what is the
  shape of this data" before the user reads a single row.
- **Filters are cheap, results are expensive.** Filters apply lazily against the server
  (`[lazy]="true"` + `onLazyLoad`); the table never sorts or pages client-side over partial data.
- **Permission shapes the UI, not just the API.** Columns, buttons and context menus are removed —
  not disabled — when `roleTypeId` or the permission matrix says no. A disabled control the user can
  never enable is noise; the exception is a control disabled *with a tooltip that explains why*.
- **Truncate and tooltip.** In a dense table, wrapping destroys the grid. Long values truncate with a
  `pTooltip` carrying the full string.
- **Reveal on hover, never hide behind hover.** Hover-revealed affordances (the copy button on
  employee code) are always *secondary*; nothing essential is hover-only, because touch users have no
  hover.
- **The page owns the scroll.** The shell is `h-screen overflow-hidden`; the content column scrolls
  with `[scrollbar-gutter:stable]` so layout never shifts when a scrollbar appears.

---

**Next:** [Governance →](./governance.md)
