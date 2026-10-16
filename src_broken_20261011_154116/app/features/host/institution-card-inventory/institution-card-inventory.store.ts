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
import { TableLazyLoadEvent } from '@openng/optimus-ui/table';
import { catchError, finalize, map, of, tap } from 'rxjs';

import { Common, DeviceDdlOptionsApi, InstitutionCardMasterApi, InstitutionsApi } from '@core/services';
import {
  DeviceDdlOptionSection,
  IInstitution,
  SettledSearchTerm,
  InstitutionCardMasterRow,
} from '@shared/interfaces';

interface InstitutionCardInventoryState {
  cardMasters: InstitutionCardMasterRow[];
  /** Server-side filters. `null` is the "Any" option — the endpoint takes them as nullable. */
  institutionId: string | null;
  cardStatus: string | null;
  isActive: boolean | null;
  /** Already debounced and whitespace-normalised by `TableSearchInput`. */
  search: string;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
}

const initialState: InstitutionCardInventoryState = {
  cardMasters: [],
  institutionId: null,
  cardStatus: null,
  isActive: null,
  search: '',
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
};

export const InstitutionCardInventoryStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const institutionCardMasterApi = inject(InstitutionCardMasterApi);
    const institutionsApi = inject(InstitutionsApi);
    const deviceDdlOptionsApi = inject(DeviceDdlOptionsApi);
    const commonService = inject(Common);

    // Unlike `InstitutionDevice`, `InstitutionCardMaster/get-all` answers 400 `A valid identifier is
    // required.` without a institution — there is no "every institution" view on this controller — so the
    // resource stays idle (`undefined` params) until one is picked.
    const cardMastersResource = rxResource({
      params: () => {
        const institutionId = store.institutionId();
        return institutionId === null
          ? undefined
          : {
              Search: store.search(),
              InstitutionId: institutionId,
              CardStatus: store.cardStatus(),
              IsActive: store.isActive(),
              PageNumber: store.pageNumber(),
              PageSize: store.pageSize(),
            };
      },
      stream: ({ params }) =>
        institutionCardMasterApi.getInstitutionCardMasters(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              cardMasters: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? 0) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { cardMasters: [], totalRecords: 0 });
            return of([] as InstitutionCardMasterRow[]);
          }),
        ),
    });

    /** Decorates the institution filter only, so a failure degrades to an empty dropdown. */
    const institutionsResource = rxResource({
      stream: () =>
        institutionsApi.getInstitutions({ IsActive: true }).pipe(
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError(() => of([] as IInstitution[])),
        ),
    });

    /** Tax-treatment and card-status labels the backend enums have no local names for. */
    const ddlOptionsResource = rxResource({
      stream: () =>
        deviceDdlOptionsApi.getInstitutionCardInventory().pipe(
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError(() => of([] as DeviceDdlOptionSection[])),
        ),
    });

    return { cardMastersResource, institutionsResource, ddlOptionsResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.cardMastersResource.isLoading()),
    /** Gates the grid — `get-all` has no "every institution" view, see `cardMastersResource` above. */
    hasInstitution: computed(() => store.institutionId() !== null),
    institutions: computed(() => store.institutionsResource.value() ?? []),
    isInstitutionsLoading: computed(() => store.institutionsResource.isLoading()),
    cardStatusOptions: computed(
      () =>
        (store.ddlOptionsResource.value() ?? []).find((section) => section.key === 'cardStatus')
          ?.options ?? [],
    ),
    taxTreatmentOptions: computed(
      () =>
        (store.ddlOptionsResource.value() ?? []).find((section) => section.key === 'taxTreatment')
          ?.options ?? [],
    ),
  })),
  withMethods((store) => {
    const institutionCardMasterApi = inject(InstitutionCardMasterApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: string, isUpdatingStatus: boolean) =>
      patchState(store, {
        cardMasters: store
          .cardMasters()
          .map((row) => (row.id === id ? { ...row, isUpdatingStatus } : row)),
      });

    const setDeleting = (id: string, isDeleting: boolean) =>
      patchState(store, {
        cardMasters: store
          .cardMasters()
          .map((row) => (row.id === id ? { ...row, isDeleting } : row)),
      });

    return {
      reloadCardMasters(): void {
        store.cardMastersResource.reload();
      },

      /** `null` is the "Any" option. */
      setInstitutionId(institutionId: string | null): void {
        patchState(store, { institutionId: institutionId ?? null, pageNumber: 1 });
      },

      setCardStatus(cardStatus: string | null): void {
        patchState(store, { cardStatus: cardStatus ?? null, pageNumber: 1 });
      },

      setIsActive(isActive: boolean | null): void {
        patchState(store, { isActive: isActive ?? null, pageNumber: 1 });
      },

      setSearch(search: SettledSearchTerm): void {
        patchState(store, { search, pageNumber: 1 });
      },

      loadPage(event: TableLazyLoadEvent): void {
        const { page, rows } = commonService.getPaginationParam(event);
        patchState(store, { pageNumber: page, pageSize: rows });
      },

      /**
       * The page is refetched because a row that stops matching the status filter changes both the
       * page contents and the total.
       */
      toggleActive(row: InstitutionCardMasterRow): void {
        const isActive = !row.isActive;
        setUpdatingStatus(row.id, true);

        // The institution comes off the row, not the filter — under "Any institution" the filter is null.
        institutionCardMasterApi
          .setInstitutionCardMasterStatus({ id: row.id, isActive, institutionId: row.institutionId })
          .pipe(
            finalize(() => setUpdatingStatus(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.cardMastersResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /** The row leaves the list, so both the page and the total come back from the server. */
      deleteCardMaster(row: InstitutionCardMasterRow): void {
        setDeleting(row.id, true);

        institutionCardMasterApi
          .deleteInstitutionCardMaster(row.id, row.institutionId)
          .pipe(
            finalize(() => setDeleting(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.cardMastersResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);
