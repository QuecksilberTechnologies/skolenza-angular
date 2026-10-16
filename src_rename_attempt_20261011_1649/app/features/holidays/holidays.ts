import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  Type,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogConfig } from '@openng/optimus-ui/dynamicdialog';
import { SelectModule } from '@openng/optimus-ui/select';
import { SplitButtonModule } from '@openng/optimus-ui/splitbutton';
import { TableModule } from '@openng/optimus-ui/table';
import { TieredMenu } from '@openng/optimus-ui/tieredmenu';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import {
  Holiday,
  SearchPipe,
  TableEmptyMessage,
  TableInlineFilters,
  TableLoader,
  TableSearchInput,
} from '@shared/index';
import { localDateKey, toDateKey } from '@shared/utilities/date-key';
import { isAdminSession } from '@shared/utilities/login-info';

import { HolidayBadge } from './holiday-badge/holiday-badge';
import { HolidayCardLoader } from './holiday-card-loader/holiday-card-loader';
import { HolidayCard } from './holiday-card/holiday-card';
import { HolidayDetail } from './holiday-detail/holiday-detail';
import { HolidayForm } from './holiday-form/holiday-form';
import { HolidayImportDialog } from './holiday-import-dialog/holiday-import-dialog';
import { HolidaysStore } from './holidays.store';
import { PrimeIconPipe } from './prime-icon-pipe';

@Component({
  selector: 'app-holidays',
  imports: [
    CardModule,
    ButtonModule,
    SelectModule,
    SplitButtonModule,
    FormsModule,
    ConfirmDialogModule,
    TableModule,
    TieredMenu,
    ContextMenuModule,
    TableActionButton,
    TooltipModule,
    DatePipe,
    NgTemplateOutlet,
    TableInlineFilters,
    TableSearchInput,
    TableLoader,
    TableEmptyMessage,
    HolidayBadge,
    HolidayCard,
    HolidayCardLoader,
    HolidayDetail,
    HeadlessDrawer,
    PrimeIconPipe,
  ],
  providers: [HolidaysStore],
  templateUrl: './holidays.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Holidays implements OnInit {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly store = inject(HolidaysStore);
  /** Sent to the API as `HolidayYear`; `null` (cleared) lists and exports every year. */
  readonly selectedYear = signal<number | null>(new Date().getFullYear());
  readonly viewMode = signal<'card' | 'table'>('card');
  protected readonly detailRow = signal<Holiday | null>(null);
  protected readonly isDetailVisible = signal(false);
  protected readonly selectedRow = signal<Holiday | null>(null);
  protected readonly searchText = signal('');
  /** Host / Admin / Manager — staffMembers get read-only access. */
  protected readonly canManage = signal(false);

  protected readonly actionMenuItems = computed<MenuItem[]>(() => [
    {
      label: 'View Details',
      icon: 'pi pi-eye',
      command: () => this.showDetail(this.selectedRow()!),
    },
    ...(this.canManage()
      ? [
          {
            label: 'Edit Holiday',
            icon: 'pi pi-pencil',
            command: () => this.openHolidayForm(this.selectedRow()!),
          },
          { separator: true },
          {
            label: 'Delete Holiday',
            styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
            icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
            command: () => this.deleteHoliday(this.selectedRow()!),
          },
        ]
      : []),
  ]);

  /** Flags each row past, today, or upcoming against the user's local calendar day. */
  readonly flaggedHolidays = computed(() => {
    const today = localDateKey();
    return this.store.holidayRows().map((h) => ({
      ...h,
      isPast: toDateKey(h.holidayDate) < today,
      isToday: toDateKey(h.holidayDate) === today,
    }));
  });

  protected readonly filteredHolidays = computed(() =>
    new SearchPipe().transform(this.flaggedHolidays(), this.searchText(), [
      'holidayName',
      'description',
    ]),
  );

  /** Card view lists upcoming first, then past in its own section. */
  protected readonly upcomingHolidays = computed(() =>
    this.filteredHolidays().filter((h) => !h.isPast),
  );
  protected readonly upcomingCount = computed(() => this.upcomingHolidays().length);
  protected readonly pastCount = computed(
    () => this.filteredHolidays().length - this.upcomingCount(),
  );

  /** Past holidays stay folded away unless asked for — or unless nothing is upcoming to show. */
  protected readonly showPast = signal(false);
  protected readonly isPastShown = computed(() => this.showPast() || this.upcomingCount() === 0);

  protected readonly visibleHolidays = computed(() =>
    this.isPastShown() ? this.filteredHolidays() : this.upcomingHolidays(),
  );
  protected readonly pastHolidays = computed(() =>
    this.isPastShown() ? this.filteredHolidays().filter((h) => h.isPast) : [],
  );

  /** The first holiday after today, across the whole list rather than the current search. */
  protected readonly nextHolidayId = computed(() => {
    const today = localDateKey();
    const upcoming = this.store
      .holidayRows()
      .filter((h) => toDateKey(h.holidayDate) > today)
      .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate));
    return upcoming[0]?.id ?? null;
  });

  protected readonly showLocation = computed(
    () => new Set(this.store.holidayRows().map((h) => h.locationName)).size > 1,
  );

  /** Next year (to plan ahead) back through two years ago. */
  protected readonly yearOptions = Array.from({ length: 4 }, (_, i) => {
    const year = new Date().getFullYear() + 1 - i;
    return { label: `${year}`, value: year };
  });

  protected readonly holidaySplitButtonItems: MenuItem[] = [
    {
      label: 'Import Holidays',
      icon: 'pi pi-upload',
      command: () => this.importHolidays(),
    },
    {
      label: 'Export Holidays',
      icon: 'pi pi-download',
      command: () => this.exportHolidays(),
    },
  ];

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Holidays',
      pageDescription: 'Manage annual company and national holidays.',
      pageIcon: 'pi pi-calendar',
      isBreadcrumbShow: false,
    });
  }

  async ngOnInit() {
    this.canManage.set(isAdminSession(await this.#commonService.getLoginInfo()));
    this.#loadHolidays();
  }

  onYearChange(year: number | null) {
    this.selectedYear.set(year);
    this.#loadHolidays();
  }

  openHolidayForm(holiday?: Holiday) {
    this.#openDialog(HolidayForm, {
      header: holiday ? 'Update Holiday' : 'Add Holiday',
      style: { width: '90vw', maxWidth: '44rem' },
      focusOnShow: false,
      data: { holiday },
    });
  }

  showDetail(holiday: Holiday) {
    this.detailRow.set(holiday);
    this.isDetailVisible.set(true);
  }

  onDetailEdit(holiday: Holiday) {
    this.isDetailVisible.set(false);
    this.openHolidayForm(holiday);
  }

  importHolidays() {
    this.#openDialog(HolidayImportDialog, {
      header: 'Import Holidays',
      style: { width: '90vw', maxWidth: '40rem' },
    });
  }

  exportHolidays() {
    this.store.exportHolidays({ HolidayYear: this.selectedYear() });
  }

  deleteHoliday(holiday: Holiday) {
    this.#confirmationService.confirm({
      message: `This will remove <strong>${holiday.holidayName}</strong> from the holiday list.`,
      header: 'Delete this holiday',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Holiday',
      rejectLabel: 'Keep Holiday',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.deleteHoliday(holiday.id);
      },
    });
  }

  #loadHolidays() {
    this.store.loadHolidays({ HolidayYear: this.selectedYear() });
  }

  /** Opens a modal that closes with `true` after a save, which reloads the list. */
  #openDialog(component: Type<unknown>, config: DynamicDialogConfig) {
    const ref = this.#dialogService.open(component, {
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      ...config,
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.#loadHolidays();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
