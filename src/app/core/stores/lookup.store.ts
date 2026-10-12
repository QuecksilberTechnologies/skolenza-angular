import { computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { catchError, map, of } from 'rxjs';

import { Common } from '@core/services/common';
import { DepartmentsApi } from '@core/services/departments-api';
import { EnumApi } from '@core/services/enum-api';
import { LocationsApi } from '@core/services/locations-api';
import { StaffCategoriesAPI } from '@core/services/staff-categories-api';
import { StaffEmploymentTypesAPI } from '@core/services/staff-employment-types-api';
import { StaffMemberContactsAPI } from '@core/services/staff-member-contacts-api';
import { UsersApi } from '@core/services/users-api';
import {
  Country,
  CurrencyOption,
  Department,
  District,
  StaffEmploymentType,
  StaffCategory,
  IGender,
  Locality,
  Relation,
  State,
} from '@shared/interfaces';

export const LookupStore = signalStore(
  { providedIn: 'root' },
  withProps(() => {
    const commonService = inject(Common);
    const locationsApi = inject(LocationsApi);
    const usersApi = inject(UsersApi);
    const staffMemberContactsApi = inject(StaffMemberContactsAPI);
    const staffEmploymentTypesApi = inject(StaffEmploymentTypesAPI);
    const staffCategoriesApi = inject(StaffCategoriesAPI);
    const departmentsApi = inject(DepartmentsApi);
    const enumApi = inject(EnumApi);
    const staffMemberId = signal<string | undefined>(undefined);
    const statesCountryId = signal<number | undefined>(undefined);
    const districtsStateId = signal<number | undefined>(undefined);
    const localitiesDistrictId = signal<number | undefined>(undefined);
    /**
     * Countries and genders are global reference data, not institution-scoped, so they share their own
     * gate: a host has no staffMember context and `layout.ts` never calls `initialize()` for one, yet
     * the host Institutions list and institution form both read countries and genders. Keeping this separate
     * from `staffMemberId` means loading them never drags in the institution-scoped lookups below — and,
     * because it is still `undefined` until asked, no request fires before the caller decides.
     */
    const globalOptionsStaffMemberId = signal<string | undefined>(undefined);

    const countriesResource = rxResource({
      params: () => {
        const id = globalOptionsStaffMemberId();
        return id !== undefined ? { staffMemberId: id } : undefined;
      },
      stream: ({ params }) =>
        locationsApi
          .getCountries({
            UserStaffMemberId: params.staffMemberId || '0',
            TodaysDate: new Date().toISOString(),
          })
          .pipe(
            map((res) => {
              if (!res.isSucceeded) {
                commonService.showMessage(res.message, 'error');
              }
              return res.isSucceeded ? res.data : [];
            }),
            catchError(() => of([] as Country[])),
          ),
    });

    const gendersResource = rxResource({
      params: () => {
        const id = globalOptionsStaffMemberId();
        return id !== undefined ? { staffMemberId: id } : undefined;
      },
      stream: ({ params }) =>
        usersApi
          .getGenderOptions({
            // A host has no staffMember context; the endpoint answers fine with the param absent,
            // and `makeHttpParams` drops an empty string from the query.
            UserStaffMemberId: params.staffMemberId,
            TodaysDate: new Date().toISOString(),
          })
          .pipe(
            map((res) => {
              if (!res.isSucceeded) {
                commonService.showMessage(res.message, 'error');
              }
              return res.isSucceeded ? res.data : [];
            }),
            catchError(() => of([] as IGender[])),
          ),
    });

    /**
     * The currency master behind `Institution.defaultCurrency`. Global reference data like countries and
     * genders, so it shares their gate — and unlike them it answers with a bare array, so there is
     * no envelope to unwrap.
     */
    const currenciesResource = rxResource({
      params: () => (globalOptionsStaffMemberId() !== undefined ? {} : undefined),
      stream: () =>
        enumApi.getAllCurrencies().pipe(
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            return of([] as CurrencyOption[]);
          }),
        ),
    });

    /** Authenticated enum-backed contact relations have no ModuleId/OperationId.
     * Load them for StaffMember screens, not the unrelated Host-only country form. */
    const contactRelationsResource = rxResource({
      params: () => {
        const id = globalOptionsStaffMemberId();
        return id && id !== '0' ? {} : undefined;
      },
      stream: () =>
        staffMemberContactsApi.getRelationOptions().pipe(
          map((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            return res.isSucceeded ? res.data : [];
          }),
          catchError(() => of([] as Relation[])),
        ),
    });

    const staffEmploymentTypesResource = rxResource({
      params: () => {
        const id = staffMemberId();
        return id !== undefined ? { staffMemberId: id } : undefined;
      },
      stream: ({ params }) =>
        staffEmploymentTypesApi
          .getStaffEmploymentTypeOptions({
            UserStaffMemberId: params.staffMemberId || '0',
            TodaysDate: new Date().toISOString(),
          })
          .pipe(
            map((res) => {
              if (!res.isSucceeded) {
                commonService.showMessage(res.message, 'error');
              }
              return res.isSucceeded ? res.data : [];
            }),
            catchError(() => of([] as StaffEmploymentType[])),
          ),
    });

    const staffCategoriesResource = rxResource({
      params: () => (staffMemberId() !== undefined ? {} : undefined),
      stream: () =>
        staffCategoriesApi.getOptions().pipe(
          map((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            return res.isSucceeded ? res.data : [];
          }),
          catchError(() => of([] as StaffCategory[])),
        ),
    });

    const departmentOptionsResource = rxResource({
      params: () => {
        const id = staffMemberId();
        return id !== undefined ? { staffMemberId: id } : undefined;
      },
      stream: ({ params }) =>
        departmentsApi
          .getDepartmentsOptions({
            UserStaffMemberId: params.staffMemberId || '0',
          })
          .pipe(
            map((res) => {
              if (!res.isSucceeded) {
                commonService.showMessage(res.message, 'error');
              }
              return res.isSucceeded ? res.data : [];
            }),
            catchError(() => of([] as Department[])),
          ),
    });

    /**
     * States, districts and localities sit on the same `/Location` controller as countries and are
     * just as global, so they share the `globalOptionsStaffMemberId` gate rather than the institution-scoped
     * one — the host institution form collects a head-office address and has no staffMember context to gate
     * on.
     * `initialize()` sets both signals, so a institution session is unaffected.
     */
    const statesResource = rxResource({
      params: () => {
        const id = globalOptionsStaffMemberId();
        const countryId = statesCountryId();
        return id !== undefined && countryId !== undefined
          ? { staffMemberId: id, countryId }
          : undefined;
      },
      stream: ({ params }) =>
        locationsApi
          .getStates({
            UserStaffMemberId: params.staffMemberId || '0',
            CountryId: params.countryId || 0,
            TodaysDate: new Date().toISOString(),
          })
          .pipe(
            map((res) => {
              if (!res.isSucceeded) {
                commonService.showMessage(res.message, 'error');
              }
              return res.isSucceeded ? res.data : [];
            }),
            catchError(() => of([] as State[])),
          ),
    });

    /** The level below a state. */
    const districtsResource = rxResource({
      params: () => {
        const id = globalOptionsStaffMemberId();
        const stateId = districtsStateId();
        return id !== undefined && stateId !== undefined
          ? { staffMemberId: id, stateId }
          : undefined;
      },
      stream: ({ params }) =>
        locationsApi
          .getDistricts({
            UserStaffMemberId: params.staffMemberId || '0',
            StateId: params.stateId || 0,
            TodaysDate: new Date().toISOString(),
          })
          .pipe(
            map((res) => {
              if (!res.isSucceeded) {
                commonService.showMessage(res.message, 'error');
              }
              return res.isSucceeded ? res.data : [];
            }),
            catchError(() => of([] as District[])),
          ),
    });

    /** Cities, towns and villages inside a district — the level below `districtsResource`. */
    const localitiesResource = rxResource({
      params: () => {
        const id = globalOptionsStaffMemberId();
        const districtId = localitiesDistrictId();
        return id !== undefined && districtId !== undefined
          ? { staffMemberId: id, districtId }
          : undefined;
      },
      stream: ({ params }) =>
        locationsApi
          .getLocalities({
            UserStaffMemberId: params.staffMemberId || '0',
            DistrictId: params.districtId || 0,
            TodaysDate: new Date().toISOString(),
          })
          .pipe(
            map((res) => {
              if (!res.isSucceeded) {
                commonService.showMessage(res.message, 'error');
              }
              return res.isSucceeded ? res.data : [];
            }),
            catchError(() => of([] as Locality[])),
          ),
    });

    return {
      staffMemberId,
      globalOptionsStaffMemberId,
      statesCountryId,
      districtsStateId,
      localitiesDistrictId,
      countriesResource,
      gendersResource,
      currenciesResource,
      contactRelationsResource,
      staffEmploymentTypesResource,
      staffCategoriesResource,
      departmentOptionsResource,
      statesResource,
      districtsResource,
      localitiesResource,
    };
  }),
  withComputed(
    ({
      countriesResource,
      gendersResource,
      currenciesResource,
      contactRelationsResource,
      staffEmploymentTypesResource,
      staffCategoriesResource,
      departmentOptionsResource,
      statesResource,
      districtsResource,
      localitiesResource,
    }) => ({
      countries: computed<Country[]>(() => countriesResource.value() ?? []),
      isLoadingCountries: computed(() => countriesResource.isLoading()),

      genders: computed<IGender[]>(() => gendersResource.value() ?? []),
      isLoadingGenders: computed(() => gendersResource.isLoading()),

      currencies: computed<CurrencyOption[]>(() => currenciesResource.value() ?? []),
      isLoadingCurrencies: computed(() => currenciesResource.isLoading()),

      relations: computed<Relation[]>(() => contactRelationsResource.value() ?? []),
      isLoadingRelations: computed(() => contactRelationsResource.isLoading()),

      staffEmploymentTypes: computed<StaffEmploymentType[]>(
        () => staffEmploymentTypesResource.value() ?? [],
      ),
      isLoadingStaffEmploymentTypes: computed(() => staffEmploymentTypesResource.isLoading()),

      staffCategories: computed<StaffCategory[]>(() => staffCategoriesResource.value() ?? []),
      isLoadingStaffCategories: computed(() => staffCategoriesResource.isLoading()),

      departmentOptions: computed<Department[]>(() => departmentOptionsResource.value() ?? []),
      isLoadingDepartmentOptions: computed(() => departmentOptionsResource.isLoading()),

      states: computed<State[]>(() => statesResource.value() ?? []),
      isLoadingStates: computed(() => statesResource.isLoading()),

      districts: computed<District[]>(() => districtsResource.value() ?? []),
      isLoadingDistricts: computed(() => districtsResource.isLoading()),

      localities: computed<Locality[]>(() => localitiesResource.value() ?? []),
      isLoadingLocalities: computed(() => localitiesResource.isLoading()),
    }),
  ),
  withMethods((store) => {
    return {
      initialize(userStaffMemberId?: string): void {
        store.staffMemberId.set(userStaffMemberId ?? '0');
        store.globalOptionsStaffMemberId.set(userStaffMemberId ?? '0');
      },
      /** Countries, genders and currencies — for a host, who must not trigger the institution-scoped
       *  lookups. */
      initializeGlobalOptions(userStaffMemberId?: string): void {
        store.globalOptionsStaffMemberId.set(userStaffMemberId ?? '');
      },
      reloadDepartmentOptions(): void {
        store.departmentOptionsResource.reload();
      },
      reloadStaffEmploymentTypes(): void {
        store.staffEmploymentTypesResource.reload();
      },
      loadStates(countryId: number | undefined): void {
        store.statesCountryId.set(countryId);
      },
      /** Districts hang off a state. */
      loadDistricts(stateId: number | undefined): void {
        store.districtsStateId.set(stateId);
      },
      loadLocalities(districtId: number | undefined): void {
        store.localitiesDistrictId.set(districtId);
      },
    };
  }),
);
