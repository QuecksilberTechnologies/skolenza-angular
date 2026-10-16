import { ConnectedPosition } from '@angular/cdk/overlay';
import { DOCUMENT, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, fromEvent } from 'rxjs';

/**
 * Flip order for a card-shaped overlay anchored to a table row: below the origin, then above it,
 * then the same two aligned to the origin's end edge. Pair with `cdkConnectedOverlayPush` and
 * `cdkConnectedOverlayFlexibleDimensions` so a card taller than the free space is clamped and
 * nudged back into the viewport instead of being cut off at the bottom.
 */
export const CARD_OVERLAY_POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
];

/**
 * The app scrolls an inner container, not the window, so CDK's `close` scroll strategy never fires.
 * Listen in the capture phase instead — and ignore scrolling *inside* the overlay, which has its
 * own overflow container. Call from an injection context.
 *
 * `isOpen` is checked first because a table row registers one of these each, and only one row's
 * overlay is ever open — the rest must cost nothing per scroll tick.
 */
export function closeOverlayOnScroll(close: () => void, isOpen: () => boolean): void {
  const view = inject(DOCUMENT).defaultView;
  if (!view) return;

  fromEvent<Event>(view, 'scroll', { capture: true })
    .pipe(
      filter(
        (event) =>
          isOpen() &&
          !(event.target instanceof Element && event.target.closest('.cdk-overlay-pane')),
      ),
      takeUntilDestroyed(),
    )
    .subscribe(close);
}
