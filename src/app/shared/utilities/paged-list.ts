import { computed, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, expand, forkJoin, map, Observable, reduce, Subscription } from 'rxjs';

import { PageRequest } from '@shared/interfaces';

import { pendingCounter } from './pending-counter';

/** The paging fields a list page needs; `data` may be missing when the page is empty. */
interface Page<T> {
  data?: T[] | null;
  totalPages?: number;
  totalRecords?: number;
}

type LoadPage<T> = (page: PageRequest) => Observable<Page<T>>;

/** The most rows one request may ask for; the API caps `PageSize` at 100. */
export const MAX_PAGE_SIZE = 100;

/** Rows a request brought back, how many `pageSize` pages they fill, and how many exist. */
interface Batch<T> {
  rows: T[];
  loaded: number;
  total: number;
}

/**
 * Rows of a server-paged list that grows a page at a time ("Load more").
 *
 * - `reload()` fetches page 1 again and replaces the rows; it cancels any request in flight.
 * - `refresh()` fetches every loaded page again, in requests of at most `MAX_PAGE_SIZE` rows, so a
 *   save does not shrink the list back to page 1 (and a scrolled list keeps its place).
 * - `loadMore()` appends the next page; it does nothing while a request is in flight or after a
 *   failure, so it is safe to call on every scroll. `retry()` repeats the failed request.
 *
 * A failed request leaves the rows as they were, sets `error` and calls `onError` (for a toast).
 */
export function pagedList<T>(
  load: LoadPage<T>,
  destroyRef: DestroyRef,
  { pageSize = 10, onError }: { pageSize?: number; onError?: (error: unknown) => void } = {},
) {
  const items = signal<T[]>([]);
  const loadedPages = signal(0);
  const totalPages = signal(0);
  const error = signal<unknown>(null);
  const pending = pendingCounter();
  let request: Subscription | undefined;
  let lastAttempt: () => void = () => undefined;

  const run = (attempt: () => void, batch: Observable<Batch<T>>, append: boolean): void => {
    request?.unsubscribe();
    lastAttempt = attempt;
    error.set(null);
    request = batch.pipe(pending.track, takeUntilDestroyed(destroyRef)).subscribe({
      next: ({ rows, loaded, total }) => {
        items.update((current) => (append ? [...current, ...rows] : rows));
        loadedPages.set(loaded);
        totalPages.set(total);
      },
      error: (failure: unknown) => {
        error.set(failure);
        onError?.(failure);
      },
    });
  };

  /** One page; `totalPages` comes straight from the response when `totalRecords` is missing. */
  const fetchPage = (pageNumber: number): void =>
    run(
      () => fetchPage(pageNumber),
      load({ pageNumber, pageSize }).pipe(
        map((page) => ({
          rows: page.data ?? [],
          loaded: pageNumber,
          total:
            page.totalRecords !== undefined
              ? Math.ceil(page.totalRecords / pageSize)
              : (page.totalPages ?? 0),
        })),
      ),
      pageNumber > 1,
    );

  /** Every loaded page again, as a few large pages that line up with the `pageSize` pages. */
  const fetchLoaded = (): void => {
    const rowsWanted = Math.max(loadedPages(), 1) * pageSize;
    // One request when the rows fit, else requests of the largest whole number of pages.
    const perRequest =
      rowsWanted <= MAX_PAGE_SIZE
        ? rowsWanted
        : Math.max(1, Math.floor(MAX_PAGE_SIZE / pageSize)) * pageSize;
    const requests = Array.from({ length: Math.ceil(rowsWanted / perRequest) }, (_, index) =>
      load({ pageNumber: index + 1, pageSize: perRequest }),
    );
    run(
      fetchLoaded,
      forkJoin(requests).pipe(
        map((pages) => {
          // The last request may reach past the loaded pages; keep the list its old length.
          const rows = pages.flatMap((page) => page.data ?? []).slice(0, rowsWanted);
          const loaded = Math.ceil(rows.length / pageSize);
          const last = pages[pages.length - 1];
          // Without `totalRecords`, only "more large pages follow" is known.
          const total =
            last.totalRecords !== undefined
              ? Math.ceil(last.totalRecords / pageSize)
              : (last.totalPages ?? 0) > requests.length
                ? loaded + 1
                : loaded;
          return { rows, loaded, total };
        }),
      ),
      false,
    );
  };

  return {
    items: items.asReadonly(),
    loading: pending.active,
    error: error.asReadonly(),
    failed: computed(() => error() !== null),
    hasMore: computed(() => loadedPages() < totalPages()),
    reload: (): void => fetchPage(1),
    refresh: fetchLoaded,
    loadMore: (): void => {
      if (pending.active() || error() !== null) return;
      fetchPage(loadedPages() + 1);
    },
    retry: (): void => lastAttempt(),
    /** Drops the rows and cancels the request in flight. */
    clear: (): void => {
      request?.unsubscribe();
      items.set([]);
      loadedPages.set(0);
      totalPages.set(0);
      error.set(null);
    },
  };
}

export type PagedList<T> = ReturnType<typeof pagedList<T>>;

/** Every row of a server-paged list, fetched page by page; for pickers and lookups. */
export function allPages<T>(load: LoadPage<T>, pageSize = MAX_PAGE_SIZE): Observable<T[]> {
  return load({ pageNumber: 1, pageSize }).pipe(
    // `index` counts the pages already received, so the next page is `index + 2`.
    expand((page, index) =>
      index + 2 <= (page.totalPages ?? 0) ? load({ pageNumber: index + 2, pageSize }) : EMPTY,
    ),
    reduce<Page<T>, T[]>((rows, page) => [...rows, ...(page.data ?? [])], []),
  );
}
