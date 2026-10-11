import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TieredMenu } from '@openng/optimus-ui/tieredmenu';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { StaffMemberWorkPatternRow, HybridType, WorkMode, WorkPatternDay } from '@shared/interfaces';
import { GetWorkModePipe } from '@shared/pipes';
import { WORK_MODES, WORK_PATTERN_DAYS } from '@shared/utilities/common-data';
import { injectStaffMemberOptions } from '@shared/utilities/staff-member-filter-options';

import { StaffMemberWorkPatternForm } from './staff-member-work-pattern-form/staff-member-work-pattern-form';
import { StaffMemberWorkPatternsStore } from './staff-member-work-pattern-info.store';

@Component({
  selector: 'app-staff-member-work-pattern-info',
  imports: [
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ContextMenuModule,
    FormsModule,
    SelectModule,
    TableModule,
    TagModule,
    TieredMenu,
    TooltipModule,
    TableActionButton,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    GetWorkModePipe,
  ],
  providers: [StaffMemberWorkPatternsStore],
  templateUrl: './staff-member-work-pattern-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberWorkPatternInfo implements OnInit {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);

  readonly store = inject(StaffMemberWorkPatternsStore);

  protected readonly staffMemberFilter = injectStaffMemberOptions();

  protected readonly dayOptions = WORK_PATTERN_DAYS;
  protected readonly arrangementOptions = computed(() =>
    this.store
      .arrangements()
      .filter((arrangement) => arrangement.isActive)
      .map((arrangement) => ({
        id: arrangement.id,
        label: `${WORK_MODES.find((mode) => mode.id === arrangement.workMode)?.label ?? 'Work'} · ${arrangement.effectiveFrom} to ${arrangement.effectiveTo ?? 'No end date'}`,
      })),
  );

  protected readonly statusOptions = [
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  /** This page's leaf in `GET /Navigation/my-menu`, which publishes the operations it grants. */
  protected readonly moduleCode = 'STAFF_WORK_PATTERNS';
  protected readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Update'),
  );
  protected readonly canDelete = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Delete'),
  );
  protected readonly canAddPermission = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Add'),
  );
  /** Flexible hybrid runs on day quotas, so it has no fixed weekday patterns. */
  readonly #isFlexibleHybrid = computed(() => {
    const arrangement = this.store.currentArrangement();
    return (
      arrangement?.workMode === WorkMode.Hybrid && arrangement.hybridType === HybridType.Flexible
    );
  });
  /**
   * A pattern belongs to an arrangement and only one row per weekday is allowed, so adding needs a
   * chosen staffMember with an active arrangement and a weekday still free. `currentArrangement` only
   * ever resolves to an active one.
   */
  protected readonly canAdd = computed(
    () =>
      !!this.store.currentArrangement() &&
      !this.#isFlexibleHybrid() &&
      this.store.takenDays().length < WORK_PATTERN_DAYS.length,
  );
  /** Why Add is blocked, for its tooltip. Empty when it is not. */
  protected readonly addBlockedReason = computed(() => {
    if (!this.store.staffMemberId()) {
      return 'Select an staffMember first';
    }
    if (this.store.isLoading()) {
      return '';
    }
    if (!this.store.currentArrangement()) {
      return 'This staffMember has no active work arrangement';
    }
    if (this.#isFlexibleHybrid()) {
      return 'Flexible hybrid arrangements use day quotas, not fixed weekday patterns';
    }
    return this.canAdd() ? '' : 'Every weekday is already configured';
  });

  protected readonly canUseRowActions = computed(() => this.canUpdate() || this.canDelete());
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(
    () => 5 + (this.canUpdate() ? 0 : 1) + (this.canUseRowActions() ? 1 : 0),
  );

  protected readonly hasActiveFilters = computed(
    () => this.store.dayOfWeek() !== null || this.store.isActive() !== null,
  );

  protected readonly selectedRow = signal<StaffMemberWorkPatternRow | null>(null);

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const row = this.selectedRow();
    const canUpdate = this.canUpdate();
    const canDelete = this.canDelete();

    return [
      ...(canUpdate
        ? [
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => row && this.openPatternForm(row),
            },
            {
              label: row?.isActive ? 'Deactivate' : 'Activate',
              icon: row?.isActive ? 'pi pi-ban' : 'pi pi-check-circle',
              command: () => row && this.confirmToggleActive(row),
            },
          ]
        : []),
      ...(canUpdate && canDelete ? [{ separator: true }] : []),
      ...(canDelete
        ? [
            {
              label: 'Delete',
              icon: 'pi pi-trash !text-red-500 dark:!text-red-400',
              styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
              command: () => row && this.removePattern(row),
            },
          ]
        : []),
    ];
  });

  ngOnInit() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'StaffMember Work Patterns',
      pageDescription: 'Where and how each weekday is worked.',
      pageIcon: 'pi pi-calendar-minus',
      isBreadcrumbShow: false,
    });
    // A link from elsewhere can pre-select the staffMember.
    this.store.setStaffMemberId(this.#route.snapshot.queryParamMap.get('staffMemberId') ?? '');
  }

  onStaffMemberChange(staffMemberId: string | null) {
    this.store.setStaffMemberId(staffMemberId ?? '');
  }

  onDayChange(dayOfWeek: WorkPatternDay | null) {
    this.store.setDayOfWeek(dayOfWeek);
  }

  onArrangementChange(arrangementId: number | null) {
    this.store.setArrangementId(arrangementId);
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive);
  }

  loadPatterns(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  protected dayLabel(pattern: StaffMemberWorkPatternRow): string {
    return WORK_PATTERN_DAYS.find((day) => day.id === pattern.dayOfWeek)?.label ?? '-';
  }

  openPatternForm(pattern?: StaffMemberWorkPatternRow) {
    if (!pattern && !this.canAdd()) {
      return;
    }
    const arrangementId = pattern?.staffMemberWorkArrangementId ?? this.store.currentArrangement()?.id;
    if (arrangementId === undefined) {
      return;
    }

    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberWorkPatternForm, {
      header: pattern ? 'Edit Weekday Pattern' : 'Add Weekday Pattern',
      style: { width: '90vw', maxWidth: '45rem' },
      contentStyle: { overflow: 'visible' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: {
        pattern,
        staffMemberWorkArrangementId: arrangementId,
        arrangement: this.store.arrangements().find((item) => item.id === arrangementId) ?? null,
        // The backend rejects a duplicate weekday, so the ones already taken never reach the select.
        takenDays: this.store.takenDays().filter((day) => day !== pattern?.dayOfWeek),
      },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((saved) => {
      if (saved) {
        this.store.reloadPatterns();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmToggleActive(pattern: StaffMemberWorkPatternRow) {
    const action = pattern.isActive ? 'deactivate' : 'activate';
    this.#confirmationService.confirm({
      message: `Are you sure you want to ${action} the <strong>${this.dayLabel(pattern)}</strong> pattern? Schedule history is kept.`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.toggleActive(pattern),
    });
  }

  removePattern(pattern: StaffMemberWorkPatternRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete the <strong>${this.dayLabel(pattern)}</strong> pattern? This action cannot be undone.`,
      header: 'Delete Weekday Pattern',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Pattern',
      rejectLabel: 'Keep Pattern',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deletePattern(pattern),
    });
  }
}

