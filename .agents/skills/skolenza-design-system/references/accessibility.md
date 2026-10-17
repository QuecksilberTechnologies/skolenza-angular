[← Index](./README.md)

# Accessibility

> Verified against Skolenza code on 2026-10-15. Earlier source versions are in git history (commit `0c786d5`).

> **Ownership:** T0 — Foundations · **Status:** Normative
> **Related:** [Colour](./foundations/color.md) · [Typography](./foundations/typography.md) · [Motion](./foundations/motion.md) · [Iconography](./foundations/iconography.md) · [Open items](./open-items.md)

Accessibility is a **build-time property** here, not a review-time opinion. `angular-eslint`'s
`templateAccessibility` config runs on every `.html` (`eslint.config.js`), AXE checks gate the UI,
and failures there are a11y bugs rather than style nits.

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

At a 13px root (`html { font-size: 0.8125rem }` in `src/styles.css`), `text-2xl` renders at
**19.5px**. That is still *normal text* for WCAG purposes unless it is bold. Only `text-3xl`
(24.38px) and above qualify as large.

**Consequence:** a `text-2xl font-medium` numeral (stat cards below `sm:`) needs **4.5:1**, not 3:1.
See [Typography → the 13px root](./foundations/typography.md#2-the-13px-root).

---

## 2. Focus

| Rule | Detail |
| --- | --- |
| Focus is never removed | `outline: none` without a replacement indicator is a defect |
| Form controls | `--p-inputtext-focus-ring-*` / `--p-select-focus-ring-*` / `--p-textarea-focus-ring-*`, solid, in `var(--p-primary-color)` |
| Non-form interactive elements | `focus-visible:ring-2 focus-visible:ring-primary-400` — compliant |
| Perimeter | **2px minimum.** WCAG 2.4.11 wants a perimeter thick enough to separate from the resting border; 1px does not manage that on the dark surface |
| Focus order | Follows DOM order. Overlays render to `body` (`appendTo="body"`) and must trap focus while open and restore it on close |

> ⚠️ **Open finding.** `src/styles.css` still declares `--p-inputtext-focus-ring-width: 1px` (and
> the same for `select` / `textarea`) while its own inline comment argues for 2px on WCAG 2.4.11
> grounds. Tracked as [A11Y-08](#4-contrast-audit) / [DS-04](./open-items.md).

---

## 3. Colour is never the sole signal

Every state that is communicated with colour must also be communicated with a **shape, an icon, or
text**.

| State | Colour | Second signal |
| --- | --- | --- |
| Role assigned | `primary-50` chip | `pi pi-shield` icon + the role name as text |
| Active / inactive | `success` / `danger` severity | `pi pi-check-circle` / `pi pi-ban` + tooltip |
| In-flight action | — | `pi pi-spin pi-spinner` + `aria-busy` |
| Required field | `error-600` asterisk | `aria-required` — the asterisk is supplementary |
| Profile completion | Green / amber / red bar (`shared/utilities/progress-tone.ts`) | Numeric percentage label + `aria-label` on the trigger |

---

## 4. Contrast audit

Every ratio below is **measured** with `scripts/skolenza_color.py check`, not estimated. Light-theme
pairs are against white; dark mode is **slate** (`src/styles.css` remaps `zinc-*` to `slate-*`
under `.dark`, and the preset's dark `surface` is slate).

| # | Location | Pair | Ratio | Required | Status / fix |
| --- | --- | --- | --- | --- | --- |
| A11Y-01 | `staff-members.html` — completion `%` label (≥ 80) | was `#22c55e` on `#ffffff` (2.28:1) | now `green-700 #15803d` **5.02:1** ✅ | 4.5:1 | Fixed via `progressTone()` |
| A11Y-02 | `staff-members.html` — completion `%` label (70–79) | was `#f59e0b` on `#ffffff` (2.15:1) | now `amber-700 #b45309` **5.02:1** ✅ | 4.5:1 | Fixed via `progressTone()` |
| A11Y-03 | New-joiner badge "Joined Today" (`get-new-joiner-badge-pipe.ts`) | `#ffffff` on `#22c55e` | **2.28:1** ❌ | 4.5:1 | `#000000` on `#22c55e` (9.22:1 ✅) or white on `success-700` (5.02:1 ✅) |
| A11Y-04 | New-joiner badge "Joined 2d ago" / "3d ago" | `#ffffff` on `#f59e0b` | **2.15:1** ❌ | 4.5:1 | `#000000` on `#f59e0b` = 9.78:1 ✅ |
| A11Y-05 | New-joiner badge "Joined Yesterday" | `#ffffff` on `#3b82f6` | **3.68:1** ❌ | 4.5:1 (10px text) | White on `info-600 #2563eb` = 5.17:1 ✅ |
| A11Y-06 | Progress track vs fill (light) | `surface-200 #e4e4e7` vs `#15803d` / `#b45309` / `#dc2626` | 3.95 / 3.96 / 3.81:1 ✅ | 3:1 | Fixed — fills moved to `-700` / `red-600` |
| A11Y-07 | "No role assigned" (`staff-member-role-cell.html`) | `gray-400 #9ca3af` on `#ffffff` | **2.54:1** ❌ | 4.5:1 | `gray-500 #6b7280` (4.83:1 ✅) |
| A11Y-08 | Focus ring on form controls | 1px | — | 2px perimeter | Set `--p-inputtext-focus-ring-width: 2px` (and select / textarea) |

### Verified-passing pairs, for reference

| Pair | Ratio |
| --- | --- |
| `primary-700 #2e5eac` on `primary-50 #f6f9fe` (light chip) | 6.01:1 ✅ |
| `primary-200 #aecbfb` on the dark chip fill (`primary-900/30` over `slate-900` ≈ `#12203b`) | 9.83:1 ✅ |
| `primary-400 #669ef7` on `slate-900 #0f172a` | 6.63:1 ✅ |
| `zinc-500 #71717a` on `zinc-50 #fafafa` (muted text, light) | 4.63:1 ✅ |
| `slate-400 #94a3b8` on `slate-900 #0f172a` (muted text, dark) | 6.96:1 ✅ |
| `slate-100 #f1f5f9` on `slate-900 #0f172a` (body text, dark) | 16.30:1 ✅ |

---

## 5. The institution-brand contrast gate

Because `primary-500` is **whatever hex the institution chose** (`#applyBrandColor()` in
`src/app/app.ts`, from `this.#institutionsApi.getBrandColor()`), its contrast is unknown at design
time.

**Requirement:** the brand-colour input MUST reject, or at minimum warn on, any hex where
`contrast(brand, #ffffff) < 3.0`. Below that, white-on-primary buttons fail even the large-text
threshold. Today the host institution form (`institution-form.ts`, `themeColorHint`) **warns**
below 3:1 but still allows saving.

The default `#4287f5` sits at **3.49:1** against white — acceptable for ≥ 18.66px bold button labels
and UI boundaries, **not** for small white text on a primary fill. For small labels on a primary
fill, use `primary-600` (4.63:1) or `primary-700` (6.34:1).

---

## 6. Text size floor

`text-xs` renders at **9.75px** at this root size — below the practical floor for sustained reading.

- Use it only for chips and badges with short, non-essential labels
- Never for values a user must read to do their job
- `text-[10px]` is reserved for `aria-hidden` decorative glyphs inside chips

Current violations: `text-xs` content ([DS-11](./open-items.md)) and the new-joiner badge label,
which renders visible text at `text-[10px]`.

---

## 7. Motion

There is **no global** `prefers-reduced-motion` block — a WCAG 2.3.3 gap. A handful of components
handle it locally (`app-aside-menu-item.css`, `color-picker-panel.css`, `form-editor.css`,
`pricing-card.css`, `pricing.css`, `profile-info-block.ts`). The required CSS block and the rules
around it live in [Motion → Reduced motion](./foundations/motion.md#4-reduced-motion).

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
  it (`@if (canPerform())`). The staff-member status toggle follows this: it renders only
  `@if (canUpdate())`.
- **The exception:** where a disabled control plus a tooltip *teaches* the user something, keep it
  visible and disabled, with a tooltip naming the permission and who can grant it.
- Disabled state is expressed through `--p-disabled-opacity` (`0.6`, Aura base) or `disabled:opacity-60`,
  never a lighter colour.

---

## 10. Testing

| Check | How |
| --- | --- |
| Automated | AXE on every page; `angular-eslint` `templateAccessibility` in CI |
| Contrast | Both themes, every new colour pair, against the thresholds in §1 (`py ${CLAUDE_SKILL_DIR}/scripts/skolenza_color.py check FG BG`) |
| Keyboard | Tab through the whole page; every interactive element reachable and visibly focused; overlays trap and restore focus |
| Reduced motion | macOS *Reduce motion*; Windows *Show animations* off; DevTools → Rendering → *Emulate `prefers-reduced-motion`* |
| Zoom | 200% browser zoom without horizontal scroll or clipped content |
| Screen reader | NVDA (Windows) or VoiceOver (macOS) on any new interactive pattern |

---

**Next:** [Foundations → Colour →](./foundations/color.md)
