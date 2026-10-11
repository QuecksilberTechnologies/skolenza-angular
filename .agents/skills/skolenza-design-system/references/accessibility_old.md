[← Index](./README.md)

# Accessibility

> **Ownership:** T0 — Foundations · **Status:** Normative
> **Related:** [Color](./foundations/color.md) · [Typography](./foundations/typography.md) · [Motion](./foundations/motion.md) · [Iconography](./foundations/iconography.md) · [Open items](./open-items.md)

Accessibility is a **build-time property** here, not a review-time opinion. `angular-eslint`'s
`templateAccessibility` config runs on every `.html`, AXE checks gate the UI, and failures there are
a11y bugs rather than style nits.

Target: **WCAG 2.2 Level AA**.

---

## 1. Contrast thresholds

| Content | Minimum |
| --- | --- |
| Body text (< 18.66px bold / < 24px regular) | **4.5:1** |
| Large text (≥ 24px, or ≥ 18.66px bold) | **3:1** |
| UI component boundaries, icons conveying meaning, chart / progress fills | **3:1** |
| Focus indicator vs adjacent colours | **3:1**, with a minimum 2px perimeter (WCAG 2.4.11) |
| Disabled controls | Exempt — but must not be the only way to convey unavailability |

### The 13px root changes what counts as "large"

At a 13px root, `text-2xl` renders at **19.5px**. That is still *normal text* for WCAG purposes
unless it is bold. Only `text-3xl` (24.38px) and above qualify as large.

**Consequence:** the stat-card numerals are `text-2xl font-medium` — they need **4.5:1**, not 3:1.
See [Typography → the 13px root](./foundations/typography.md#2-the-13px-root).

---

## 2. Focus

| Rule | Detail |
| --- | --- |
| Focus is never removed | `outline: none` without a replacement indicator is a defect |
| Form controls | `--p-inputtext-focus-ring-*` / `--p-select-focus-ring-*` / `--p-textarea-focus-ring-*`, solid, in `var(--p-primary-color)` |
| Non-form interactive elements | `focus-visible:ring-2 ring-primary-400` — compliant |
| Perimeter | **2px minimum.** WCAG 2.4.11 wants a perimeter thick enough to separate from the resting border; 1px does not manage that on the dark surface |
| Focus order | Follows DOM order. Overlays render to `body` (`appendTo="body"`) and must trap focus while open and restore it on close |

> ⚠️ **Open finding.** `src/styles.css` currently declares `--p-inputtext-focus-ring-width: 1px`
> while its own inline comment argues for 2px on WCAG 2.4.11 grounds. Tracked as
> [A11Y-08](#4-contrast-audit) / [DS-04](./open-items.md).

---

## 3. Colour is never the sole signal

Every state that is communicated with colour must also be communicated with a **shape, an icon, or
text**.

| State | Colour | Second signal |
| --- | --- | --- |
| Role assigned | `primary-50` chip | `pi pi-shield` icon + the role name as text |
| Active / inactive | `success` / `error` severity | `pi pi-check-circle` / `pi pi-ban` + tooltip |
| In-flight action | — | `pi pi-spin pi-spinner` + `aria-busy` |
| Required field | `error-600` asterisk | `aria-required` — the asterisk is supplementary |
| Profile completion | Green / amber / red bar | Numeric percentage label + tooltip |

---

## 4. Contrast audit

Every ratio below is **measured**, not estimated. These are real defects in `axionpro-app` today and
must be resolved before the next release.

| # | Location | Pair | Ratio | Required | Fix |
| --- | --- | --- | --- | --- | --- |
| A11Y-01 | `employees.html` — completion `%` label | `#22c55e` on `#ffffff` | **2.28:1** ❌ | 4.5:1 | Use `success-700 #15803d` for the text; keep `#22c55e` for the bar fill |
| A11Y-02 | `employees.html` — completion `%` label | `#f59e0b` on `#ffffff` | **2.15:1** ❌ | 4.5:1 | Use `warning-700 #b45309` for the text |
| A11Y-03 | New-joiner badge "Joined Today" | `#ffffff` on `#22c55e` | **2.28:1** ❌ | 4.5:1 | Swap to `#000000` on `#22c55e` (9.22:1 ✅) or white on `success-700` (5.02:1 ✅) |
| A11Y-04 | New-joiner badge "Joined 2d ago" | `#ffffff` on `#f59e0b` | **2.15:1** ❌ | 4.5:1 | `#000000` on `#f59e0b` = 9.78:1 ✅ |
| A11Y-05 | New-joiner badge "Joined Yesterday" | `#ffffff` on `#3b82f6` | **3.68:1** ❌ | 4.5:1 (10px text) | White on `info-600 #2563eb` = 5.17:1 ✅ |
| A11Y-06 | Progress track vs fill | `#e4e4e7` vs `#22c55e` | 1.75:1 | 3:1 | Track to `neutral-300 #d4d4d8`, or add a 1px `neutral-400` outline to the bar |
| A11Y-07 | "No role assigned" | `#9ca3af` on `#ffffff` | **2.54:1** ❌ | 4.5:1 | `neutral-500 #71717a` (4.83:1 ✅) |
| A11Y-08 | Focus ring on form controls | 1px | 2px perimeter | — | Set `--p-inputtext-focus-ring-width: 2px` (and select / textarea) |

### Verified-passing pairs, for reference

| Pair | Ratio |
| --- | --- |
| `primary-700 #2e5eac` on `primary-50 #f6f9fe` (light chip) | 6.01:1 ✅ |
| `primary-200 #aecbfb` on the dark chip fill (`primary-900/30` over `zinc-900` = `#192130`) | 9.78:1 ✅ |
| `primary-400 #669ef7` on `zinc-900 #18181b` | 6.58:1 ✅ |
| `neutral-500 #71717a` on `neutral-50 #fafafa` (muted text, light) | 4.63:1 ✅ |
| `neutral-400 #a1a1aa` on `zinc-900 #18181b` (muted text, dark) | 6.91:1 ✅ |
| `zinc-100 #f4f4f5` on `zinc-900 #18181b` (body text, dark) | 16.12:1 ✅ |

---

## 5. The tenant-brand contrast gate

Because `primary-500` is **whatever hex the tenant chose**, its contrast is unknown at design time.

**Requirement:** the brand-colour picker MUST reject, or at minimum warn on, any hex where
`contrast(brand, #ffffff) < 3.0`. Below that, white-on-primary buttons fail even the large-text
threshold.

The default `#4287f5` sits at **3.49:1** against white — acceptable for ≥ 18.66px bold button labels
and UI boundaries, **not** for small white text on a primary fill. For small labels on a primary
fill, use `primary-600` (4.63:1) or `primary-700` (6.34:1).

---

## 6. Text size floor

`text-xs` renders at **9.75px** at this root size — below the practical floor for sustained reading.

- Use it only for chips and badges with short, non-essential labels
- Never for values a user must read to do their job
- `text-[10px]` is reserved for `aria-hidden` decorative glyphs inside chips

Tracked as [DS-11](./open-items.md) where this is currently violated.

---

## 7. Motion

`prefers-reduced-motion` is **not currently implemented** — a WCAG 2.3.3 gap. The required CSS block
and the rules around it live in [Motion → Reduced motion](./foundations/motion.md#4-reduced-motion).

Key rules:

- Reduced motion means **reduced**, not removed. State changes still happen; they happen at once
- Indeterminate indicators keep moving — a frozen spinner reads as a hung app
- Motion is never the only indicator of a state change
- No parallax, auto-playing carousels, or large-area zooms — there is no acceptable reduced-motion
  fallback for these

---

## 8. Icons and controls

| Situation | Markup |
| --- | --- |
| Decorative icon beside a visible text label | `<i class="pi pi-shield" aria-hidden="true"></i>` |
| Icon-only button | `<p-button icon="pi pi-ellipsis-h" [ariaLabel]="'More actions for ' + name" />` |
| Icon carrying state | Icon + `pTooltip` + `[attr.aria-label]` — colour alone is never sufficient |
| Spinner replacing an icon | Keep the button's `aria-label` stable; add `aria-busy="true"` |
| Icon in an empty state | `aria-hidden="true"` — the heading already carries the message |

**Hit targets:** any clickable icon needs ≥ **32×32 px** of interactive area (44×44 on touch
surfaces), regardless of glyph size. Pad the button; do not grow the icon.

**Degradation:** if `@openng/icons` fails to load, an icon-only button with a proper `aria-label`
must still be operable. Test with the stylesheet blocked.

---

## 9. Permission and disabled state

- **Permission removes, it does not disable.** A control the user can never enable is noise — remove
  it (`@if (canPerform())`).
- **The exception:** where a disabled control plus a tooltip *teaches* the user something, keep it.
  The employee status toggle stays visible and disabled with "You do not have permission to change
  employee status. Please contact your Admin."
- Disabled state is expressed through `--p-disabled-opacity` (`0.6`), never a lighter colour.

---

## 10. Testing

| Check | How |
| --- | --- |
| Automated | AXE on every page; `angular-eslint` `templateAccessibility` in CI |
| Contrast | Both themes, every new colour pair, against the thresholds in §1 |
| Keyboard | Tab through the whole page; every interactive element reachable and visibly focused; overlays trap and restore focus |
| Reduced motion | macOS *Reduce motion*; Windows *Show animations* off; DevTools → Rendering → *Emulate `prefers-reduced-motion`* |
| Zoom | 200% browser zoom without horizontal scroll or clipped content |
| Screen reader | NVDA (Windows) or VoiceOver (macOS) on any new interactive pattern |

---

**Next:** [Foundations → Color →](./foundations/color.md)
