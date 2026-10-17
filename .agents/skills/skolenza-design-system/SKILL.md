---
name: skolenza-design-system
description: >-
  Design rules and tokens for the Skolenza school and institution management frontend
  (skolenza-angular, Angular 22 + @openng/optimus-ui + Tailwind v4). Use when building, styling, or
  reviewing any Skolenza UI — a feature page, list page, table, form, dialog, drawer, card, chip,
  stat row, empty or loading state — or when picking a colour, spacing value, font size, radius,
  shadow, duration, icon, or z-index in that codebase. Also use for institution brand-colour
  palettes, `.dark` theme work, `--p-*` / `@theme` token questions, and WCAG contrast checks on
  Skolenza screens.
allowed-tools: Bash(py ${CLAUDE_SKILL_DIR}/scripts/skolenza_color.py:*), Bash(python3 ${CLAUDE_SKILL_DIR}/scripts/skolenza_color.py:*), Bash(python ${CLAUDE_SKILL_DIR}/scripts/skolenza_color.py:*)
---

# Skolenza Design System

Angular 22 zoneless · `@openng/optimus-ui` v2 (PrimeNG-compatible fork, `p-*` / `pi pi-*` / `--p-*`)
· Tailwind v4 · dark mode via `.dark` · **root font size 13px** · primary colour generated at
runtime from the institution's brand hex.

Reference implementation: `src/app/features/staff-members/`. Token sources: `src/styles.css`
(`@theme`, `.dark` remap) and `src/app/core/skolenza-preset.ts`.

---

## Non-negotiables

1. **No literals.** Never write a hex, radius, shadow, duration or `z-index` in a component. Use a
   Tailwind utility backed by `@theme`, or a `--p-*` token. Missing token → add it to
   `src/styles.css` / `core/skolenza-preset.ts` first. Only exception: the hand-written z-index
   `14` / `15` in `layout/layout.css` (DS-09). Do not copy them.
2. **The brand colour is data.** `primary-500` is whatever hex the institution chose. Never assume
   it is blue, never assume white text on it is readable, never use `primary-*` to mean success or
   error.
3. **`rem` ≠ 16px here.** `html { font-size: 0.8125rem }` → **1rem = 13px**. `text-sm` renders at
   11.38px, `space-4` at 13px, `rounded-md` at ≈4.9px. Media-query `rem` is unaffected, so `sm:`
   really is 640px.
4. **Light uses shadows, dark uses borders.** Every raised surface (card, overlay, drawer, modal):
   `shadow-*` + `dark:shadow-none dark:border-zinc-800`. Never a shadow in dark mode. Optimus form
   fields already draw their own border; don't add one.
5. **Dark neutrals are slate.** Write `zinc-*` classes; under `.dark`, `src/styles.css` remaps
   `--color-zinc-*` to slate and `SkolenzaPreset` maps dark `surface` to `{slate.*}`. So
   `dark:bg-zinc-900` renders `#0f172a`. Check dark contrast against slate, not zinc.
6. **Colour is never the only signal.** Pair it with an icon and text: chips carry `pi pi-shield` +
   the label; status uses `pi-check-circle` / `pi-ban`.
7. **Permission removes, it does not disable.** `@if (canUpdate())` / `@if (canAdd())` from the
   permission matrix. Exception: keep a disabled control when a `pTooltip` explains *why* it is
   blocked.
8. **Tailwind v4 important goes last:** `px-3!`, never `!px-3`. Existing `!px-3 !py-3` table cells
   are legacy; don't copy them.
9. **Optimus component rules:**
   - `styleClass` is deprecated → native `class`. Overlays that move their panel to `body`
     (`p-tieredmenu [popup]`, `p-contextMenu`, `p-confirmDialog`, `p-drawer`) leave the host
     `class` behind: style the panel via `[pt]="{ root: { class: '…' } }"` or one global rule on
     the root class (`.p-confirmdialog`).
   - Projected templates resolve **by reference name** (`#title`, `#content`, `#empty`, `#header`,
     `#headless`, `#caption`, `#body`, `#emptymessage`, `#loadingbody`), each **once per
     template**. Two of the same component in one template → use the wrapper
     (`app-section-card`, `app-select-field`, `app-country-select`, `app-status-dot-select`,
     `app-headless-drawer`, `asset/asset-status-select`). Never `pTemplate="..."`.
   - `appendTo="body"` on every select, menu, popover and paginator dropdown, or it clips inside
     the card's `overflow-x-auto`.

---

## Token lookup

Most work needs nothing beyond this section. Full ramps live in `references/`.

### Surfaces, text, layout

| Need | Use |
| --- | --- |
| Page ground | `bg-zinc-50 dark:bg-zinc-950` |
| Card / raised surface | `bg-white dark:bg-zinc-900` + `shadow-sm dark:shadow-none dark:border-zinc-800` |
| Hover fill | `hover:bg-gray-50 dark:hover:bg-zinc-700` |
| Border | `border-zinc-200 dark:border-zinc-800` |
| Heading text | `text-zinc-900 dark:text-zinc-50` |
| Body / table cell text | `text-gray-700 dark:text-zinc-100` |
| Muted / caption text | `text-zinc-500 dark:text-zinc-400` |
| Placeholder only (never content) | `text-gray-400`: 2.54:1, fails AA for real text |
| Branded tint (interactive) | `bg-primary-50 dark:bg-primary-900/30` |
| Branded text on that tint | `text-primary-700 dark:text-primary-200` |
| Focus (non-form element) | `focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400` |
| Page gutter | `m-3 sm:m-4` |
| Inline gap · block gap | `gap-2` · `gap-4` |
| Form grid | `grid grid-cols-1 gap-4 md:grid-cols-2`, full-width fields `md:col-span-2` |
| Table cell padding | `px-3! py-3!` |
| Table floor width | `[tableStyle]="{ 'min-width': '60rem' }"` |
| Header height | `h-[55px]` (list pages still subtract `4.6rem`, ~5px off) |
| Content shell height | `h-[calc(100vh-4.6rem)]` |

### Semantic colours

`-500` is a **fill**, `-700` is the **light-theme text** (`-600` for error and info), `-400` is the **dark-theme text**:

| Role | Fill | Text (light) | Text (dark) |
| --- | --- | --- | --- |
| Success | `#22c55e` | `#15803d` | `#4ade80` |
| Warning | `#f59e0b` | `#b45309` | `#fbbf24` |
| Error | `#ef4444` | `#dc2626` | `#f87171` |
| Info | `#3b82f6` | `#2563eb` | `#60a5fa` |

A `-500` as text on white is the most common mistake: `#22c55e` on white is 2.28:1 and fails AA.
White text on a `-500` fill fails the same way. The preset already darkens light-theme `success` /
`danger` buttons to `green.700` / `red.600` for this reason.

### Which colour?

| Situation | Answer |
| --- | --- |
| Needs to look interactive / branded | `primary-*` |
| Needs to look grouped but neutral | `zinc` / `gray` |
| Conveys state | semantic (`success` / `warning` / `error` / `info`) |
| "We need a second brand colour" | You don't. Use a neutral, a semantic colour, or a different *shape* (outline vs filled, dashed vs solid) |
| Avatar without a photo | `[appAvatarColor]="firstName"`: 16-hue deterministic palette, contrast handled |
| Progress / score tone | `shared/utilities/progress-tone.ts` (`-700` / red `-600` light, `-400` dark) |
| Small white text on a primary fill | Don't. `primary-500` may be only 3.49:1. Use `primary-600`/`700`, or make the label ≥ 18.66px bold |

### Scales

| Scale | Values |
| --- | --- |
| Spacing (only these) | `0 1 1.5 2 2.5 3 4 5 6 8 10 12 16`. No `gap-7`, no `p-[13px]` |
| Type (px at 13px root) | `text-xs` 9.75 · `text-sm` **11.38 (body/table default)** · `text-base` 13 · `text-lg` 14.63 · `text-xl` 16.25 · `text-2xl` **19.5 (target h1)** · `text-3xl` 24.38 |
| Radius | Optimus input/select/button/popover: keep the Optimus default (6px), not `rounded-md` (≈4.9px) · card `rounded-[0.8rem]` · modal `rounded-xl` · menu item `rounded-sm` · chip/tag/avatar/progress `rounded-full` · inline code `rounded-xs` · table cell none |
| Elevation | form field `shadow-xs` · card `shadow-sm` · select/popover/menu `shadow-md` · drawer `shadow-lg` · modal `shadow-xl`. Bare `shadow` is the v3 name: use `shadow-sm` |
| Duration | hover/colour `transition-colors duration-200` · layout shift, overlay entry, `@defer` placeholder floor `300ms` · spinner `500ms` linear |
| Easing | entering `ease-out` · leaving `ease-in` (~30% shorter) · moving within viewport `ease-in-out` |
| Z-index | sticky header `z-10` · mobile scrim `14` / aside drawer `15` (layout only, DS-09) · route progress bar `z-50!` · Optimus overlay / menu `1000` · modal / tooltip `1100` |

**Radius nesting:** inner radius = outer radius − padding. A rounded container with a fill or image
child needs `overflow-hidden`.

**Page title:** `app-sub-header` currently renders `<h4 class="text-lg font-bold">`; the target is
one `<h1>` per route.

---

## Building a list page

Copy `src/app/features/staff-members/staff-members.html`, except its `styleClass` bindings (open item
DS-14).

```
h-[calc(100vh-4.6rem)] overflow-hidden overflow-y-auto
├── m-3 sm:m-4          @defer stats row + @placeholder (minimum 300ms) skeleton
└── p-card m-3 sm:m-4 overflow-x-auto
    └── p-table  [lazy] [paginator] [scrollable] min-width 60rem, rows [10, 25, 50]
        ├── #caption      → app-table-inline-filters (3 selects lg:min-w-52 + filter drawer trigger,
        │                    ngProjectAs="right" → app-table-search-filter + primary action)
        ├── #header       → bg-gray-50 dark:bg-zinc-800, px-3! py-3!, max-w-* per column
        ├── #body         → truncate + pTooltip, chips, row actions
        ├── #loadingbody  → app-table-loader
        └── #emptymessage → app-table-empty-message (icon + message + subMessage)
Siblings, all appendTo="body":
p-tieredmenu · p-contextMenu · p-confirmDialog · p-drawer (advanced filters, @defer, #headless)
· app-headless-drawer
```

Rules the page encodes — keep every one:

- The page owns the scroll; the shell never does.
- `[lazy]="true"` + `(onLazyLoad)`: server-side sort/page/filter always. Never client-side over
  partial data.
- Three filters inline, everything else in the drawer behind a `[filterCount]` badge.
- Cells `truncate` with `max-w-*` + `pTooltip`; never wrap.
- Hover-revealed actions (`opacity-0 group-hover:opacity-100`) are always secondary; touch has no
  hover.
- Interactive chips are real `<button>`s with `[attr.aria-label]`.
- Every async control shows a loading identity (`[loading]`, `pi pi-spin pi-spinner`, `aria-busy`).
- Empty state names the thing **and** the next step.

Full anatomy, skeleton, and per-element token contract:
[references/patterns/list-page.md](references/patterns/list-page.md).

---

## Theming an institution

`src/app/app.ts` expands one hex into the whole ramp at runtime:

```ts
const brandColor = (await this.#institutionsApi.getBrandColor()) ?? '#4287f5';
updatePreset({ semantic: { primary: palette(brandColor) } });
```

`palette()` mixes with white below 500 and black above: `50`=tint 95%, `100`=76%, `200`=57%,
`300`=38%, `400`=19%, `500`=the hex, `600`=shade 15%, `700`=30%, `800`=45%, `900`=60%, `950`=75%.

- Light theme uses `primary.500`; **dark theme uses `primary.400`**.
- Never add a static `primary` to `skolenza-preset.ts`; it would fight the runtime injection.
- **Gate:** warn on any brand hex with `contrast(brand, #ffffff) < 3.0`. The host institution form
  (`institution-form.ts`) shows this as an advisory warning.

### Contrast script

`scripts/skolenza_color.py` (Python 3.8+, stdlib only) implements the exact `palette()` algorithm
from `@openng/optimus-ui-styled`, so its output matches what the app renders. Dark checks measure
against slate (`#0f172a` card, `#020617` ground).

Always invoke through `${CLAUDE_SKILL_DIR}`; a relative path resolves against the session's working
directory. On this Windows setup `python` / `python3` are Store stubs: use `py`. Elsewhere `python3`.

```bash
# Ramp the app will generate for a brand hex, with contrast report
py ${CLAUDE_SKILL_DIR}/scripts/skolenza_color.py ramp "#4287f5"

# Check a foreground/background pair against WCAG AA
py ${CLAUDE_SKILL_DIR}/scripts/skolenza_color.py check "#22c55e" "#ffffff"
py ${CLAUDE_SKILL_DIR}/scripts/skolenza_color.py check "#f8fafc" "#0f172a" --large

# Re-run the known audit pairs (non-zero exit on any failure)
py ${CLAUDE_SKILL_DIR}/scripts/skolenza_color.py audit
```

Run `ramp` for "what will institution X's palette look like", and `check` before committing
**any** new colour pair. Do not eyeball contrast.

---

## Known defects — do not copy, fix on contact

| Where | Problem |
| --- | --- |
| `shared/pipes/get-new-joiner-badge-pipe.ts` | White text on `#22c55e` / `#f59e0b` / `#3b82f6` → 2.28 / 2.15 / 3.68:1, all fail AA |
| `get-status-tag-pipe.ts`, `get-priority-tag-pipe.ts` | Material pastels used nowhere else; comments contradict values; `dark:text-white!` over them is 1.14–1.35:1 |
| `src/styles.css` | `--p-inputtext/select/textarea-focus-ring-width: 1px` contradicts its own WCAG 2.4.11 comment; should be `2px` |
| `src/styles.css` | No global `prefers-reduced-motion` block, while `scroll-behavior: smooth` is global |
| `layout/layout.css` | `z-index: 14` / `15` hand-written instead of tokenised |
| `features/staff-members/staff-members.html` | Deprecated `styleClass` on menus and drawer |

Not a defect: `dark.surface.0 = #ffffff` in the preset (Aura uses it as dark-theme text colour).
Full list with fixes: [references/open-items.md](references/open-items.md).

---

## References

Read only what the task needs; these are large.

| Task | File |
| --- | --- |
| Full palettes, HEX/RGB tables, light + dark theme maps, usage do/don't | [color.md](references/foundations/color.md) |
| Type scale, the 13px root and its consequences, font stacks | [typography.md](references/foundations/typography.md) |
| Spacing scale, layout / component / content spacing | [spacing.md](references/foundations/spacing.md) |
| Breakpoints, containers, columns, gutters, app-shell metrics | [grid.md](references/foundations/grid.md) |
| Shadow scale and use cases | [elevation.md](references/foundations/elevation.md) |
| Radius tokens and nesting rules | [border-radius.md](references/foundations/border-radius.md) |
| Duration/easing tokens, motion principles, reduced motion | [motion.md](references/foundations/motion.md) |
| Icon libraries, sizes, strokes, a11y markup | [iconography.md](references/foundations/iconography.md) |
| WCAG thresholds, focus rules, the measured contrast audit | [accessibility.md](references/accessibility.md) |
| Token naming, every category, how tokens are emitted | [tokens/README.md](references/tokens/README.md) |
| Machine-readable tokens | [tokens.json](references/tokens/tokens.json) |
| List-page pattern in full | [list-page.md](references/patterns/list-page.md) |
| Why the system is shaped this way; principles | [introduction.md](references/introduction.md) |
| Who may change what, deprecation, versioning | [governance.md](references/governance.md) |
| Known gaps between spec and code | [open-items.md](references/open-items.md) |

---

## Before you finish

- [ ] No new colour / radius / shadow / duration / z-index literal
- [ ] Renders in light **and** dark (dark = slate)
- [ ] Checked at 320 / 640 / 1024 / 1440 px
- [ ] Loading, empty and error states exist
- [ ] Contrast ≥ 4.5:1 body, ≥ 3:1 large text and UI boundaries: **run the script**
- [ ] Visible focus everywhere; icon-only controls have `aria-label`
- [ ] User-facing copy uses `-` or `:`, never an em/en dash separator (`.claude/docs/ui-copy.md`)
- [ ] `ChangeDetectionStrategy.OnPush`; `@if` / `@for` / `@switch` / `@defer`
- [ ] `input()` / `output()` functions, `inject()`, no `ngClass` / `ngStyle`
- [ ] Component stylesheet under 4 kB (budget: 4 kB warn / 8 kB error)

---

*Provenance: verified against Skolenza code on 2026-10-15; restructured 2026-10-17 (docs-only).
Earlier source versions are in git history (commit `0c786d5`). The backend `LOCKED_FIXES.md`
registry was unreachable both times and skipped with user approval. Record new decisions in the
current files.*
