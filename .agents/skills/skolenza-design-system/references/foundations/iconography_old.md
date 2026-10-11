[← Index](../README.md) · [← Motion](./motion.md)

# Iconography

> **Ownership:** T0 — Foundations · **Status:** Normative
> **Source of truth:** `@openng/icons`, `@lucide/angular`, `--p-icon-size`
> **Related:** [Accessibility](../accessibility.md) · [Typography](./typography.md) · [Color](./color.md)

---

## 1. Libraries

| Library | Package | Syntax | Role |
| --- | --- | --- | --- |
| **Optimus Icons** | `@openng/icons` | `<i class="pi pi-users"></i>` | **Primary.** Icon font, PrimeIcons-compatible names. Used by every Optimus component's own icon slots |
| **Lucide** | `@lucide/angular`, `lucide-angular` | `<lucide-icon name="users" />` | Secondary — outline SVGs where a glyph is missing from `pi` or needs independent stroke control |

> **Rule:** one library per surface. A card header must not mix a `pi` glyph with a Lucide SVG —
> their optical weights differ and the mismatch is visible at small sizes. `pi` is the default; reach
> for Lucide only when `pi` has no equivalent.

---

## 2. Style rules

- **Solid / filled for `pi`, 2px outline for Lucide.** Do not mix metaphors within one component.
- **One concept, one icon, product-wide:**

  | Concept | Icon |
  | --- | --- |
  | Employees | `pi pi-users` |
  | Role / permission | `pi pi-shield` |
  | Create | `pi pi-plus` |
  | Overflow menu | `pi pi-ellipsis-h` |
  | Copy | `pi pi-clipboard` |
  | Active / inactive | `pi pi-check-circle` / `pi pi-ban` |
  | In-flight | `pi pi-spin pi-spinner` |

  Adding a second icon for an existing concept requires a T0 review.

- **Icons inherit `currentColor`.** Never set a fill hex on an icon; colour it with a text utility so
  it follows the theme.
- **Optical alignment over geometric.** Pair icons with text using `inline-flex items-center gap-2`
  (or `gap-1.5` inside a chip), never a hard-coded vertical offset.
- **No icon-only destructive actions without a tooltip.** The delete affordance always carries either
  a visible label or a `pTooltip` plus an `aria-label`.

---

## 3. Sizes

Icon size is font-size for `pi`; the base token `--p-icon-size` is `1rem` = **13px**.

| Token | Class | rem | **px @ 13px** | Use |
| --- | --- | --- | --- | --- |
| `icon-2xs` | `text-[10px]` | — | 10 | Decorative glyph inside a chip (`pi pi-shield`). **Always `aria-hidden`** |
| `icon-xs` | `text-xs` | 0.75 | 9.75 | Sort arrows, breadcrumb separators, submenu chevrons (`--p-navigation-submenu-icon-size` = `0.875rem`) |
| `icon-sm` | `text-sm` | 0.875 | 11.38 | Inline icons in table cells, field prefix / suffix icons |
| `icon-md` | `text-base` | 1 | **13** | **Default** — buttons, menu items, form field icons (`--p-icon-size`) |
| `icon-lg` | `text-xl!` | 1.25 | 16.25 | Stat-card icons below `sm:` |
| `icon-xl` | `text-2xl!` | 1.5 | 19.5 | Stat-card icons at `sm:` and above |
| `icon-2xl` | `text-3xl!` | 1.875 | 24.38 | Empty-state icon inside its 16×16 halo (`table-empty-message.html`) |
| `icon-hero` | `text-5xl` | 3 | 39 | Full-page empty / error states only |

**Container sizing.** An icon tile is `2.5×` the icon — stat cards put a 13px icon in `h-10 w-10`;
at `sm:`, a 19.5px icon in `h-12 w-12`. The empty-state halo is `h-16 w-16` with `radius-full`.

**Hit target.** Any icon that is *clickable* needs ≥ **32×32 px** of interactive area (44×44 on touch
surfaces), regardless of the glyph size. **Pad the button, don't grow the icon.**

> **Tailwind v4 important modifier goes after the utility:** `text-xl!`, never `!text-xl`. The
> codebase contains both — trailing is correct; leading survives only in files not yet touched.
> Tracked as [DS-08](../open-items.md).

---

## 4. Stroke weights

| Library | Stroke | Notes |
| --- | --- | --- |
| `pi pi-*` | n/a (filled glyph) | Weight is baked into the font. Do not attempt to thin it with `font-weight` |
| Lucide | `2` at 24px viewBox (default) | Keep `stroke-width="2"` at `icon-md` and above; drop to `1.5` at `icon-sm` and below so small glyphs don't clog |

**Never render an icon below its designed grid.** A 24px-grid Lucide glyph at 10px loses its interior
detail — use a `pi` glyph at that size instead.

---

## 5. Accessibility guidance

| Situation | Markup |
| --- | --- |
| Decorative icon beside a visible text label | `<i class="pi pi-shield" aria-hidden="true"></i>` |
| Icon-only button | `<p-button icon="pi pi-ellipsis-h" [ariaLabel]="'More actions for ' + name" />` — see `table-action-button.ts`, which exposes `ariaLabel` as a required-in-practice input |
| Icon carrying state (active / inactive) | Icon + `pTooltip` + `[attr.aria-label]`. Colour alone is never sufficient |
| Loading spinner replacing an icon | Keep the button's `aria-label` stable; add `aria-busy="true"` so the label doesn't change under the user |
| Icon in an empty state | `aria-hidden="true"` — the heading already carries the message |

Additional requirements:

- Icons that convey meaning must clear **3:1** against their background — see
  [Accessibility](../accessibility.md#1-contrast-thresholds).
- Never rely on an icon's *shape* alone for a critical distinction (✓ vs ✗ at 10px is not
  distinguishable for many users) — pair with text or colour **and** a tooltip.
- Icon fonts must degrade: if `@openng/icons` fails to load, an icon-only button with a proper
  `aria-label` is still operable. **Test with the stylesheet blocked.**

---

**Next:** [Tokens →](../tokens/README.md)
