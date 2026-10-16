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
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { Drawer } from '@openng/optimus-ui/drawer';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { Menu, MenuModule } from '@openng/optimus-ui/menu';
import { Select } from '@openng/optimus-ui/select';
import { SplitButtonModule } from '@openng/optimus-ui/splitbutton';
import { Table, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common, DepartmentsApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { BulkImportDialog } from '@shared/components/bulk-import-dialog/bulk-import-dialog';
import { DepartmentFilter } from '@shared/components/department/department-filter/department-filter';
import { DepartmentManageDialog } from '@shared/components/department/department-manage-dialog/department-manage-dialog';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import {
  BulkImportDialogData,
  Department,
  GetDepartmentsResponse,
  IDepartmentFilter,
  LoginInfo,
  SettledSearchTerm,
} from '@shared/interfaces';
import { isAdminSession } from '@shared/utilities/login-info';

import { DEPARTMENT_IMPORT_DISPLAY, departmentBulkImportAdapter } from './department-bulk-import';
import { DepartmentsStore } from './departments.store';

@Component({
  selector: 'app-departments',
  imports: [
    TableModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    MenuModule,
    ContextMenuModule,
    TagModule,
    TableActionButton,
    TableLoader,
    TableEmptyMessage,
    TableSearchFilter,
    Drawer,
    DepartmentFilter,
    TableInlineFilters,
    TableSearchInput,
    Select,
    TooltipModule,
    FormsModule,
    SplitButtonModule,
  ],
  providers: [DepartmentsStore],
  templateUrl: './departments.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Departments implements OnInit {
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #departmentsApi = inject(DepartmentsApi);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly store = inject(DepartmentsStore);
  protected readonly table = viewChild<Table>('dt');
  protected readonly actionMenu = viewChild<Menu>('actionMenu');
  protected readonly loginInfo = signal<LoginInfo | null>(null);
  protected readonly selectedRow = signal<Department | null>(null);
  protected readonly isFilterDrawerOpen = signal(false);
  protected readonly moduleCode = ['DEPARTMENT', 'INSTITUTION_DEPARTMENTS'] as const;

  protected readonly departmentStatusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  protected readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Update'),
  );

  protected readonly canAddDepartment = computed(() => isAdminSession(this.loginInfo()));

  protected readonly departmentSplitButtonItems: MenuItem[] = [
    {
      label: 'Import Departments',
      icon: 'pi pi-upload',
      command: () => this.openBulkImport(),
    },
  ];

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const row = this.selectedRow();

    return [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.createEditDepartment(row),
      },
      {
        separator: true,
      },
      {
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.confirmDeleteDepartment(row),
      },
    ];
  });

  constructor() {
    effect(() => this.#setPageHeaderInfo());
  }

  async ngOnInit() {
    this.loginInfo.set(await this.#commonService.getLoginInfo());
  }

  #setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Departments',
      pageDescription: 'Manage departments and their configurations',
      pageIcon: 'pi pi-building',
      isBreadcrumbShow: false,
    });
  }

  createEditDepartment(department?: Department | null) {
    const ref = this.#dialogService.open(DepartmentManageDialog, {
      header: department ? 'Update Department' : 'Add Department',
      style: { width: '90vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { department },
    });

    ref?.onClose
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: GetDepartmentsResponse | undefined) =>
        this.#refreshAfterSave(result, department),
      );

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  openBulkImport() {
    // The dialog owns the flow; Departments owns its endpoints and its copy.
    const data: BulkImportDialogData = {
      adapter: departmentBulkImportAdapter(this.#departmentsApi),
      display: DEPARTMENT_IMPORT_DISPLAY,
    };

    const ref = this.#dialogService.open(BulkImportDialog, {
      header: 'Import Departments',
      style: { width: '90vw', maxWidth: '64rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      // Focus enters the dialog on open: the trap only wraps focus that is already inside.
      data,
    });

    // The dialog closes with `true` once an import job ran, so the list is refetched rather than
    // left showing the departments from before the import.
    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (imported) this.store.reloadFirstPage();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  #refreshAfterSave(result: GetDepartmentsResponse | undefined, department?: Department | null) {
    if (!result) return;

    if (department?.id) {
      this.store.reloadDepartments();
      return;
    }

    const table = this.table();
    if (table) {
      table.first = 0;
    }
    this.store.reloadFirstPage();
  }

  confirmDeleteDepartment(department?: Department | null) {
    if (!department) return;

    this.#confirmationService.confirm({
      message: `This will permanently delete the <strong>${department.departmentName}</strong> and all its contents. This action cannot be undone.`,
      header: 'Delete this department',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Department',
      rejectLabel: 'Keep Department',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.deleteDepartment(department);
      },
    });
  }

  confirmToggleStatus(department: Department) {
    const isDeactivating = !!department.isActive;

    this.#confirmationService.confirm({
      message: `This will mark <strong>${department.departmentName}</strong> as ${
        isDeactivating ? 'Inactive' : 'Active'
      }.${isDeactivating ? ' It will no longer be selectable in department dropdowns.' : ''}`,
      header: isDeactivating ? 'Deactivate this department' : 'Activate this department',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: isDeactivating ? 'Deactivate' : 'Activate',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.toggleDepartmentStatus(department);
      },
    });
  }

  openActionMenu(department: Department, event: Event) {
    this.selectedRow.set(department);
    this.actionMenu()?.toggle(event);
  }

  searchDepartments(value: SettledSearchTerm) {
    const table = this.table();
    if (table) table.first = 0;
    this.store.setSearch(value);
  }

  openFilterDrawer() {
    this.isFilterDrawerOpen.set(true);
  }

  onStatusChange(status: boolean | null) {
    const filters: IDepartmentFilter = { ...this.store.appliedFilters(), status };
    this.store.loadDepartments({ first: 0, rows: this.store.pageSize() }, filters);
  }
}

