import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
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

import { HOST_MODULE } from '@core/host-modules';
import { Common, HostBulkImportApi } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { BulkImportDialog } from '@shared/components/bulk-import-dialog/bulk-import-dialog';
import { IconTile } from '@shared/components/icon-tile/icon-tile';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { BulkImportDialogData, OPERATION_TYPES, OperationRow } from '@shared/interfaces';

import { hostBulkImportAdapter, OPERATION_IMPORT_DISPLAY } from '../../host-bulk-import';
import OperationForm, { OperationFormData } from './operation-form/operation-form';
import { OperationsStore } from './operations.store';

@Component({
  selector: 'app-operations',
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
    IconTile,
    TableActionButton,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
  ],
  providers: [OperationsStore],
  templateUrl: './operations.html',
  styleUrl: './operations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Operations {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #hostBulkImportApi = inject(HostBulkImportApi);
  readonly #destroyRef = inject(DestroyRef);

  readonly store = inject(OperationsStore);

  protected readonly typeOptions = OPERATION_TYPES;
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
  protected readonly canUseRowActions = computed(() => this.canUpdate() || this.canDelete());
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 5 : 4));

  protected readonly selectedRow = signal<OperationRow | null>(null);

  protected readonly primaryActionItems = computed<MenuItem[]>(() => [
    { label: 'Parent Headers', icon: 'pi pi-th-large', routerLink: ['/app/modules'] },
    { label: 'Child Modules', icon: 'pi pi-sitemap', routerLink: ['/app/modules/sub-modules'] },
    {
      label: 'Module Operations',
      icon: 'pi pi-link',
      routerLink: ['/app/modules/module-operations'],
    },
    { separator: true },
    {
      label: 'Import Operations',
      icon: 'pi pi-upload',
      disabled: !this.canAdd(),
      command: () => this.openBulkImport(),
    },
  ]);

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const operation = this.selectedRow();
    const canUpdate = this.canUpdate();
    const canDelete = this.canDelete();

    return [
      ...(canUpdate
        ? [
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => this.upsertOperation(operation ?? undefined),
            },
          ]
        : []),
      ...(canUpdate && canDelete ? [{ separator: true }] : []),
      ...(canDelete
        ? [
            {
              label: 'Delete',
              icon: 'pi pi-trash',
              command: () => operation && this.confirmDelete(operation),
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
      pageTitle: 'Operations',
      pageDescription: 'Manage the master list of operations',
      pageIcon: 'pi pi-bolt',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Modules', routerLink: '/app/modules' },
      { label: 'Operations' },
    ]);
  }

  /** `get-all-operations` never returns `operationType`, so a row without one gets no tag at all. */
  typeLabel(operationType: number | null | undefined): string | null {
    if (operationType == null) {
      return null;
    }

    return (
      this.typeOptions.find((type) => type.value === operationType)?.label ?? `${operationType}`
    );
  }

  searchOperations(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }

  onTypeChange(operationType: number | null) {
    this.store.setOperationType(operationType ?? null);
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive ?? null);
  }

  upsertOperation(operation?: OperationRow) {
    const data: OperationFormData = { operation };

    const ref: DynamicDialogRef | null = this.#dialogService.open(OperationForm, {
      header: operation ? 'Edit operation' : 'Create operation',
      style: { width: '90vw', maxWidth: '46rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data,
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (result) {
        this.store.reloadOperations();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmDelete(operation: OperationRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${operation.operationName}</strong>? Any module mapping that uses it will stop working.`,
      header: 'Delete Operation',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteOperation(operation),
    });
  }
  openBulkImport() {
    // The dialog owns the flow; this screen owns its endpoints and its copy.
    const data: BulkImportDialogData = {
      adapter: hostBulkImportAdapter(this.#hostBulkImportApi, 'Operation'),
      display: OPERATION_IMPORT_DISPLAY,
    };

    const ref = this.#dialogService.open(BulkImportDialog, {
      header: 'Import Operations',
      style: { width: '90vw', maxWidth: '64rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      // Focus enters the dialog on open: the trap only wraps focus that is already inside.
      data,
    });

    // The dialog closes with `true` once an import job ran, so the grid is refetched rather than
    // left showing the operations from before the import.
    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (imported) this.store.reloadOperations();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
