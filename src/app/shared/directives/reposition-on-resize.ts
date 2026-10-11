import { CdkConnectedOverlay } from '@angular/cdk/overlay';
import { DestroyRef, Directive, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * CDK measures a connected overlay once, when it attaches. Cards that open as a skeleton and grow
 * when their data lands therefore keep the position that suited the skeleton, and the finished card
 * hangs off the bottom of the viewport. Re-run the position pass whenever the panel resizes, so the
 * flip/push fallbacks are re-evaluated against the real height.
 *
 * Put it on the same `ng-template` as `cdkConnectedOverlay`.
 */
@Directive({
  selector: '[appRepositionOnResize]',
})
export class RepositionOnResize {
  constructor() {
    const overlay = inject(CdkConnectedOverlay);
    if (typeof ResizeObserver === 'undefined') return;

    // Built on first attach: a table row declares one of these each, and most never open.
    let observer: ResizeObserver | undefined;

    overlay.attach.pipe(takeUntilDestroyed()).subscribe(() => {
      observer ??= new ResizeObserver(() => overlay.overlayRef?.updatePosition());
      observer.observe(overlay.overlayRef.overlayElement);
    });
    overlay.detach.pipe(takeUntilDestroyed()).subscribe(() => observer?.disconnect());

    // `CdkConnectedOverlay` unsubscribes from `detach` before it disposes the ref, so closing the
    // row (a filter, a sort, a reload) with the card open never emits `detach`.
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }
}
