[← Index](../README.md) · [← Elevation](./elevation.md)

# Border Radius

> **Ownership:** T0 — Foundations · **Status:** Normative
> **Source of truth:** Aura `borderRadius` primitives, `--p-card-border-radius` in `src/styles.css`
> **Related:** [Elevation](./elevation.md) · [Tokens](../tokens/README.md)

---

## 1. Radius tokens

The Aura primitive scale, plus the two app-level overrides.

| Token | Value | px @ 13px | Tailwind | Usage |
| --- | --- | --- | --- | --- |
| `radius-none` | `0` | 0 | `rounded-none` | Table cells, full-bleed dividers, edge-to-edge drawer |
| `radius-xs` | `2px` | 2 | `rounded-xs` | Inline code, tiny indicators, colour swatches |
| `radius-sm` | `4px` | 4 | `rounded-sm` | List options, menu items, navigation items (`--p-list-option-border-radius`) |
| `radius-md` | `6px` | 6 | `rounded-md` | **Default for controls** — inputs, selects, buttons, popovers (`--p-form-field-border-radius`, `--p-content-border-radius`) |
| `radius-lg` | `8px` | 8 | `rounded-lg` | Dashboard list items, tiles, nested panels |
| `radius-xl` | `12px` | 12 | `rounded-xl` | Modals (`--p-overlay-modal-border-radius`), stat-card icon tiles, image thumbnails |
| `radius-card` | `0.8rem` | **10.4** | `rounded-[0.8rem]` | **Cards** — `--p-card-border-radius`, set in `src/styles.css` |
| `radius-full` | `9999px` | — | `rounded-full` | Chips, avatars, badges, pills, progress bar and its track, icon-only round buttons |

> Note that `radius-card` (10.4px) sits *between* `radius-lg` and `radius-xl` because it is declared
> in `rem` and therefore scales with the 13px root, while the Aura primitives are declared in `px`
> and do not.

---

## 2. Usage guidance

### Radius scales with the element

A 20px chip takes `radius-full`; a 600px dialog takes `radius-xl`. Applying `radius-xl` to a 24px
badge makes it look broken; applying `radius-sm` to a modal makes it look unfinished.

### The nesting rule

**Inner radius = outer radius − padding.**

A `radius-card` (10.4px) card with `p-4` (13px) holding a full-width child → the child is
`radius-none` or `radius-sm`, never `radius-card` again. Concentric radii read as sloppy.

### `radius-full` has a meaning

It means **"this is a token, an identity, or a state"** — chips, avatars, count badges, progress
bars. It never means "this is a button". Rectangular actions use `radius-md`.

### Never mix radii on one element's corners

The exception is deliberately joined controls — a segmented button group, an input with an attached
suffix button — where the join is square and the outer corners keep `radius-md`.

### Overflow

Any rounded container with an image or a fill child needs `overflow-hidden`, or the child's square
corner punches through. This is how the progress bar keeps its pill shape:

```html
<div class="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
  <div class="absolute inset-y-0 left-0 rounded-full …" [style.width.%]="completionPercentage"></div>
</div>
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
