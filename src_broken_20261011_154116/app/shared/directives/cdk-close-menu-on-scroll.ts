import { CdkMenuTrigger } from '@angular/cdk/menu';
import { AfterViewInit, DestroyRef, Directive, inject } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Directive({
  selector: '[appCdkCloseMenuOnScroll]',
})
export class CdkCloseMenuOnScroll implements AfterViewInit {
  private menuTrigger = inject(CdkMenuTrigger, { optional: true });
  readonly #destroyRef = inject(DestroyRef);
  private scrollSub?: Subscription;

  ngAfterViewInit(): void {
    if (!this.menuTrigger) return;

    this.scrollSub = fromEvent<Event>(window, 'scroll', { capture: true })
      .pipe(
        filter((event) => {
          if (!this.menuTrigger?.isOpen || !this.menuTrigger.isOpen()) return false;

          // Ignore scroll events originating from inside the opened menu
          const target = event.target;
          if (target instanceof Element && target.closest('[cdkmenu]')) return false;

          return true;
        }),
      )
      .subscribe(() => {
        this.menuTrigger?.close?.();
      });

    this.#destroyRef.onDestroy(() => {
      this.scrollSub?.unsubscribe();
    });
  }
}
