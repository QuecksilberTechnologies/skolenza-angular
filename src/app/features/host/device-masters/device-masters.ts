import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
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
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MenuModule } from '@openng/optimus-ui/menu';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { finalize } from 'rxjs';

import { HOST_MODULE } from '@core/host-modules';
import { Common, DeviceMasterApi, HostBulkImportApi } from '@core/services';
import { CurrentUserPermissionsStore, FeaturePageStore } from '@core/stores';
import { BulkImportDialog } from '@shared/components/bulk-import-dialog/bulk-import-dialog';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import {
  BulkImportDialogData,
  DeviceMasterRow,
  DeviceType,
  SettledSearchTerm,
} from '@shared/interfaces';
import { CurrencySymbolPipe, GetDeviceTypePipe } from '@shared/pipes';
import { DEVICE_TYPES } from '@shared/utilities/common-data';

import { DEVICE_MASTER_IMPORT_DISPLAY, hostBulkImportAdapter } from '../host-bulk-import';
import { DeviceMasterDetail } from './device-master-detail/device-master-detail';
import { DeviceMastersStore } from './device-masters.store';

@Component({
  selector: 'app-device-masters',
  imports: [
    ButtonModule,
    CardModule,
    CurrencyPipe,
    ConfirmDialogModule,
    ContextMenuModule,
    FormsModule,
    InputTextModule,
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
    DeviceMasterDetail,
    CurrencySymbolPipe,
    GetDeviceTypePipe,
  ],
  providers: [DeviceMastersStore],
  templateUrl: './device-masters.html',
  styleUrl: './device-masters.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeviceMasters {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #router = inject(Router);
  readonly #dialogService = inject(DialogService);
  readonly #hostBulkImportApi = inject(HostBulkImportApi);
  readonly #deviceMasterApi = inject(DeviceMasterApi);
  readonly #destroyRef = inject(DestroyRef);

  readonly store = inject(DeviceMastersStore);

  /** `null` is the "All" row — the same clear affordance the status filter uses. */
  protected readonly deviceTypeOptions: { id: DeviceType | null; label: string }[] = [
    { id: null, label: 'All Types' },
    ...DEVICE_TYPES,
  ];
  protected readonly statusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  // Device screens have no catalog module of their own — they ride the parent `Host` key
  // until the backend models them separately.
  protected readonly moduleKey = HOST_MODULE.host;
  // Distinct from `moduleKey` above — this is `my-menu`'s own moduleCode, used only to source
  // the label the sidebar already shows for this leaf.
  protected readonly moduleCode = 'HOST_DEVICE_SETUP';

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
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 7 : 6));

  /** An empty grid means "nothing matches" when a filter is on, and "nothing exists" otherwise. */
  protected readonly hasActiveFilters = computed(
    () =>
      !!this.store.search() || this.store.deviceType() !== null || this.store.isActive() !== null,
  );

  protected readonly selectedRow = signal<DeviceMasterRow | null>(null);
  /**
   * Separate from `selectedRow` on purpose — the context menu emits `contextMenuSelectionChange`
   * with `null` on every dismissal, which would blank the open drawer.
   */
  protected readonly detailRow = signal<DeviceMasterRow | null>(null);
  protected readonly isShowDetail = signal(false);
  protected readonly serialLookup = signal('');
  protected readonly isLookingUpSerial = signal(false);

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
              command: () => row && this.editDeviceMaster(row),
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
    effect(() => this.setPageHeaderInfo());
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Device Masters',
      pageDescription: 'Manage the catalog of device models institutions can deploy',
      pageIcon: 'pi pi-tablet',
      // A single crumb would only repeat the title; the description carries more.
      isBreadcrumbShow: false,
    });
  }

  searchDeviceMasters(value: SettledSearchTerm) {
    this.store.setSearch(value);
  }

  onDeviceTypeChange(deviceType: DeviceType | null) {
    this.store.setDeviceType(deviceType ?? null);
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive ?? null);
  }

  loadDeviceMasters(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  showDetail(row: DeviceMasterRow) {
    this.detailRow.set(row);
    this.isShowDetail.set(true);
  }

  protected onSerialInput(event: Event) {
    this.serialLookup.set((event.target as HTMLInputElement).value);
  }

  /**
   * Opens the catalogue entry for a serial printed on a physical device.
   *
   * `get-info-by-sno` is an exact-match read, not the grid's `Search`, so a typo returns nothing
   * rather than a near miss - which is the point when someone is checking whether a unit they are
   * holding is already in the catalogue.
   */
  lookUpSerial() {
    const sNo = this.serialLookup().trim();
    if (!sNo || this.isLookingUpSerial()) {
      return;
    }

    this.isLookingUpSerial.set(true);

    this.#deviceMasterApi
      .getDeviceMasterBySerial(sNo)
      .pipe(
        finalize(() => this.isLookingUpSerial.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.isSucceeded && res.data) {
            this.showDetail(res.data);
            this.serialLookup.set('');
            return;
          }

          this.#commonService.showMessage(
            res.message || `No device in the catalogue has serial ${sNo}.`,
            'info',
          );
        },
        error: (err) => this.#commonService.showMessage(err.message, 'error'),
      });
  }

  createDeviceMaster() {
    this.#router.navigate(['/app/device-masters/new']);
  }

  editDeviceMaster(row: DeviceMasterRow) {
    this.#router.navigate(['/app/device-masters', row.id, 'edit']);
  }

  onDetailEdit() {
    const row = this.detailRow();
    if (!row) {
      return;
    }

    // Leave the sheet open. Optimus appends the drawer mask straight to document.body and only
    // removes it on `animationend` — or, on destroy, while `visible` is still true. Closing first
    // strands the mask over the next route.
    this.editDeviceMaster(row);
  }

  confirmToggleActive(row: DeviceMasterRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to change the status of <strong>${row.deviceName ?? 'this device'}</strong>? You can update this again at any time.`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.toggleActive(row),
    });
  }

  confirmDelete(row: DeviceMasterRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${row.deviceName ?? 'this device'}</strong>? Institution devices that point at it will lose their model reference.`,
      header: 'Delete Device Master',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Device',
      rejectLabel: 'Keep Device',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteDeviceMaster(row),
    });
  }
  openBulkImport() {
    // The dialog owns the flow; this screen owns its endpoints and its copy.
    const data: BulkImportDialogData = {
      adapter: hostBulkImportAdapter(this.#hostBulkImportApi, 'DeviceMaster'),
      display: DEVICE_MASTER_IMPORT_DISPLAY,
    };

    const ref = this.#dialogService.open(BulkImportDialog, {
      header: 'Import Devices',
      style: { width: '90vw', maxWidth: '64rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      // Focus enters the dialog on open: the trap only wraps focus that is already inside.
      data,
    });

    // The dialog closes with `true` once an import job ran, so the grid is refetched rather than
    // left showing the catalogue from before the import.
    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (imported) this.store.reloadDeviceMasters();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
