import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/angular/daygrid';
import interactionPlugin from '@fullcalendar/angular/interaction';
import themePlugin from '@fullcalendar/angular/themes/monarch';
import { CalendarOptions, EventClickInfo, EventInput } from 'fullcalendar';

import { Common } from '@core/services';
import { loadFullCalendarStyles } from '@shared/utilities/load-stylesheet';

import { PRIORITY_META, TODAY } from '../tasks-nav';
import { TasksStore } from '../tasks.store';

const PRIORITY_COLOR: Record<string, string> = {
  Low: '#94a3b8',
  Medium: '#38bdf8',
  High: '#f59e0b',
  Critical: '#ef4444',
};

@Component({
  selector: 'app-tasks-calendar',
  host: { class: 'block overflow-hidden overflow-y-auto h-page p-4' },
  imports: [FullCalendarModule],
  providers: [TasksStore],
  template: `
    <div
      class="rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
    >
      @if (stylesReady()) {
        <full-calendar #calendar [options]="calendarOptions()" />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TasksCalendar implements OnInit {
  readonly store = inject(TasksStore);
  readonly #router = inject(Router);
  readonly #common = inject(Common);

  readonly calendar = viewChild<FullCalendarComponent>('calendar');

  protected readonly meta = PRIORITY_META;

  protected readonly stylesReady = signal(false);

  readonly calendarOptions = signal<CalendarOptions>({
    plugins: [themePlugin, dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    initialDate: TODAY,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek',
    },
    height: 'auto',
    dayMaxEvents: 3,
    eventClick: (info: EventClickInfo) => this.#onEventClick(info),
    events: [],
  });

  constructor() {
    // Push tasks onto the calendar whenever the scoped set changes.
    effect(() => {
      const events = this.#toEvents();
      const api = this.calendar()?.getApi();
      if (api) {
        api.removeAllEvents();
        api.addEventSource(events);
      } else {
        this.calendarOptions.update((o) => ({ ...o, events }));
      }
    });
  }

  ngOnInit(): void {
    // FullCalendar's stylesheet is fetched as an asset, not bundled globally - hold the
    // calendar back until it has applied so it never paints unstyled.
    void loadFullCalendarStyles().then(() => this.stylesReady.set(true));
    this.store.setScope('all');
    this.#common.setPageHeaderInfo({
      pageTitle: 'Task Calendar',
      pageDescription: 'Tasks plotted by due date',
      pageIcon: 'pi pi-calendar',
      isBreadcrumbShow: true,
    });
    this.#common.setBreadcrumbItems([
      { label: 'Tasks', routerLink: '/app/tasks/dashboard' },
      { label: 'Calendar' },
    ]);
  }

  #toEvents(): EventInput[] {
    return this.store.scopedTasks().map((task) => ({
      id: task.id,
      title: task.title,
      start: task.dueDate,
      allDay: true,
      backgroundColor: PRIORITY_COLOR[task.priority],
      borderColor: PRIORITY_COLOR[task.priority],
      extendedProps: { status: task.status },
    }));
  }

  #onEventClick(info: EventClickInfo): void {
    this.#router.navigate(['/app/tasks', info.event.id]);
  }
}
