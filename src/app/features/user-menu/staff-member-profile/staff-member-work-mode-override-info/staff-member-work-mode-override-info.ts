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
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import {
  StaffMemberWorkModeOverrideRow,
  SettledSearchTerm,
  WorkModeOverrideApprovalStatus,
} from '@shared/interfaces';
import { GetWorkModePipe } from '@shared/pipes';
import { WORK_MODE_OVERRIDE_STATUSES } from '@shared/utilities/common-data';
import { injectStaffMemberOptions } from '@shared/utilities/staff-member-filter-options';

import { StaffMemberWorkModeOverrideDecisionDialog } from './staff-member-work-mode-override-decision-dialog';
import { StaffMemberWorkModeOverrideForm } from './staff-member-work-mode-override-form/staff-member-work-mode-override-form';
import { StaffMemberWorkModeOverridesStore } from './staff-member-work-mode-override-info.store';

@Component({
  selector: 'app-staff-member-work-mode-override-info',
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
    TableSearchInput,
    GetWorkModePipe,
  ],
  providers: [StaffMemberWorkModeOverridesStore],
  templateUrl: './staff-member-work-mode-override-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberWorkModeOverrideInfo implements OnInit {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);

  readonly store = inject(StaffMemberWorkModeOverridesStore);

  protected readonly staffMemberFilter = injectStaffMemberOptions();

  protected readonly approvalOptions = WORK_MODE_OVERRIDE_STATUSES;

  protected readonly statusOptions = [
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  /** This page's leaf in `GET /Navigation/my-menu`, which publishes the operations it grants. */
  protected readonly moduleCode = 'STAFF_WORK_MODE_OVERRIDES';
  protected readonly canAdd = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Add'),
  );
  protected readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Update'),
  );
  protected readonly canDelete = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Delete'),
  );
  protected readonly canApprove = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Approve'),
  );
  protected readonly canReject = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Reject'),
  );
  protected readonly canUseRowActions = computed(
    () => this.canUpdate() || this.canDelete() || this.canApprove() || this.canReject(),
  );
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(
    () => 6 + (this.canUpdate() ? 0 : 1) + (this.canUseRowActions() ? 1 : 0),
  );

  protected readonly hasActiveFilters = computed(
    () =>
      !!this.store.search() ||
      !!this.store.staffMemberId() ||
      this.store.approvalStatus() !== null ||
      this.store.isActive() !== null,
  );

  protected readonly selectedRow = signal<StaffMemberWorkModeOverrideRow | null>(null);

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const row = this.selectedRow();
    const canUpdate = this.canUpdate();
    const canDelete = this.canDelete();
    const pending = !!row && this.isPending(row);
    // `selectedRow` is a snapshot; the busy flags live on the store's copy of the row.
    const liveRow = this.store.overrides().find((override) => override.id === row?.id);
    const busy = !!(liveRow?.isDeciding || liveRow?.isDeleting);

    return [
      ...(pending && this.canApprove()
        ? [
            {
              label: 'Approve',
              disabled: busy,
              icon: 'pi pi-check',
              command: () => row && this.confirmApprove(row),
            },
          ]
        : []),
      ...(pending && this.canReject()
        ? [
            {
              label: 'Reject',
              disabled: busy,
              icon: 'pi pi-times',
              command: () => row && this.openRejectDialog(row),
            },
          ]
        : []),
      ...(pending && (this.canApprove() || this.canReject()) && (canUpdate || canDelete)
        ? [{ separator: true }]
        : []),
      ...(canUpdate
        ? [
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => row && this.openOverrideForm(row),
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
              disabled: busy,
              icon: 'pi pi-trash !text-red-500 dark:!text-red-400',
              styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
              command: () => row && this.removeOverride(row),
            },
          ]
        : []),
    ];
  });

  ngOnInit() {
    this.#commonService.setPageHeaderInfo({
      pageTitle:
        this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'StaffMember Work Mode Overrides',
      pageDescription: 'Temporary changes to the usual work mode.',
      pageIcon: 'pi pi-calendar-times',
      isBreadcrumbShow: false,
    });
    // A link from elsewhere can pre-select the staffMember.
    this.store.setStaffMemberId(this.#route.snapshot.queryParamMap.get('staffMemberId') ?? '');
  }

  onStaffMemberChange(staffMemberId: string | null) {
    this.store.setStaffMemberId(staffMemberId ?? '');
  }

  onApprovalChange(approvalStatus: WorkModeOverrideApprovalStatus | null) {
    this.store.setApprovalStatus(approvalStatus);
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive);
  }

  searchOverrides(value: SettledSearchTerm) {
    this.store.setSearch(value);
  }

  loadOverrides(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  protected isPending(override: StaffMemberWorkModeOverrideRow): boolean {
    return override.approvalStatus === WorkModeOverrideApprovalStatus.Pending;
  }

  protected approvalStatusLabel(override: StaffMemberWorkModeOverrideRow): string {
    return (
      WORK_MODE_OVERRIDE_STATUSES.find((status) => status.id === override.approvalStatus)?.label ??
      'Pending'
    );
  }

  /** Approval state, not action: approved reads as success, rejected as danger. */
  protected approvalSeverity(override: StaffMemberWorkModeOverrideRow) {
    switch (override.approvalStatus) {
      case WorkModeOverrideApprovalStatus.Approved:
        return 'success';
      case WorkModeOverrideApprovalStatus.Rejected:
        return 'danger';
      case WorkModeOverrideApprovalStatus.Cancelled:
        return 'secondary';
      default:
        return 'warn';
    }
  }

  openOverrideForm(override?: StaffMemberWorkModeOverrideRow) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberWorkModeOverrideForm, {
      header: override ? 'Edit Work Mode Override' : 'Add Work Mode Override',
      style: { width: '90vw', maxWidth: '45rem' },
      contentStyle: { overflow: 'auto' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { override, staffMemberId: this.store.staffMemberId() },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((saved) => {
      if (saved) {
        this.store.reloadOverrides();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmToggleActive(override: StaffMemberWorkModeOverrideRow) {
    const action = override.isActive ? 'deactivate' : 'activate';
    this.#confirmationService.confirm({
      message: `Are you sure you want to ${action} the override for <strong>${override.staffMemberName ?? 'this staffMember'}</strong>?`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle text-amber-700! dark:text-amber-400! text-2xl!',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.toggleActive(override),
    });
  }

  confirmApprove(override: StaffMemberWorkModeOverrideRow) {
    this.#confirmationService.confirm({
      message: `Approve this override for <strong>${override.staffMemberName ?? 'this staffMember'}</strong>? Dates and dependencies will be checked again.`,
      header: 'Approve Work Mode Override',
      icon: 'pi pi-check-circle text-green-700! dark:text-green-400! text-2xl!',
      acceptLabel: 'Approve',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.decideOverride(override, true),
    });
  }

  openRejectDialog(override: StaffMemberWorkModeOverrideRow) {
    const ref = this.#dialogService.open(StaffMemberWorkModeOverrideDecisionDialog, {
      header: 'Reject Work Mode Override',
      style: { width: '90vw', maxWidth: '32rem' },
      modal: true,
      data: { staffMemberName: override.staffMemberName },
    });
    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((remark) => {
      if (typeof remark === 'string' && remark.trim()) {
        this.store.decideOverride(override, false, remark.trim());
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  removeOverride(override: StaffMemberWorkModeOverrideRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete this override? This action cannot be undone.`,
      header: 'Delete Work Mode Override',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Override',
      rejectLabel: 'Keep Override',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteOverride(override),
    });
  }
}

