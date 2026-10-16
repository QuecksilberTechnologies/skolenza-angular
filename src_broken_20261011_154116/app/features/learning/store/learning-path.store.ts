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
import { LearningPath } from '@shared/interfaces';

interface PathState {
  paths: LearningPath[];
}

const initialState: PathState = { paths: [] };

export const LearningPathStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const learningApi = inject(LearningApi);
    const commonService = inject(Common);

    const pathsResource = rxResource({
      stream: () =>
        learningApi.getLearningPaths().pipe(
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            patchState(store, { paths: res.isSucceeded ? res.data : [] });
          }),
          map((res) => res.data),
        ),
    });

    return { pathsResource };
  }),
  withComputed(({ pathsResource }) => ({
    isLoading: computed(() => pathsResource.isLoading()),
  })),
  withMethods((store) => ({
    reload: (): void => {
      store.pathsResource.reload();
    },
  })),
);
