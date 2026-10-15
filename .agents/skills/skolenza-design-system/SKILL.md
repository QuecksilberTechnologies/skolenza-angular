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

> Ported from AxionPro `SKILL_old.md` (removed; see git history). Verified against Skolenza code on 2026-10-15.
> The backend `LOCKED_FIXES.md` registry was not checked for this docs-only port (unavailable;
> skipped with user approval).

Angular 22 zoneless · `@openng/optimus-ui` v2 (PrimeNG-compatible fork, `p-*` / `pi pi-*` / `--p-*`)
· Tailwind v4 · dark mode via `.dark` · **root font size 13px** · primary colour generated at
runtime from the institution's brand hex.

Reference implementation for page structure: `src/app/features/staff-members/`.

---

## Non-negotiables

1. **No literals.** Never write a hex, radius, shadow or duration in a component. Use a Tailwind
   utility backed by `@theme`, or a `--p-*` token. Missing token → add it to `src/styles.css` /
   `core/skolenza-preset.ts` first.
2. **The brand colour is data.** `primary-500` is whatever hex the institution chose. Never assume
   it is blue, never assume white text on it is readable, never use `primary-*` to mean success or
   error.
3. **`rem` ≠ 16px here.** `html { font-size: 0.8125rem }` → **1rem = 13px**. `text-sm` renders at
   11.38px, `space-4` at 13px. Media-query `rem` is unaffected (still 16px), so `sm:` really is 640px.
4. **Light uses shadows, dark uses borders.** Every raised surface: `shadow-sm` +
   `dark:shadow-none dark:border-zinc-800`. Never a shadow in dark mode.
5. **Dark neutrals are slate.** Write `zinc-*` classes; under `.dark`, `src/styles.css` remaps
   `--color-zinc-*` to slate and `SkolenzaPreset` maps dark `surface` to `{slate.*}`. So
   `dark:bg-zinc-900` renders `#0f172a`. Check dark contrast against slate, not zinc.
6. **Colour is never the only signal.** Pair it with an icon and text — chips carry `pi pi-shield` +
   the label; status uses `pi-check-circle` / `pi-ban`.
7. **Permission removes, it does not disable** — `@if (canUpdate())` / `@if (canAdd())` from the
   permission matrix. Exception: keep a disabled control when a `pTooltip` explains *why* it is
   blocked.
8. **Tailwind v4 important goes last:** `text-xl!`, never `!text-xl`.
9. **`styleClass` is deprecated** on Optimus components → use the native `class` attribute.
   Never reach for `styleClass`, even on overlays that move their panel to `body`
   (`p-tieredmenu [popup]`, `p-contextMenu`, `p-confirmDialog`, `p-drawer`), where the host `class`
   stays behind. Style the moved panel through pass-through, `[pt]="{ root: { class: '…' } }"`, or
   through one global rule on the component's root class (`.p-confirmdialog` sets its width).
10. **Optimus projected templates resolve by reference name** (`#title`, `#content`, `#empty`,
    `#header`, `#headless`, `#caption`, `#body`, `#emptymessage`, `#loadingbody`) and each name may
    appear only **once per template**. Two of the same component in one template → use the existing
    wrapper (`app-section-card`, `app-select-field`, `app-country-select`, `app-status-dot-select`,
    `app-headless-drawer`, `asset/asset-status-select`). Never `pTemplate="..."`.
11. **Overlays render to body** — `appendTo="body"` on every select, menu, popover and paginator
    dropdown, or they clip inside the card's `overflow-x-auto`.

---

## Fast token lookup

Most work needs nothing beyond this table. Go to `references/` only for the full ramps.

| Need | Use |
| --- | --- |
| Page ground | `bg-zinc-50 dark:bg-zinc-950` |
| Card / raised surface | `bg-white dark:bg-zinc-900` + `shadow-sm dark:shadow-none dark:border-zinc-800` |
| Hover fill | `hover:bg-gray-50 dark:hover:bg-zinc-700` |
| Border | `border-zinc-200 dark:border-zinc-800` |
| Heading text | `text-zinc-900 dark:text-zinc-50` |
| Body / table cell text | `text-gray-700 dark:text-zinc-100` |
| Muted / caption text | `text-zinc-500 dark:text-zinc-400` |
| Placeholder only (never content) | `text-gray-400` — 2.54:1, fails AA for real text |
| Branded tint (interactive) | `bg-primary-50 dark:bg-primary-900/30` |
| Branded text on that tint | `text-primary-700 dark:text-primary-200` |
| Focus (non-form element) | `focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400` |
| Page gutter | `m-3 sm:m-4` |
| Inline gap | `gap-2` · block gap `gap-4` |
| Form grid | `grid grid-cols-1 gap-4 md:grid-cols-2`, full-width fields `md:col-span-2` |
| Table cell padding | `!px-3 !py-3` (existing form; prefer `px-3! py-3!` in new code) |
| Control radius | `rounded-md` · card `rounded-[0.8rem]` · chip/avatar `rounded-full` · modal `rounded-xl` |
| Hover/colour transition | `transition-colors duration-200` |
| Layout transition | `300ms ease-in-out` |
| Header height | `h-[55px]` (list pages still subtract `4.6rem`, ~5px off) |
| Content shell height | `h-[calc(100vh-4.6rem)]` |
| Table floor width | `[tableStyle]="{ 'min-width': '60rem' }"` |

**Semantic colours** — `-500` is a **fill**, `-700` is the **light-theme text**, `-400` is the
**dark-theme text**:

| Role | Fill | Text (light) | Text (dark) |
| --- | --- | --- | --- |
| Success | `#22c55e` | `#15803d` | `#4ade80` |
| Warning | `#f59e0b` | `#b45309` | `#fbbf24` |
| Error | `#ef4444` | `#dc2626` | `#f87171` |
| Info | `#3b82f6` | `#2563eb` | `#60a5fa` |

Using a `-500` as text on white is the single most common mistake — `#22c55e` on white is 2.28:1
and fails AA outright. White text on a `-500` fill fails the same way. The preset already darkens
light-theme `success` / `danger` buttons to `green.700` / `red.600` for this reason.

**Spacing scale** (only these): `0 1 1.5 2 2.5 3 4 5 6 8 10 12 16`. No `gap-7`, no `p-[13px]`.

**Type scale** (px at the 13px root): `text-xs` 9.75 · `text-sm` **11.38 (body/table default)** ·
`text-base` 13 · `text-lg` 14.63 · `text-xl` 16.25 · `text-2xl` **19.5 (target h1)** · `text-3xl`
24.38. `app-sub-header` currently renders the page title as `<h4 class="text-lg font-bold">`; the
target is one `<h1>` per route.

**Z-index**: sticky header `z-10` · mobile scrim `14` · mobile aside drawer `15` · route progress
bar `z-50!` · Optimus overlay / menu `1000` · modal / tooltip `1100`. Nothing else invents a
`z-index`.

---

## Decision tables

### Which colour?

| Situation | Answer |
| --- | --- |
| Needs to look interactive / branded | `primary-*` |
| Needs to look grouped but neutral | `zinc` / `gray` |
| Conveys state | semantic (`success` / `warning` / `error` / `info`) |
| "We need a second brand colour" | You don't. Use a neutral, a semantic colour, or a different *shape* (outline vs filled, dashed vs solid) |
| Avatar without a photo | `[appAvatarColor]="firstName"` — 16-hue deterministic palette, contrast handled |
| Progress / score tone | `shared/utilities/progress-tone.ts` (`-700` / red `-600` light, `-400` dark) |
| Small white text on a primary fill | Don't. `primary-500` may be only 3.49:1. Use `primary-600`/`700`, or make the label ≥ 18.66px bold |

### Which radius?

input/select/button → `rounded-md` · card → `rounded-[0.8rem]` · modal → `rounded-xl` · popover →
`rounded-md` · menu item → `rounded-sm` · chip/tag/avatar/progress → `rounded-full` · table cell →
none · inline code → `rounded-xs`. Tailwind v4 radii are rem, so they shrink at the 13px root
(`rounded-md` ≈ 4.9px).

**Nesting rule:** inner radius = outer radius − padding. A rounded container with a fill or image
child needs `overflow-hidden`.

### Which elevation?

card `shadow-sm` · select/popover/menu `shadow-md` · drawer `shadow-lg` · modal `shadow-xl` ·
form field `shadow-xs`. All of them `dark:shadow-none` + a border. Bare `shadow` is the Tailwind v3
name — use `shadow-sm`.

### Which duration?

hover/colour `200ms` · layout shift, overlay entry, `@defer` placeholder floor `300ms` · spinner
`500ms` linear. Entering `ease-out`, leaving `ease-in` (~30% shorter), moving within the viewport
`ease-in-out`.

---

## Building a list page

Copy `src/app/features/staff-members/staff-members.html`. Anatomy, in order:

```
h-[calc(100vh-4.6rem)] overflow-hidden overflow-y-auto
├── m-3 sm:m-4          @defer stats row + @placeholder (minimum 300ms) skeleton
└── p-card m-3 sm:m-4 overflow-x-auto
    └── p-table  [lazy] [paginator] [scrollable] min-width 60rem, rows [10, 25, 50]
        ├── #caption      → app-table-inline-filters (3 selects lg:min-w-52 + filter drawer trigger,
        │                    ngProjectAs="right" → app-table-search-filter + primary action)
        ├── #header       → bg-gray-50 dark:bg-zinc-800, !px-3 !py-3, max-w-* per column
        ├── #body         → truncate + pTooltip, chips, row actions
        ├── #loadingbody  → app-table-loader
        └── #emptymessage → app-table-empty-message (icon + message + subMessage)
Siblings, all appendTo="body":
p-tieredmenu · p-contextMenu · p-confirmDialog · p-drawer (advanced filters, @defer, #headless)
· app-headless-drawer
```

Do not copy the reference page's remaining `styleClass` bindings or its rename-artifact copy
("No staffMembers found", "Add StaffMember"); see open items DS-14 and DS-15.

Rules the page encodes — keep every one:

- The page owns the scroll; the shell never does.
- `[lazy]="true"` + `(onLazyLoad)` — server-side sort/page/filter always. Never client-side over
  partial data.
- Three filters inline, everything else in the drawer behind a `[filterCount]` badge.
- Cells `truncate` with `max-w-*` + `pTooltip`; never wrap.
- Hover-revealed actions (`opacity-0 group-hover:opacity-100`) are always secondary — touch has no
  hover.
- Interactive chips are real `<button>`s with `[attr.aria-label]`.
- Every async control shows a loading identity (`[loading]`, `pi pi-spin pi-spinner`, `aria-busy`).
- Empty state names the thing **and** the next step.

Full anatomy, numbered rules, a copy-paste skeleton, and the per-element token contract:
[references/patterns/list-page.md](references/patterns/list-page.md).

---

## Theming an institution

`src/app/app.ts` expands one hex into the whole ramp at runtime:

```ts
const brandColor = (await this.#institutionsApi.getBrandColor()) ?? '#4287f5';
updatePreset({ semantic: { primary: palette(brandColor) } });
```

`palette()` mixes with white below 500 and black above: `50`=tint 95%, `100`=76%, `200`=57%,
`300`=38%, `400`=19%, `500`=the hex itself, `600`=shade 15%, `700`=30%, `800`=45%, `900`=60%,
`950`=75%.

Light theme uses `primary.500`; **dark theme uses `primary.400`**. Never add a static `primary` to
`skolenza-preset.ts` — it would fight the runtime injection.

**Gate:** warn on any brand hex with `contrast(brand, #ffffff) < 3.0`. The host institution form
(`institution-form.ts`) already shows this as an advisory warning. Verify with the script below
before shipping a brand colour.

---

## Scripts

`scripts/skolenza_color.py` — Python 3.8+, stdlib only. Implements the exact `palette()` algorithm
from `@openng/optimus-ui-styled`, so its output matches what the app will render.

Always invoke it through `${CLAUDE_SKILL_DIR}` — a relative path resolves against the session's
working directory, not the skill folder, and will not be found.

```bash
# Expand a brand hex into the ramp the app will generate, with a contrast report
py ${CLAUDE_SKILL_DIR}/scripts/skolenza_color.py ramp "#4287f5"

# Check a foreground/background pair against WCAG AA
py ${CLAUDE_SKILL_DIR}/scripts/skolenza_color.py check "#22c55e" "#ffffff"
py ${CLAUDE_SKILL_DIR}/scripts/skolenza_color.py check "#f8fafc" "#0f172a" --large

# Re-run the known audit pairs (exits non-zero if any fail)
py ${CLAUDE_SKILL_DIR}/scripts/skolenza_color.py audit
```

On this Windows setup `python` / `python3` are Store stubs; use the `py` launcher. Elsewhere use
`python3`.

Dark columns and dark audit pairs measure against slate (`#0f172a` card, `#020617` ground), which
is what `.dark` renders.

Use `ramp` whenever someone asks "what will institution X's palette look like" and `check` before
committing **any** new colour pair. Do not eyeball contrast.

---

## When to read the references

Read only what the task needs — these are large.

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

The AxionPro `*_old.md` originals were removed; they are in git history (commit `0c786d5`).
Record new decisions in the current files.

---

## Known defects — do not reproduce, do fix on contact

The app currently violates its own rules in these places. Never copy them into new code.

| Where | Problem |
| --- | --- |
| `shared/pipes/get-new-joiner-badge-pipe.ts` | White text on `#22c55e` / `#f59e0b` / `#3b82f6` → 2.28 / 2.15 / 3.68:1, all fail AA |
| `get-status-tag-pipe.ts`, `get-priority-tag-pipe.ts` | Material pastels used nowhere else; comments contradict the values; `dark:text-white!` over them is 1.14–1.35:1 |
| `src/styles.css` | `--p-inputtext/select/textarea-focus-ring-width: 1px` contradicts its own WCAG 2.4.11 comment — should be `2px` |
| `src/styles.css` | No global `prefers-reduced-motion` block, while `scroll-behavior: smooth` is global |
| `layout/layout.css` | `z-index: 14` / `15` hand-written instead of tokenised |
| `features/staff-members/staff-members.html` | Deprecated `styleClass` on menus and drawer; "No staffMembers found" / "Add StaffMember" copy |

Fixed since AxionPro: the progress-colour pipe (now `progress-tone.ts`). Not a defect:
`dark.surface.0 = #ffffff` in the preset (Aura uses it as dark-theme text colour).

Full list with fixes: [references/open-items.md](references/open-items.md).

---

## Before you finish

- [ ] No new colour / radius / shadow / duration literal
- [ ] Renders in light **and** dark (dark = slate)
- [ ] Checked at 320 / 640 / 1024 / 1440 px
- [ ] Loading, empty and error states exist
- [ ] Contrast ≥ 4.5:1 body, ≥ 3:1 large text and UI boundaries — **run the script**
- [ ] Visible focus everywhere; icon-only controls have `aria-label`
- [ ] User-facing copy uses `-` or `:`, never an em/en dash separator (`.claude/docs/ui-copy.md`)
- [ ] `ChangeDetectionStrategy.OnPush`; `@if` / `@for` / `@switch` / `@defer`
- [ ] `input()` / `output()` functions, `inject()`, no `ngClass` / `ngStyle`
- [ ] Component stylesheet under 4 kB (budget: 4 kB warn / 8 kB error)
