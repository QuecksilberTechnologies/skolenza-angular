import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { map, tap } from 'rxjs';

import { Common, LearningApi, StorageApi } from '@core/services';
import { KnowledgeArticle, KnowledgeFilter } from '@shared/interfaces';

const BOOKMARK_KEY = 'learning-bookmarks';

interface KnowledgeState {
  articles: KnowledgeArticle[];
  filter: KnowledgeFilter;
  selectedId: string | null;
  bookmarks: string[];
}

const initialState: KnowledgeState = {
  articles: [],
  filter: {},
  selectedId: null,
  bookmarks: [],
};

const unique = (values: string[]): string[] => [...new Set(values)].sort();

const matches = (a: KnowledgeArticle, f: KnowledgeFilter): boolean => {
  const term = f.search?.trim().toLowerCase();
  if (term && !`${a.title} ${a.summary}`.toLowerCase().includes(term)) return false;
  if (f.category && a.category !== f.category) return false;
  return true;
};

export const KnowledgeStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const learningApi = inject(LearningApi);
    const commonService = inject(Common);
    const storageApi = inject(StorageApi);
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    if (isBrowser) {
      storageApi.getItem(BOOKMARK_KEY).then((saved) => {
        if (Array.isArray(saved)) patchState(store, { bookmarks: saved as string[] });
      });
    }

    const articlesResource = rxResource({
      stream: () =>
        learningApi.getKnowledge().pipe(
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            patchState(store, { articles: res.isSucceeded ? res.data : [] });
          }),
          map((res) => res.data),
        ),
    });

    return { articlesResource };
  }),
  withComputed(({ articles, filter, selectedId, bookmarks, articlesResource }) => ({
    isLoading: computed(() => articlesResource.isLoading()),
    categories: computed(() => unique(articles().map((a) => a.category))),
    filteredArticles: computed(() => articles().filter((a) => matches(a, filter()))),
    popular: computed(() => articles().filter((a) => a.popular)),
    selectedArticle: computed(() => articles().find((a) => a.id === selectedId()) ?? null),
    bookmarkSet: computed(() => new Set(bookmarks())),
  })),
  withMethods((store) => {
    const storageApi = inject(StorageApi);

    const setFilter = (patch: Partial<KnowledgeFilter>): void =>
      patchState(store, { filter: { ...store.filter(), ...patch } });

    return {
      setSearch: (search: string): void => setFilter({ search }),
      setCategory: (category: string | null): void => setFilter({ category }),
      select: (id: string): void => patchState(store, { selectedId: id }),
      isBookmarked: (id: string): boolean => store.bookmarkSet().has(id),
      toggleBookmark(id: string): void {
        const current = store.bookmarks();
        const next = current.includes(id) ? current.filter((b) => b !== id) : [...current, id];
        patchState(store, { bookmarks: next });
        storageApi.setItem(BOOKMARK_KEY, next);
      },
      reload: (): void => {
        store.articlesResource.reload();
      },
    };
  }),
);
