import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { MenuModule } from '@openng/optimus-ui/menu';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { catchError, map, of } from 'rxjs';

import { Common, PolicyTypeApi } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { AttendancePolicyRow, PolicyTypesName, SettledSearchTerm } from '@shared/interfaces';
import { GetAttendanceLocationScopePipe } from '@shared/pipes';

import { AttendancePoliciesStore } from './attendance-policies.store';
import { AttendancePolicyDetail } from './attendance-policy-detail/attendance-policy-detail';

@Component({
  selector: 'app-attendance-policies',
  imports: [
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ContextMenuModule,
    FormsModule,
    MenuModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
    TableActionButton,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
    HeadlessDrawer,
    AttendancePolicyDetail,
    GetAttendanceLocationScopePipe,
  ],
  providers: [AttendancePoliciesStore],
  templateUrl: './attendance-policies.html',
  styleUrl: './attendance-policies.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AttendancePolicies {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);
  readonly #policyTypeApi = inject(PolicyTypeApi);
  readonly #router = inject(Router);

  readonly store = inject(AttendancePoliciesStore);

  readonly #policyTypesResource = rxResource({
    stream: () =>
      this.#policyTypeApi.getPolicyTypeNames({ IsActive: true }).pipe(
        map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
        catchError(() => of([] as PolicyTypesName[])),
      ),
  });

  /** `null` is the "All" row — the same clear affordance the status filter uses. */
  protected readonly policyTypeOptions = computed(() => [
    { id: null as number | null, policyName: 'All Policy Types' },
    ...(this.#policyTypesResource.value() ?? []),
  ]);
  protected readonly isLoadingPolicyTypes = computed(() => this.#policyTypesResource.isLoading());

  protected readonly statusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  // Attendance configuration has no catalog module of its own — this screen rides the existing
  // `Attendance` key until the backend models it separately.
  //
  // Deliberately NOT migrated to `FeaturePageStore` with the sibling attendance screens:
  // `GET /Navigation/my-menu` publishes no attendance module either, so a `moduleCode` would have
  // nothing to resolve — a hard gate would hide every action and a soft one would decide nothing.
  protected readonly moduleKey = 'Attendance';

  protected readonly canAdd = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Add'),
  );
  protected readonly canUpdate = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Update'),
  );
  protected readonly canDelete = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Delete'),
  );
  protected readonly canUseRowActions = computed(() => this.canUpdate() || this.canDelete());
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 6 : 5));

  /** An empty grid means "nothing matches" when a filter is on, and "nothing exists" otherwise. */
  protected readonly hasActiveFilters = computed(
    () =>
      !!this.store.search() || this.store.policyTypeId() !== null || this.store.isActive() !== null,
  );

  protected readonly selectedRow = signal<AttendancePolicyRow | null>(null);
  /**
   * Separate from `selectedRow` on purpose — the context menu emits `contextMenuSelectionChange`
   * with `null` on every dismissal, which would blank the open drawer.
   */
  protected readonly detailRow = signal<AttendancePolicyRow | null>(null);
  protected readonly isShowDetail = signal(false);

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const row = this.selectedRow();
    const canUpdate = this.canUpdate();
    const canDelete = this.canDelete();

    return [
      {
        label: 'View Details',
        icon: 'pi pi-eye',
        command: () => row && this.showDetail(row),
      },
      ...(canUpdate
        ? [
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => row && this.editAttendancePolicy(row),
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
              command: () => row && this.confirmDelete(row),
            },
          ]
        : []),
    ];
  });

  constructor() {
    this.setPageHeaderInfo();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Attendance Policies',
      pageDescription: 'Define how and from where staffMembers are allowed to mark attendance',
      pageIcon: 'pi pi-verified',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Policies', routerLink: '/app/policies' },
      { label: 'Attendance Policies' },
    ]);
  }

  searchAttendancePolicies(value: SettledSearchTerm) {
    this.store.setSearch(value);
  }

  onPolicyTypeChange(policyTypeId: number | null) {
    this.store.setPolicyTypeId(policyTypeId ?? null);
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive ?? null);
  }

  loadAttendancePolicies(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  showDetail(row: AttendancePolicyRow) {
    this.detailRow.set(row);
    this.isShowDetail.set(true);
  }

  createAttendancePolicy() {
    this.#router.navigate(['/app/policies/attendance-policies/new']);
  }

  editAttendancePolicy(row: AttendancePolicyRow) {
    this.#router.navigate(['/app/policies/attendance-policies', row.id, 'edit']);
  }

  onDetailEdit() {
    const row = this.detailRow();
    if (!row) {
      return;
    }

    // Leave the sheet open. Optimus appends the drawer mask straight to document.body and only
    // removes it on `animationend` — or, on destroy, while `visible` is still true. Closing first
    // strands the mask over the next route.
    this.editAttendancePolicy(row);
  }

  confirmToggleActive(row: AttendancePolicyRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to change the status of <strong>${row.policyName ?? 'this policy'}</strong>? Deactivating is rejected while an active work arrangement still uses it.`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.toggleActive(row),
    });
  }

  confirmDelete(row: AttendancePolicyRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${row.policyName ?? 'this policy'}</strong>? Work arrangements that reference it will block the delete.`,
      header: 'Delete Attendance Policy',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Policy',
      rejectLabel: 'Keep Policy',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteAttendancePolicy(row),
    });
  }
}
