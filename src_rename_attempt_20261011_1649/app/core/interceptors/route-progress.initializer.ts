import { DestroyRef, DOCUMENT, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';

import { LoadingStore } from '@core/services/loading-store';
import { clearChunkReloadFlag } from '@core/services/navigation-error-handler';

export function initializeRouteProgress() {
  const router = inject(Router);
  const progressBar = inject(LoadingStore);
  const destroyRef = inject(DestroyRef);
  const win = inject(DOCUMENT).defaultView;

  router.events.pipe(takeUntilDestroyed(destroyRef)).subscribe((event) => {
    if (event instanceof NavigationStart) {
      progressBar.busy();
    } else if (
      event instanceof NavigationEnd ||
      event instanceof NavigationCancel ||
      event instanceof NavigationError
    ) {
      progressBar.idle();

      if (event instanceof NavigationEnd) {
        // A later genuine chunk failure on this URL still gets its one retry.
        clearChunkReloadFlag(win);
      }
    }
  });
}
