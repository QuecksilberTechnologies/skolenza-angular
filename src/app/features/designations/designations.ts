import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
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
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { SelectModule } from '@openng/optimus-ui/select';
import { SplitButtonModule } from '@openng/optimus-ui/splitbutton';
import { Table, TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common, DesignationsApi } from '@core/services';
import { INSTITUTION_ACCESS_MODULE_CODES } from '@core/feature-page-identifiers';
import { FeaturePageStore, LookupStore } from '@core/stores';
import { BulkImportDialog } from '@shared/components/bulk-import-dialog/bulk-import-dialog';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import {
  BulkImportDialogData,
  IDepartmentFilter,
  IDesignation,
  LoginInfo,
  SettledSearchTerm,
} from '@shared/interfaces';

import {
  DESIGNATION_IMPORT_DISPLAY,
  designationBulkImportAdapter,
} from './designation-bulk-import';
import DesignationManageDialog from './designation-manage-dialog/designation-manage-dialog';
import { DesignationsStore } from './designations.store';

@Component({
  selector: 'app-designations',
  imports: [
    TableModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    MenuModule,
    ContextMenuModule,
    FormsModule,
    SelectModule,
    TooltipModule,
    TableLoader,
    TagModule,
    TableActionButton,
    TableEmptyMessage,
    TableSearchFilter,
    TableInlineFilters,
    TableSearchInput,
    SplitButtonModule,
  ],
  templateUrl: './designations.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DesignationsStore],
})
export default class Designations implements OnInit {
  readonly #lookupStore = inject(LookupStore);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #designationsApi = inject(DesignationsApi);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly store = inject(DesignationsStore);
  readonly table = viewChild<Table>('dt');
  readonly departments = this.#lookupStore.departmentOptions;
  readonly isLoadingDepartments = this.#lookupStore.isLoadingDepartmentOptions;
  readonly loginInfo = signal<LoginInfo | null>(null);
  protected readonly selectedRow = signal<IDesignation | null>(null);
  protected breadcrumbItems: MenuItem[] = [];
  protected isShowFilter = false;
  protected readonly moduleCode = INSTITUTION_ACCESS_MODULE_CODES.designation;

  readonly departmentStatusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  protected readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Update'),
  );

  protected readonly designationSplitButtonItems: MenuItem[] = [
    {
      label: 'Import Designations',
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
        command: () => this.createDesignation(row),
      },
      { separator: true },
      {
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.confirmDeleteDesignation(row),
      },
    ];
  });

  constructor() {
    effect(() => this.setPageHeaderInfo());
  }

  async ngOnInit() {
    this.loginInfo.set(await this.#commonService.getLoginInfo());
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Designations',
      pageDescription: 'Manage designations and their configurations',
      pageIcon: 'pi pi-id-card',
      isBreadcrumbShow: false,
    });
  }

  getDesignations(
    event: TableLazyLoadEvent,
    isPageChange = true,
    filters?: IDepartmentFilter | null,
  ) {
    this.store.loadDesignations(event, isPageChange, filters);
  }

  onDepartmentChange(departmentId: number) {
    const filters = { ...this.store.appliedFilters(), departmentId };
    this.store.loadDesignations({ first: 0, rows: this.store.pageSize() }, true, filters);
  }

  onStatusChange(status: boolean | null) {
    const filters = { ...this.store.appliedFilters(), status };
    this.store.loadDesignations({ first: 0, rows: this.store.pageSize() }, true, filters);
  }

  createDesignation(designation?: IDesignation | null) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(DesignationManageDialog, {
      header: designation ? 'Update Designation' : 'Add Designation',
      style: { width: '90vw', maxWidth: '45rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { designation, departments: this.departments() },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (!result) {
        return;
      }

      const isEdit = designation && designation.id;
      if (isEdit) {
        this.store.reloadDesignations();
      } else {
        if (this.table()) {
          this.table()!.first = 0;
        }
        this.store.reloadFirstPage();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  openBulkImport() {
    // The dialog owns the flow; Designations owns its endpoints and its copy.
    const data: BulkImportDialogData = {
      adapter: designationBulkImportAdapter(this.#designationsApi),
      display: DESIGNATION_IMPORT_DISPLAY,
    };

    const ref = this.#dialogService.open(BulkImportDialog, {
      header: 'Import Designations',
      style: { width: '90vw', maxWidth: '64rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      // Focus enters the dialog on open: the trap only wraps focus that is already inside.
      data,
    });

    // The dialog closes with `true` once an import job ran, so the list is refetched rather than
    // left showing the designations from before the import.
    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (imported) this.store.reloadFirstPage();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmDeleteDesignation(designation?: IDesignation | null) {
    if (!designation) return;

    this.#confirmationService.confirm({
      message: `This will permanently delete the <strong>${designation.designationName}</strong> and all its contents. This action cannot be undone.`,
      header: 'Delete this designation',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Designation',
      rejectLabel: 'Keep Designation',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.deleteDesignation(designation);
      },
    });
  }

  confirmToggleStatus(designation: IDesignation) {
    const isDeactivating = !!designation.isActive;

    this.#confirmationService.confirm({
      message: `This will mark <strong>${designation.designationName}</strong> as ${
        isDeactivating ? 'Inactive' : 'Active'
      }.${isDeactivating ? ' It will no longer be selectable in designation dropdowns.' : ''}`,
      header: isDeactivating ? 'Deactivate this designation' : 'Activate this designation',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: isDeactivating ? 'Deactivate' : 'Activate',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.toggleDesignationStatus(designation);
      },
    });
  }

  searchDesignations(value: SettledSearchTerm) {
    const table = this.table();
    if (table) table.first = 0;
    this.store.setSearch(value);
  }
}

