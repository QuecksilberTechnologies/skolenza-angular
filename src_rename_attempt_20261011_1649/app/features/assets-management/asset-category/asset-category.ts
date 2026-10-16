import { ChangeDetectionStrategy, Component, inject, OnInit, viewChild } from '@angular/core';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { Table, TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';

import { Common } from '@core/services';
import { AssetCategoryManageDialog } from '@shared/components/asset/asset-category-manage-dialog/asset-category-manage-dialog';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { IAssetCategory, LoginInfo } from '@shared/interfaces';

import { AssetCategoryStore } from './asset-category.store';

@Component({
  selector: 'app-asset-category',
  imports: [
    TableModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    MenuModule,
    ContextMenuModule,
    TableLoader,
    TableInlineFilters,
    TableEmptyMessage,
    TableSearchInput,
    TagModule,
  ],
  providers: [AssetCategoryStore],
  templateUrl: './asset-category.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AssetCategory implements OnInit {
  readonly #store = inject(AssetCategoryStore);
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly table = viewChild<Table>('dt');
  readonly assetCategories = this.#store.assetCategories;
  readonly isLoadingCategories = this.#store.isLoading;
  readonly pageSize = this.#store.pageSize;
  readonly totalRecords = this.#store.totalRecords;
  protected actionMenuItems: MenuItem[] = [];
  protected selectedRow!: IAssetCategory;
  protected loginInfo!: LoginInfo;

  constructor() {
    this.setPageHeaderInfo();
    this.initActionMenus();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Asset Categories',
      pageDescription: 'Manage asset categories and their types',
      pageIcon: 'pi pi-plus',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Assets', routerLink: '/app/assets' },
      { label: 'Manage Categories' },
    ]);
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.upsertAssetCategory(this.selectedRow),
      },
      {
        separator: true,
      },
      {
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.deleteCategory(this.selectedRow),
      },
    ];
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
  }

  loadCategories(event: TableLazyLoadEvent, isPageChange = true) {
    this.#store.loadCategories(event, isPageChange);
  }

  searchAssets(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }

  upsertAssetCategory(assetCategory?: IAssetCategory) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(AssetCategoryManageDialog, {
      header: assetCategory ? 'Edit Asset Category' : 'Add Asset Category',
      style: { width: '90vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { assetCategory },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: boolean) => {
      if (result) {
        const isPageChange = !(assetCategory && assetCategory.id);
        if (isPageChange && this.table()) {
          this.table()!.first = 0;
        }
        this.#store.reloadCategories();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  deleteCategory(assetCategory: IAssetCategory) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete ${assetCategory.categoryName}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, delete',
      rejectLabel: 'No, cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.#store.deleteCategory(assetCategory);
      },
    });
  }
}
