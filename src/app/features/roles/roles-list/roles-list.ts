import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
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
import { SplitButtonModule } from '@openng/optimus-ui/splitbutton';
import { Table, TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { finalize } from 'rxjs';

import { Common, RolesApi } from '@core/services';
import { INSTITUTION_ACCESS_MODULE_CODES } from '@core/feature-page-identifiers';
import { FeaturePageStore } from '@core/stores';
import { BulkImportDialog } from '@shared/components/bulk-import-dialog/bulk-import-dialog';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import {
  AddUpdateRoleRequest,
  BulkImportDialogData,
  GetRolesReq,
  IRoleFilter,
  LoginInfo,
  NO_SEARCH_TERM,
  Role,
  SettledSearchTerm,
} from '@shared/interfaces';
import { downloadBlob } from '@shared/utilities/download-blob';

import { ROLE_IMPORT_DISPLAY, roleBulkImportAdapter } from '../role-bulk-import';
import { RoleDialog } from '../role-dialog/role-dialog';

@Component({
  selector: 'app-roles-list',
  imports: [
    TableModule,
    ButtonModule,
    ConfirmDialogModule,
    CardModule,
    MenuModule,
    ContextMenuModule,
    TagModule,
    TableActionButton,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
    TableSearchInput,
    Select,
    TableSearchFilter,
    TooltipModule,
    SplitButtonModule,
    FormsModule,
  ],
  providers: [DialogService],
  templateUrl: './roles-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RolesList implements OnInit {
  readonly #rolesApi = inject(RolesApi);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);
  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly table = viewChild<Table>('dt');
  readonly roles = this.#rolesApi.roles;
  readonly isLoadingRoles = this.#rolesApi.isLoadingRoles;
  readonly totalRecords = this.#rolesApi.totalRecords;
  readonly sortOrder = signal<string | null>('desc');
  readonly sortBy = signal<string | string[] | null | undefined>(undefined);
  readonly pageNumber = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly isDeletingRole = signal(false);
  /** Drives the per-row spinner on the status toggle button. */
  readonly updatingStatusRoleId = signal<number | null>(null);
  readonly appliedFilters = signal<IRoleFilter | null>(null);
  /**
   * Already debounced and whitespace-normalised by `TableSearchInput`. Sent as `RoleName`: the
   * endpoint has no general search, so this matches names only.
   */
  readonly #search = signal<SettledSearchTerm>(NO_SEARCH_TERM);
  readonly selectedRoleTypeId = signal<number | undefined>(undefined);
  readonly roleTypes = this.#rolesApi.roleTypes;
  readonly loginInfo = signal<LoginInfo | null>(null);
  protected selectedRow!: Role;
  protected actionMenuItems: MenuItem[] = [];
  protected roleSplitButtonItems: MenuItem[] = [];

  protected readonly moduleCode = INSTITUTION_ACCESS_MODULE_CODES.role;

  readonly statusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  protected readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Update'),
  );

  readonly appliedFilterCount = computed(() => {
    const filters = this.appliedFilters();
    return filters ? Object.values(filters).filter(Boolean).length : 0;
  });

  constructor() {
    effect(() => this.setPageHeaderInfo());
    this.initActionMenus();
    this.initRoleSplitButtonItems();

    this.#rolesApi.setRoles([]);
  }

  async ngOnInit() {
    this.loginInfo.set(await this.#commonService.getLoginInfo());
    this.loadRoleTypeOptions();
  }

  loadRoleTypeOptions() {
    this.#rolesApi
      .getRoleTypeOptions()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => {
          this.#rolesApi.setRoleTypes(res.isSucceeded ? res.data : []);
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Roles',
      pageDescription: 'Manage roles',
      pageIcon: 'pi pi-shield',
      isBreadcrumbShow: false,
    });
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'Permissions',
        icon: 'pi pi-shield',
        command: () => this.viewRolePermission(this.selectedRow),
      },
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.upsertRole(this.selectedRow),
      },
      {
        separator: true,
      },
      {
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.confirmDeleteRole(this.selectedRow),
      },
    ];
  }

  initRoleSplitButtonItems() {
    this.roleSplitButtonItems = [
      {
        label: 'Import Roles',
        icon: 'pi pi-upload',
        command: () => this.openBulkImport(),
      },
      {
        label: 'Export Current Page',
        icon: 'pi pi-download',
        command: () => this.exportCurrentPage(),
      },
    ];
  }

  upsertRole(role?: Role) {
    const roleId = role?.id;

    const ref: DynamicDialogRef | null = this.#dialogService.open(RoleDialog, {
      header: roleId ? 'Edit Role' : 'Add Role',
      style: { width: '90vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { roleId },
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  openBulkImport() {
    // The dialog owns the flow; Roles owns its endpoints and its copy.
    const data: BulkImportDialogData = {
      adapter: roleBulkImportAdapter(this.#rolesApi),
      display: ROLE_IMPORT_DISPLAY,
    };

    const ref = this.#dialogService.open(BulkImportDialog, {
      header: 'Import Roles',
      style: { width: '90vw', maxWidth: '64rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      // Focus enters the dialog on open: the trap only wraps focus that is already inside.
      data,
    });

    // The dialog closes with `true` once an import job ran, so the list is refetched rather than
    // left showing the roles from before the import.
    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (imported) this.#reloadFirstPage();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  exportCurrentPage() {
    const header = ['Name', 'Role Type', 'Remark', 'Status'];
    const rows = this.roles().map((role) => [
      role.roleName,
      role.roleTypeName,
      role.remark ?? '',
      role.isActive ? 'Active' : 'Inactive',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => this.#escapeCsv(value)).join(','))
      .join('\r\n');

    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'roles.csv');
  }

  confirmDeleteRole(role: Role) {
    this.#confirmationService.confirm({
      message: `This will permanently delete the <strong>${role?.roleName}</strong> and all its contents. This action cannot be undone.`,
      header: 'Delete this role',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Role',
      rejectLabel: 'Keep Role',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteRole(role.id);
      },
    });
  }

  deleteRole(roleId: number) {
    const sessionUser = this.loginInfo()?.user;

    if (!roleId) {
      this.#commonService.showMessage('Unable to delete: missing role ID.', 'error');
      return;
    }

    if (!sessionUser) return;

    // Prevent deleting user's own role for safety/consistency
    if (sessionUser?.primaryRole?.roleId === roleId) {
      this.#commonService.showMessage('You cannot delete your own role.', 'error');
      return;
    }

    this.isDeletingRole.set(true);
    this.#rolesApi
      .deleteRole(roleId)
      .pipe(
        finalize(() => this.isDeletingRole.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#rolesApi.removeRoleSignal(roleId);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  async getRoles(event: TableLazyLoadEvent, isPageChange = true, filters?: IRoleFilter | null) {
    if (!this.loginInfo()) {
      this.loginInfo.set(await this.#commonService.getLoginInfo());
    }

    const { page, rows, sortField, sortOrder } = this.#commonService.getPaginationParam(event);
    if (isPageChange) {
      this.pageNumber.set(page);
    }

    this.pageSize.set(rows);
    this.sortBy.set(sortField);
    this.sortOrder.set(sortOrder);

    const info = this.loginInfo()?.user;
    if (!info) return;

    const body = this.#buildRolesRequest(info.staffMemberId, filters);

    this.#rolesApi.setIsLoadingRoles(true);
    this.#rolesApi.setRoles([]);

    this.#rolesApi
      .getRoles(body)
      .pipe(
        finalize(() => this.#rolesApi.setIsLoadingRoles(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#rolesApi.setRoles(res.isSucceeded ? res.data : []);
          this.#rolesApi.setTotalRecords(res.isSucceeded ? res.totalRecords || res.data.length : 0);
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  #buildRolesRequest(userStaffMemberId: string, filters?: IRoleFilter | null): GetRolesReq {
    const body: GetRolesReq = {
      // `null` is the explicit "All" choice; `makeHttpParams` drops the undefined param.
      IsActive: filters?.status ?? undefined,
      PageNumber: this.pageNumber(),
      PageSize: this.pageSize(),
      SortBy: this.sortBy() ?? '',
      SortOrder: this.sortOrder() ?? 'desc',
      UserStaffMemberId: userStaffMemberId,
      RoleName: this.#search() || undefined,
    };

    if (filters?.roleTypeId !== undefined) {
      body.RoleType = filters.roleTypeId;
    }

    return body;
  }

  confirmToggleStatus(role: Role) {
    const isDeactivating = !!role.isActive;

    this.#confirmationService.confirm({
      message: `This will mark <strong>${role.roleName}</strong> as ${
        isDeactivating ? 'Inactive' : 'Active'
      }.${isDeactivating ? ' It will no longer be selectable when assigning roles.' : ''}`,
      header: isDeactivating ? 'Deactivate this role' : 'Activate this role',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: isDeactivating ? 'Deactivate' : 'Activate',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.toggleRoleStatus(role);
      },
    });
  }

  toggleRoleStatus(role: Role) {
    const sessionUser = this.loginInfo()?.user;
    if (!sessionUser || !role?.id) return;

    // Same lockout guard the delete path applies.
    if (role.isActive && sessionUser?.primaryRole?.roleId === role.id) {
      this.#commonService.showMessage('You cannot deactivate your own role.', 'error');
      return;
    }

    const body: AddUpdateRoleRequest = {
      id: role.id,
      roleName: role.roleName,
      roleType: role.roleType,
      remark: role.remark ?? '',
      isActive: !role.isActive,
    };

    this.updatingStatusRoleId.set(role.id);
    this.#rolesApi
      .updateRole(body)
      .pipe(
        finalize(() => this.updatingStatusRoleId.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            // A toggled row can drop out of the active status filter, so refetch the page.
            this.#reloadFirstPage();
          }
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  viewRolePermission(role: Role) {
    this.#router.navigate(['/app/roles/permissions', role.id]);
  }

  searchRoles(value: SettledSearchTerm) {
    this.#search.set(value);
    this.#reloadFirstPage();
  }

  onRoleTypeChange(roleTypeId?: string) {
    this.appliedFilters.update((filter) => ({ ...filter, roleTypeId: roleTypeId }));
    this.#reloadFirstPage();
  }

  onStatusChange(status: boolean | null) {
    this.appliedFilters.update((filter) => ({ ...filter, status: status }));
    this.#reloadFirstPage();
  }

  /** Back to page one under the current filters - what every change of the result set needs. */
  #reloadFirstPage(): void {
    this.getRoles({ first: 0, rows: this.pageSize() }, true, this.appliedFilters());
  }

  #escapeCsv(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
  }
}

