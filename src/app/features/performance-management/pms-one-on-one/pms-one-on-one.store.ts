import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { finalize } from 'rxjs';

import { Common, PerformanceManagementApi } from '@core/services';
import { OneOnOne } from '@shared/interfaces';

interface OneOnOneState {
  meetings: OneOnOne[];
  isLoading: boolean;
  selectedId: string | null;
}

const initialState: OneOnOneState = {
  meetings: [],
  isLoading: false,
  selectedId: null,
};

export const PmsOneOnOneStore = signalStore(
  withState(initialState),
  withComputed(({ meetings, selectedId }) => ({
    selectedMeeting: computed<OneOnOne | null>(
      () => meetings().find((m) => m.id === selectedId()) ?? meetings()[0] ?? null,
    ),
    upcomingCount: computed(() => meetings().filter((m) => !!m.nextMeetingAt).length),
  })),
  withMethods((store) => {
    const api = inject(PerformanceManagementApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      loadMeetings(): void {
        patchState(store, { isLoading: true, meetings: [] });
        api
          .getMeetings()
          .pipe(
            takeUntilDestroyed(destroyRef),
            finalize(() => patchState(store, { isLoading: false })),
          )
          .subscribe({
            next: (res) => {
              patchState(store, {
                meetings: res.isSucceeded ? res.data : [],
                selectedId: res.isSucceeded ? (res.data[0]?.id ?? null) : null,
              });
              if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      select(id: string): void {
        patchState(store, { selectedId: id });
      },

      saveMeeting(meeting: OneOnOne): void {
        const exists = store.meetings().some((m) => m.id === meeting.id);
        api
          .saveMeeting(meeting)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, {
                  meetings: exists
                    ? store.meetings().map((m) => (m.id === meeting.id ? res.data : m))
                    : [res.data, ...store.meetings()],
                  selectedId: res.data.id,
                });
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      toggleActionItem(meetingId: string, itemId: string): void {
        patchState(store, {
          meetings: store.meetings().map((m) =>
            m.id === meetingId
              ? {
                  ...m,
                  actionItems: m.actionItems.map((a) =>
                    a.id === itemId ? { ...a, done: !a.done } : a,
                  ),
                }
              : m,
          ),
        });
      },
    };
  }),
);
