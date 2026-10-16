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
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
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
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import {
  isModuleScopeKey,
  BulkImportDialogData,
  MODULE_SCOPES,
  ModuleScopeKey,
  moduleScopeKeyOf,
  moduleIcon,
  moduleScopeLabel,
  SubModuleRow,
} from '@shared/interfaces';

import { hostBulkImportAdapter, SUB_MODULE_IMPORT_DISPLAY } from '../../host-bulk-import';
import ModuleForm, { ModuleFormData } from '../module-form/module-form';
import { SubModulesStore } from './sub-modules.store';

@Component({
  selector: 'app-sub-modules',
  imports: [
    ButtonModule,
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
    TableActionButton,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
  ],
  providers: [SubModulesStore],
  templateUrl: './sub-modules.html',
  styleUrl: './sub-modules.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SubModules {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #hostBulkImportApi = inject(HostBulkImportApi);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);

  readonly store = inject(SubModulesStore);

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
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUpdate() ? 10 : 9));

  protected readonly selectedRow = signal<SubModuleRow | null>(null);

  protected readonly primaryActionItems = computed<MenuItem[]>(() => [
    { label: 'Parent Headers', icon: 'pi pi-sitemap', routerLink: ['/app/modules'] },
    { label: 'Operations', icon: 'pi pi-bolt', routerLink: ['/app/modules/operations'] },
    {
      label: 'Module Operations',
      icon: 'pi pi-link',
      routerLink: ['/app/modules/module-operations'],
    },
    { separator: true },
    {
      label: 'Import Child Modules',
      icon: 'pi pi-upload',
      disabled: !this.canAdd(),
      command: () => this.openBulkImport(),
    },
  ]);

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const module = this.selectedRow();
    if (!this.canUpdate()) return [];

    return [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.upsertModule(module ?? undefined),
      },
      { separator: true },
      {
        label: module?.isActive ? 'Deactivate' : 'Activate',
        icon: module?.isActive ? 'pi pi-ban' : 'pi pi-check-circle',
        command: () => module && this.confirmToggleActive(module),
      },
    ];
  });

  constructor() {
    this.setPageHeaderInfo();

    // The parent grid's drill-down links here with the parent pre-selected. Scope is applied
    // first because `setModuleScopeKey` clears the parent filter.
    const params = this.#route.snapshot.queryParamMap;
    const moduleScopeKey = params.get('moduleScopeKey');
    if (isModuleScopeKey(moduleScopeKey)) {
      this.store.setModuleScopeKey(moduleScopeKey);
    }

    const parentModuleId = Number(params.get('parentModuleId'));
    if (parentModuleId) {
      this.store.setParentModuleId(parentModuleId);
    }
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Child Modules',
      pageDescription: 'Manage child modules and their parent header mapping',
      pageIcon: 'pi pi-sitemap',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Modules', routerLink: '/app/modules' },
      { label: 'Child Modules' },
    ]);
  }

  protected readonly scopeLabel = moduleScopeLabel;
  protected readonly moduleIcon = moduleIcon;

  searchModules(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }

  onScopeChange(moduleScopeKey: ModuleScopeKey | null) {
    this.store.setModuleScopeKey(moduleScopeKey);
  }

  onParentChange(parentModuleId: number | null) {
    this.store.setParentModuleId(parentModuleId ?? null);
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive ?? null);
  }

  upsertModule(module?: SubModuleRow) {
    const data: ModuleFormData = {
      kind: 'sub',
      module,
      moduleScopeKey: (module && moduleScopeKeyOf(module)) ?? this.store.moduleScopeKey(),
      parentModuleId: module?.parentModuleId ?? this.store.parentModuleId(),
    };

    const ref: DynamicDialogRef | null = this.#dialogService.open(ModuleForm, {
      header: module ? 'Edit child module' : 'Create child module',
      style: { width: '90vw', maxWidth: '52rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data,
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (result) {
        this.store.reloadSubModules();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmToggleActive(module: SubModuleRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to change the status of <strong>${module.displayName}</strong>? You can update this again at any time.`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.toggleActive(module),
    });
  }
  openBulkImport() {
    // The dialog owns the flow; this screen owns its endpoints and its copy.
    const data: BulkImportDialogData = {
      adapter: hostBulkImportAdapter(this.#hostBulkImportApi, 'ChildModule'),
      display: SUB_MODULE_IMPORT_DISPLAY,
    };

    const ref = this.#dialogService.open(BulkImportDialog, {
      header: 'Import Child Modules',
      style: { width: '90vw', maxWidth: '64rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      // Focus enters the dialog on open: the trap only wraps focus that is already inside.
      data,
    });

    // The dialog closes with `true` once an import job ran, so the grid is refetched rather than
    // left showing the child modules from before the import.
    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (imported) this.store.reloadSubModules();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
