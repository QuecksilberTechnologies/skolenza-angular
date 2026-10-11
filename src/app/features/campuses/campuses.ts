import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { MenuModule } from '@openng/optimus-ui/menu';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { CurrentUserPermissionsStore, FeaturePageStore, LookupStore } from '@core/stores';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import {
  Country,
  SettledSearchTerm,
  CampusRow,
  CampusType,
} from '@shared/interfaces';
import { GetCampusTypePipe } from '@shared/pipes';
import { CAMPUS_TYPES } from '@shared/utilities/common-data';
import { flagUrl } from '@shared/utilities/flag-url';

import { CampusDetail } from './campus-detail/campus-detail';
import { CampusesStore } from './campuses.store';

@Component({
  selector: 'app-campuses',
  imports: [
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
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
    CampusDetail,
    GetCampusTypePipe,
  ],
  providers: [CampusesStore],
  templateUrl: './campuses.html',
  styleUrl: './campuses.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Campuses {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);
  readonly #lookupStore = inject(LookupStore);
  readonly #router = inject(Router);

  readonly store = inject(CampusesStore);

  /** `null` is the "All" row — the same clear affordance the status filter uses. */
  protected readonly locationTypeOptions: { id: CampusType | null; label: string }[] = [
    { id: null, label: 'All Types' },
    ...CAMPUS_TYPES,
  ];
  protected readonly statusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  /** The Type column already names a head office; the capability tag only adds value when they differ. */
  protected readonly headOfficeType = CampusType.HeadOffice;

  protected readonly countries = this.#lookupStore.countries;
  protected readonly isLoadingCountries = this.#lookupStore.isLoadingCountries;

  protected readonly flagUrl = flagUrl;
  /** Keyed once rather than rescanned per row — the rows only carry `countryId`, not the ISO code. */
  readonly #countryById = computed(() => new Map(this.countries().map((c) => [c.id, c])));
  protected readonly states = this.#lookupStore.states;
  protected readonly isLoadingStates = this.#lookupStore.isLoadingStates;
  protected readonly districts = this.#lookupStore.districts;
  protected readonly isLoadingDistricts = this.#lookupStore.isLoadingDistricts;

  /**
   * This screen's leaf in `GET /Navigation/my-menu`, which publishes the operations it grants.
   * A host session reaches this same route under its own leaf, `HOST_CAMPUS_LIST`
   * (confirmed against a live `/Navigation/my-menu` row, `moduleId: 78`) — `my-menu` grants it
   * `View` only, never `Add`/`Update`/`Delete`. Reading the institution code on a host session would
   * find no match, and `canPerformOrUnknown`'s soft gate fails *open* on an unknown module,
   * showing write actions a host can never use.
   */
  protected readonly moduleCode = computed(() =>
    this.#permissionsStore.isHostSession() ? 'HOST_CAMPUS_LIST' : 'INSTITUTION_CAMPUSES',
  );

  protected readonly isHostSession = this.#permissionsStore.isHostSession;
  protected readonly institutions = this.store.institutions;
  protected readonly isInstitutionsLoading = this.store.isInstitutionsLoading;

  protected readonly canAdd = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode(), 'Add'),
  );
  protected readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode(), 'Update'),
  );
  protected readonly canDelete = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode(), 'Delete'),
  );
  protected readonly canUseRowActions = computed(() => this.canUpdate() || this.canDelete());
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 7 : 6));

  /** An empty grid means "nothing matches" when a filter is on, and "nothing exists" otherwise. */
  protected readonly hasActiveFilters = computed(
    () => !!this.store.search() || this.store.appliedFilterCount() > 0,
  );

  protected readonly selectedRow = signal<CampusRow | null>(null);
  /**
   * Separate from `selectedRow` on purpose — the context menu emits `contextMenuSelectionChange`
   * with `null` on every dismissal, which would blank the open drawer.
   */
  protected readonly detailRow = signal<CampusRow | null>(null);
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
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => row && this.editCampus(row),
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
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode()) ?? 'Locations',
      pageDescription: 'Manage the offices, plants and sites staffMembers can attend from',
      pageIcon: 'pi pi-map-marker',
      // A single crumb would only repeat the title; the description carries more.
      isBreadcrumbShow: false,
    });
  }

  searchCampuses(value: SettledSearchTerm) {
    this.store.setSearch(value);
  }

  onInstitutionChange(institutionId: string | null) {
    this.store.setInstitutionId(institutionId ?? null);
  }

  onLocationTypeChange(locationType: CampusType | null) {
    this.store.setLocationType(locationType ?? null);
  }

  /** Missing parts are dropped rather than rendered as dashes — "-, India" is not an address. */
  /** The list rows carry no ISO code, so the flag comes from the already-loaded country lookup. */
  getCountry(countryId?: number): Country | undefined {
    return countryId == null ? undefined : this.#countryById().get(countryId);
  }

  formatGeography(row: CampusRow): string {
    return [row.localityName, row.districtName, row.stateName, row.countryName]
      .filter((part): part is string => !!part?.trim())
      .join(', ');
  }

  /** A stale state or district would filter the grid down to nothing, so the cascade clears both. */
  onCountryChange(countryId: number | null) {
    this.store.setCountryId(countryId ?? null);
    this.#lookupStore.loadStates(countryId ?? undefined);
    this.#lookupStore.loadDistricts(undefined);
  }

  onStateChange(stateId: number | null) {
    this.store.setStateId(stateId ?? null);
    this.#lookupStore.loadDistricts(stateId ?? undefined);
  }

  onDistrictChange(districtId: number | null) {
    this.store.setDistrictId(districtId ?? null);
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive ?? null);
  }

  loadCampuses(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  showDetail(row: CampusRow) {
    this.detailRow.set(row);
    this.isShowDetail.set(true);
  }

  createCampus() {
    this.#router.navigate(['/app/campuses/new']);
  }

  editCampus(row: CampusRow) {
    this.#router.navigate(['/app/campuses', row.id, 'edit']);
  }

  onDetailEdit() {
    const row = this.detailRow();
    if (!row) {
      return;
    }

    // Leave the sheet open. Optimus appends the drawer mask straight to document.body and only
    // removes it on `animationend` — or, on destroy, while `visible` is still true. Closing first
    // strands the mask over the next route.
    this.editCampus(row);
  }

  confirmToggleActive(row: CampusRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to change the status of <strong>${row.locationName ?? 'this location'}</strong>? Deactivating is rejected while devices or staffMember assignments still point at it.`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.toggleActive(row),
    });
  }

  confirmDelete(row: CampusRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${row.locationName ?? 'this location'}</strong>? Devices, location assignments, work arrangements and patterns that reference it will block the delete.`,
      header: 'Delete Location',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Location',
      rejectLabel: 'Keep Location',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteCampus(row),
    });
  }
}

