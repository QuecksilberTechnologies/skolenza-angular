import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { SelectModule } from '@openng/optimus-ui/select';
import { SplitButtonModule } from '@openng/optimus-ui/splitbutton';
import { Table, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { HOST_MODULE } from '@core/host-modules';
import { Common, HostBulkImportApi } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { BulkImportDialog } from '@shared/components/bulk-import-dialog/bulk-import-dialog';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import { IconTile } from '@shared/components/icon-tile/icon-tile';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableFilterSelect } from '@shared/components/table/table-filter-select/table-filter-select';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import {
  BulkImportDialogData,
  MODULE_SCOPES,
  ModuleOperationRow,
  ModuleScopeKey,
} from '@shared/interfaces';

import { hostBulkImportAdapter, MODULE_OPERATION_IMPORT_DISPLAY } from '../../host-bulk-import';
import { ModuleOperationDetail } from './module-operation-detail/module-operation-detail';
import ModuleOperationForm, {
  ModuleOperationFormData,
} from './module-operation-form/module-operation-form';
import { ModuleOperationsStore } from './module-operations.store';

@Component({
  selector: 'app-module-operations',
  imports: [
    CardModule,
    ConfirmDialogModule,
    ContextMenuModule,
    FormsModule,
    MenuModule,
    SelectModule,
    SplitButtonModule,
    TableModule,
    TagModule,
    TooltipModule,
    HeadlessDrawer,
    IconTile,
    ModuleOperationDetail,
    TableActionButton,
    TableEmptyMessage,
    TableFilterSelect,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
  ],
  providers: [ModuleOperationsStore],
  templateUrl: './module-operations.html',
  styleUrl: './module-operations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ModuleOperations {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #hostBulkImportApi = inject(HostBulkImportApi);
  readonly #destroyRef = inject(DestroyRef);
  readonly #platformId = inject(PLATFORM_ID);

  readonly store = inject(ModuleOperationsStore);

  /** Filtering shrinks the result set, so the paginator has to be sent back to the first page. */
  protected readonly table = viewChild<Table>('dt');

  protected readonly scopeOptions = MODULE_SCOPES;

  protected readonly statusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  readonly #permissionsStore = inject(CurrentUserPermissionsStore);
  // Institutions and Modules have no catalog module of their own — they ride the
  // parent `Host` key until the backend models them separately.
  protected readonly moduleKey = HOST_MODULE.host;

  protected readonly canAdd = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Add'),
  );
  protected readonly canUpdate = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Update'),
  );
  protected readonly canDelete = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Delete'),
  );
  /**
   * The loading and empty rows must span the same columns the header renders. Every role reaches
   * the detail sheet, so the actions column is unconditional.
   */
  protected readonly columnCount = 8;

  protected readonly selectedRow = signal<ModuleOperationRow | null>(null);

  /**
   * The detail sheet needs its own subject. `selectedRow` cannot serve: it is bound to
   * `contextMenuSelection`, and Optimus emits `null` through that binding on every context-menu
   * dismissal, which would blank the sheet the instant the menu closed.
   */
  protected readonly detailModuleOperation = signal<ModuleOperationRow | null>(null);
  protected readonly isDetailOpen = signal(false);
  /** `p-drawer` never restores focus itself, so the opener is remembered and refocused on close. */
  #returnFocusTo: HTMLElement | null = null;
  /** The row control that opened the action menu, so focus returns to it rather than the overlay. */
  #actionMenuTrigger: HTMLElement | null = null;

  protected readonly primaryActionItems = computed<MenuItem[]>(() => [
    { label: 'Parent Headers', icon: 'pi pi-th-large', routerLink: ['/app/modules'] },
    { label: 'Child Modules', icon: 'pi pi-sitemap', routerLink: ['/app/modules/sub-modules'] },
    { label: 'Operations', icon: 'pi pi-bolt', routerLink: ['/app/modules/operations'] },
    { separator: true },
    {
      label: 'Import Module Operations',
      icon: 'pi pi-upload',
      disabled: !this.canAdd(),
      command: () => this.openBulkImport(),
    },
  ]);

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const moduleOperation = this.selectedRow();
    const canUpdate = this.canUpdate();
    const canDelete = this.canDelete();

    return [
      {
        label: 'View Details',
        icon: 'pi pi-eye',
        command: () =>
          moduleOperation && this.viewDetails(moduleOperation, this.#actionMenuTrigger),
      },
      ...(canUpdate || canDelete ? [{ separator: true }] : []),
      ...(canUpdate
        ? [
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => this.upsertModuleOperation(moduleOperation ?? undefined),
            },
          ]
        : []),
      ...(canUpdate && canDelete ? [{ separator: true }] : []),
      ...(canDelete
        ? [
            {
              label: 'Delete',
              icon: 'pi pi-trash',
              command: () => moduleOperation && this.confirmDelete(moduleOperation),
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
      pageTitle: 'Module Operations',
      pageDescription: 'Map operations to modules',
      pageIcon: 'pi pi-link',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Modules', routerLink: '/app/modules' },
      { label: 'Module Operations' },
    ]);
  }

  moduleLabel(moduleOperation: ModuleOperationRow): string {
    return moduleOperation.moduleName || `#${moduleOperation.moduleId}`;
  }

  operationLabel(moduleOperation: ModuleOperationRow): string {
    return moduleOperation.operationName || `#${moduleOperation.operationId}`;
  }

  /** An operation is not always performed against a module — say which kind this row maps. */
  moduleKindLabel(moduleOperation: ModuleOperationRow): string {
    if (moduleOperation.isOperational) return 'Operational';
    return this.store.scopedModules().get(moduleOperation.moduleId)?.isLeafNode ? 'Leaf' : 'Module';
  }

  searchModuleOperations(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }

  onScopeChange(moduleScopeKey: ModuleScopeKey | null) {
    this.#resetPage();
    this.store.setModuleScopeKey(moduleScopeKey ?? null);
  }

  onModuleChange(moduleId: number | null) {
    this.#resetPage();
    this.store.setModuleId(moduleId ?? null);
  }

  onOperationChange(operationId: number | null) {
    this.#resetPage();
    this.store.setOperationId(operationId ?? null);
  }

  onStatusChange(isActive: boolean | null) {
    this.#resetPage();
    this.store.setIsActive(isActive ?? null);
  }

  /** Without this a filter applied from page 3 leaves the grid empty on a page that no longer exists. */
  #resetPage() {
    const table = this.table();
    if (table) {
      table.first = 0;
    }
  }

  openActionMenu(
    moduleOperation: ModuleOperationRow,
    event: Event,
    menu: { toggle: (event: Event) => void },
  ) {
    this.selectedRow.set(moduleOperation);
    this.#actionMenuTrigger = event.currentTarget as HTMLElement | null;
    menu.toggle(event);
  }

  /** A right-click must not leave the previous row's kebab behind as the focus target. */
  onContextMenuSelection(moduleOperation: ModuleOperationRow | null) {
    this.selectedRow.set(moduleOperation);
    this.#actionMenuTrigger = null;
  }

  /**
   * `trigger` is passed explicitly because the kebab route runs from inside a body-appended menu
   * overlay that is torn down before the drawer closes — `document.activeElement` would point at a
   * detached node by then.
   */
  viewDetails(moduleOperation: ModuleOperationRow, trigger?: HTMLElement | null) {
    this.#returnFocusTo =
      trigger ??
      (isPlatformBrowser(this.#platformId) ? (document.activeElement as HTMLElement | null) : null);
    this.detailModuleOperation.set(moduleOperation);
    this.isDetailOpen.set(true);
  }

  /** The drawer's own mask-click and Escape paths close themselves; mirror that back here. */
  onDetailVisibleChange(visible: boolean) {
    if (!visible) {
      this.closeDetails();
    }
  }

  /**
   * Setting `visible` false does not make `p-drawer` emit `onHide` — only its own mask-click and
   * Escape paths do — so both routes funnel through here and it has to be safe to run twice.
   */
  closeDetails() {
    if (!this.isDetailOpen() && !this.detailModuleOperation()) {
      return;
    }

    this.isDetailOpen.set(false);
    this.detailModuleOperation.set(null);
    this.#returnFocusTo?.focus();
    this.#returnFocusTo = null;
  }

  /** Swaps the panel for the edit dialog rather than stacking a modal on top of the drawer. */
  editFromDetails(moduleOperation: ModuleOperationRow) {
    // The dialog autofocuses its first field, so the drawer must not pull focus back afterwards.
    this.#returnFocusTo = null;
    this.closeDetails();
    this.upsertModuleOperation(moduleOperation);
  }

  upsertModuleOperation(moduleOperation?: ModuleOperationRow) {
    // The dialog's own scope select seeds from the grid's, or a new mapping saves into a scope the
    // grid is not showing and the row disappears on reload.
    const data: ModuleOperationFormData = {
      moduleOperation,
      moduleScopeKey: this.store.moduleScopeKey(),
    };

    const ref: DynamicDialogRef | null = this.#dialogService.open(ModuleOperationForm, {
      header: moduleOperation ? 'Edit module operation' : 'Create module operation',
      style: { width: '90vw', maxWidth: '52rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data,
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (result) {
        this.store.reloadModuleOperations();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmDelete(moduleOperation: ModuleOperationRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete the mapping <strong>${this.moduleLabel(moduleOperation)} → ${this.operationLabel(moduleOperation)}</strong>? Roles will lose that permission cell.`,
      header: 'Delete Module Operation',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteModuleOperation(moduleOperation),
    });
  }
  openBulkImport() {
    // The dialog owns the flow; this screen owns its endpoints and its copy.
    const data: BulkImportDialogData = {
      adapter: hostBulkImportAdapter(this.#hostBulkImportApi, 'ModuleOperation'),
      display: MODULE_OPERATION_IMPORT_DISPLAY,
    };

    const ref = this.#dialogService.open(BulkImportDialog, {
      header: 'Import Module Operations',
      style: { width: '90vw', maxWidth: '64rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      // Focus enters the dialog on open: the trap only wraps focus that is already inside.
      data,
    });

    // The dialog closes with `true` once an import job ran, so the grid is refetched rather than
    // left showing the module operations from before the import.
    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (imported) this.store.reloadModuleOperations();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
