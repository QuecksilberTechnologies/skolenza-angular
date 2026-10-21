import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { LoadMore, LoadMoreList } from './load-more';

describe('LoadMore', () => {
  function render(state: { failed?: boolean; hasMore?: boolean }) {
    const list = {
      loading: signal(false),
      failed: signal(state.failed ?? false),
      hasMore: signal(state.hasMore ?? false),
      loadMore: vi.fn(),
      retry: vi.fn(),
    } satisfies LoadMoreList;
    const fixture = TestBed.createComponent(LoadMore);
    fixture.componentRef.setInput('list', list);
    fixture.componentRef.setInput('what', 'lesson plans');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return { list, element, button: element.querySelector('button') };
  }

  it('offers Load more while pages remain', () => {
    const { list, button } = render({ hasMore: true });

    expect(button?.getAttribute('aria-label')).toBe('Load more lesson plans');
    button?.click();
    expect(list.loadMore).toHaveBeenCalledOnce();
  });

  it('names the failure and offers Retry once a request has failed', () => {
    const { list, element, button } = render({ failed: true, hasMore: true });

    expect(element.textContent).toContain("Couldn't load the lesson plans.");
    button?.click();
    expect(list.retry).toHaveBeenCalledOnce();
  });

  it('renders nothing on the last page', () => {
    expect(render({}).button).toBeNull();
  });
});
