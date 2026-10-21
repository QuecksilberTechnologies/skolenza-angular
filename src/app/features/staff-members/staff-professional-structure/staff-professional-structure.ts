import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  Type,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { SelectModule } from '@openng/optimus-ui/select';
import { TieredMenu, TieredMenuModule } from '@openng/optimus-ui/tieredmenu';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { filter, forkJoin, Subscription, take } from 'rxjs';

import { Common, StaffProfessionalStructureApi } from '@core/services';
import { FeaturePageStore, LookupStore } from '@core/stores';
import {
  ListSkeleton,
  LoadMore,
  type RouteTab,
  RouteTabs,
  StatusBadge,
  TableActionButton,
  TableEmptyMessage,
} from '@shared/components';
import {
  InstitutionStaffCategory,
  StaffPositionMaster,
  StaffProfessionalMaster,
  StaffProfessionalMasterType,
} from '@shared/interfaces';
import { errorMessage } from '@shared/utilities/error-message';
import { openManageDialog } from '@shared/utilities/manage-dialog';
import { allPages, pagedList, PagedList } from '@shared/utilities/paged-list';
import { pendingCounter } from '@shared/utilities/pending-counter';
import { confirmStatusChange, statusRowActions } from '@shared/utilities/status-change';

import {
  ProfessionalMasterDialog,
  ProfessionalMasterDialogData,
} from './professional-master-dialog/professional-master-dialog';
import {
  StaffCategoryDialog,
  StaffCategoryDialogData,
} from './staff-category-dialog/staff-category-dialog';
import {
  STAFF_POSITION_TITLE_ID,
  StaffPositionDialog,
  StaffPositionDialogData,
} from './staff-position-dialog/staff-position-dialog';

type StructureTab = StaffProfessionalMasterType | 'categories' | 'positions';
type StatusFilter = 'all' | 'active' | 'inactive';

/** URL segment under `/app/staff/professional-structure/` for each tab. */
export const STRUCTURE_TAB_ROUTES: readonly { route: string; tab: StructureTab }[] = [
  { route: 'job-families', tab: StaffProfessionalMasterType.JobFamily },
  { route: 'staff-categories', tab: 'categories' },
  { route: 'capabilities', tab: StaffProfessionalMasterType.Capability },
  { route: 'duties', tab: StaffProfessionalMasterType.DutyDefinition },
  { route: 'positions', tab: 'positions' },
];

/** Singular and plural record names per tab, for headings, tab labels and empty states. */
const TAB_NOUNS: Record<StructureTab, { singular: string; plural: string }> = {
  [StaffProfessionalMasterType.JobFamily]: { singular: 'Job Family', plural: 'Job Families' },
  categories: { singular: 'Staff Category', plural: 'Staff Categories' },
  [StaffProfessionalMasterType.Capability]: { singular: 'Capability', plural: 'Capabilities' },
  [StaffProfessionalMasterType.DutyDefinition]: { singular: 'Duty', plural: 'Duties' },
  positions: { singular: 'Position', plural: 'Positions' },
};

/** Professional-structure endpoints sit under the Staff Directory permission boundary (see module-operation-routes.ts). */
const MODULE_CODE = 'STAFF_DIRECTORY';

@Component({
  selector: 'app-staff-professional-structure',
  imports: [
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    FormsModule,
    ListSkeleton,
    LoadMore,
    NgTemplateOutlet,
    RouteTabs,
    SelectModule,
    StatusBadge,
    TableActionButton,
    TableEmptyMessage,
    TieredMenuModule,
    TooltipModule,
  ],
  templateUrl: './staff-professional-structure.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffProfessionalStructure implements OnInit {
  readonly #api = inject(StaffProfessionalStructureApi);
  readonly #common = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(DialogService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #lookups = inject(LookupStore);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);

  readonly masterTypes = StaffProfessionalMasterType;
  readonly tabs: RouteTab<StructureTab>[] = STRUCTURE_TAB_ROUTES.map((item) => ({
    id: item.tab,
    route: item.route,
    label: TAB_NOUNS[item.tab].plural,
  }));
  readonly selectedTab = signal<StructureTab>(StaffProfessionalMasterType.JobFamily);
  /** A failed request shows its error as a toast. */
  readonly #toast = (error: unknown): void =>
    this.#common.showMessage(errorMessage(error), 'error');
  readonly statusFilter = signal<StatusFilter>('all');
  /** "Active" is filtered by the server; "Inactive" only on the loaded rows (no API option). */
  readonly #activeOnly = (): boolean => this.statusFilter() === 'active';
  // Each tab's list is server-paged and grows with "Load more".
  readonly categoryList = pagedList(
    (page) => this.#api.getCategories(page, this.#activeOnly()),
    this.#destroyRef,
    { onError: this.#toast },
  );
  readonly positionList = pagedList(
    (page) => this.#api.getPositions(page, undefined, this.#activeOnly()),
    this.#destroyRef,
    { onError: this.#toast },
  );
  /** Job Families, Capabilities and Duties share one list; it reads the selected tab's type. */
  readonly masterList = pagedList(
    (page) =>
      this.#api.getMasters(
        this.selectedTab() as StaffProfessionalMasterType,
        page,
        this.#activeOnly(),
      ),
    this.#destroyRef,
    { onError: this.#toast },
  );
  /** Every row of each reference list, for the category and position dialog pickers. */
  readonly jobFamilies = signal<StaffProfessionalMaster[]>([]);
  readonly capabilities = signal<StaffProfessionalMaster[]>([]);
  readonly duties = signal<StaffProfessionalMaster[]>([]);
  readonly categories = signal<InstitutionStaffCategory[]>([]);
  readonly #referenceLoad = pendingCounter();
  #referenceRequest?: Subscription;
  /** Categories, job families, capabilities and duties the category and position dialogs pick from. */
  readonly referencesLoading = this.#referenceLoad.active;
  readonly #referencesLoading$ = toObservable(this.referencesLoading);
  readonly statusOptions = [
    { label: 'All statuses', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];
  readonly noun = computed(() => TAB_NOUNS[this.selectedTab()]);
  readonly canAdd = computed(() => this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Add'));
  readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Update'),
  );
  /** Deactivating a master or position calls its DELETE endpoint (a soft deactivate). */
  readonly canDelete = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Delete'),
  );
  readonly rowMenuItems = signal<MenuItem[]>([]);

  ngOnInit(): void {
    this.#lookups.reloadStaffCategories();
    this.#common.setPageHeaderInfo({
      pageTitle: 'Staff Professional Structure',
      pageDescription: 'Manage institution-owned job families, positions, capabilities and duties',
      pageIcon: 'pi pi-sitemap',
      isBreadcrumbShow: true,
    });
    this.#common.setBreadcrumbItems([
      { label: 'Staff Directory', routerLink: '/app/staff' },
      { label: 'Professional Structure' },
    ]);

    this.loadReferenceData();
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const match = STRUCTURE_TAB_ROUTES.find((item) => item.route === params.get('tab'));
      if (!match) {
        void this.#router.navigate(['..', STRUCTURE_TAB_ROUTES[0].route], {
          relativeTo: this.#route,
          replaceUrl: true,
        });
        return;
      }
      this.selectTab(match.tab);
    });
  }

  selectTab(tab: StructureTab): void {
    this.selectedTab.set(tab);
    this.#reloadSelected();
  }

  /** Server-side "Active" changes which rows come back, so leaving or entering it reloads. */
  setStatusFilter(value: StatusFilter): void {
    const wasActiveOnly = this.#activeOnly();
    this.statusFilter.set(value);
    if (this.#activeOnly() !== wasActiveOnly) this.#reloadSelected();
  }

  /** Clears the selected tab's list first, so it shows a loading state instead of stale rows. */
  #reloadSelected(): void {
    const list = this.#selectedList();
    list.clear();
    list.reload();
  }

  /** Opens the add dialog for the current tab. */
  openAdd(): void {
    const tab = this.selectedTab();
    if (tab === 'categories') this.openCategoryDialog();
    else if (tab === 'positions') this.openPositionDialog();
    else this.openMasterDialog(tab);
  }

  openMasterDialog(type: StaffProfessionalMasterType, master?: StaffProfessionalMaster): void {
    const data: ProfessionalMasterDialogData = { type, master };
    this.#openDialog(ProfessionalMasterDialog, data, !!master, '36rem', () => {
      // Job Families, Capabilities and Duties feed the other tabs' pickers.
      this.loadReferenceData();
      this.loadSelected();
    });
  }

  openCategoryDialog(category?: InstitutionStaffCategory): void {
    this.#afterReferences(() => {
      const data: StaffCategoryDialogData = { category, jobFamilies: this.jobFamilies() };
      this.#openDialog(StaffCategoryDialog, data, !!category, '40rem', () => {
        // Categories feed the position dialog's picker.
        this.loadReferenceData();
        this.loadSelected();
      });
    });
  }

  openPositionDialog(position?: StaffPositionMaster): void {
    this.#afterReferences(() => {
      const data: StaffPositionDialogData = {
        position,
        categories: this.categories(),
        jobFamilies: this.jobFamilies(),
        capabilities: this.capabilities(),
        duties: this.duties(),
      };
      this.#openDialog(
        StaffPositionDialog,
        data,
        !!position,
        '56rem',
        () => this.loadSelected(),
        STAFF_POSITION_TITLE_ID,
      );
    });
  }

  /** Fetches the selected tab's loaded pages again, so a save keeps the rows already shown. */
  loadSelected(): void {
    this.#selectedList().refresh();
  }

  /** The list the selected tab shows. */
  #selectedList(): Pick<PagedList<unknown>, 'reload' | 'refresh' | 'clear' | 'hasMore'> {
    const tab = this.selectedTab();
    if (tab === 'categories') return this.categoryList;
    if (tab === 'positions') return this.positionList;
    return this.masterList;
  }

  setCategoryActive(item: InstitutionStaffCategory): void {
    this.#api
      .setCategoryActive(item.id, !item.isActive)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          this.loadReferenceData();
          this.loadSelected();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  confirmCategoryActive(item: InstitutionStaffCategory): void {
    this.confirmStatusChange(item.name, item.isActive, () => this.setCategoryActive(item));
  }

  deleteMaster(item: StaffProfessionalMaster): void {
    const tab = this.selectedTab();
    if (typeof tab === 'string') return;
    this.#api
      .deleteMaster(tab, item.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          this.loadReferenceData();
          this.loadSelected();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  activateMaster(item: StaffProfessionalMaster): void {
    const tab = this.selectedTab();
    if (typeof tab === 'string') return;
    this.#api
      .saveMaster(tab, { ...item, isActive: true })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          this.loadReferenceData();
          this.loadSelected();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  confirmMasterActive(item: StaffProfessionalMaster): void {
    // The backend DELETE endpoints soft-deactivate (isActive = false); nothing is hard-deleted.
    this.confirmStatusChange(item.name, item.isActive, () =>
      item.isActive ? this.deleteMaster(item) : this.activateMaster(item),
    );
  }

  deletePosition(item: StaffPositionMaster): void {
    this.#api
      .deletePosition(item.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          this.loadSelected();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  activatePosition(item: StaffPositionMaster): void {
    this.#api
      .savePosition({
        ...item,
        institutionStaffCategoryMasterId: item.institutionStaffCategoryMasterId ?? 0,
        isActive: true,
        capabilities: item.capabilities.map((value, index) => ({
          id: value.id,
          isMandatory: value.isMandatory,
          displayOrder: (index + 1) * 10,
        })),
        duties: item.duties.map((value, index) => ({
          id: value.id,
          isMandatory: value.isMandatory,
          displayOrder: (index + 1) * 10,
        })),
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          this.loadSelected();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  confirmPositionActive(item: StaffPositionMaster): void {
    this.confirmStatusChange(item.name, item.isActive, () =>
      item.isActive ? this.deletePosition(item) : this.activatePosition(item),
    );
  }

  /**
   * Every row of the four reference lists, inactive ones included. A newer load cancels the one in
   * flight, so a late response cannot overwrite fresher lists; a failure shows one toast.
   */
  private loadReferenceData(): void {
    this.#referenceRequest?.unsubscribe();
    const masters = (type: StaffProfessionalMasterType) =>
      allPages((page) => this.#api.getMasters(type, page, false));
    this.#referenceRequest = forkJoin({
      categories: allPages((page) => this.#api.getCategories(page, false)),
      jobFamilies: masters(StaffProfessionalMasterType.JobFamily),
      capabilities: masters(StaffProfessionalMasterType.Capability),
      duties: masters(StaffProfessionalMasterType.DutyDefinition),
    })
      .pipe(this.#referenceLoad.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: ({ categories, jobFamilies, capabilities, duties }) => {
          this.categories.set(categories);
          this.jobFamilies.set(jobFamilies);
          this.capabilities.set(capabilities);
          this.duties.set(duties);
        },
        error: this.#toast,
      });
  }

  /**
   * Runs `open` once reference data has loaded. The dialogs copy those lists when they open, so
   * opening early (straight after landing on the page) would leave their pickers empty.
   */
  #afterReferences(open: () => void): void {
    this.#referencesLoading$
      .pipe(
        filter((loading) => !loading),
        take(1),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(open);
  }

  /** A row shows its action menu only when at least one action in it is permitted. */
  hasRowActions(isActive: boolean, canDeactivate: boolean): boolean {
    return this.canUpdate() || (isActive && canDeactivate);
  }

  openRowMenu(menu: TieredMenu, event: Event, items: MenuItem[]): void {
    this.rowMenuItems.set(items);
    menu.toggle(event);
  }

  categoryActions(item: InstitutionStaffCategory): MenuItem[] {
    return this.rowActions(
      item.isActive,
      this.canUpdate(),
      () => this.openCategoryDialog(item),
      () => this.confirmCategoryActive(item),
    );
  }

  masterActions(item: StaffProfessionalMaster): MenuItem[] {
    return this.rowActions(
      item.isActive,
      this.canDelete(),
      () => {
        const tab = this.selectedTab();
        if (typeof tab !== 'string') this.openMasterDialog(tab, item);
      },
      () => this.confirmMasterActive(item),
    );
  }

  positionActions(item: StaffPositionMaster): MenuItem[] {
    return this.rowActions(
      item.isActive,
      this.canDelete(),
      () => this.openPositionDialog(item),
      () => this.confirmPositionActive(item),
    );
  }

  /**
   * Whether the status filter, not an empty tab, explains the empty list. `total` is the tab's
   * loaded row count: above zero means the client-side filter hid every loaded row. "Active" is
   * filtered by the server, so an empty answer there may still hide inactive rows.
   */
  filterHidRows(total: number): boolean {
    return total > 0 || this.#activeOnly();
  }

  emptyMessage(total: number): string {
    const plural = this.noun().plural.toLowerCase();
    if (!this.filterHidRows(total)) return `No ${plural} yet`;
    // Pages still to load may hold matching rows.
    return this.#selectedList().hasMore()
      ? `No ${this.statusFilter()} ${plural} on the loaded pages`
      : `No ${this.statusFilter()} ${plural}`;
  }

  emptyDetail(total: number): string {
    const plural = this.noun().plural.toLowerCase();
    if (!this.filterHidRows(total))
      return `${plural[0].toUpperCase()}${plural.slice(1)} appear here once added.`;
    return this.#selectedList().hasMore()
      ? 'Load more to check the rest, or change the status filter.'
      : `Change the status filter to see all ${plural}.`;
  }

  visibleCategories(): InstitutionStaffCategory[] {
    return this.filterByStatus(this.categoryList.items());
  }
  visibleMasters(): StaffProfessionalMaster[] {
    return this.filterByStatus(this.masterList.items());
  }
  visiblePositions(): StaffPositionMaster[] {
    return this.filterByStatus(this.positionList.items());
  }

  private filterByStatus<T extends { isActive: boolean }>(values: T[]): T[] {
    const status = this.statusFilter();
    return status === 'all'
      ? values
      : values.filter((item) => item.isActive === (status === 'active'));
  }

  private rowActions(
    isActive: boolean,
    canDeactivate: boolean,
    edit: () => void,
    toggleActive: () => void,
  ): MenuItem[] {
    return statusRowActions({
      isActive,
      canEdit: this.canUpdate(),
      canDeactivate,
      canActivate: this.canUpdate(),
      edit,
      toggleActive,
    });
  }

  /** Opens a manage dialog and runs `onSaved` when it closes after a successful save. */
  #openDialog(
    component: Type<unknown>,
    data: unknown,
    isEdit: boolean,
    maxWidth: string,
    onSaved: () => void,
    titleId?: string,
  ): void {
    openManageDialog(
      this.#dialogService,
      this.#destroyRef,
      {
        component,
        header: `${isEdit ? 'Edit' : 'Add'} ${this.noun().singular}`,
        maxWidth,
        data,
        titleId,
      },
      onSaved,
    );
  }

  private confirmStatusChange(name: string, isActive: boolean, accept: () => void): void {
    confirmStatusChange(
      this.#confirmationService,
      name,
      isActive,
      accept,
      'It will no longer be available for new dependent selections.',
    );
  }
}
