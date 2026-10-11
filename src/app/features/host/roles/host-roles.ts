import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { Select } from '@openng/optimus-ui/select';
import { Table, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { HOST_MODULE } from '@core/host-modules';
import { Common } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { HostRoleManageDialog } from '@shared/components/host-role/host-role-manage-dialog/host-role-manage-dialog';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { HostRole } from '@shared/interfaces';

import { HostRolesStore } from './host-roles.store';

@Component({
  selector: 'app-host-roles',
  imports: [
    DatePipe,
    TableModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ContextMenuModule,
    FormsModule,
    MenuModule,
    Select,
    TagModule,
    TooltipModule,
    TableActionButton,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
    TableSearchInput,
  ],
  providers: [HostRolesStore],
  templateUrl: './host-roles.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HostRoles {
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #router = inject(Router);
  readonly store = inject(HostRolesStore);
  readonly #commonService = inject(Common);
  readonly permissionsStore = inject(CurrentUserPermissionsStore);
  protected readonly moduleKey = HOST_MODULE.hostRole;

  protected readonly canUseRowActions = computed(
    () =>
      this.permissionsStore.canPerform(this.moduleKey, 'Update') ||
      this.permissionsStore.canPerform(this.moduleKey, 'Delete'),
  );

  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 5 : 4));

  /** Delete is the only action barred on your own row, so the menu can still come
   *  back empty even when `canUseRowActions()` is true. */
  protected hasRowActions(hostRole: HostRole): boolean {
    return (
      this.permissionsStore.canPerform(this.moduleKey, 'Update') ||
      (this.permissionsStore.canPerform(this.moduleKey, 'Delete') &&
        !this.store.isOwnRole(hostRole))
    );
  }

  protected readonly selectedRow = signal<HostRole | null>(null);
  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const hostRole = this.selectedRow();
    return this.buildActionMenuItems(hostRole ? this.store.isOwnRole(hostRole) : true);
  });

  readonly statusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  constructor() {
    this.setPageHeaderInfo();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Roles',
      pageDescription: 'Manage platform host roles',
      pageIcon: 'pi pi-shield',
      isBreadcrumbShow: false,
    });
  }

  // A host cannot delete the role their own account is assigned to.
  private buildActionMenuItems(isOwnRole: boolean): MenuItem[] {
    const canUpdate = this.permissionsStore.canPerform(this.moduleKey, 'Update');
    const canDelete = this.permissionsStore.canPerform(this.moduleKey, 'Delete');
    return [
      ...(canUpdate
        ? [
            {
              label: 'Permissions',
              icon: 'pi pi-shield',
              command: () => this.viewRolePermission(this.selectedRow()!),
            },
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => this.createEditHostRole(this.selectedRow() ?? undefined),
            },
          ]
        : []),
      ...(isOwnRole || !canDelete
        ? []
        : [
            {
              separator: true,
            },
            {
              label: 'Delete',
              styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
              icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
              command: () => this.confirmDeleteHostRole(this.selectedRow()!),
            },
          ]),
    ];
  }

  viewRolePermission(hostRole: HostRole) {
    this.#router.navigate(['/app/platform-roles/permissions', hostRole.id]);
  }

  createEditHostRole(hostRole?: HostRole) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(HostRoleManageDialog, {
      header: hostRole ? 'Update Platform Role' : 'Add Platform Role',
      style: { width: '90vw', maxWidth: '36rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { hostRole },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (result) {
        this.store.reloadHostRoles();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmDeleteHostRole(hostRole: HostRole) {
    this.#confirmationService.confirm({
      message: `This will permanently delete the host role <strong>${hostRole.name}</strong>. This action cannot be undone.`,
      header: 'Delete this host role',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Role',
      rejectLabel: 'Keep Role',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.deleteHostRole(hostRole);
      },
    });
  }

  toggleActive(hostRole: HostRole) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to change the status of <strong>${hostRole.name}</strong>? You can update this again at any time.`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.toggleActive(hostRole);
      },
    });
  }

  searchRoles(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }

  onStatusChange(status: boolean | null) {
    this.store.setStatusFilter(status ?? null);
  }
}
