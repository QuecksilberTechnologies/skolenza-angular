# Color picker - design system review

**Component:** `src/app/shared/components/color-picker/` (+ `shared/components/popup/popup.ts`)
**Reviewed against:** `docs/design-system/index.html`
**Date:** 2026-09-20
**Status:** open - nothing applied yet

Root font-size is `0.8125rem` (13px), so every `rem` utility renders ~19% smaller than its
Tailwind-documented value. Several findings below follow directly from that.

---

## 1. Blocking - accessibility

### 1.1 Hit targets below 24&times;24px (WCAG 2.2 AA, 2.5.8)

| File                      | Line | Class                       | Renders                    | Fix                                                          |
| ------------------------- | ---- | --------------------------- | -------------------------- | ------------------------------------------------------------ |
| `color-picker.ts`         | 21   | `h-7 w-7` (`sm:h-8 sm:w-8`) | **22.75px** (26px at `sm`) | Min 26px, prefer 28px (`--ax-control-h-sm`)                  |
| `color-picker-panel.html` | 39   | `grid-cols-10 gap-2`        | **22.75px** per swatch     | `grid-cols-8` (~29px) or widen the panel                     |
| `color-picker-panel.html` | 160  | `h-5 w-5` remove button     | **16.25px**                | Pad the button to 24px, shrink the visual with an inner span |

Swatch math: panel `w-[min(92vw,24rem)]` = 312px, minus `px-4` (26px) minus 9 &times; `gap-2`
(58.5px) = 227.5px / 10 columns = 22.75px.

### 1.2 `aria-modal="true"` on a non-modal popover

`color-picker.html:37`. The overlay has no backdrop and does not block the page, so the attribute
tells assistive tech something untrue. Design system rule: a popover is `role="dialog"` +
`aria-label`, no `aria-modal`.

**Fix:** drop `aria-modal`, or make it genuinely modal (`hasBackdrop` + `--ax-overlay-scrim` +
`ScrollStrategy.block()`).

### 1.3 Remove-swatch button unreachable on touch

`color-picker-panel.html:160` - `hidden ... group-hover:flex focus-visible:flex`. Touch devices have
no hover; tapping the swatch picks the colour and closes the panel, so the remove action can never be
reached.

**Fix:** always render it (dimmed at rest, full opacity on hover/focus). Design system: "row actions
must be reachable without hover".

### 1.4 Custom-colour inputs are not wired to their error

`color-picker-panel.html:95-120`. The `<p role="alert">` exists, but neither input carries
`aria-invalid="true"` nor `aria-describedby` pointing at the message id.

---

## 2. Design system drift

| File:line                                                      | Issue                                                                                                                     | Fix                                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `color-picker.ts:44-49`                                        | Hand-rolled `positions` with an 8px offset, different flip order                                                          | Use `CARD_OVERLAY_POSITIONS` from `@shared/utilities/overlay` (6px, `--ax-overlay-offset`)                 |
| `color-picker.ts:43`                                           | `closeOnScroll` is actually `scrollStrategies.reposition()` - the panel never closes on scroll, and the name says it does | Add `closeOverlayOnScroll()` in the constructor; rename the field to `scrollStrategy`                      |
| `color-picker.html:19`                                         | No `appRepositionOnResize`                                                                                                | The panel grows (custom form expands, custom colours load async) and keeps the position measured at attach |
| `color-picker.html:19`                                         | No `panelClass`                                                                                                           | Once the pane is in `body` it is the only styling hook                                                     |
| `color-picker-panel.css:1-28`                                  | Animates `max-height` to a magic `22rem`; content past that clips                                                         | `grid-template-rows: 0fr -> 1fr` with `min-height: 0` on the child                                         |
| `color-picker-panel.css:34,39`                                 | Literal `ease-out` / `ease-in`                                                                                            | `--ax-ease-enter` / `--ax-ease-exit`; durations already match (200ms / 160ms)                              |
| `popup.ts:9`                                                   | `border-gray-100` (neutrals are zinc), `shadow-lg` for a floating panel, no dark reset                                    | `border-zinc-200 dark:border-zinc-800`, `--ax-shadow-md`, `dark:shadow-none`                               |
| `color-picker-panel.html:48,150`                               | `shadow-sm` on swatches with no dark reset                                                                                | Add `dark:shadow-none`                                                                                     |
| `color-picker-panel.html:48,150`                               | `hover:scale-110` moves and resizes the hit target                                                                        | Hover = ring or brightness change, never a transform                                                       |
| `color-picker.html:15`; `color-picker-panel.html:26,31,61,164` | `!text-[10px]` - important modifier prefixed                                                                              | `text-[10px]!` (Tailwind v4 rule in CLAUDE.md). Also 9px/10px sit below the 12px icon floor                |
| `color-picker-panel.html:128`                                  | `styleClass="w-full"`                                                                                                     | Deprecated on Optimus components - use the native `class` attribute                                        |
| `color-picker-panel.html:143`                                  | `@empty` shows "No custom colors yet." while `load()` is still in flight                                                  | Skeleton swatches until the request resolves                                                               |

---

## 3. Minor

- `color-picker-panel.ts:101` - `queueMicrotask(() => this.focusHexField())`. Zoneless render order
  is not guaranteed relative to a microtask; `afterNextRender` is the safe call.
- `color-picker-panel.ts:138` - copy state resets at 1500ms; the design system says ~2s.
- `color-picker.html:36-38` - `aria-labelledby="color-picker-title"` and `ariaLabel="Color picker"`
  are both set on `app-popup`. `aria-labelledby` wins; drop the redundant one.

---

## 4. Already correct - do not "fix"

- Focus ring is 2px with 2px offset on every interactive element.
- `close()` returns focus to the trigger; `cdkTrapFocus` + `cdkTrapFocusAutoCapture` on the panel.
- `appRovingRadioGroup` + `role="radiogroup"` / `aria-checked` for the presets.
- Selection carries a check glyph, so it is not colour-only; glyph colour comes from
  `contrastTextColor()`.
- `animate.enter` / `animate.leave` with a `prefers-reduced-motion` block at 1ms (not `none`).
- Panel width `min(92vw, 24rem)` and height `min(32rem, calc(100vh - 4rem))` match the overlay caps.
- Escape closes, outside click closes, `detach` resets state.

---

## Suggested order of work

1. Hit targets (1.1) - one pass over three class strings.
2. `aria-modal` (1.2) and the touch-unreachable remove button (1.3).
3. Overlay wiring: shared positions, `closeOverlayOnScroll`, `appRepositionOnResize`, `panelClass`.
4. Token cleanup: shadows, neutrals, easing tokens, important-modifier order.
5. `max-height` animation to the grid-rows technique.
6. Minor items.
