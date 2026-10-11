[← Index](../README.md) · [Foundations](./color.md)

# Color

> **Ownership:** T0 — Foundations · **Status:** Normative
> **Source of truth:** `src/styles.css` (`@theme`), `src/app/core/axion-preset.ts`, `src/app/app.ts` (`#applyBrandColor`)
> **Related:** [Accessibility](../accessibility.md) · [Tokens](../tokens/README.md) · [Elevation](./elevation.md)

---

## 1. Architecture

Colour resolves through three layers. **Feature code may only touch layer 3.**

```
Layer 1 — Primitive        Layer 2 — Semantic              Layer 3 — Component
(fixed hex ramps)          (role tokens, theme-aware)      (what you write)
─────────────────────      ────────────────────────        ──────────────────────
zinc.50 … zinc.950    →    surface.0 … surface.950    →    bg-white dark:bg-zinc-900
blue/green/amber/red  →    primary.color / .hoverColor →   text-primary-700
                           text.color / .mutedColor        --p-primary-color
tenant brand hex      →    primary.50 … primary.950   →    bg-primary-50
```

### The primary ramp is generated at runtime

`src/app/app.ts`:

```ts
async #applyBrandColor() {
  const brandColor = (await this.#tenantsApi.getBrandColor()) ?? '#4287f5';
  updatePreset({ semantic: { primary: palette(brandColor) } });
}
```

`palette()` (from `@openng/optimus-ui-styled`) expands one hex into eleven stops by mixing with
white and black:

| Stop | Operation | Stop | Operation |
| --- | --- | --- | --- |
| `50` | tint 95% (95% white) | `600` | shade 15% (15% black) |
| `100` | tint 76% | `700` | shade 30% |
| `200` | tint 57% | `800` | shade 45% |
| `300` | tint 38% | `900` | shade 60% |
| `400` | tint 19% | `950` | shade 75% |
| `500` | the brand hex, unchanged | | |

> **Consequence for designers and QA.** `primary-500` is *always* the tenant's exact hex. Its contrast
> against white is therefore **unknown at design time** and must never be assumed. See
> [Accessibility → the tenant-brand contrast gate](../accessibility.md#5-the-tenant-brand-contrast-gate).

---

## 2. Primary colors

Default tenant brand: **`#4287f5`**. The table below is the ramp `palette('#4287f5')` produces — the
*fallback* palette, and the shape every tenant palette takes.

| Token Name | HEX | RGB | Usage |
| --- | --- | --- | --- |
| `primary-50` | `#f6f9fe` | `rgb(246, 249, 254)` | Chip and stat-icon backgrounds (`bg-primary-50`), empty-state icon halo, hover wash on ghost buttons |
| `primary-100` | `#d2e2fd` | `rgb(210, 226, 253)` | Chip hover background, highlight focus background |
| `primary-200` | `#aecbfb` | `rgb(174, 203, 251)` | Chip border in light theme; **chip text in dark theme** |
| `primary-300` | `#8ab5f9` | `rgb(138, 181, 249)` | Dashed-border hover on "Assign Role" placeholder; dark-theme active state |
| `primary-400` | `#669ef7` | `rgb(102, 158, 247)` | **`primary.color` in dark theme**; focus ring in dark; icon colour on dark surfaces |
| `primary-500` | `#4287f5` | `rgb(66, 135, 245)` | **`primary.color` in light theme** — buttons, active nav, focus ring, stat icons. The tenant hex, verbatim |
| `primary-600` | `#3873d0` | `rgb(56, 115, 208)` | Button hover (light), float-label focus |
| `primary-700` | `#2e5eac` | `rgb(46, 94, 172)` | Button active (light), **chip text on `primary-50`** (6.01:1 ✅), highlight text |
| `primary-800` | `#244a87` | `rgb(36, 74, 135)` | Highlight focus text, pressed states on tinted surfaces |
| `primary-900` | `#1a3662` | `rgb(26, 54, 98)` | Dark-theme chip background at 30% alpha (`dark:bg-primary-900/30`) |
| `primary-950` | `#10223d` | `rgb(16, 34, 61)` | Deepest tint; reserved — avoid as a text colour |

Theme mapping (from the Aura base preset, unchanged by `AxionPreset`):

| Semantic token | Light | Dark |
| --- | --- | --- |
| `--p-primary-color` | `{primary.500}` | `{primary.400}` |
| `--p-primary-contrast-color` | `#ffffff` | `{surface.900}` |
| `--p-primary-hover-color` | `{primary.600}` | `{primary.300}` |
| `--p-primary-active-color` | `{primary.700}` | `{primary.200}` |
| `--p-highlight-background` | `{primary.50}` | `color-mix(in srgb, {primary.400}, transparent 84%)` |
| `--p-highlight-color` | `{primary.700}` | `rgba(255,255,255,.87)` |

---

## 3. Secondary colors

AxionPro has **no second brand hue by design** — a second hue cannot be guaranteed to harmonise with
an arbitrary tenant brand colour. The secondary role is carried by the **neutral (zinc) ramp**, which
is what `severity="secondary"` resolves to on Optimus controls.

| Token Name | HEX | RGB | Usage |
| --- | --- | --- | --- |
| `secondary-surface` | `#f4f4f5` | `rgb(244, 244, 245)` | `severity="secondary"` button fill, neutral chip background |
| `secondary-border` | `#e4e4e7` | `rgb(228, 228, 231)` | Neutral chip border, card and table dividers |
| `secondary-foreground` | `#52525b` | `rgb(82, 82, 91)` | Neutral chip text (7.73:1 on white ✅) |
| `secondary-surface-dark` | `#27272a` | `rgb(39, 39, 42)` | Dark-theme neutral chip fill, table header band |
| `secondary-border-dark` | `#3f3f46` | `rgb(63, 63, 70)` | Dark-theme chip border |
| `secondary-foreground-dark` | `#d4d4d8` | `rgb(212, 212, 216)` | Dark-theme neutral chip text (11.99:1 on zinc-900 ✅) |

> **Rule.** If a design calls for "a second colour", the answer is a neutral, a semantic colour, or a
> different *shape* (outline vs filled, dashed vs solid). It is not a new hue.

---

## 4. Accent colors

Two accent families exist, both **decorative or categorical** — neither may encode state.

### 4.1 Avatar identity palette

16 fixed hues, selected deterministically from the first character of the name
(`shared/directives/avatar-color.ts`), with the text colour chosen by luminance so every combination
clears contrast automatically.

| Token Name | HEX | RGB | Usage |
| --- | --- | --- | --- |
| `accent-avatar-01` | `#D32F2F` | `rgb(211, 47, 47)` | Avatar fallback background — Red |
| `accent-avatar-02` | `#00796B` | `rgb(0, 121, 107)` | Teal |
| `accent-avatar-03` | `#1976D2` | `rgb(25, 118, 210)` | Blue |
| `accent-avatar-04` | `#388E3C` | `rgb(56, 142, 60)` | Green |
| `accent-avatar-05` | `#F9A825` | `rgb(249, 168, 37)` | Yellow — pairs with `#000000` text |
| `accent-avatar-06` | `#C2185B` | `rgb(194, 24, 91)` | Pink |
| `accent-avatar-07` | `#7B1FA2` | `rgb(123, 31, 162)` | Purple |
| `accent-avatar-08` | `#0288D1` | `rgb(2, 136, 209)` | Light Blue |
| `accent-avatar-09` | `#F57C00` | `rgb(245, 124, 0)` | Orange |
| `accent-avatar-10` | `#1ABC9C` | `rgb(26, 188, 156)` | Turquoise — pairs with `#000000` text |
| `accent-avatar-11` | `#1565C0` | `rgb(21, 101, 192)` | Dark Blue |
| `accent-avatar-12` | `#2E7D32` | `rgb(46, 125, 50)` | Dark Green |
| `accent-avatar-13` | `#E65100` | `rgb(230, 81, 0)` | Dark Orange |
| `accent-avatar-14` | `#C62828` | `rgb(198, 40, 40)` | Dark Red |
| `accent-avatar-15` | `#6A1B9A` | `rgb(106, 27, 154)` | Dark Purple |
| `accent-avatar-16` | `#455A64` | `rgb(69, 90, 100)` | Dark Slate |

### 4.2 Route progress accent

Intentionally outside the tenant palette so progress reads as *system chrome* rather than brand.

| Token Name | HEX | RGB | Usage |
| --- | --- | --- | --- |
| `accent-progress` | `#ca1922` | `rgb(202, 25, 34)` | `--ng-progress-color`, 4px top bar during route navigation |

---

## 5. Semantic colors

These are the values currently in the codebase (`get-employee-progress-color-pipe.ts`,
`get-new-joiner-badge-pipe.ts`) plus the AA-safe variants that must be used **whenever the colour
carries text or is the sole indicator**. See [Accessibility](../accessibility.md) for why both
columns exist.

### Success

| Token Name | HEX | RGB | Usage |
| --- | --- | --- | --- |
| `success-50` | `#f0fdf4` | `rgb(240, 253, 244)` | Success message background, positive chip fill (light) |
| `success-400` | `#4ade80` | `rgb(74, 222, 128)` | **Dark-theme** success text/icon — 10.17:1 on zinc-900 ✅ |
| `success-500` | `#22c55e` | `rgb(34, 197, 94)` | Fill only — progress bar ≥ 80%, "Joined Today" badge. ⚠️ 2.28:1 on white — **not a text colour in light theme** |
| `success-600` | `#16a34a` | `rgb(22, 163, 74)` | Non-text UI boundary on white (3.30:1 ✅ for ≥ 3:1 graphics) |
| `success-700` | `#15803d` | `rgb(21, 128, 61)` | **Light-theme success text** — 5.02:1 on white ✅. Also the light `severity="success"` button fill (`axion-preset.ts`) |

### Warning

| Token Name | HEX | RGB | Usage |
| --- | --- | --- | --- |
| `warning-50` | `#fffbeb` | `rgb(255, 251, 235)` | Warning message background |
| `warning-400` | `#fbbf24` | `rgb(251, 191, 36)` | **Dark-theme** warning text/icon — 10.61:1 on zinc-900 ✅ |
| `warning-500` | `#f59e0b` | `rgb(245, 158, 11)` | Fill only — progress bar 70–79%, "Joined 2d ago" badge. ⚠️ 2.15:1 on white |
| `warning-600` | `#d97706` | `rgb(217, 119, 6)` | Non-text UI boundary on white (3.19:1 ✅) |
| `warning-700` | `#b45309` | `rgb(180, 83, 9)` | **Light-theme warning text** — 5.02:1 on white ✅ |

### Error

| Token Name | HEX | RGB | Usage |
| --- | --- | --- | --- |
| `error-50` | `#fef2f2` | `rgb(254, 242, 242)` | Error message background, destructive confirm dialog wash |
| `error-300` | `#fca5a5` | `rgb(252, 165, 165)` | `--p-inputtext-invalid-border-color` in dark theme |
| `error-400` | `#f87171` | `rgb(248, 113, 113)` | Invalid field border (light, via `.form-invalid-visible`); dark-theme error text — 6.40:1 ✅ |
| `error-500` | `#ef4444` | `rgb(239, 68, 68)` | Progress bar < 70%, overlay badge. 3.76:1 on white — large text / icons only |
| `error-600` | `#dc2626` | `rgb(220, 38, 38)` | **Light-theme error text** — 4.83:1 on white ✅. Also the light `severity="danger"` button fill (`axion-preset.ts`) |

### Info

| Token Name | HEX | RGB | Usage |
| --- | --- | --- | --- |
| `info-50` | `#eff6ff` | `rgb(239, 246, 255)` | Info message background |
| `info-400` | `#60a5fa` | `rgb(96, 165, 250)` | **Dark-theme** info text/icon — 6.97:1 on zinc-900 ✅ |
| `info-500` | `#3b82f6` | `rgb(59, 130, 246)` | "Joined Yesterday" badge fill. 3.68:1 on white — non-text only |
| `info-600` | `#2563eb` | `rgb(37, 99, 235)` | **Light-theme info text** — 5.17:1 on white ✅ |

> **Semantic vs primary.** When the tenant brand is blue, `info-*` and `primary-*` will look similar.
> That is acceptable: *info* is still a distinct token and must not be aliased to primary, because a
> tenant with an orange brand needs info to stay blue.

---

## 6. Neutral palette (50–950)

The `zinc` ramp, used for surfaces in **both** themes (`AxionPreset` overrides Aura's light-mode
`slate` with `zinc` so the two schemes share one neutral family).

| Token Name | HEX | RGB | On white | On zinc-900 | Usage |
| --- | --- | --- | --- | --- | --- |
| `neutral-50` | `#fafafa` | `rgb(250, 250, 250)` | 1.04 | 16.97 | App background (light); table header band |
| `neutral-100` | `#f4f4f5` | `rgb(244, 244, 245)` | 1.10 | 16.12 | Hover fill on list rows, disabled field background |
| `neutral-200` | `#e4e4e7` | `rgb(228, 228, 231)` | 1.27 | 13.96 | **Border (light)**; progress track; chip border |
| `neutral-300` | `#d4d4d8` | `rgb(212, 212, 216)` | 1.48 | 11.99 | Form field border (light); dashed placeholder border; dark secondary text |
| `neutral-400` | `#a1a1aa` | `rgb(161, 161, 170)` | 2.56 | 6.91 | **Secondary text (dark)**; field icons; placeholder |
| `neutral-500` | `#71717a` | `rgb(113, 113, 122)` | 4.83 | 3.67 | **Secondary text (light)** — 4.63:1 on `neutral-50` ✅ |
| `neutral-600` | `#52525b` | `rgb(82, 82, 91)` | 7.73 | 2.29 | Body text on tinted light surfaces; muted headings |
| `neutral-700` | `#3f3f46` | `rgb(63, 63, 70)` | 10.44 | 1.70 | Table cell text; dark-theme borders on raised surfaces |
| `neutral-800` | `#27272a` | `rgb(39, 39, 42)` | 14.89 | 1.19 | **Border (dark)**; dark table header band |
| `neutral-900` | `#18181b` | `rgb(24, 24, 27)` | 17.72 | 1.00 | **Primary text (light)**; **card surface (dark)** |
| `neutral-950` | `#09090b` | `rgb(9, 9, 11)` | 19.90 | 1.12 | **App background (dark)**; dark form-field fill |

---

## 7. Usage guidelines

### Do

- Use `bg-white dark:bg-zinc-900` for raised surfaces (cards, drawers, popovers) and
  `bg-zinc-50 dark:bg-zinc-950` for the page ground. **Two steps of separation, always.**
- Pair every colour with a non-colour signal: status chips carry `pi pi-shield` + a text label;
  active/inactive uses `pi pi-check-circle` / `pi pi-ban`, not green/red alone.
- Reach for `primary-50` / `primary-900/30` when you need a *branded* tint, and `gray-50` /
  `zinc-800` when you need a *neutral* one. A branded tint signals interactivity; a neutral one
  signals grouping.
- Express disabled state through `--p-disabled-opacity` (`0.6`), not a lighter colour.
- Put semantic colour on the **fill** and neutral colour on the **text** when the fill is light
  (`bg-primary-50` + `text-primary-700`).

### Don't

- ❌ Hard-code a hex in a template or component `.ts`. The pipes that currently do are grandfathered
  and tracked as [DS-01](../open-items.md).
- ❌ Use `primary-*` to mean success, or `error-500` to mean "delete button" *and* "required field" —
  one token, one meaning.
- ❌ Invert a light-theme colour to get a dark-theme colour. Pick the dark value from the ramp.
- ❌ Use `text-gray-400` (2.54:1) for anything a user must read. It is a *placeholder* colour only.
- ❌ Apply a shadow in dark mode. Use `dark:shadow-none` and `dark:border-zinc-800` — see
  [Elevation](./elevation.md).
- ❌ Introduce a hue outside the primary ramp, the zinc ramp, the four semantic families, and the two
  accent families above.

---

## 8. Light theme

| Role token | Value | HEX | RGB | Usage |
| --- | --- | --- | --- | --- |
| `surface.ground` | `--color-surface-ground-light` | `#fafafa` | `rgb(250, 250, 250)` | App canvas behind cards |
| `surface.default` | `--color-surface-light` | `#ffffff` | `rgb(255, 255, 255)` | Cards, drawers, popovers, table body, sidebar |
| `surface.raised` | `{surface.0}` | `#ffffff` | `rgb(255, 255, 255)` | Overlays — separated by shadow, not colour |
| `surface.subtle` | `{zinc.50}` | `#fafafa` | `rgb(250, 250, 250)` | Table header band, hover fill, inline-edit field |
| `border.default` | `--color-border-light` | `#e4e4e7` | `rgb(228, 228, 231)` | Card, table, sidebar dividers |
| `border.strong` | `{surface.300}` | `#d4d4d8` | `rgb(212, 212, 216)` | Form field resting border |
| `text.primary` | `--color-text-primary-light` | `#18181b` | `rgb(24, 24, 27)` | Headings, stat numerals |
| `text.body` | `{surface.700}` | `#3f3f46` | `rgb(63, 63, 70)` | Table cells, paragraph text |
| `text.muted` | `--color-text-secondary-light` | `#71717a` | `rgb(113, 113, 122)` | Labels, captions, secondary email line |
| `text.placeholder` | `{surface.500}` | `#71717a` | `rgb(113, 113, 122)` | Input placeholders |
| `primary.color` | `{primary.500}` | `#4287f5`* | `rgb(66, 135, 245)` | Buttons, focus ring, active nav, stat icons |
| `primary.contrast` | `#ffffff` | `#ffffff` | `rgb(255, 255, 255)` | Text on primary fill |
| `mask.background` | `rgba(0,0,0,0.4)` | — | — | Modal and drawer scrim |

\* tenant-dependent.

---

## 9. Dark theme

Activated by `.dark` on `<html>`. `ThemeApi.setTheme()` also sets `data-color-scheme`, persists to
`localStorage` under the tenant-prefixed `theme` key, and falls back to `prefers-color-scheme`.

| Role token | Value | HEX | RGB | Usage |
| --- | --- | --- | --- | --- |
| `surface.ground` | `--color-surface-ground-dark` | `#09090b` | `rgb(9, 9, 11)` | App canvas |
| `surface.default` | `--color-surface-dark` | `#18181b` | `rgb(24, 24, 27)` | Cards, sidebar, drawers, table body |
| `surface.raised` | `{zinc.800}` | `#27272a` | `rgb(39, 39, 42)` | Hover fill, table header band, neutral chips |
| `surface.field` | `{surface.950}` | `#09090b` | `rgb(9, 9, 11)` | Form field background |
| `border.default` | `--color-border-dark` | `#27272a` | `rgb(39, 39, 42)` | Card and sidebar dividers — **carries the elevation that shadows carry in light theme** |
| `border.strong` | `{surface.600}` | `#52525b` | `rgb(82, 82, 91)` | Form field resting border |
| `text.primary` | `--color-text-primary-dark` | `#fafafa` | `rgb(250, 250, 250)` | Headings, stat numerals — 16.97:1 ✅ |
| `text.body` | `{zinc.100}` | `#f4f4f5` | `rgb(244, 244, 245)` | Table cells (`dark:text-zinc-100`) — 16.12:1 ✅ |
| `text.muted` | `--color-text-secondary-dark` | `#a1a1aa` | `rgb(161, 161, 170)` | Secondary lines — 6.91:1 ✅ |
| `primary.color` | `{primary.400}` | `#669ef7`* | `rgb(102, 158, 247)` | Buttons, focus ring — 6.58:1 on `#18181b` ✅ |
| `primary.contrast` | `{surface.900}` | `#18181b` | `rgb(24, 24, 27)` | Text on primary fill |
| `chip.background` | `{primary.900}/30` | `#1a3662` @ 30% | — | Role chip fill |
| `chip.text` | `{primary.200}` | `#aecbfb` | `rgb(174, 203, 251)` | Role chip label — 9.78:1 over the composited fill (`#192130`) ✅ |
| `mask.background` | `rgba(0,0,0,0.6)` | — | — | Modal and drawer scrim |

### Dark-mode rules

1. **Never carry elevation with a shadow** — `dark:shadow-none dark:border-zinc-800`.
2. **Never use pure `#000000` as a surface** — `zinc-950` is the floor.
3. **Never use pure `#ffffff` as body text** — `zinc-50` / `zinc-100` is the ceiling (halation control).
4. **Semantic colours shift up** one or two stops (`-500` → `-400`) so they clear contrast on `zinc-900`.

---

**Next:** [Typography →](./typography.md)
