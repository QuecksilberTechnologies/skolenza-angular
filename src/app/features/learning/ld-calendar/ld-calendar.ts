import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { EventType } from '@shared/interfaces';

import { CalendarStore } from '../store/calendar.store';

const TYPE_META: Record<EventType, { icon: string; chip: string; dot: string }> = {
  Session: {
    icon: 'pi pi-users',
    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  'Live Training': {
    icon: 'pi pi-video',
    chip: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200',
    dot: 'bg-primary-500',
  },
  Webinar: {
    icon: 'pi pi-desktop',
    chip: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  Deadline: {
    icon: 'pi pi-flag',
    chip: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    dot: 'bg-red-500',
  },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-ld-calendar',
  imports: [DatePipe, TableLoader, TableEmptyMessage],
  providers: [CalendarStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.isLoading()) {
      <app-table-loader />
    } @else if (!store.sortedEvents().length) {
      <app-table-empty-message
        icon="pi pi-calendar"
        message="No upcoming events"
        subMessage="Live sessions, webinars, and deadlines will appear here."
      />
    } @else {
      <!-- View toggle -->
      <div class="mb-4 flex items-center justify-between gap-3">
        @if (view() === 'month' && store.monthGrid(); as grid) {
          <h2 class="text-base font-semibold text-gray-900 dark:text-zinc-100">{{ grid.label }}</h2>
        } @else {
          <h2 class="text-base font-semibold text-gray-900 dark:text-zinc-100">Schedule</h2>
        }
        <div
          class="inline-flex rounded-lg border border-border-light p-0.5 dark:border-zinc-700"
          role="tablist"
          aria-label="Calendar view"
        >
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="view() === 'agenda'"
            class="rounded-md px-3 py-1 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            [class]="
              view() === 'agenda' ? 'bg-primary-500 text-white' : 'text-gray-600 dark:text-zinc-300'
            "
            (click)="view.set('agenda')"
          >
            Agenda
          </button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="view() === 'month'"
            class="rounded-md px-3 py-1 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            [class]="
              view() === 'month' ? 'bg-primary-500 text-white' : 'text-gray-600 dark:text-zinc-300'
            "
            (click)="view.set('month')"
          >
            Month
          </button>
        </div>
      </div>

      @if (view() === 'month') {
        <!-- Month grid -->
        @if (store.monthGrid(); as grid) {
          <div
            class="rounded-xl border border-border-light bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div class="grid grid-cols-7 gap-1">
              @for (wd of weekdays; track wd) {
                <div class="px-1 py-2 text-center text-xs font-semibold text-gray-400">
                  {{ wd }}
                </div>
              }
              @for (cell of grid.cells; track $index) {
                <div
                  class="min-h-20 rounded-lg border p-1.5 text-xs"
                  [class]="
                    cell.day
                      ? 'border-border-light dark:border-zinc-800'
                      : 'border-transparent bg-gray-50/50 dark:bg-zinc-800/30'
                  "
                >
                  @if (cell.day) {
                    <span class="font-medium text-gray-700 dark:text-zinc-300">{{ cell.day }}</span>
                    <div class="mt-1 flex flex-col gap-1">
                      @for (ev of cell.events; track ev.id) {
                        <span
                          class="flex items-center gap-1 truncate"
                          [title]="ev.title + ' (' + ev.type + ')'"
                        >
                          <span
                            class="h-1.5 w-1.5 shrink-0 rounded-full"
                            [class]="meta(ev.type).dot"
                            aria-hidden="true"
                          ></span>
                          <span class="truncate text-gray-600 dark:text-zinc-400">
                            {{ ev.title }}
                          </span>
                        </span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <!-- Agenda -->
          <section class="lg:col-span-2" aria-label="Upcoming agenda">
            <h2 class="mb-2 text-base font-semibold text-gray-900 dark:text-zinc-100">Upcoming</h2>
            <ul
              class="flex flex-col divide-y divide-border-light rounded-xl border border-border-light bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900"
            >
              @for (ev of store.sortedEvents(); track ev.id) {
                <li class="flex items-center gap-4 p-4">
                  <div
                    class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-gray-50 text-center dark:bg-zinc-800"
                  >
                    <span
                      class="text-xs font-medium text-primary-600 uppercase dark:text-primary-300"
                    >
                      {{ ev.date | date: 'MMM' }}
                    </span>
                    <span class="text-lg leading-none font-bold text-gray-900 dark:text-zinc-100">
                      {{ ev.date | date: 'd' }}
                    </span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-900 dark:text-zinc-100">
                      {{ ev.title }}
                    </p>
                    <p class="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                      <i class="pi pi-clock mr-1 text-[0.65rem]" aria-hidden="true"></i>
                      {{ ev.time }} ·
                      <i class="pi pi-map-marker mx-1 text-[0.65rem]" aria-hidden="true"></i>
                      {{ ev.location }} · {{ ev.host }}
                    </p>
                  </div>
                  <span
                    class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                    [class]="meta(ev.type).chip"
                  >
                    {{ ev.type }}
                  </span>
                </li>
              }
            </ul>
          </section>

          <!-- Grouped by type -->
          <section aria-label="By type" class="flex flex-col gap-4">
            @for (group of store.groups(); track group.type) {
              <div
                class="rounded-xl border border-border-light bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h3
                  class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-zinc-100"
                >
                  <i
                    [class]="meta(group.type).icon"
                    class="text-primary-500"
                    aria-hidden="true"
                  ></i>
                  {{ group.type }}
                  <span class="text-xs font-normal text-gray-400">({{ group.items.length }})</span>
                </h3>
                <ul class="flex flex-col gap-2">
                  @for (ev of group.items; track ev.id) {
                    <li class="flex items-center justify-between gap-2 text-sm">
                      <span class="truncate text-gray-700 dark:text-zinc-300">{{ ev.title }}</span>
                      <span class="shrink-0 text-xs text-gray-400">
                        {{ ev.date | date: 'MMM d' }}
                      </span>
                    </li>
                  }
                </ul>
              </div>
            }
          </section>
        </div>
      }
    }
  `,
})
export default class LdCalendar {
  protected readonly store = inject(CalendarStore);
  protected readonly view = signal<'agenda' | 'month'>('agenda');
  protected readonly weekdays = WEEKDAYS;
  protected meta(type: EventType) {
    return TYPE_META[type];
  }
}
