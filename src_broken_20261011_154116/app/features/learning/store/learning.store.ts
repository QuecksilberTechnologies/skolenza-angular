import { computed, inject } from '@angular/core';
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

import { Common, LearningApi } from '@core/services';
import { LearningStatus, MyLearningFilter, MyLearningItem } from '@shared/interfaces';

interface LearningState {
  items: MyLearningItem[];
  filter: MyLearningFilter;
}

const initialState: LearningState = {
  items: [],
  filter: {},
};

const unique = (values: string[]): string[] => [...new Set(values)].sort();

const matches = (item: MyLearningItem, f: MyLearningFilter): boolean => {
  const term = f.search?.trim().toLowerCase();
  if (term && !item.title.toLowerCase().includes(term)) return false;
  if (f.category && item.category !== f.category) return false;
  if (f.status && item.status !== f.status) return false;
  return true;
};

export const LearningStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const learningApi = inject(LearningApi);
    const commonService = inject(Common);

    const myLearningResource = rxResource({
      stream: () =>
        learningApi.getMyLearning().pipe(
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            patchState(store, { items: res.isSucceeded ? res.data : [] });
          }),
          map((res) => res.data),
        ),
    });

    return { myLearningResource };
  }),
  withComputed(({ items, filter, myLearningResource }) => ({
    isLoading: computed(() => myLearningResource.isLoading()),
    categories: computed(() => unique(items().map((i) => i.category))),
    filteredItems: computed(() => items().filter((i) => matches(i, filter()))),
  })),
  withMethods((store) => {
    const setFilter = (patch: Partial<MyLearningFilter>): void =>
      patchState(store, { filter: { ...store.filter(), ...patch } });

    return {
      setSearch: (search: string): void => setFilter({ search }),
      setCategory: (category: string | null): void => setFilter({ category }),
      setStatus: (status: LearningStatus | null): void => setFilter({ status }),
      reload: (): void => {
        store.myLearningResource.reload();
      },
    };
  }),
);
