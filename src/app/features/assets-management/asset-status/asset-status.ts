import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenu } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { Table, TableModule } from '@openng/optimus-ui/table';

import { Common } from '@core/services';
import { AssetStatusManageDialog } from '@shared/components/asset/asset-status-manage-dialog/asset-status-manage-dialog';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { AssetStatus, LoginInfo } from '@shared/interfaces';

import { AssetStatusStore } from './asset-status.store';

@Component({
  selector: 'app-asset-status',
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
    ContextMenu,
  ],
  providers: [ConfirmationService, AssetStatusStore],
  templateUrl: './asset-status.html',
  styleUrls: ['./asset-status.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AssetStatusComponent implements OnInit {
  readonly #store = inject(AssetStatusStore);
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  protected assetStatuses = this.#store.assetStatuses;
  protected isLoadingStatus = this.#store.isLoading;
  protected loginInfo?: LoginInfo;
  protected actionMenuItems: MenuItem[] = [];
  protected selectedRow!: AssetStatus;

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Asset Status',
      pageDescription: 'Manage asset statuses and their configurations',
      pageIcon: 'pi pi-plus',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Assets', routerLink: '/app/assets' },
      { label: 'Manage Status' },
    ]);

    this.initActionMenus();
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.upsertAssetStatus(this.selectedRow),
      },
      {
        separator: true,
      },
      {
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.deleteStatus(this.selectedRow),
      },
    ];
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
  }

  searchAssets(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }

  upsertAssetStatus(assetStatus?: AssetStatus) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(AssetStatusManageDialog, {
      header: assetStatus ? 'Edit Asset Status' : 'Add Asset Status',
      style: { width: '90vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { assetStatus },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: (result) => {
        if (result) {
          this.#store.reloadStatuses();
        }
      },
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  deleteStatus(assetStatus: AssetStatus) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete ${assetStatus.statusName}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, delete',
      rejectLabel: 'No, cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.#store.deleteStatus(assetStatus);
      },
    });
  }
}
