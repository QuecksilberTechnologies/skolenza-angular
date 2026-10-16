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

import { Common, InstitutionsApi } from '@core/services';
import { IInstitution, SettledSearchTerm } from '@shared/interfaces';

interface InstitutionsState {
  institutions: IInstitution[];
  /** Sent to the API as `IsActive` / `IsVerified`; `null` is dropped from the query and means All. */
  statusFilter: boolean | null;
  verifiedFilter: boolean | null;
  /** Already debounced and whitespace-normalised by `TableSearchInput`. */
  search: string;
  /** Institutions whose verification email is still on the wire. Kept off the rows so a refetch, which
   *  replaces the whole array with server data, cannot lose it. */
  sendingVerificationIds: string[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
}

const initialState: InstitutionsState = {
  institutions: [],
  statusFilter: null,
  verifiedFilter: null,
  search: '',
  sendingVerificationIds: [],
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
};

export const InstitutionsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const institutionsApi = inject(InstitutionsApi);
    const commonService = inject(Common);

    const institutionsResource = rxResource({
      params: () => ({
        IsActive: store.statusFilter(),
        IsVerified: store.verifiedFilter(),
        SearchKeyword: store.search(),
        PageNumber: store.pageNumber(),
        PageSize: store.pageSize(),
      }),
      stream: ({ params }) =>
        institutionsApi.getInstitutions(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              institutions: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? 0) : 0,
            });
          }),
          map((res) => res.data ?? []),
          // `handleError` rethrows, so without this a failed refetch keeps rows that no longer
          // match the selected filter.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { institutions: [], totalRecords: 0 });
            return of([] as IInstitution[]);
          }),
        ),
    });

    return { institutionsResource };
  }),
  withComputed(({ institutionsResource, sendingVerificationIds }) => ({
    isLoading: computed(() => institutionsResource.isLoading()),
    sendingVerification: computed(() => new Set(sendingVerificationIds())),
  })),
  withMethods((store) => {
    const institutionsApi = inject(InstitutionsApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinners on the action menu. */
    const patchRow = (id: string, changes: Partial<IInstitution>) =>
      patchState(store, {
        institutions: store.institutions().map((t) => (t.id === id ? { ...t, ...changes } : t)),
      });

    return {
      reloadInstitutions(): void {
        store.institutionsResource.reload();
      },

      /** A different filter invalidates the page the grid is on. */
      setStatusFilter(status: boolean | null): void {
        patchState(store, { statusFilter: status, pageNumber: 1 });
      },

      setVerifiedFilter(verified: boolean | null): void {
        patchState(store, { verifiedFilter: verified, pageNumber: 1 });
      },

      setSearch(search: SettledSearchTerm): void {
        patchState(store, { search, pageNumber: 1 });
      },

      loadPage(event: TableLazyLoadEvent): void {
        const { page, rows } = commonService.getPaginationParam(event);
        patchState(store, { pageNumber: page, pageSize: rows });
      },

      /** The row leaves the list, so both the page and the total come back from the server. */
      deleteInstitution(institution: IInstitution): void {
        patchRow(institution.id, { isDeleting: true });

        institutionsApi
          .deleteInstitution({ institutionId: institution.id })
          .pipe(
            finalize(() => patchRow(institution.id, { isDeleting: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.institutionsResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /** `IsActive` is a server-side filter, so a locally patched row would linger in a list it no
       *  longer belongs to — reload instead. */
      toggleActive(institution: IInstitution): void {
        const isActive = !institution.isActive;
        patchRow(institution.id, { isUpdatingStatus: true });

        const request$ = isActive
          ? institutionsApi.activateInstitution({ institutionId: institution.id })
          : institutionsApi.deactivateInstitution({ institutionId: institution.id });

        request$
          .pipe(
            finalize(() => patchRow(institution.id, { isUpdatingStatus: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.institutionsResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /** `isVerified` flips when the institution opens the link, not when the mail leaves, so the row
       *  stays as it is.
       *
       *  The in-flight marker deliberately lives beside the list rather than on the row: a search
       *  keystroke or a status toggle refetches, and fresh server rows carry no client flag, which
       *  would clear the spinner and re-arm the menu item under a mail that is still on its way. */
      sendVerificationEmail(institution: IInstitution): void {
        if (store.sendingVerificationIds().includes(institution.id)) return;

        patchState(store, {
          sendingVerificationIds: [...store.sendingVerificationIds(), institution.id],
        });

        institutionsApi
          .resendVerificationEmail(institution.id)
          .pipe(
            finalize(() =>
              patchState(store, {
                sendingVerificationIds: store
                  .sendingVerificationIds()
                  .filter((id) => id !== institution.id),
              }),
            ),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) =>
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error'),
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /** The sync writes entitlement rows, not anything the list renders or filters on, so the
       *  row needs no refresh - only the toast. */
      syncPlanEntitlements(institution: IInstitution): void {
        patchRow(institution.id, { isSyncingEntitlements: true });

        institutionsApi
          .syncActivePlanEntitlements({ institutionId: institution.id })
          .pipe(
            finalize(() => patchRow(institution.id, { isSyncingEntitlements: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) =>
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error'),
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);
