import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { finalize } from 'rxjs';

import { Common, PerformanceManagementApi } from '@core/services';
import { HistoryEvent, HistoryEventType } from '@shared/interfaces';

interface HistoryState {
  events: HistoryEvent[];
  isLoading: boolean;
  staffMemberFilter: string | null;
  typeFilter: HistoryEventType | null;
}

const initialState: HistoryState = {
  events: [],
  isLoading: false,
  staffMemberFilter: null,
  typeFilter: null,
};

export const PmsHistoryStore = signalStore(
  withState(initialState),
  withComputed(({ events, staffMemberFilter, typeFilter }) => ({
    filteredEvents: computed(() => {
      const emp = staffMemberFilter();
      const type = typeFilter();
      return events()
        .filter((e) => (emp ? e.staffMemberId === emp : true))
        .filter((e) => (type ? e.type === type : true))
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date));
    }),
    staffMembers: computed(() => {
      const map = new Map<string, string>();
      events().forEach((e) => map.set(e.staffMemberId, e.staffMemberName));
      return Array.from(map, ([value, label]) => ({ label, value }));
    }),
  })),
  withMethods((store) => {
    const api = inject(PerformanceManagementApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      loadHistory(): void {
        patchState(store, { isLoading: true, events: [] });
        api
          .getHistory()
          .pipe(
            takeUntilDestroyed(destroyRef),
            finalize(() => patchState(store, { isLoading: false })),
          )
          .subscribe({
            next: (res) => {
              patchState(store, { events: res.isSucceeded ? res.data : [] });
              if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      setStaffMemberFilter(id: string | null): void {
        patchState(store, { staffMemberFilter: id });
      },

      setTypeFilter(type: HistoryEventType | null): void {
        patchState(store, { typeFilter: type });
      },
    };
  }),
);
