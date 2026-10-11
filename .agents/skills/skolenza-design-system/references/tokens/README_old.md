[← Index](../README.md)

# Design Tokens

> **Ownership:** T0 — Foundations · **Status:** Normative
> **Machine-readable source:** [`tokens.json`](./tokens.json)
> **Related:** [Color](../foundations/color.md) · [Typography](../foundations/typography.md) · [Governance](../governance.md)

---

## 1. Naming convention

```
{category}-{concept}-{variant}-{state}

color-primary-500              category-concept-variant
color-text-muted               category-concept-variant
color-surface-ground-dark      category-concept-variant-theme
space-4                        category-scale
type-body-md                   category-concept-variant
radius-card                    category-concept
shadow-md                      category-scale
duration-base                  category-scale
z-modal                        category-concept
```

### Rules

1. **Kebab-case throughout**, matching the repo's file convention.
2. **Category first**, so tokens sort into groups in any editor's autocomplete.
3. **Numeric scales for continuous ramps** (colour 50–950, spacing 0–16); **named scales for discrete
   ones** (`sm` / `md` / `lg`, `fast` / `base` / `slow`).
4. **Never encode a component name in a foundation token.** `color-employee-chip-bg` is wrong;
   `color-primary-50` *used by* the employee chip is right.
5. **Never encode a raw value in a name.** `space-13px`, `color-blue-500` (for the brand) — both
   wrong; the brand is not always blue.
6. **Theme suffix only where the value genuinely differs** between light and dark and cannot be
   handled by the `.dark` variant.
7. **Three output forms, one source:** Tailwind `@theme` (utilities), the Optimus preset (`--p-*`
   component tokens), and [`tokens.json`](./tokens.json) (design-tool sync). They must never drift.

---

## 2. Token categories

### 2.1 Color

Full tables with HEX, RGB and usage live in [Foundations → Color](../foundations/color.md).

| Token | Light value | Dark value | Emitted as |
| --- | --- | --- | --- |
| `color-primary-{50..950}` | `palette(brandHex)` | same ramp | `--p-primary-{n}`, `bg-primary-*` |
| `color-primary-default` | `{primary.500}` | `{primary.400}` | `--p-primary-color` |
| `color-primary-hover` | `{primary.600}` | `{primary.300}` | `--p-primary-hover-color` |
| `color-primary-active` | `{primary.700}` | `{primary.200}` | `--p-primary-active-color` |
| `color-primary-contrast` | `#ffffff` | `{surface.900}` | `--p-primary-contrast-color` |
| `color-neutral-{50..950}` | zinc ramp | zinc ramp | `--p-surface-{n}` |
| `color-surface-ground` | `#fafafa` | `#09090b` | `--color-surface-ground-light/-dark` |
| `color-surface-default` | `#ffffff` | `#18181b` | `--color-surface-light/-dark` |
| `color-surface-raised` | `#ffffff` | `#27272a` | Tailwind utilities |
| `color-border-default` | `#e4e4e7` | `#27272a` | `--color-border-light/-dark` |
| `color-border-strong` | `#d4d4d8` | `#52525b` | `--p-form-field-border-color` |
| `color-text-primary` | `#18181b` | `#fafafa` | `--color-text-primary-light/-dark` |
| `color-text-body` | `#3f3f46` | `#f4f4f5` | `--p-text-color` |
| `color-text-muted` | `#71717a` | `#a1a1aa` | `--color-text-secondary-light/-dark` |
| `color-text-placeholder` | `#71717a` | `#a1a1aa` | `--p-form-field-placeholder-color` |
| `color-success-{50,400,500,600,700}` | see Color | shift up one stop | app tokens |
| `color-warning-{50,400,500,600,700}` | see Color | shift up one stop | app tokens |
| `color-error-{50,300,400,500,600}` | see Color | shift up one stop | `--p-*-invalid-border-color` |
| `color-info-{50,400,500,600}` | see Color | shift up one stop | app tokens |
| `color-accent-avatar-{01..16}` | fixed | fixed | `shared/directives/avatar-color.ts` |
| `color-accent-progress` | `#ca1922` | `#ca1922` | `--ng-progress-color` |
| `color-mask` | `rgba(0,0,0,0.4)` | `rgba(0,0,0,0.6)` | `--p-mask-background` |

### 2.2 Typography

| Token | Value | Emitted as |
| --- | --- | --- |
| `font-family-sans` | `'Inter', ui-sans-serif, system-ui, sans-serif` | `body { font-family }` |
| `font-family-mono` | `ui-monospace, SFMono-Regular, Menlo, monospace` | `--font-mono` |
| `font-size-root` | `0.8125rem` (13px) | `html { font-size }` |
| `font-size-{xs..5xl}` | 0.75 – 3 rem | `text-*` |
| `font-weight-regular` / `-medium` / `-semibold` / `-bold` | 400 / 500 / 600 / 700 | `font-*` |
| `line-height-tight` / `-snug` / `-normal` / `-relaxed` | 1.2 / 1.35 / 1.5 / 1.65 | `leading-*` |
| `letter-spacing-tight` / `-normal` / `-wide` | −0.02em / 0 / 0.06em | `tracking-*` |
| `type-{display,h1..h6,body,caption,label,code}-*` | composites | Tailwind `@utility` |

Full scale: [Foundations → Typography](../foundations/typography.md#3-type-scale).

### 2.3 Spacing

| Token | rem | px @ 13px |
| --- | --- | --- |
| `space-0` | 0 | 0 |
| `space-1` | 0.25 | 3.25 |
| `space-1-5` | 0.375 | 4.88 |
| `space-2` | 0.5 | 6.5 |
| `space-2-5` | 0.625 | 8.13 |
| `space-3` | 0.75 | 9.75 |
| `space-4` | 1 | 13 |
| `space-5` | 1.25 | 16.25 |
| `space-6` | 1.5 | 19.5 |
| `space-8` | 2 | 26 |
| `space-10` | 2.5 | 32.5 |
| `space-12` | 3 | 39 |
| `space-16` | 4 | 52 |

**Layout constants:** `layout-header-h` `4.6rem` · `layout-sidebar-w` `20rem` ·
`layout-sidebar-w-collapsed` `65px` · `layout-content-h` `calc(100vh - 4.6rem)`.

### 2.4 Border

| Token | Value | Emitted as |
| --- | --- | --- |
| `border-width-none` / `-hairline` / `-thick` | `0` / `1px` / `2px` | `border-*` |
| `border-style-solid` / `-dashed` | `solid` / `dashed` | — |
| `radius-none` / `-xs` / `-sm` / `-md` / `-lg` / `-xl` | 0 / 2px / 4px / 6px / 8px / 12px | `--p-border-radius-*` |
| `radius-card` | `0.8rem` | `--p-card-border-radius` |
| `radius-full` | `9999px` | `rounded-full` |
| `focus-ring-width` | `1px` → **should be `2px`** ([DS-04](../open-items.md)) | `--p-inputtext-focus-ring-width` |
| `focus-ring-style` | `solid` | `--p-inputtext-focus-ring-style` |
| `focus-ring-color` | `var(--p-primary-color)` | `--p-inputtext-focus-ring-color` |
| `focus-ring-offset` | `2px` | `--p-focus-ring-offset` |
| `anchor-gutter` | `2px` | `--p-anchor-gutter` |

### 2.5 Shadow

| Token | Value |
| --- | --- |
| `shadow-none` | `none` |
| `shadow-xs` | `0 0 #0000, 0 0 #0000, 0 1px 2px 0 rgba(18,18,23,0.05)` |
| `shadow-sm` | `0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)` |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` |
| `shadow-focus` | `0 0 0 2px var(--p-primary-color)` |

### 2.6 Animation

| Token | Value |
| --- | --- |
| `duration-instant` | `0ms` |
| `duration-fast` | `150ms` |
| `duration-base` | `200ms` |
| `duration-moderate` | `300ms` |
| `duration-slow` | `500ms` |
| `duration-deliberate` | `700ms` |
| `ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` |
| `ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` |
| `ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` |
| `ease-linear` | `linear` |
| `disabled-opacity` | `0.6` (`--p-disabled-opacity`) |

### 2.7 Z-index

A single ordered scale. **No `z-index` literal may appear outside this table.**

| Token | Value | Layer | Current usage |
| --- | --- | --- | --- |
| `z-base` | `0` | Page content | Default flow |
| `z-raised` | `1` | Cards lifting off the ground | Hover states inside a scroll container |
| `z-sticky` | `10` | Sticky in-page chrome | App header (`sticky top-0 z-10`), sticky table header |
| `z-scrim` | `14` | Mobile sidebar scrim | `.mobile-overlay` (`layout.css`) |
| `z-drawer` | `15` | Off-canvas sidebar | `.app-aside-menu` below 1024px (`layout.css`) |
| `z-overlay` | `1000` | Anchored overlays | Optimus select panels, popovers, tiered / context menus (`appendTo="body"`) |
| `z-modal` | `1100` | Blocking dialogs | `p-dialog`, `p-confirmDialog`, `p-drawer` |
| `z-tooltip` | `1100` | Tooltips | `pTooltip` — sits with modals so it works *inside* one |
| `z-toast` | `1200` | Transient messages | `p-toast` — above everything, including modals |
| `z-progress` | `1300` | Route progress bar | `--ng-progress-*`, must never be occluded |

> The `1000+` band is the Optimus / PrimeNG `zIndex` config (`overlay: 1000`, `menu: 1000`,
> `modal: 1100`, `tooltip: 1100`). The `0–15` band is app-owned. **Keep a gap between the two** so a
> future app-level layer never collides with a library overlay.

---

## 3. JSON source

[`tokens.json`](./tokens.json) is the design-tool-facing source of truth. Values are the **default
tenant** (`#4287f5`); `color.primary.*` is regenerated per tenant at runtime.

Its top-level shape:

```json
{
  "color":      { "primary": {}, "neutral": {}, "semantic": {}, "surface": {}, "text": {}, "border": {}, "accent": {} },
  "spacing":    { "base": {}, "0": {}, "…": {}, "layout": {} },
  "typography": { "fontFamily": {}, "rootFontSize": {}, "fontSize": {}, "fontWeight": {}, "lineHeight": {}, "letterSpacing": {}, "style": {} },
  "border":     { "width": {}, "radius": {}, "focusRing": {} },
  "shadow":     {},
  "animation":  { "duration": {}, "easing": {}, "disabledOpacity": "" },
  "zIndex":     {},
  "breakpoint": {}
}
```

---

## 4. Emitting the tokens

### 4.1 Tailwind v4 — `src/styles.css`

Extends the existing `@theme` block:

```css
@theme {
  /* Existing */
  --color-text-secondary-light: #71717a;
  --color-text-secondary-dark: #a1a1aa;
  --color-border-light: #e4e4e7;
  --color-border-dark: #27272a;
  --color-text-primary-light: #18181b;
  --color-text-primary-dark: #fafafa;
  --color-surface-light: #ffffff;
  --color-surface-dark: #18181b;
  --color-surface-ground-light: #fafafa;
  --color-surface-ground-dark: #09090b;

  /* Semantic — add */
  --color-success-500: #22c55e;
  --color-success-700: #15803d;
  --color-warning-500: #f59e0b;
  --color-warning-700: #b45309;
  --color-error-500: #ef4444;
  --color-error-600: #dc2626;
  --color-info-500: #3b82f6;
  --color-info-600: #2563eb;

  /* Motion — add */
  --duration-fast: 150ms;
  --duration-base: 200ms;
  --duration-moderate: 300ms;
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);

  /* Layout — add */
  --spacing-header-h: 4.6rem;
  --spacing-sidebar-w: 20rem;
}
```

### 4.2 Composite type styles

Same mechanism as the existing `dash-*` utilities in `styles.css`:

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
  @apply text-sm leading-[1.4] font-medium;
}
```

### 4.3 Optimus preset — `src/app/core/axion-preset.ts`

The preset is where `--p-*` **component** tokens belong. `primary` is deliberately *absent* because
`app.ts` injects it at runtime from the tenant brand colour — **do not add a static `primary` here.**

```ts
export const AxionPreset = definePreset(Aura, {
  semantic: {
    colorScheme: {
      light: { surface: { 0: '#ffffff', 50: '{zinc.50}', /* … */ 950: '{zinc.950}' } },
      dark:  { surface: { 0: '#ffffff', 50: '{zinc.50}', /* … */ 950: '{zinc.950}' } },
    },
  },
});
```

---

## 5. Consumption precedence

Always prefer the leftmost option that can express the need:

```
Tailwind utility  →  --p-* token  →  @utility composite  →  component CSS  →  inline style
   (default)         (component)       (repeated 3+)         (last resort)     (dynamic only)
```

Inline `[style.*]` bindings are legitimate **only** for genuinely dynamic values — the progress bar's
`[style.width.%]`, the avatar's computed background. Everything else is a token.

---

**Next:** [Patterns → List page →](../patterns/list-page.md)
