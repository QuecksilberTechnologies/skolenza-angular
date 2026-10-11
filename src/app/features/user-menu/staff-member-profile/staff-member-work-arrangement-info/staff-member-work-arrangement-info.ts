import { DatePipe } from '@angular/common';
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
import { StaffMemberWorkArrangementRow, WorkMode } from '@shared/interfaces';
import { GetWorkModePipe } from '@shared/pipes';
import { HYBRID_TYPES, WORK_MODES } from '@shared/utilities/common-data';
import { injectStaffMemberOptions } from '@shared/utilities/staff-member-filter-options';

import { StaffMemberWorkArrangementForm } from './staff-member-work-arrangement-form/staff-member-work-arrangement-form';
import { StaffMemberWorkArrangementsStore } from './staff-member-work-arrangement-info.store';

@Component({
  selector: 'app-staff-member-work-arrangement-info',
  imports: [
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ContextMenuModule,
    DatePipe,
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
  providers: [StaffMemberWorkArrangementsStore],
  templateUrl: './staff-member-work-arrangement-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberWorkArrangementInfo implements OnInit {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);

  readonly store = inject(StaffMemberWorkArrangementsStore);

  protected readonly staffMemberFilter = injectStaffMemberOptions();

  protected readonly workModeOptions = WORK_MODES;

  protected readonly statusOptions = [
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  /** This page's leaf in `GET /Navigation/my-menu`, which publishes the operations it grants. */
  protected readonly moduleCode = 'STAFF_WORK_ARRANGEMENTS';
  protected readonly canAdd = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Add'),
  );
  protected readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Update'),
  );
  protected readonly canDelete = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Delete'),
  );
  protected readonly canUseRowActions = computed(() => this.canUpdate() || this.canDelete());
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(
    () => 6 + (this.canUpdate() ? 0 : 1) + (this.canUseRowActions() ? 1 : 0),
  );

  /** Why Add is blocked, for its tooltip. Empty when it is not. The form picks the staffMember. */
  protected readonly addBlockedReason = computed(() =>
    this.store.hasActiveArrangement() ? 'This staffMember already has an active arrangement' : '',
  );

  protected readonly hasActiveFilters = computed(
    () =>
      !!this.store.staffMemberId() || this.store.workMode() !== null || this.store.isActive() !== null,
  );

  protected readonly selectedRow = signal<StaffMemberWorkArrangementRow | null>(null);

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
              command: () => row && this.openArrangementForm(row),
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
              command: () => row && this.removeArrangement(row),
            },
          ]
        : []),
    ];
  });

  ngOnInit() {
    this.#commonService.setPageHeaderInfo({
      pageTitle:
        this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'StaffMember Work Arrangements',
      pageDescription: 'The current working arrangement and its attendance policy.',
      pageIcon: 'pi pi-calendar',
      isBreadcrumbShow: false,
    });
    // A link from elsewhere can pre-select the staffMember.
    this.store.setStaffMemberId(this.#route.snapshot.queryParamMap.get('staffMemberId') ?? '');
  }

  onStaffMemberChange(staffMemberId: string | null) {
    this.store.setStaffMemberId(staffMemberId ?? '');
  }

  onWorkModeChange(workMode: WorkMode | null) {
    this.store.setWorkMode(workMode);
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive);
  }

  loadArrangements(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  protected hybridTypeLabel(arrangement: StaffMemberWorkArrangementRow): string | null {
    return HYBRID_TYPES.find((type) => type.id === arrangement.hybridType)?.label ?? null;
  }

  /** The quotas only apply to hybrid work; other modes show one placeholder instead of three. */
  protected isHybrid(arrangement: StaffMemberWorkArrangementRow): boolean {
    return arrangement.workMode === WorkMode.Hybrid;
  }

  openArrangementForm(arrangement?: StaffMemberWorkArrangementRow) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberWorkArrangementForm, {
      header: arrangement ? 'Edit Work Arrangement' : 'Add Work Arrangement',
      style: { width: '90vw', maxWidth: '50rem' },
      // The form's sticky footer supplies the bottom spacing; padding here would show rows beneath it.
      contentStyle: { paddingBottom: 0 },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { arrangement, staffMemberId: this.store.staffMemberId() },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((saved) => {
      if (saved) {
        this.store.reloadArrangements();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmToggleActive(arrangement: StaffMemberWorkArrangementRow) {
    const action = arrangement.isActive ? 'deactivate' : 'activate';
    this.#confirmationService.confirm({
      message: `Are you sure you want to ${action} the work arrangement for <strong>${arrangement.staffMemberName ?? 'this staffMember'}</strong>? An staffMember can hold only one active arrangement.`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.toggleActive(arrangement),
    });
  }

  removeArrangement(arrangement: StaffMemberWorkArrangementRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete this work arrangement? Weekday patterns and work-mode overrides that hang off it will block the delete.`,
      header: 'Delete Work Arrangement',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Arrangement',
      rejectLabel: 'Keep Arrangement',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteArrangement(arrangement),
    });
  }
}

