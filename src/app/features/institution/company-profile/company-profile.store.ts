import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { catchError, from, map, Observable, of } from 'rxjs';

import { Common, DepartmentsApi, CampusApi } from '@core/services';
import { Department, CampusRow } from '@shared/interfaces';

/** One un-paged read: a company's sites and departments are a short list, not a grid. */
const PAGE_SIZE = 200;

/** A section that fails must say so on its own, never blank the sections that loaded. */
interface SectionResult<T> {
  rows: T[];
  errorMessage: string;
}

const readSection = <T>(
  source: Observable<{ isSucceeded: boolean; message: string; data: T[] | null }>,
): Observable<SectionResult<T>> =>
  source.pipe(
    map((res) => ({
      rows: res.isSucceeded ? (res.data ?? []) : [],
      errorMessage: res.isSucceeded ? '' : res.message,
    })),
    // `BaseService.handleError` rethrows, so an unguarded stream would leave the section stuck.
    catchError((err: Error) => of({ rows: [] as T[], errorMessage: err.message })),
  );

/**
 * The signed-in company, from what a institution token may read.
 *
 * `GET /Institution/get-institution-by-id` is not among those - the backend answers a institution token with
 * `401 "A valid Host user token is required."`, and the 401 signs the user out. There is no
 * institution-scoped company read yet, so the name comes from the session and the sites and departments
 * from their own institution-scoped controllers.
 */
export const CompanyProfileStore = signalStore(
  withProps(() => {
    const commonService = inject(Common);
    const campusApi = inject(CampusApi);
    const departmentsApi = inject(DepartmentsApi);

    const sessionResource = rxResource({
      stream: () => from(commonService.getLoginInfo()),
    });

    /**
     * Both reads wait on a institution session: a host token gets `401 "Inactive user."` from these
     * controllers, and that 401 would sign the host out of a page it should not have reached.
     * `ModuleId` / `OperationId` are `moduleOperationInterceptor`'s job.
     */
    const locationsResource = rxResource({
      params: () => (sessionResource.value()?.user ? true : undefined),
      stream: () =>
        readSection(
          campusApi.getCampuses({
            PageNumber: 1,
            PageSize: PAGE_SIZE,
          }),
        ),
    });

    const departmentsResource = rxResource({
      params: () => sessionResource.value()?.user?.staffMemberId,
      stream: ({ params: userStaffMemberId }) =>
        readSection<Department>(
          departmentsApi.getDepartments({
            PageNumber: 1,
            PageSize: PAGE_SIZE,
            UserStaffMemberId: userStaffMemberId,
          }),
        ),
    });

    return { sessionResource, locationsResource, departmentsResource };
  }),
  withComputed((store) => ({
    /** `null` while the session is being read and for a host session, which has no `user`. */
    session: computed(() => store.sessionResource.value()?.user ?? null),
    isSessionLoading: computed(() => {
      const status = store.sessionResource.status();
      return status === 'idle' || status === 'loading';
    }),
    locations: computed<CampusRow[]>(() => store.locationsResource.value()?.rows ?? []),
    locationsError: computed(() => store.locationsResource.value()?.errorMessage ?? ''),
    isLoadingLocations: computed(() => store.locationsResource.isLoading()),
    departments: computed<Department[]>(() => store.departmentsResource.value()?.rows ?? []),
    departmentsError: computed(() => store.departmentsResource.value()?.errorMessage ?? ''),
    isLoadingDepartments: computed(() => store.departmentsResource.isLoading()),
  })),
  withMethods((store) => ({
    reloadLocations(): void {
      store.locationsResource.reload();
    },
    reloadDepartments(): void {
      store.departmentsResource.reload();
    },
  })),
);
