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

import { Common, DeviceDdlOptionsApi, StaffMemberDeviceEnrollmentApi } from '@core/services';
import {
  DeviceDdlOptionSection,
  StaffMemberDeviceEnrollmentRow,
  SettledSearchTerm,
} from '@shared/interfaces';

interface StaffMemberDeviceEnrollmentsState {
  /** The 8-character staffMember code the app holds; empty means "All staffMembers". */
  staffMemberId: string;
  /** Server-side. `null` is the "All" option. */
  institutionLocationId: number | null;
  isActive: boolean | null;
  /** Already debounced and whitespace-normalised by `TableSearchInput`. */
  search: string;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  enrollments: StaffMemberDeviceEnrollmentRow[];
}

const initialState: StaffMemberDeviceEnrollmentsState = {
  staffMemberId: '',
  institutionLocationId: null,
  isActive: null,
  search: '',
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
  enrollments: [],
};

export const StaffMemberDeviceEnrollmentsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const staffMemberDeviceEnrollmentApi = inject(StaffMemberDeviceEnrollmentApi);
    const deviceDdlOptionsApi = inject(DeviceDdlOptionsApi);
    const commonService = inject(Common);

    const enrollmentsResource = rxResource({
      params: () => ({
        Search: store.search() || null,
        StaffMemberId: store.staffMemberId() || null,
        InstitutionLocationId: store.institutionLocationId(),
        IsActive: store.isActive(),
        PageNumber: store.pageNumber(),
        PageSize: store.pageSize(),
      }),
      stream: ({ params }) =>
        staffMemberDeviceEnrollmentApi.getStaffMemberDeviceEnrollments(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              enrollments: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data?.length ?? 0) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { enrollments: [], totalRecords: 0 });
            return of([] as StaffMemberDeviceEnrollmentRow[]);
          }),
        ),
    });

    /**
     * `credentialType` on `credential/remove` is an unnamed backend enum, so the number is read
     * from the ddl rather than hardcoded. An empty list means the app cannot name the card type
     * and the unbind action stays hidden - guessing `1` would remove whichever credential the
     * backend happens to number first.
     */
    const credentialTypesResource = rxResource({
      stream: () =>
        deviceDdlOptionsApi.getStaffMemberDeviceCredentials().pipe(
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError(() => of([] as DeviceDdlOptionSection[])),
        ),
    });

    return { enrollmentsResource, credentialTypesResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.enrollmentsResource.isLoading()),
    /** Bound to the table so its paginator follows the store when a filter resets the page. */
    first: computed(() => (store.pageNumber() - 1) * store.pageSize()),
    cardCredentialType: computed(() => {
      const option = (store.credentialTypesResource.value() ?? [])
        .flatMap((section) => section.options)
        .find((candidate) => candidate.label.trim().toLowerCase() === 'card');

      return option ? Number(option.value) : null;
    }),
  })),
  withMethods((store) => {
    const staffMemberDeviceEnrollmentApi = inject(StaffMemberDeviceEnrollmentApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: string, isUpdatingStatus: boolean) =>
      patchState(store, {
        enrollments: store
          .enrollments()
          .map((row) => (row.id === id ? { ...row, isUpdatingStatus } : row)),
      });

    const setDeleting = (id: string, isDeleting: boolean) =>
      patchState(store, {
        enrollments: store
          .enrollments()
          .map((row) => (row.id === id ? { ...row, isDeleting } : row)),
      });

    return {
      setStaffMemberId(staffMemberId: string): void {
        patchState(store, { staffMemberId, pageNumber: 1 });
      },

      setInstitutionLocationId(institutionLocationId: number | null): void {
        patchState(store, { institutionLocationId: institutionLocationId ?? null, pageNumber: 1 });
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

      reloadEnrollments(): void {
        store.enrollmentsResource.reload();
      },

      toggleActive(row: StaffMemberDeviceEnrollmentRow): void {
        setUpdatingStatus(row.id, true);

        staffMemberDeviceEnrollmentApi
          .setStaffMemberDeviceEnrollmentStatus({ id: row.id, isActive: !row.isActive })
          .pipe(
            finalize(() => setUpdatingStatus(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.enrollmentsResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /** Unbinds the card credential. The enrollment and its other credentials survive. */
      unbindCard(row: StaffMemberDeviceEnrollmentRow): void {
        const credentialType = store.cardCredentialType();
        if (credentialType === null) {
          return;
        }

        staffMemberDeviceEnrollmentApi
          .removeStaffMemberDeviceCredential({ enrollmentId: row.id, credentialType })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.enrollmentsResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      deleteEnrollment(row: StaffMemberDeviceEnrollmentRow): void {
        setDeleting(row.id, true);

        staffMemberDeviceEnrollmentApi
          .deleteStaffMemberDeviceEnrollment(row.id)
          .pipe(
            finalize(() => setDeleting(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                // Removing a page's only row would reload an empty page past the end.
                if (store.enrollments().length === 1 && store.pageNumber() > 1) {
                  patchState(store, { pageNumber: store.pageNumber() - 1 });
                } else {
                  store.enrollmentsResource.reload();
                }
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);
