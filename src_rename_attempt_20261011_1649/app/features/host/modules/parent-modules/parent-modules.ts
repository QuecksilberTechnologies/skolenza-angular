import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
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
import { Popover, PopoverModule } from '@openng/optimus-ui/popover';
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
  BulkImportDialogData,
  MODULE_SCOPES,
  ModuleRow,
  ModuleScopeKey,
  moduleScopeKeyOf,
  moduleIcon,
  moduleScopeLabel,
  moduleScopeSeverity,
} from '@shared/interfaces';

import { hostBulkImportAdapter, MODULE_IMPORT_DISPLAY } from '../../host-bulk-import';
import ModuleForm, { ModuleFormData } from '../module-form/module-form';
import { ParentModulesStore } from './parent-modules.store';
import { ParentSubModulesDetail } from './parent-sub-modules-detail/parent-sub-modules-detail';

@Component({
  selector: 'app-parent-modules',
  imports: [
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ContextMenuModule,
    FormsModule,
    MenuModule,
    PopoverModule,
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
    ParentSubModulesDetail,
  ],
  providers: [ParentModulesStore],
  templateUrl: './parent-modules.html',
  styleUrl: './parent-modules.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ParentModules {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #hostBulkImportApi = inject(HostBulkImportApi);

  readonly store = inject(ParentModulesStore);
  readonly popover = viewChild<Popover>('op');

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

  protected readonly selectedRow = signal<ModuleRow | null>(null);

  protected readonly primaryActionItems = computed<MenuItem[]>(() => [
    { label: 'Child Modules', icon: 'pi pi-sitemap', routerLink: ['/app/modules/sub-modules'] },
    { label: 'Operations', icon: 'pi pi-bolt', routerLink: ['/app/modules/operations'] },
    {
      label: 'Module Operations',
      icon: 'pi pi-link',
      routerLink: ['/app/modules/module-operations'],
    },
    { separator: true },
    {
      label: 'Import Parent Headers',
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
        // No endpoint can update a nested sub-header without losing its parent: the ParentModule
        // update DTO carries no `parentModuleId`, and `/ChildModule/{id}` has no record of one.
        disabled: this.isSubHeader(module),
        tooltip: this.isSubHeader(module)
          ? 'Sub headers cannot be edited yet — the API has no update route that keeps their parent.'
          : undefined,
        command: () => !this.isSubHeader(module) && this.upsertModule(module ?? undefined),
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
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Modules',
      pageDescription: 'Manage application modules',
      pageIcon: 'pi pi-th-large',
      isBreadcrumbShow: false,
    });
  }

  protected readonly scopeLabel = moduleScopeLabel;
  protected readonly scopeSeverity = moduleScopeSeverity;
  protected readonly moduleIcon = moduleIcon;

  searchModules(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }

  onScopeChange(moduleScopeKey: ModuleScopeKey | null) {
    this.store.setModuleScopeKey(moduleScopeKey);
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive ?? null);
  }

  /** A header the tree nested under another one — flattened into this grid, but not editable here. */
  isSubHeader(module: ModuleRow | null | undefined): boolean {
    return !!module?.parentModuleId;
  }

  upsertModule(module?: ModuleRow) {
    // Guarded by `isSubHeader` at every entry point — a sub-header would be saved without its
    // parent link, because `UpdateParentModuleRequestDTO` has no field for it.
    if (this.isSubHeader(module)) {
      return;
    }

    const data: ModuleFormData = {
      kind: 'parent',
      module,
      moduleScopeKey: (module && moduleScopeKeyOf(module)) ?? this.store.moduleScopeKey(),
    };

    const ref: DynamicDialogRef | null = this.#dialogService.open(ModuleForm, {
      header: module ? 'Edit parent header' : 'Create parent header',
      style: { width: '90vw', maxWidth: '52rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data,
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (result) {
        this.store.reloadParentModules();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  openBulkImport() {
    // The dialog owns the flow; this screen owns its endpoints and its copy.
    const data: BulkImportDialogData = {
      adapter: hostBulkImportAdapter(this.#hostBulkImportApi, 'Module'),
      display: MODULE_IMPORT_DISPLAY,
    };

    const ref = this.#dialogService.open(BulkImportDialog, {
      header: 'Import Parent Headers',
      style: { width: '90vw', maxWidth: '64rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      // Focus enters the dialog on open: the trap only wraps focus that is already inside.
      data,
    });

    // The dialog closes with `true` once an import job ran, so the grid is refetched rather than
    // left showing the modules from before the import.
    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (imported) this.store.reloadParentModules();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmToggleActive(module: ModuleRow) {
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

  showSubModulesPopover(event: Event, module: ModuleRow) {
    this.popover()?.hide();
    // The popover keeps its old content until the next tick, so the row swap waits for the hide.
    setTimeout(() => {
      this.selectedRow.set(module);
      this.popover()?.show(event);
      this.popover()?.align();
    });
  }

  hidePopover() {
    this.popover()?.hide();
  }
}
