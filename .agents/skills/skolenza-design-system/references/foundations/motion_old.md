[← Index](../README.md) · [← Border radius](./border-radius.md)

# Motion & Animation

> **Ownership:** T0 — Foundations · **Status:** Normative
> **Source of truth:** Aura `transitionDuration`, `src/app/layout/layout.css`, `src/styles.css`
> **Related:** [Accessibility](../accessibility.md) · [Tokens](../tokens/README.md)

---

## 1. Duration tokens

| Token | Value | Where it is used today | Applies to |
| --- | --- | --- | --- |
| `duration-instant` | `0ms` | — | State that must not animate: value updates in a live table, validation messages |
| `duration-fast` | `150ms` | — | Micro-feedback: button press, checkbox tick, icon swap |
| `duration-base` | `200ms` | `--p-transition-duration` (Aura), `transition-colors duration-200` on list rows | **Default.** Hover, focus, colour and border transitions |
| `duration-moderate` | `300ms` | Sidebar collapse (`max-width` / `transform 300ms`), progress-bar width, `--p-mask-transition-duration`, `@placeholder (minimum 300ms)` | Layout shifts, overlays entering, scrim fades |
| `duration-slow` | `500ms` | `p-progress-spinner animationDuration=".5s"` | Looping indeterminate indicators only |
| `duration-deliberate` | `700ms` | — | Reserved: onboarding walkthroughs, celebratory moments. Not for routine UI |

> **The `@defer` placeholder floor.** `@placeholder (minimum 300ms)` matches `duration-moderate` on
> purpose — it guarantees a skeleton is visible long enough to read *as* a skeleton rather than as a
> flash. Keep new `@defer` blocks on the same floor.

---

## 2. Easing tokens

| Token | `cubic-bezier` | CSS keyword | Use for |
| --- | --- | --- | --- |
| `ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | `ease-in-out` | **Default.** Elements moving within the viewport: sidebar, accordion, tab indicator |
| `ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | `ease-out` | Entering: drawer sliding in, popover opening, toast arriving. Fast start, soft landing |
| `ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | `ease-in` | Leaving: dialog dismissing, toast retiring. Soft start, quick exit |
| `ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | — | A single hero moment per screen at most: a card expanding into a detail view |
| `ease-linear` | `linear` | `linear` | **Only** for looping indeterminate motion — spinners, progress bars, shimmer |

**Pairing rule.** Entering uses `ease-decelerate`, leaving uses `ease-accelerate`, and leaving is
typically ~30% shorter than entering. Never `ease-in-out` on an entrance — it makes the UI feel
hesitant.

---

## 3. Motion principles

**M1 — Motion explains a relationship.** A drawer slides from the right because it came from the
button on the right. A row expands downward because its detail belongs to it. If the motion doesn't
answer "where did this come from", cut it.

**M2 — Nothing important animates.** Data values, counts, validation errors and permission changes
appear instantly. Animation is for *chrome*, and chrome only.

**M3 — Animate cheap properties.** `transform` and `opacity` are composited. `width`, `height`, `top`
and `left` are not. The sidebar animates `max-width` because a rail must reflow content — that is the
justified exception, and it is why the transition is gated behind a `.transition-enabled` class so it
never fires on first paint.

**M4 — No motion on first paint.** `isTransitionEnabled()` guards the sidebar for exactly this
reason. A page that animates itself into existence on load reads as slow.

**M5 — One moving thing at a time.** Staggered lists, cascading cards and simultaneous multi-element
transitions cost attention that a work application does not have to spend.

**M6 — Optimus animations are native CSS.** `showTransitionOptions` / `hideTransitionOptions` are
**non-functional** in Optimus v2. Do not set them; style the transition in CSS instead.

---

## 4. Reduced motion

**Status: not currently implemented.** This is a WCAG 2.3.3 gap ([DS-03](../open-items.md)) and must
be added to `src/styles.css`:

```css
/* Honour the OS "reduce motion" setting. Motion becomes instant; nothing disappears. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Indeterminate indicators must keep moving — a frozen spinner reads as a hung app.
     Slow them and drop the rotation-induced motion instead of stopping them. */
  .p-progressspinner-circle,
  .p-progressbar-value-animate {
    animation-duration: 2s !important;
    animation-iteration-count: infinite !important;
  }
}
```

`html { scroll-behavior: smooth }` is currently set globally — the block above is what makes that
setting safe.

### Rules

- **Reduced motion means reduced, not removed.** State changes still happen; they just happen at once.
- **Never use motion as the only indicator of a state change.** If a row highlights *and* slides, the
  highlight must survive on its own.
- **Avoid parallax, auto-playing carousels, and large-area zooms entirely** — there is no
  reduced-motion fallback that makes them acceptable for vestibular disorders.

### Testing

- macOS → System Settings → Accessibility → Display → *Reduce motion*
- Windows → Settings → Accessibility → Visual effects → *Animation effects* off
- Chrome DevTools → Rendering → *Emulate CSS `prefers-reduced-motion`*

---

**Next:** [Iconography →](./iconography.md)
