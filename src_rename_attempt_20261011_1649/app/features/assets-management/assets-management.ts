import { CdkMenu, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { Select, SelectChangeEvent } from '@openng/optimus-ui/select';
import { SplitButtonModule } from '@openng/optimus-ui/splitbutton';
import { Table, TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { AssetDetail } from '@shared/components/asset/asset-detail/asset-detail';
import { AssetFilter } from '@shared/components/asset/asset-filter/asset-filter';
import { AssetStatsLoader } from '@shared/components/asset/asset-stats-loader/asset-stats-loader';
import { AssetStats } from '@shared/components/asset/asset-stats/asset-stats';
import { UpsertAssetDialog } from '@shared/components/asset/upsert-asset-dialog/upsert-asset-dialog';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { CdkCloseMenuOnScroll } from '@shared/directives';
import { Asset, IAssetFilter, LoginInfo } from '@shared/interfaces';

import { AssetsManagementStore } from './assets-management.store';
import { AssignAssetPopup } from './assign-asset-popup/assign-asset-popup';

@Component({
  selector: 'app-assets-management',
  imports: [
    TableModule,
    ButtonModule,
    ConfirmDialogModule,
    CardModule,
    TagModule,
    MenuModule,
    ContextMenuModule,
    SplitButtonModule,
    HeadlessDrawer,
    AssetStats,
    AssetStatsLoader,
    AssetDetail,
    AssetFilter,
    TableActionButton,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
    TableSearchInput,
    TooltipModule,
    Select,
    TableSearchFilter,
    CdkMenuTrigger,
    CdkMenu,
    CdkCloseMenuOnScroll,
    AssignAssetPopup,
  ],
  providers: [ConfirmationService, AssetsManagementStore],
  templateUrl: './assets-management.html',
  styleUrls: ['./assets-management.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AssetsManagement implements OnInit {
  readonly store = inject(AssetsManagementStore);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #commonService = inject(Common);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  protected primaryActionItems: MenuItem[] = [];
  protected actionMenuItems: MenuItem[] = [];
  protected selectedRow!: Asset;
  protected loginInfo?: LoginInfo;

  /** StaffMembers (roleTypeId 2) only read the grid — no add, assign or row actions. */
  protected get canManageAssets(): boolean {
    return (this.loginInfo?.user?.primaryRole?.roleTypeId ?? 2) !== 2;
  }

  /** The loading and empty rows must span the same columns the header renders. */
  protected get columnCount(): number {
    return this.canManageAssets ? 7 : 6;
  }
  protected isShowDetail = false;
  protected isShowFilter = false;

  constructor() {
    this.setPageHeaderInfo();
    this.initPrimaryActionItems();
    this.initActionMenus();
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    await this.store.loadAssetStatistics();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Assets',
      pageDescription: 'Track, manage, and maintain your company assets efficiently',
      pageIcon: 'pi pi-desktop',
    });
  }

  initPrimaryActionItems() {
    this.primaryActionItems = [
      {
        label: 'Asset Category',
        routerLink: ['/app/assets/asset-categories'],
      },
      { separator: true },
      {
        label: 'Asset Types',
        routerLink: ['/app/assets/asset-types'],
      },
      { separator: true },
      {
        label: 'Asset Status',
        routerLink: ['/app/assets/asset-status'],
      },
    ];
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.upsertAsset(this.selectedRow),
      },
      {
        separator: true,
      },
      {
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.deleteAsset(this.selectedRow),
      },
    ];
  }

  onCategoryChange(asseCategory: SelectChangeEvent) {
    this.store.setCategoryIdForTypes(asseCategory.value);
    this.store.loadAssets({ first: 0, rows: this.store.pageSize() }, true, {
      ...this.store.appliedFilters(),
      category: asseCategory.value,
    });
  }

  onTypeChange(assetType: SelectChangeEvent) {
    this.store.loadAssets({ first: 0, rows: this.store.pageSize() }, true, {
      ...this.store.appliedFilters(),
      assetTypeId: assetType.value,
    });
  }

  onStatusChange(assetStatus: SelectChangeEvent) {
    this.store.loadAssets({ first: 0, rows: this.store.pageSize() }, true, {
      ...this.store.appliedFilters(),
      assetStatusId: assetStatus.value,
    });
  }

  getAssets(event: TableLazyLoadEvent) {
    this.store.loadAssets(event);
  }

  upsertAsset(asset?: Asset) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(UpsertAssetDialog, {
      header: !asset ? 'Add Asset' : 'Edit Asset',
      style: { width: '90vw', maxWidth: '50rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { asset },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: (data?: Asset) => {
        if (!data) return;
        this.store.reloadAssets();
      },
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  deleteAsset(asset: Asset) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete ${asset.assetName}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, delete',
      rejectLabel: 'No, cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.deleteAsset(asset);
      },
    });
  }

  onDetail(asset: Asset) {
    this.isShowDetail = true;
    this.store.setSelectedAsset(asset);
  }

  toggleActiveInactive(asset: Asset) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to change the status of <strong>${asset?.assetName ?? '-'}</strong>? You can update this again at any time.`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.#commonService.showMessage('This feature is under progress', 'warn');
      },
    });
  }

  searchAssets(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }

  filterAssets() {
    this.isShowFilter = true;
  }

  onFilterApplied(filters: IAssetFilter | null) {
    this.isShowFilter = false;
    this.store.loadAssets({ first: 0, rows: this.store.pageSize() }, true, filters);
  }

  onAssetAssigned() {
    this.store.reloadAssets();
  }
}
