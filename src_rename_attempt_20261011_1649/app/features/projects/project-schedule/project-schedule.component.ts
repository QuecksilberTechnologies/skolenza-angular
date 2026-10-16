import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/angular/daygrid';
import interactionPlugin from '@fullcalendar/angular/interaction';
import themePlugin from '@fullcalendar/angular/themes/monarch';
import timeGridPlugin from '@fullcalendar/angular/timegrid';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import {
  CalendarApi,
  CalendarOptions,
  DateSelectInfo,
  EventClickInfo,
  EventDropInfo,
  EventInput,
  EventResizeDoneInfo,
} from 'fullcalendar';

import { ProjectsApi } from '@core/services';
import { ProjectScheduleItem } from '@shared/interfaces';
import { loadFullCalendarStyles } from '@shared/utilities/load-stylesheet';

import { ProjectBoardStore } from '../project-board.store';
import { SCHEDULE_TYPE_META } from '../projects-nav';
import ScheduleItemDetailsDialogComponent from './schedule-item-details-dialog/schedule-item-details-dialog.component';
import ScheduleItemFormComponent from './schedule-item-form/schedule-item-form.component';

interface ViewMountInfo {
  view: { title: string; type: string };
}

@Component({
  selector: 'app-project-schedule',
  imports: [DatePipe, FullCalendarModule, ButtonModule],
  providers: [DialogService],
  templateUrl: './project-schedule.component.html',
  styleUrl: './project-schedule.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProjectScheduleComponent {
  readonly #projectsApi = inject(ProjectsApi);
  readonly #dialog = inject(DialogService);
  readonly store = inject(ProjectBoardStore);

  readonly typeMeta = SCHEDULE_TYPE_META;
  readonly currentTitle = this.#projectsApi.getCurrentTitle();
  readonly currentView = this.#projectsApi.getCurrentView();

  readonly calendarComponent = viewChild<FullCalendarComponent>('calendar');

  protected readonly stylesReady = signal(false);

  constructor() {
    // FullCalendar's stylesheet is fetched as an asset, not bundled globally - hold the
    // calendar back until it has applied so it never paints unstyled.
    void loadFullCalendarStyles().then(() => this.stylesReady.set(true));
  }

  readonly #linkedTaskOptions = computed(() =>
    this.store.allTasks().map((t) => ({ label: t.title, value: t.id })),
  );

  // FullCalendar wants minimal EventInput objects — map the domain items down and
  // stash extras under extendedProps (mirrors the working tasks-calendar pattern).
  readonly #events = computed<EventInput[]>(() =>
    this.store.scheduleItems().map((i) => ({
      id: i.id,
      title: i.title,
      start: i.start,
      end: i.end,
      allDay: i.allDay,
      color: i.backgroundColor,
      contrastColor: '#ffffff',
      extendedProps: { type: i.type },
    })),
  );

  readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [themePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: false,
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: true,
    height: 'auto',
    events: this.#events(),
    eventClick: this.handleEventClick.bind(this),
    select: this.handleDateSelect.bind(this),
    eventDrop: this.handleEventDrop.bind(this),
    eventResize: this.handleEventResize.bind(this),
    viewDidMount: this.handleViewDidMount.bind(this),
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', meridiem: false, hour12: false },
    eventDisplay: 'block',
    initialDate: new Date(),
  }));

  handleEventClick(info: EventClickInfo): void {
    const item = this.store.scheduleItems().find((i) => i.id === info.event.id);
    if (!item) return;
    const linkedTaskTitle = item.linkedTaskId
      ? this.store.allTasks().find((t) => t.id === item.linkedTaskId)?.title
      : undefined;

    const ref = this.#dialog.open(ScheduleItemDetailsDialogComponent, {
      showHeader: false,
      width: '44rem',
      closable: true,
      modal: true,
      styleClass: '!p-0',
      data: { item, linkedTaskTitle },
    });

    ref?.onClose?.subscribe((result) => {
      if (!result) return;
      if (result.action === 'edit') this.openForm({ item: result.item });
      if (result.action === 'delete') this.store.deleteScheduleItem(result.item.id);
    });
  }

  handleDateSelect(selectInfo: DateSelectInfo): void {
    this.openForm({
      start: selectInfo.start,
      end: selectInfo.end,
      allDay: selectInfo.allDay,
    });
    this.calendarComponent()?.getApi().unselect();
  }

  showAddDialog(): void {
    this.openForm();
  }

  edit(item: ProjectScheduleItem): void {
    this.openForm({ item });
  }

  private openForm(
    opts: { item?: ProjectScheduleItem; start?: Date; end?: Date; allDay?: boolean } = {},
  ): void {
    const ref: DynamicDialogRef | null = this.#dialog.open(ScheduleItemFormComponent, {
      header: opts.item ? 'Edit Schedule Item' : 'Add Schedule Item',
      style: { width: '90vw', maxWidth: '44rem' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { ...opts, linkedTasks: this.#linkedTaskOptions() },
    });

    ref?.onClose?.subscribe((result: ProjectScheduleItem | undefined) => {
      if (result) this.store.saveScheduleItem(result);
    });
  }

  handleEventDrop(dropInfo: EventDropInfo): void {
    this.store.updateScheduleDates(
      dropInfo.event.id,
      dropInfo.event.start ?? new Date(),
      dropInfo.event.end ?? undefined,
    );
  }

  handleEventResize(resizeInfo: EventResizeDoneInfo): void {
    this.store.updateScheduleDates(
      resizeInfo.event.id,
      resizeInfo.event.start ?? new Date(),
      resizeInfo.event.end ?? undefined,
    );
  }

  handleViewDidMount(info: ViewMountInfo): void {
    this.#projectsApi.setCurrentTitle(info.view.title);
    this.#projectsApi.setCurrentView(info.view.type);
  }

  handlePrevClick(): void {
    const api = this.calendarComponent()?.getApi();
    if (!api) return;
    api.prev();
    this.updateTitle(api);
  }

  handleNextClick(): void {
    const api = this.calendarComponent()?.getApi();
    if (!api) return;
    api.next();
    this.updateTitle(api);
  }

  handleTodayClick(): void {
    const api = this.calendarComponent()?.getApi();
    if (!api) return;
    api.today();
    this.updateTitle(api);
  }

  handleViewChange(view: string): void {
    const api = this.calendarComponent()?.getApi();
    if (!api) return;
    api.changeView(view);
    this.updateTitle(api);
    this.#projectsApi.setCurrentView(view);
  }

  private updateTitle(api: CalendarApi): void {
    this.#projectsApi.setCurrentTitle(api.view.title);
  }
}
