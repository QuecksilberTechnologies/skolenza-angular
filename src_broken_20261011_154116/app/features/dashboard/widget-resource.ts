import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of } from 'rxjs';

import { SuperAdminDashboardRes } from '@shared/interfaces';

/**
 * One widget's own read, for a card that loads outside the role dashboard call. A failure
 * (including the 403 every non-Admin role type gets) resolves to `null`, so the card renders its
 * own empty state; the API skips the global 403 toast for the same reason.
 */
export function widgetResource<T>(load: () => Observable<SuperAdminDashboardRes<T>>) {
  return rxResource<T | null, void>({
    defaultValue: null,
    stream: () =>
      load().pipe(
        map((res) => (res.isSucceeded ? (res.data ?? null) : null)),
        catchError(() => of(null)),
      ),
  });
}
