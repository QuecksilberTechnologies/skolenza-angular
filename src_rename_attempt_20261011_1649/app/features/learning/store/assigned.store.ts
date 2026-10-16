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
import { AssignedCourse, AssignedFilter, AssignPriority, LearningStatus } from '@shared/interfaces';

interface AssignedState {
  items: AssignedCourse[];
  filter: AssignedFilter;
}

const initialState: AssignedState = { items: [], filter: {} };

const matches = (item: AssignedCourse, f: AssignedFilter): boolean => {
  if (f.priority && item.priority !== f.priority) return false;
  if (f.status && item.status !== f.status) return false;
  return true;
};

export const AssignedStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const learningApi = inject(LearningApi);
    const commonService = inject(Common);

    const assignedResource = rxResource({
      stream: () =>
        learningApi.getAssigned().pipe(
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            patchState(store, { items: res.isSucceeded ? res.data : [] });
          }),
          map((res) => res.data),
        ),
    });

    return { assignedResource };
  }),
  withComputed(({ items, filter, assignedResource }) => ({
    isLoading: computed(() => assignedResource.isLoading()),
    filteredItems: computed(() => items().filter((i) => matches(i, filter()))),
  })),
  withMethods((store) => {
    const setFilter = (patch: Partial<AssignedFilter>): void =>
      patchState(store, { filter: { ...store.filter(), ...patch } });

    return {
      setPriority: (priority: AssignPriority | null): void => setFilter({ priority }),
      setStatus: (status: LearningStatus | null): void => setFilter({ status }),
      reload: (): void => {
        store.assignedResource.reload();
      },
    };
  }),
);
