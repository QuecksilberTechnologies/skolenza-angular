import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { HOST_MODULE } from '@core/host-modules';
import { Common } from '@core/services';
import { CurrentUserPermissionsStore, FeaturePageStore } from '@core/stores';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableFilterSelect } from '@shared/components/table/table-filter-select/table-filter-select';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { SettledSearchTerm, InstitutionDeviceRow } from '@shared/interfaces';

import { DeviceBootstrapDialog } from './device-bootstrap-dialog/device-bootstrap-dialog';
import { InstitutionDeviceDetail } from './institution-device-detail/institution-device-detail';
import { InstitutionDevicesStore } from './institution-devices.store';

@Component({
  selector: 'app-institution-devices',
  imports: [
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ContextMenuModule,
    MenuModule,
    TableModule,
    TagModule,
    TooltipModule,
    TableActionButton,
    TableEmptyMessage,
    TableFilterSelect,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
    HeadlessDrawer,
    InstitutionDeviceDetail,
  ],
  providers: [InstitutionDevicesStore],
  templateUrl: './institution-devices.html',
  styleUrl: './institution-devices.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InstitutionDevices {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #router = inject(Router);

  readonly store = inject(InstitutionDevicesStore);

  /** No "Any" row — the select's clear button already means "no attendance filter". */
  protected readonly attendanceOptions = [
    { label: 'Attendance device', value: true },
    { label: 'Not an attendance device', value: false },
  ];
  /** No "All" row — the select's clear button already means "no status filter". */
  protected readonly statusOptions = [
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  // Device screens have no catalog module of their own — they ride the parent `Host` key
  // until the backend models them separately.
  protected readonly moduleKey = HOST_MODULE.host;
  // Distinct from `moduleKey` above — this is `my-menu`'s own moduleCode, used only to source
  // the label the sidebar already shows for this leaf.
  protected readonly moduleCode = 'INSTITUTION_DEVICES';

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
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 8 : 7));

  /** An empty grid means "nothing matches" when a filter is on, and "nothing exists" otherwise. */
  protected readonly hasActiveFilters = computed(
    () =>
      !!this.store.search() ||
      this.store.institutionId() !== null ||
      this.store.campusId() !== null ||
      this.store.deviceMasterId() !== null ||
      this.store.isAttendanceDevice() !== null ||
      this.store.isActive() !== null,
  );

  /** Announces the new total after a filter or search silently swaps the grid. */
  protected readonly resultSummary = computed(() => {
    if (this.store.isLoading()) {
      return '';
    }
    const total = this.store.totalRecords();
    return `${total} ${total === 1 ? 'device' : 'devices'} found`;
  });

  protected readonly selectedRow = signal<InstitutionDeviceRow | null>(null);
  /**
   * Separate from `selectedRow` on purpose — the context menu emits `contextMenuSelectionChange`
   * with `null` on every dismissal, which would blank the open drawer.
   */
  protected readonly detailRow = signal<InstitutionDeviceRow | null>(null);
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
              label: 'Device Configuration',
              icon: 'pi pi-cog',
              command: () => row && this.openDeviceConfiguration(row),
            },
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => row && this.editInstitutionDevice(row),
            },
            {
              label: row?.isActive ? 'Deactivate' : 'Activate',
              icon: row?.isActive ? 'pi pi-ban' : 'pi pi-check-circle',
              command: () => row && this.confirmToggleActive(row),
            },
            {
              label: 'Device Setup',
              icon: 'pi pi-link',
              command: () => row && this.openDeviceBootstrap(row),
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
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Institution Devices',
      pageDescription: 'Manage devices installed across institution campuses',
      pageIcon: 'pi pi-sitemap',
      // A single crumb would only repeat the title; the description carries more.
      isBreadcrumbShow: false,
    });
  }

  searchInstitutionDevices(value: SettledSearchTerm) {
    this.store.setSearch(value);
  }

  onInstitutionChange(institutionId: string | null) {
    this.store.setInstitutionId(institutionId ?? null);
  }

  onLocationChange(campusId: number | null) {
    this.store.setCampusId(campusId ?? null);
  }

  onDeviceMasterChange(deviceMasterId: number | null) {
    this.store.setDeviceMasterId(deviceMasterId ?? null);
  }

  onAttendanceChange(isAttendanceDevice: boolean | null) {
    this.store.setIsAttendanceDevice(isAttendanceDevice ?? null);
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive ?? null);
  }

  loadInstitutionDevices(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  showDetail(row: InstitutionDeviceRow) {
    this.detailRow.set(row);
    this.isShowDetail.set(true);
  }

  createInstitutionDevice() {
    this.#router.navigate(['/app/institution-devices/new']);
  }

  /**
   * The Host-side first-connection setup: mints the one-time URL that points a factory-fresh device
   * at this server. Nothing in the grid changes, so the close needs no reload.
   */
  openDeviceBootstrap(row: InstitutionDeviceRow) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(DeviceBootstrapDialog, {
      header: `${row.deviceName || 'Device'} - Device Setup`,
      style: { width: '90vw', maxWidth: '34rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { device: row },
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  /** `get-by-id` is institution-scoped and the form is route-driven, so the institution travels on the query
   *  string — router `state` would not survive a refresh or a pasted link. */
  editInstitutionDevice(row: InstitutionDeviceRow) {
    this.#router.navigate(['/app/institution-devices', row.id, 'edit'], {
      queryParams: { institutionId: row.institutionId ?? this.store.institutionId() },
    });
  }

  /** Deep link into the institution-wide Device Configurations list, pre-filtered to this device. */
  openDeviceConfiguration(row: InstitutionDeviceRow) {
    this.#router.navigate(['/app/institution-device-configurations'], {
      queryParams: { institutionId: row.institutionId ?? this.store.institutionId(), institutionDeviceId: row.id },
    });
  }

  onDetailEdit() {
    const row = this.detailRow();
    if (!row) {
      return;
    }

    // Leave the sheet open. Optimus appends the drawer mask straight to document.body and only
    // removes it on `animationend` — or, on destroy, while `visible` is still true. Closing first
    // strands the mask over the next route.
    this.editInstitutionDevice(row);
  }

  confirmToggleActive(row: InstitutionDeviceRow) {
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

  confirmDelete(row: InstitutionDeviceRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${row.deviceName ?? 'this device'}</strong>? Its attendance and enrollment history stays with the institution, but the device stops syncing.`,
      header: 'Delete Institution Device',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Device',
      rejectLabel: 'Keep Device',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteInstitutionDevice(row),
    });
  }
}
