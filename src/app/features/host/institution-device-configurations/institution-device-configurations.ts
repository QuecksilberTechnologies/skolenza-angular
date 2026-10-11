import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MenuItem } from '@openng/optimus-ui/api';
import { CardModule } from '@openng/optimus-ui/card';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { HOST_MODULE } from '@core/host-modules';
import { Common } from '@core/services';
import { CurrentUserPermissionsStore, FeaturePageStore } from '@core/stores';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import { RotateGatewayUrlDialog } from '@shared/components/rotate-gateway-url-dialog/rotate-gateway-url-dialog';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import {
  DeviceCommunicationType,
  SettledSearchTerm,
  InstitutionDeviceConfigurationRow,
} from '@shared/interfaces';
import { GetDeviceCommunicationTypePipe } from '@shared/pipes';
import { DEVICE_COMMUNICATION_TYPES } from '@shared/utilities/common-data';

import { InstitutionDeviceConfigurationDetail } from './institution-device-configuration-detail/institution-device-configuration-detail';
import { InstitutionDeviceConfigurationsStore } from './institution-device-configurations.store';

@Component({
  selector: 'app-institution-device-configurations',
  imports: [
    CardModule,
    ContextMenuModule,
    FormsModule,
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
    InstitutionDeviceConfigurationDetail,
    GetDeviceCommunicationTypePipe,
  ],
  providers: [InstitutionDeviceConfigurationsStore],
  templateUrl: './institution-device-configurations.html',
  styleUrl: './institution-device-configurations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InstitutionDeviceConfigurations {
  readonly #commonService = inject(Common);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);

  readonly store = inject(InstitutionDeviceConfigurationsStore);

  protected readonly communicationTypeOptions = DEVICE_COMMUNICATION_TYPES;
  /** No "All" row — the select's clear button already means "no enrollment filter". */
  protected readonly enrollmentOptions = [
    { label: 'Enrollment on', value: true },
    { label: 'Enrollment off', value: false },
  ];

  // Device screens have no catalog module of their own — they ride the parent `Host` key
  // until the backend models them separately.
  protected readonly moduleKey = HOST_MODULE.host;
  // Distinct from `moduleKey` above — this is `my-menu`'s own moduleCode, used only to source
  // the label the sidebar already shows for this leaf.
  protected readonly moduleCode = 'INSTITUTION_DEVICE_CONFIG';

  /**
   * The backend rejects every Host call to create/update/delete a `InstitutionDeviceConfiguration` -
   * that ownership belongs to the Institution admin now (see
   * `docs/specs/DEVICE_RELATED_API_COMPLETE_HANDOFF.md`). Rotating the gateway URL is the one
   * mutation-shaped action the backend still grants Host, for provisioning/recovery.
   */
  protected readonly canRotate = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Update'),
  );
  protected readonly canUseRowActions = computed(() => this.canRotate());
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 6 : 5));

  /** The row carries only `institutionId`, so the detail sheet gets the name from the same lookup the
   *  institution filter renders. Read off the open row, not the filter — under "Any institution" the two
   *  are different institutions. */
  protected readonly institutionName = computed(() => {
    const institutionId = this.detailRow()?.institutionId;
    return this.store.institutions().find((institution) => institution.id === institutionId)?.companyName;
  });

  /** An empty grid means "nothing matches" when a filter is on, and "nothing exists" otherwise. */
  protected readonly hasActiveFilters = computed(
    () =>
      !!this.store.search() ||
      this.store.institutionId() !== null ||
      this.store.institutionDeviceId() !== null ||
      this.store.communicationType() !== null ||
      this.store.isEnrollmentEnabled() !== null,
  );

  /** Announces the new total after a filter or search silently swaps the grid. */
  protected readonly resultSummary = computed(() => {
    if (this.store.isLoading()) {
      return '';
    }
    const total = this.store.totalRecords();
    return `${total} ${total === 1 ? 'configuration' : 'configurations'} found`;
  });

  /**
   * Connection health for the grid, read off the telemetry the device writes back rather than
   * anything the form sets. A failure newer than the last success wins — a unit that synced
   * yesterday and failed an hour ago is not healthy. The dot never carries the meaning on its
   * own; the label beside it says the same thing in words.
   */
  protected connectionState(row: InstitutionDeviceConfigurationRow): {
    dotClass: string;
    label: string;
    tooltip: string;
  } {
    const succeeded = row.lastSuccessfulConnectionDateTime;
    const failed = row.lastFailedConnectionDateTime;

    if (failed && (!succeeded || new Date(failed) > new Date(succeeded))) {
      return {
        dotClass: 'bg-red-500',
        label: 'Connection failed',
        tooltip: row.lastConnectionError ?? `Last failed on ${this.#formatDateTime(failed)}`,
      };
    }

    if (row.lastSyncDateTime) {
      return {
        dotClass: 'bg-green-500',
        label: this.#formatDateTime(row.lastSyncDateTime),
        tooltip: `Last synced on ${this.#formatDateTime(row.lastSyncDateTime)}`,
      };
    }

    return {
      dotClass: 'bg-zinc-400',
      label: 'Never synced',
      tooltip: 'This device has not reported a sync yet',
    };
  }

  #formatDateTime(value: string): string {
    return this.#commonService.getFormattedDate(value, 'dd MMM, HH:mm');
  }

  protected readonly selectedRow = signal<InstitutionDeviceConfigurationRow | null>(null);
  /**
   * Separate from `selectedRow` on purpose — the context menu emits `contextMenuSelectionChange`
   * with `null` on every dismissal, which would blank the open drawer.
   */
  protected readonly detailRow = signal<InstitutionDeviceConfigurationRow | null>(null);
  protected readonly isShowDetail = signal(false);

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const row = this.selectedRow();
    const canRotate = this.canRotate();

    return [
      {
        label: 'View Details',
        icon: 'pi pi-eye',
        command: () => row && this.showDetail(row),
      },
      ...(canRotate
        ? [
            {
              label: 'Rotate Gateway URL',
              icon: 'pi pi-refresh',
              command: () => row && this.rotateGatewayUrl(row),
            },
          ]
        : []),
    ];
  });

  constructor() {
    effect(() => this.setPageHeaderInfo());
    this.#applyRouteFilters();
  }

  /** The Institution Devices list deep-links here with the device already picked, on the query string
   *  rather than router `state` so a refresh or a pasted link keeps the filter. `setInstitutionId`
   *  clears `institutionDeviceId`, so the device must be applied after it. */
  #applyRouteFilters(): void {
    const institutionId = this.#route.snapshot.queryParamMap.get('institutionId');
    const institutionDeviceId = this.#route.snapshot.queryParamMap.get('institutionDeviceId');

    if (institutionId) {
      this.store.setInstitutionId(institutionId);
    }
    if (institutionDeviceId) {
      this.store.setInstitutionDeviceId(institutionDeviceId);
    }
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Device Configurations',
      pageDescription: 'Manage how each institution device connects to the platform',
      pageIcon: 'pi pi-cog',
      // A single crumb would only repeat the title; the description carries more.
      isBreadcrumbShow: false,
    });
  }

  searchConfigurations(value: SettledSearchTerm) {
    this.store.setSearch(value);
  }

  onInstitutionChange(institutionId: string | null) {
    this.store.setInstitutionId(institutionId ?? null);
  }

  onDeviceChange(institutionDeviceId: string | null) {
    this.store.setInstitutionDeviceId(institutionDeviceId ?? null);
  }

  onCommunicationTypeChange(communicationType: DeviceCommunicationType | null) {
    this.store.setCommunicationType(communicationType ?? null);
  }

  onEnrollmentChange(isEnrollmentEnabled: boolean | null) {
    this.store.setIsEnrollmentEnabled(isEnrollmentEnabled ?? null);
  }

  loadConfigurations(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  showDetail(row: InstitutionDeviceConfigurationRow) {
    this.detailRow.set(row);
    this.isShowDetail.set(true);
  }

  onDetailRotate() {
    const row = this.detailRow();
    if (row) {
      this.rotateGatewayUrl(row);
    }
  }

  rotateGatewayUrl(row: InstitutionDeviceConfigurationRow) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(RotateGatewayUrlDialog, {
      header: `${row.deviceName || 'Device'} - Rotate Gateway URL`,
      style: { width: '90vw', maxWidth: '34rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { by: 'configuration', id: row.id, deviceName: row.deviceName },
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
