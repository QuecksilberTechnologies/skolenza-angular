# AxionPro Design System

**Codename:** Axion DS · **Version:** 1.0 — Foundations & Tokens · **Status:** Normative
**Applies to:** `axionpro-app` (AxionPro HRMS frontend)
**Audience:** Designers · Frontend engineers · Product managers · QA · Accessibility reviewers

---

## Read this first

| Fact | Value |
| --- | --- |
| Framework | Angular 22, **zoneless**, standalone components, signal-first |
| Component library | `@openng/optimus-ui` v2 — a PrimeNG-compatible fork (`p-*` selectors, `pi pi-*` icons, `--p-*` tokens) |
| Theme engine | `@openng/optimus-ui-themes`, Aura base preset → `src/app/core/axion-preset.ts` |
| Utility layer | Tailwind CSS v4 (`@tailwindcss/postcss`) + `@openng/optimus-ui-tailwindcss` bridge |
| Dark mode | Class strategy — `darkModeSelector: '.dark'`, `@custom-variant dark (&:where(.dark, .dark *))` |
| Token prefix | `p` → CSS custom properties emit as `--p-*` |
| Root font size | **`0.8125rem` = 13px** — every `rem` in a style is 81.25% of its nominal value |
| Primary colour | **Generated at runtime** from the tenant's brand hex. Never hard-coded |
| Reference page | `src/app/features/employees/` — the canonical list-page pattern |

> ### Source-of-truth rule
>
> This documentation is normative for **decisions**. The executable truth lives in four files:
>
> 1. `src/styles.css` — Tailwind `@theme` block and global overrides
> 2. `src/app/core/axion-preset.ts` — the Optimus theme preset
> 3. `src/app/app.config.ts` — `provideOptimus` theme options
> 4. `src/app/app.ts` — `#applyBrandColor()`, the runtime primary ramp
>
> A token that is not in one of those four files does not exist. When these documents and the code
> disagree, **the code wins and the document is a bug** — open an issue against this folder.

---

## Map

### Start here

| Document | What it answers |
| --- | --- |
| [`introduction.md`](./introduction.md) | Why this system exists, its goals, the eight design principles, brand attributes, UX philosophy |
| [`governance.md`](./governance.md) | Who may change what, how a change gets in, deprecation, versioning, the per-PR Definition of Done |
| [`accessibility.md`](./accessibility.md) | WCAG thresholds, focus rules, the measured contrast audit, icon and motion accessibility |

### Foundations

| Document | Covers |
| --- | --- |
| [`foundations/color.md`](./foundations/color.md) | Three-layer architecture, runtime primary ramp, secondary, accents, semantic, neutrals, usage rules, light and dark themes |
| [`foundations/typography.md`](./foundations/typography.md) | Font families, the 13px root and its consequences, the full type scale, usage guidance |
| [`foundations/spacing.md`](./foundations/spacing.md) | Base unit, approved scale, layout / component / content spacing |
| [`foundations/grid.md`](./foundations/grid.md) | Breakpoints, container widths, columns, gutters, margins, app-shell metrics |
| [`foundations/elevation.md`](./foundations/elevation.md) | Shadow scale, use cases, the light-shadow / dark-border rule, naming |
| [`foundations/border-radius.md`](./foundations/border-radius.md) | Radius tokens and the nesting, scaling and overflow rules |
| [`foundations/motion.md`](./foundations/motion.md) | Duration and easing tokens, six motion principles, reduced-motion support |
| [`foundations/iconography.md`](./foundations/iconography.md) | Libraries, style rules, sizes, stroke weights, accessibility |

### Tokens

| Document | Covers |
| --- | --- |
| [`tokens/README.md`](./tokens/README.md) | Naming convention, every token category, and how tokens are emitted to Tailwind and Optimus |
| [`tokens/tokens.json`](./tokens/tokens.json) | Machine-readable source for design-tool sync |

### Patterns

| Document | Covers |
| --- | --- |
| [`patterns/list-page.md`](./patterns/list-page.md) | The Employees page — anatomy, the 15 rules it encodes, a copy-this skeleton, per-element token contract |

### Backlog

| Document | Covers |
| --- | --- |
| [`open-items.md`](./open-items.md) | Every verified gap between this specification and the app today, with the fix for each |

---

## Quick reference

```
COLOUR      primary 50-950 (runtime, tenant)   neutral = zinc 50-950
            success/warning/error/info: -500 fill, -700 text (light), -400 text (dark)
TYPE        root 13px · Inter · body-md = text-sm (11.4px) · h1 = text-2xl (19.5px)
SPACE       step 3.25px · inline gap-2 · block gap-4 · cell px-3 py-3 · page m-3/sm:m-4
GRID        sm 640 · md 768 · lg 1024 (layout pivot) · xl 1280 · 2xl 1536
            table min 60rem · form max 40rem · drawer 40rem
RADIUS      controls md 6px · cards 0.8rem · chips/avatars full
SHADOW      cards sm · overlays md · drawer lg · modal xl · dark = none + border
MOTION      hover 200ms · layout 300ms · ease-in-out · reduce-motion honoured
Z-INDEX     sticky 10 · scrim 14 · drawer 15 · overlay 1000 · modal 1100 · toast 1200
```

## The three rules that catch most mistakes

1. **Never write a literal.** No hex, radius, shadow or duration in a component. If no token fits,
   add the token here first — see [`governance.md`](./governance.md).
2. **The brand colour is data.** `primary-500` is whatever the tenant chose. Never assume it is blue,
   never assume white text on it is readable, never use it to mean success or error.
3. **Light uses shadows, dark uses borders.** Every raised surface pairs `shadow-sm` with
   `dark:shadow-none dark:border-zinc-800`.

---

## Scope of v1.0 and what is next

**In scope now:** Introduction, Governance, Accessibility, the eight Foundations, the token
reference, and the list-page pattern.

**Planned for v1.1:** Component specifications (buttons, inputs, selects, dialogs, drawers, tables),
additional page patterns (detail page, form page, dashboard), Content & Voice, and the QA test matrix.

---

*Derived from `axionpro-app` at commit-time state, with the Employees page
(`src/app/features/employees/`) as the reference implementation.*
