import { computed, DestroyRef, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { catchError, finalize, map, of, tap } from 'rxjs';

import { Common, OperationsMasterApi } from '@core/services';
import { OperationRow } from '@shared/interfaces';

interface OperationsState {
  operations: OperationRow[];
  operationType: number | null;
  isActive: boolean | null;
}

const initialState: OperationsState = {
  operations: [],
  operationType: null,
  isActive: null,
};

export const OperationsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const operationsApi = inject(OperationsMasterApi);
    const commonService = inject(Common);

    /** `get-all-operations` takes no params, so filters are applied client-side and refresh is a reload. */
    const operationsResource = rxResource({
      stream: () =>
        operationsApi.getOperations().pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, { operations: res.isSucceeded ? (res.data ?? []) : [] });
          }),
          map((res) => res.data ?? []),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { operations: [] });
            return of([] as OperationRow[]);
          }),
        ),
    });

    return { operationsResource };
  }),
  withComputed(({ operations, operationType, isActive, operationsResource }) => ({
    isLoading: computed(() => operationsResource.isLoading()),
    filteredOperations: computed(() => {
      const type = operationType();
      const active = isActive();
      return operations().filter(
        (operation) =>
          (type === null || operation.operationType === type) &&
          (active === null || operation.isActive === active),
      );
    }),
  })),
  withMethods((store) => {
    const operationsApi = inject(OperationsMasterApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the delete button. */
    const setDeleting = (id: number, isDeleting: boolean) =>
      patchState(store, {
        operations: store.operations().map((o) => (o.id === id ? { ...o, isDeleting } : o)),
      });

    return {
      setOperationType(operationType: number | null): void {
        patchState(store, { operationType: operationType ?? null });
      },

      setIsActive(isActive: boolean | null): void {
        patchState(store, { isActive: isActive ?? null });
      },

      reloadOperations(): void {
        store.operationsResource.reload();
      },

      deleteOperation(operation: OperationRow): void {
        setDeleting(operation.id, true);

        operationsApi
          .deleteOperation(operation.id)
          .pipe(
            finalize(() => setDeleting(operation.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, {
                  operations: store.operations().filter((o) => o.id !== operation.id),
                });
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);
