[← Index](../README.md) · [← Color](./color.md)

# Typography

> Ported from AxionPro `typography_old.md` (removed; see git history). Verified against Skolenza code on 2026-10-15.
> **Ownership:** T0 — Foundations · **Status:** Normative
> **Source of truth:** `src/styles.css` (`html { font-size }`, the Inter `@import`)
> **Related:** [Accessibility](../accessibility.md) · [Spacing](./spacing.md) · [Tokens](../tokens/README.md)

---

## 1. Font families

| Token | Stack | Loaded from | Usage |
| --- | --- | --- | --- |
| `font-sans` | `'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` (CSS emits only `'Inter', sans-serif`) | Google Fonts variable axes `opsz 14..32`, `wght 100..900`, italic | Everything — UI, body, headings, data |
| `font-mono` | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | System | Code, IDs, hashes, JSON in developer surfaces |
| `font-numeric` | `font-sans` + `font-variant-numeric: tabular-nums` | — | Any column of numbers that must align: amounts, counts, percentages, durations |

> **Recommended change.** The font is loaded with `@import url(...)` on line 1 of `styles.css`,
> which serialises the request behind CSS parse. Move to `<link rel="preconnect">` +
> `<link rel="stylesheet">` in `index.html`, or self-host the variable file, to remove the
> render-block. Tracked as [DS-06](../open-items.md). The current URL already specifies
> `display=swap`, which is correct.

---

## 2. The 13px root

**Read this before using any `rem` value.**

```css
html { font-size: 0.8125rem; }   /* 13px */
```

Every `rem` in a **style** resolves against 13px, so the whole Tailwind scale is compressed to ~81%
of its documented size.

| Tailwind class | rem | **Actual px @ 13px root** | Nominal px @ 16px |
| --- | --- | --- | --- |
| `text-xs` | 0.75 | **9.75** | 12 |
| `text-sm` | 0.875 | **11.38** | 14 |
| `text-base` | 1 | **13** | 16 |
| `text-lg` | 1.125 | **14.63** | 18 |
| `text-xl` | 1.25 | **16.25** | 20 |
| `text-2xl` | 1.5 | **19.5** | 24 |
| `text-3xl` | 1.875 | **24.38** | 30 |
| `text-4xl` | 2.25 | **29.25** | 36 |
| `text-5xl` | 3 | **39** | 48 |

### Consequences you must internalise

**1. `text-xs` renders at 9.75px.** That is below the 12px practical floor for sustained reading.
Use it only for chips and badges with short, non-essential labels — never for values a user must
read to do their job.

**2. Media queries are unaffected.** Per CSS Media Queries Level 4, `rem` in a media query resolves
against the *initial* font size (16px), not the root's computed value. So Tailwind's `sm: 40rem` is
still **640px** — which is exactly why `styles.css` can hand-write `@media (max-width: 639.98px)`
for the paginator and have it line up with `sm:`. See [Grid](./grid.md).

**3. What counts as "large text" changes.** `text-2xl` (19.5px) is still *normal* text for WCAG
unless bold. Only `text-3xl` and above qualify as large — so the stat-card numerals need 4.5:1, not
3:1. See [Accessibility](../accessibility.md#1-contrast-thresholds).

---

## 3. Type scale

Letter-spacing is expressed in `em` so it tracks the size. `line-height` is unitless.

### Display

| Token | Class | Size (px) | Weight | Line height | Letter spacing | Usage |
| --- | --- | --- | --- | --- | --- | --- |
| `type-display-lg` | `text-5xl font-bold` | 39 | 700 | 1.1 | `-0.02em` | Marketing / pricing hero only — never inside the app shell |
| `type-display-md` | `text-4xl font-bold` | 29.25 | 700 | 1.15 | `-0.02em` | Empty-state hero, onboarding, 404 |
| `type-display-sm` | `text-3xl font-medium` | 24.38 | 500 | 1.2 | `-0.01em` | Stat-card numerals at `sm:` and above (`sm:text-3xl!`, `leading-tight`) |

### Headings

| Token | Class | Size (px) | Weight | Line height | Letter spacing | Usage |
| --- | --- | --- | --- | --- | --- | --- |
| `type-h1` | `text-2xl font-semibold` | 19.5 | 600 | 1.25 | `-0.015em` | Page title in `app-sub-header`. **One per route** (today an `<h4 class="text-lg font-bold">`: a gap) |
| `type-h2` | `text-xl font-semibold` | 16.25 | 600 | 1.3 | `-0.01em` | Card heading (`app-section-card [heading]`, no size class yet), drawer title |
| `type-h3` | `text-lg font-semibold` | 14.63 | 600 | 1.35 | `-0.005em` | Sub-section inside a card, dialog header, empty-state message |
| `type-h4` | `text-base font-semibold` | 13 | 600 | 1.4 | `0` | Form fieldset legend, grouped-list header |
| `type-h5` | `text-sm font-semibold` | 11.38 | 600 | 1.45 | `0.005em` | Dense sub-group label inside a panel |
| `type-h6` | `text-xs font-semibold uppercase` | 9.75 | 600 | 1.5 | `0.06em` | Overline / eyebrow. Uppercase requires the extra tracking |

> H5 and H6 exist for outline correctness. Prefer `type-h4` + a semantic `<h5>` over shrinking text
> further — heading *level* is document structure, heading *size* is visual; they need not move together.

### Body

| Token | Class | Size (px) | Weight | Line height | Letter spacing | Usage |
| --- | --- | --- | --- | --- | --- | --- |
| `type-body-lg` | `text-base` | 13 | 400 | 1.6 | `0` | Default paragraph, dialog copy, help text blocks |
| `type-body-md` | `text-sm` | 11.38 | 400 | 1.55 | `0` | **Table cell default**, form values, list items |
| `type-body-sm` | `text-xs` | 9.75 | 400 | 1.5 | `0.005em` | Chip labels, badge text, table meta. Short strings only |
| `type-body-strong` | `text-sm font-semibold` | 11.38 | 600 | 1.55 | `0` | Staff member code, IDs, emphasised value in a pair |

### Caption

| Token | Class | Size (px) | Weight | Line height | Letter spacing | Usage |
| --- | --- | --- | --- | --- | --- | --- |
| `type-caption` | `text-sm text-zinc-500 dark:text-zinc-400` | 11.38 | 400 | 1.45 | `0.005em` | Secondary line under a primary value (the email under a name), timestamps, empty-state sub-message, form hints |
| `type-caption-strong` | `text-sm font-medium text-gray-500 sm:text-base` | 11.38 → 13 | 500 | 1.45 | `0.005em` | Stat-card label ("Total StaffMembers") |

### Labels

| Token | Class | Size (px) | Weight | Line height | Letter spacing | Usage |
| --- | --- | --- | --- | --- | --- | --- |
| `type-label` | `font-medium` (inherits `text-base`) | 13 | 500 | 1.4 | `0` | Form field label (`form-field-shell`) |
| `type-label-sm` | `text-xs font-medium` | 9.75 | 500 | 1.4 | `0.01em` | Chip label, filter pill, tag |
| `type-label-required` | `type-label` + `aria-hidden` `*` (`text-red-600`) + sr-only "(required)" | 13 | 500 | 1.4 | `0` | Required field. The asterisk is **supplementary** — the sr-only text carries the meaning |

### Code

| Token | Class | Size (px) | Weight | Line height | Letter spacing | Usage |
| --- | --- | --- | --- | --- | --- | --- |
| `type-code-inline` | `font-mono text-sm bg-zinc-100 dark:bg-zinc-800 rounded-xs px-1` | 11.38 | 400 | 1.5 | `0` | Inline identifier, API key fragment, module key |
| `type-code-block` | `font-mono text-sm` | 11.38 | 400 | 1.65 | `0` | Multi-line code, JSON payload viewer. Block scrolls with `overflow-x-auto` |

---

## 4. Usage guidance

- **One `<h1>` per route.** `app-sub-header` should own it (today an `<h4>`). Feature cards start at
  `<h2>` (`app-section-card [heading]`), so the outline never skips a level.
- **Never set a size below `text-xs`.** `text-[10px]` is for `aria-hidden` chip glyphs (drift: the
  `staff-members` new-joiner and role-count badges use it for visible text).
- **Weight before size for emphasis.** Line-height loosens at small sizes (1.5–1.6) and tightens at
  display sizes (1.1–1.2); a size bump disturbs dense table rhythm, `font-semibold` does not.
- **Truncate, don't wrap, in table cells:** `truncate` + `max-w-*` + `pTooltip` carrying the full
  value.
- **Negative tracking above 16px, positive below 11px**, as corrections on Inter's optical sizing.
- **Numbers align.** Any column of numerals gets `tabular-nums`.

---

## 5. Composite utilities

**Proposed, not yet emitted** (`styles.css` has only the `dash-*` utilities). Emit type styles as
Tailwind `@utility` blocks so a composite is one class, not five:

```css
@utility type-h2 {
  @apply text-xl leading-[1.3] font-semibold tracking-[-0.01em];
}

@utility type-body-md {
  @apply text-sm leading-[1.55];
}

@utility type-caption {
  @apply text-sm leading-[1.45] tracking-[0.005em] text-zinc-500 dark:text-zinc-400;
}

@utility type-label {
  @apply leading-[1.4] font-medium;
}
```

See [Tokens → Emitting](../tokens/README.md#4-emitting-the-tokens) for where these live.

---

**Next:** [Spacing →](./spacing.md)
