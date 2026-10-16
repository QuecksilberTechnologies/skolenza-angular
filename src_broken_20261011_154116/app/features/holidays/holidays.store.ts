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
import { catchError, finalize, map, of } from 'rxjs';

import { Common, HolidayCalandarApi, InstitutionLocationApi } from '@core/services';
import {
  GetHolidaysReq,
  Holiday,
  HolidayCalendarStyle,
  HolidayTypeStyles,
  MANDATORY_HOLIDAY_CODE,
  OPTIONAL_HOLIDAY_CODE,
  InstitutionLocationRow,
} from '@shared/interfaces';
import { localDateKey, toDateKey } from '@shared/utilities/date-key';
import { downloadBlob } from '@shared/utilities/download-blob';

/** One page big enough to hold every location — this feeds a name lookup, not a grid. */
const LOOKUP_PAGE_SIZE = 500;

interface HolidaysState {
  holidays: Holiday[];
  isLoading: boolean;
}

const initialState: HolidaysState = {
  holidays: [],
  isLoading: false,
};

export const HolidaysStore = signalStore(
  withState(initialState),
  withProps(() => {
    const institutionLocationApi = inject(InstitutionLocationApi);
    const holidayCalandarApi = inject(HolidayCalandarApi);

    return {
      /** Every institution location, inactive included, so a holiday on a retired location still resolves. */
      locationsResource: rxResource({
        stream: () =>
          institutionLocationApi.getInstitutionLocations({ PageSize: LOOKUP_PAGE_SIZE }).pipe(
            map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
            catchError(() => of([] as InstitutionLocationRow[])),
          ),
      }),
      /** Shared calendar palette. Empty on failure, so badges keep their built-in tones. */
      displayConstantsResource: rxResource({
        stream: () =>
          holidayCalandarApi.getCalendarDisplayConstants().pipe(
            map((res) => (res.isSucceeded ? (res.data?.styles ?? []) : [])),
            catchError(() => of([] as HolidayCalendarStyle[])),
          ),
      }),
    };
  }),
  withComputed(({ holidays, locationsResource, displayConstantsResource }) => {
    const locationNames = computed(
      () => new Map((locationsResource.value() ?? []).map((l) => [l.id, l.locationName])),
    );

    const styleFor = (code: string) =>
      (displayConstantsResource.value() ?? []).find((s) => s.statusCode === code) ?? null;

    return {
      /** API palette for the Mandatory/Optional badges; `null` falls back to the badge's own tone. */
      holidayTypeStyles: computed<HolidayTypeStyles>(() => ({
        mandatory: styleFor(MANDATORY_HOLIDAY_CODE),
        optional: styleFor(OPTIONAL_HOLIDAY_CODE),
      })),
      /** `GET /get` sends only `institutionLocationId`; resolve the display name client-side. */
      holidayRows: computed(() =>
        holidays().map((h) => ({
          ...h,
          locationName: h.locationName ?? locationNames().get(h.institutionLocationId) ?? null,
        })),
      ),
      /** `today` is read inside the computed so each (re)load re-checks against the current day. */
      todayHoliday: computed(() => {
        const today = localDateKey();
        return holidays().find((h) => toDateKey(h.holidayDate) === today) ?? null;
      }),
    };
  }),
  withMethods((store) => {
    const holidayCalandarApi = inject(HolidayCalandarApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      /** `GET /get` only ever lists active holidays for the current institution. */
      loadHolidays(req: GetHolidaysReq = {}): void {
        patchState(store, { isLoading: true, holidays: [] });

        holidayCalandarApi
          .getHolidays(req)
          .pipe(
            takeUntilDestroyed(destroyRef),
            finalize(() => patchState(store, { isLoading: false })),
          )
          .subscribe({
            next: (res) => {
              patchState(store, { holidays: res.isSucceeded ? res.data : [] });
              if (!res.isSucceeded) {
                commonService.showMessage(res.message, 'error');
              }
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
            },
          });
      },

      /** UTF-8 CSV of active institution holidays, downloaded straight from the response blob. */
      exportHolidays(req: GetHolidaysReq = {}): void {
        holidayCalandarApi
          .exportHolidays(req)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (blob) => downloadBlob(blob, `Holidays-${req.HolidayYear ?? 'all'}.csv`),
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /** Soft-delete. The row disappears from the (active-only) list on success. */
      deleteHoliday(id: number): void {
        holidayCalandarApi
          .deleteHoliday(id)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, { holidays: store.holidays().filter((h) => h.id !== id) });
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
            },
          });
      },
    };
  }),
);
