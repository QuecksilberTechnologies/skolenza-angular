[← Index](../README.md) · [← Elevation](./elevation.md)

# Border Radius

> Verified against Skolenza code on 2026-10-15. Earlier source versions are in git history (commit `0c786d5`).

> **Ownership:** T0 — Foundations · **Status:** Normative
> **Source of truth:** Aura `borderRadius` primitives, `--p-card-border-radius` in `src/styles.css`
> **Related:** [Elevation](./elevation.md) · [Tokens](../tokens/README.md)

---

## 1. Radius tokens

The Aura primitive scale, plus the one app-level override (`radius-card`) and `radius-full`.

| Token | Aura value | Tailwind | Tailwind @ 13px | Usage |
| --- | --- | --- | --- | --- |
| `radius-none` | `0` | `rounded-none` | 0 | Table cells, full-bleed dividers, edge-to-edge drawer |
| `radius-xs` | `2px` | `rounded-xs` | 1.6 | Inline code, tiny indicators, colour swatches |
| `radius-sm` | `4px` | `rounded-sm` | 3.25 | List options, menu items, navigation items (`--p-list-option-border-radius`) |
| `radius-md` | `6px` | `rounded-md` | 4.9 | **Default for controls** — inputs, selects, buttons, popovers (`--p-form-field-border-radius`, `--p-content-border-radius`) |
| `radius-lg` | `8px` | `rounded-lg` | 6.5 | Dashboard list items (`dash-list-item`), tiles, nested panels |
| `radius-xl` | `12px` | `rounded-xl` | 9.75 | Modals (`--p-overlay-modal-border-radius`), stat-card icon tiles, image thumbnails |
| `radius-card` | `0.8rem` | `rounded-[0.8rem]` | **10.4** | **Cards** — `--p-card-border-radius`, set in `src/styles.css` |
| `radius-full` | `9999px` | `rounded-full` | — | Chips, avatars, badges, pills, progress bar and its track, icon-only round buttons |

> The root font size is 13px (`html { font-size: 0.8125rem }`). Aura primitives are declared in `px`
> and do not scale; Tailwind v4 `rounded-*` utilities are declared in `rem` and do. So
> `rounded-md` (4.9px) is *not* the same as an Optimus control's 6px. `radius-card` (10.4px) sits
> between Aura `lg` and `xl`, and just above Tailwind `rounded-xl`.

---

## 2. Usage guidance

### Radius scales with the element

A 20px chip takes `radius-full`; a 600px dialog takes `radius-xl`. Applying `radius-xl` to a 24px
badge makes it look broken; applying `radius-sm` to a modal makes it look unfinished.

### The nesting rule

**Inner radius = outer radius − padding.**

A `radius-card` (10.4px) card with `p-4` (13px) holding a full-width child → the child is
`radius-none` or `radius-sm`, never `radius-card` again. Repeating the outer radius on the inner element reads as sloppy.

### `radius-full` has a meaning

It means **"this is a token, an identity, or a state"** — chips, avatars, count badges, progress
bars. It never means "this is a button". Rectangular actions use `radius-md`.

### Never mix radii on one element's corners

The exception is deliberately joined controls — a segmented button group, an input with an attached
suffix button — where the join is square and the outer corners keep `radius-md`.

### Overflow

Any rounded container with an image or a fill child needs `overflow-hidden`, or the child's square
corner punches through. This is how the profile-completion bar in `staff-members.html` keeps its
pill shape:

```html
<span class="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
  <span class="absolute inset-y-0 left-0 rounded-full …" [class]="progressTone.bar" [style.width.%]="completion"></span>
</span>
```

---

## 3. Quick decision table

| You are styling | Use |
| --- | --- |
| A text input, select, textarea, standard button | `radius-md` |
| A card | `radius-card` |
| A modal or dialog | `radius-xl` |
| A popover, tooltip, dropdown panel | `radius-md` |
| A menu item or list option inside a panel | `radius-sm` |
| A chip, tag, badge, avatar, pill | `radius-full` |
| A progress bar and its track | `radius-full` |
| A table cell | `radius-none` |
| An icon tile inside a stat card | `radius-xl` |
| Inline code | `radius-xs` |

---

**Next:** [Motion →](./motion.md)
