import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenu } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { Select, SelectChangeEvent } from '@openng/optimus-ui/select';
import { Table, TableModule } from '@openng/optimus-ui/table';

import { Common } from '@core/services';
import { AssetTypeManageDialog } from '@shared/components/asset/asset-type-manage-dialog/asset-type-manage-dialog';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { AssetType, LoginInfo } from '@shared/interfaces';

import { AssetTypesStore } from './asset-types.store';

@Component({
  selector: 'app-asset-types',
  imports: [
    TableModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    MenuModule,
    TableLoader,
    TableInlineFilters,
    TableEmptyMessage,
    TableSearchInput,
    Select,
    ContextMenu,
  ],
  providers: [ConfirmationService, AssetTypesStore],
  templateUrl: './asset-types.html',
  styleUrls: ['./asset-types.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AssetTypes implements OnInit {
  readonly #store = inject(AssetTypesStore);
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  protected assetTypes = this.#store.assetTypes;
  protected isLoadingTypes = this.#store.isLoadingTypes;
  protected assetCategories = this.#store.assetCategories;
  protected isLoadingCategories = this.#store.isLoadingCategories;
  protected loginInfo?: LoginInfo;
  protected actionMenuItems: MenuItem[] = [];
  protected selectedRow!: AssetType;

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Asset Types',
      pageDescription: 'Manage asset types and their categories',
      pageIcon: 'pi pi-plus',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Assets', routerLink: '/app/assets' },
      { label: 'Manage Types' },
    ]);

    this.initActionMenus();
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.upsertAssetType(this.selectedRow),
      },
      {
        separator: true,
      },
      {
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.deleteType(this.selectedRow),
      },
    ];
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
  }

  searchAssets(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }

  upsertAssetType(assetType?: AssetType) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(AssetTypeManageDialog, {
      header: assetType ? 'Edit Asset Type' : 'Add Asset Type',
      style: { width: '90vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { assetType },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.#store.reloadTypes();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  deleteType(assetType: AssetType) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete ${assetType.typeName}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, delete',
      rejectLabel: 'No, cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.#store.deleteType(assetType);
      },
    });
  }

  onCategoryChange(categoryId: SelectChangeEvent) {
    this.#store.updateAppliedFilters({ category: categoryId.value });
  }
}
