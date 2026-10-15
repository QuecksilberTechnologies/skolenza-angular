import { computed, signal } from '@angular/core';
import { defer, finalize, Observable } from 'rxjs';

/**
 * Counts in-flight requests so several parallel loads drive one busy flag. `track()` counts a
 * request from subscribe until it completes, errors or is unsubscribed.
 */
export function pendingCounter() {
  const count = signal(0);
  return {
    active: computed(() => count() > 0),
    track: <T>(source: Observable<T>): Observable<T> =>
      defer(() => {
        count.update((value) => value + 1);
        return source.pipe(finalize(() => count.update((value) => value - 1)));
      }),
  };
}
