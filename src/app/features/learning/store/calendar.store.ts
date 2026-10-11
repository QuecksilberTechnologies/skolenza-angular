import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { map, tap } from 'rxjs';

import { Common, LearningApi } from '@core/services';
import { EventType, LearningEvent } from '@shared/interfaces';

const TYPE_ORDER: EventType[] = ['Session', 'Live Training', 'Webinar', 'Deadline'];

export interface MonthCell {
  day: number | null;
  events: LearningEvent[];
}

export interface MonthGrid {
  label: string;
  cells: MonthCell[];
}

const buildMonthGrid = (events: LearningEvent[]): MonthGrid | null => {
  if (!events.length) return null;
  const anchor = [...events].sort((a, b) => a.date.localeCompare(b.date))[0].date;
  const [year, month] = anchor.split('-').map(Number);
  const monthIdx = month - 1;
  const firstDow = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const label = new Date(year, monthIdx, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const cells: MonthCell[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, events: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, events: events.filter((e) => e.date === ds) });
  }
  return { label, cells };
};

interface CalendarState {
  events: LearningEvent[];
}

const initialState: CalendarState = { events: [] };

export const CalendarStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const learningApi = inject(LearningApi);
    const commonService = inject(Common);

    const eventsResource = rxResource({
      stream: () =>
        learningApi.getCalendar().pipe(
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            patchState(store, { events: res.isSucceeded ? res.data : [] });
          }),
          map((res) => res.data),
        ),
    });

    return { eventsResource };
  }),
  withComputed(({ events, eventsResource }) => ({
    isLoading: computed(() => eventsResource.isLoading()),
    sortedEvents: computed(() => [...events()].sort((a, b) => a.date.localeCompare(b.date))),
    groups: computed(() =>
      TYPE_ORDER.map((type) => ({
        type,
        items: events()
          .filter((e) => e.type === type)
          .sort((a, b) => a.date.localeCompare(b.date)),
      })).filter((g) => g.items.length),
    ),
    monthGrid: computed(() => buildMonthGrid(events())),
  })),
  withMethods((store) => ({
    reload: (): void => {
      store.eventsResource.reload();
    },
  })),
);
