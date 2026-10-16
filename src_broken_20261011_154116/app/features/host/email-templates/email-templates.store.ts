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
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';

import { Common } from '@core/services';
import { EmailTemplateMutationRes, EmailTemplateRow, SettledSearchTerm } from '@shared/interfaces';

import { EMAIL_TEMPLATE_SCOPE } from './email-template-scope';

interface EmailTemplatesState {
  emailTemplates: EmailTemplateRow[];
  /** Already debounced and whitespace-normalised by `TableSearchInput`. */
  search: string;
  /** Server-side. `null` is the "All" option — the endpoint takes it as a nullable filter. */
  isActive: boolean | null;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  isSyncing: boolean;
}

const initialState: EmailTemplatesState = {
  emailTemplates: [],
  search: '',
  isActive: null,
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
  isSyncing: false,
};

export const EmailTemplatesStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const emailTemplateApi = inject(EMAIL_TEMPLATE_SCOPE).api;
    const commonService = inject(Common);

    const emailTemplatesResource = rxResource({
      params: () => ({
        Search: store.search(),
        IsActive: store.isActive(),
        PageNumber: store.pageNumber(),
        PageSize: store.pageSize(),
      }),
      stream: ({ params }) =>
        emailTemplateApi.getEmailTemplates(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              emailTemplates: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? 0) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { emailTemplates: [], totalRecords: 0 });
            return of([] as EmailTemplateRow[]);
          }),
        ),
    });

    return { emailTemplatesResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.emailTemplatesResource.isLoading()),
  })),
  withMethods((store) => {
    const scope = inject(EMAIL_TEMPLATE_SCOPE);
    const emailTemplateApi = scope.api;
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Sets one of the per-row busy flags that drive the spinners in the Actions cell. */
    const setRowFlag = (id: number, flag: 'isUpdatingStatus' | 'isDeleting', value: boolean) =>
      patchState(store, {
        emailTemplates: store
          .emailTemplates()
          .map((row) => (row.id === id ? { ...row, [flag]: value } : row)),
      });

    /**
     * The shape both row mutations share: raise the row's spinner, run the call, report, and on
     * success refetch rather than patch. Refetching is the point - a row that stops matching the
     * status filter, or leaves entirely, changes both the page contents and the total.
     */
    const mutateRow = (
      row: EmailTemplateRow,
      flag: 'isUpdatingStatus' | 'isDeleting',
      call$: Observable<EmailTemplateMutationRes>,
    ): void => {
      setRowFlag(row.id, flag, true);

      call$
        .pipe(
          finalize(() => setRowFlag(row.id, flag, false)),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              store.emailTemplatesResource.reload();
            }
            commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          },
          error: (err) => commonService.showMessage(err.message, 'error'),
        });
    };

    return {
      reloadEmailTemplates(): void {
        store.emailTemplatesResource.reload();
      },

      setSearch(search: SettledSearchTerm): void {
        patchState(store, { search, pageNumber: 1 });
      },

      /** `null` is the "All" option. A different filter invalidates the page the grid is on. */
      setIsActive(isActive: boolean | null): void {
        patchState(store, { isActive: isActive ?? null, pageNumber: 1 });
      },

      loadPage(event: TableLazyLoadEvent): void {
        const { page, rows } = commonService.getPaginationParam(event);
        patchState(store, { pageNumber: page, pageSize: rows });
      },

      toggleActive(row: EmailTemplateRow): void {
        mutateRow(
          row,
          'isUpdatingStatus',
          emailTemplateApi.setEmailTemplateStatus({ id: row.id, isActive: !row.isActive }),
        );
      },

      deleteEmailTemplate(row: EmailTemplateRow): void {
        mutateRow(row, 'isDeleting', emailTemplateApi.deleteEmailTemplate(row.id));
      },

      /** Pulls in the defaults the catalog is missing. A no-op where the scope has no `sync`. */
      syncEmailTemplates(): void {
        if (!scope.sync || store.isSyncing()) {
          return;
        }
        patchState(store, { isSyncing: true });

        scope
          .sync()
          .pipe(
            finalize(() => patchState(store, { isSyncing: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.emailTemplatesResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);
