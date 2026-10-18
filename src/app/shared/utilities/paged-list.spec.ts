import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { PageRequest } from '@shared/interfaces';

import { allPages, pagedList } from './paged-list';

const page = (data: number[], totalPages: number) => of({ data, totalPages });

describe('pagedList', () => {
  const destroyRef = () => TestBed.inject(DestroyRef);

  it('appends the next page on loadMore and stops at the last page', () => {
    const load = vi.fn(({ pageNumber }: PageRequest) => page(pageNumber === 1 ? [1, 2] : [3], 2));
    const list = pagedList(load, destroyRef(), { pageSize: 2 });

    list.reload();
    expect(list.items()).toEqual([1, 2]);
    expect(list.hasMore()).toBe(true);

    list.loadMore();
    expect(load).toHaveBeenLastCalledWith({ pageNumber: 2, pageSize: 2 });
    expect(list.items()).toEqual([1, 2, 3]);
    expect(list.hasMore()).toBe(false);
  });

  it('replaces the rows with page 1 on reload', () => {
    const list = pagedList(() => page([7], 3), destroyRef());

    list.reload();
    list.loadMore();
    list.reload();

    expect(list.items()).toEqual([7]);
    expect(list.hasMore()).toBe(true);
  });

  it('drops a late page once the list is cleared', () => {
    const pending = new Subject<{ data: number[]; totalPages: number }>();
    const list = pagedList(() => pending, destroyRef());

    list.reload();
    expect(list.loading()).toBe(true);
    list.clear();
    pending.next({ data: [1], totalPages: 1 });

    expect(list.items()).toEqual([]);
    expect(list.loading()).toBe(false);
  });

  it('keeps the rows on a failed page, reports it, and loads nothing more until retried', () => {
    const onError = vi.fn();
    let fail = false;
    const load = vi.fn(({ pageNumber }: PageRequest) =>
      fail ? throwError(() => new Error('Server error')) : page([pageNumber], 3),
    );
    const list = pagedList(load, destroyRef(), { onError });
    list.reload();
    fail = true;

    list.loadMore();
    list.loadMore();

    expect(list.items()).toEqual([1]);
    expect(list.failed()).toBe(true);
    expect(onError).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledTimes(2);

    fail = false;
    list.retry();
    expect(load).toHaveBeenLastCalledWith({ pageNumber: 2, pageSize: 10 });
    expect(list.items()).toEqual([1, 2]);
    expect(list.failed()).toBe(false);
  });

  it('ignores loadMore while a request is in flight, so a reload is never cut short', () => {
    const pending = new Subject<{ data: number[]; totalPages: number }>();
    const load = vi.fn(() => pending);
    const list = pagedList(load, destroyRef());

    list.reload();
    list.loadMore();

    expect(load).toHaveBeenCalledOnce();
  });

  it('refreshes every loaded page in one request and keeps the list length', () => {
    const load = vi.fn(({ pageNumber, pageSize }: PageRequest) =>
      of({
        data: Array.from({ length: pageSize }, (_, i) => (pageNumber - 1) * pageSize + i),
        totalRecords: 30,
      }),
    );
    const list = pagedList(load, destroyRef(), { pageSize: 10 });
    list.reload();
    list.loadMore();

    list.refresh();

    expect(load).toHaveBeenLastCalledWith({ pageNumber: 1, pageSize: 20 });
    expect(list.items()).toHaveLength(20);
    expect(list.hasMore()).toBe(true);
    list.loadMore();
    expect(load).toHaveBeenLastCalledWith({ pageNumber: 3, pageSize: 10 });
  });

  it('refreshes a long list in requests of at most 100 rows', () => {
    const load = vi.fn(({ pageNumber, pageSize }: PageRequest) =>
      of({
        data: Array.from({ length: pageSize }, (_, i) => (pageNumber - 1) * pageSize + i),
        totalRecords: 300,
      }),
    );
    const list = pagedList(load, destroyRef(), { pageSize: 10 });
    list.reload();
    for (let page = 2; page <= 12; page++) list.loadMore();
    load.mockClear();

    list.refresh();

    expect(load.mock.calls.map(([request]) => request)).toEqual([
      { pageNumber: 1, pageSize: 100 },
      { pageNumber: 2, pageSize: 100 },
    ]);
    expect(list.items()).toHaveLength(120);
    expect(list.items().at(-1)).toBe(119);
    expect(list.hasMore()).toBe(true);
  });

  it('treats a response without paging fields as a single page', () => {
    const list = pagedList(() => of({ data: [1] }), destroyRef());

    list.reload();

    expect(list.items()).toEqual([1]);
    expect(list.hasMore()).toBe(false);
  });
});

describe('allPages', () => {
  it('fetches every page in order and joins the rows', () => {
    const load = vi.fn(({ pageNumber }: PageRequest) => page([pageNumber], 3));
    let rows: number[] = [];

    allPages(load, 50).subscribe((value) => (rows = value));

    expect(load.mock.calls.map(([request]) => request)).toEqual([
      { pageNumber: 1, pageSize: 50 },
      { pageNumber: 2, pageSize: 50 },
      { pageNumber: 3, pageSize: 50 },
    ]);
    expect(rows).toEqual([1, 2, 3]);
  });

  it('stops after page 1 when the response has no paging fields', () => {
    const load = vi.fn(() => of({ data: [1] }));
    let rows: number[] = [];

    allPages(load).subscribe((value) => (rows = value));

    expect(load).toHaveBeenCalledOnce();
    expect(rows).toEqual([1]);
  });
});
