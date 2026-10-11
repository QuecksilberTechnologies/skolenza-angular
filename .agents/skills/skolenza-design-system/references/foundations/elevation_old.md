[← Index](../README.md) · [← Grid](./grid.md)

# Elevation & Shadows

> **Ownership:** T0 — Foundations · **Status:** Normative
> **Source of truth:** Aura preset overlay tokens, `src/styles.css`
> **Related:** [Color → Dark theme](./color.md#9-dark-theme) · [Border radius](./border-radius.md) · [Tokens](../tokens/README.md)

---

## 1. Principles

**E1 — Elevation encodes distance from the page, and nothing else.** Not importance, not state.

**E2 — Light theme uses shadows. Dark theme uses surface steps and borders.** Every shadowed element
carries `dark:shadow-none` plus a `dark:border-zinc-800`. This is the app's existing convention and
is normative.

**E3 — Two-layer shadows only.** A tight ambient layer plus a wider directional layer. Single-layer
shadows read as artificial.

**E4 — Maximum of three elevation levels visible at once.** Ground → card → overlay. A popover inside
a dialog inside a drawer is a design failure, not a shadow problem.

---

## 2. Shadow scale

| Token | Value | Tailwind (v4) | Elevation | Use case |
| --- | --- | --- | --- | --- |
| `shadow-none` | `none` | `shadow-none` | 0 | Flat surfaces; **all** raised surfaces in dark theme |
| `shadow-xs` | `0 0 #0000, 0 0 #0000, 0 1px 2px 0 rgba(18,18,23,0.05)` | `shadow-xs` | 1 | Form fields at rest (`--p-form-field-shadow`) |
| `shadow-sm` | `0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1)` | `shadow-sm` | 2 | **Cards, stat cards, table container.** The default raised surface |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)` | `shadow-md` | 3 | Select panels, popovers, tiered / context menus, dropdown navigation (`--p-overlay-select-shadow`, `--p-overlay-popover-shadow`, `--p-overlay-navigation-shadow`) |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)` | `shadow-lg` | 4 | Drawer, sticky action bar lifting off content |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)` | `shadow-xl` | 5 | Modal / dynamic dialog (`--p-overlay-modal-shadow`) |
| `shadow-focus` | `0 0 0 2px var(--p-primary-color)` | `ring-2 ring-primary-400` | — | Focus indicator. **Not an elevation** — never combine with an elevation shadow |

> **Tailwind v4 naming.** v4 renamed the shadow utilities (`shadow-sm` → `shadow-xs`, `shadow` →
> `shadow-sm`). The codebase still writes bare `shadow` in places. Prefer the explicit token names
> above; when you touch a file that uses bare `shadow`, migrate it. Tracked as
> [DS-07](../open-items.md).

---

## 3. Use cases

| Surface | Light | Dark |
| --- | --- | --- |
| Page ground | `bg-zinc-50` | `bg-zinc-950` |
| Card / stat card / table container | `bg-white shadow-sm border-0` | `bg-zinc-900 shadow-none border border-zinc-800` |
| Sidebar | `bg-white border-e border-zinc-200` | `bg-zinc-900 border-e border-zinc-800` |
| Sticky header | `bg-white` + `sticky top-0 z-10` | `bg-zinc-900` |
| Select / popover / menu | `shadow-md` | `shadow-none bg-zinc-900 border border-zinc-700` |
| Drawer | `shadow-lg` | `shadow-none border-s border-zinc-800` |
| Modal | `shadow-xl` + scrim `rgba(0,0,0,.4)` | `shadow-none border border-zinc-800` + scrim `rgba(0,0,0,.6)` |
| Hover on a list row | `hover:bg-gray-50` | `hover:bg-zinc-700` — **surface step, not shadow** |

---

## 4. Token naming convention

```
shadow-{scale}                 shadow-sm, shadow-md
shadow-{scale}-{theme}         shadow-md-dark            (only where the value differs)
--p-{component}-shadow         --p-overlay-modal-shadow  (library-owned; do not invent new ones)
```

**Rules**

- The scale name describes **elevation**, never a component. `shadow-card` is wrong; `shadow-sm`
  *used by* a card is right.
- Numbers ascend with distance from the page.
- Never bake a colour into a shadow token beyond black-with-alpha.

---

**Next:** [Border radius →](./border-radius.md)
