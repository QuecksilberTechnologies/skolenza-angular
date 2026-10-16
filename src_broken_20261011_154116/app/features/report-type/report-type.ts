import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
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
import { SelectModule } from '@openng/optimus-ui/select';
import { Table, TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { LoginInfo, ReportType, SettledSearchTerm } from '@shared/interfaces';

import ReportTypeManageDialog from './report-type-manage-dialog/report-type-manage-dialog';
import { ReportTypeStore } from './report-type.store';

@Component({
  selector: 'app-report-type',
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    MenuModule,
    ContextMenuModule,
    SelectModule,
    TagModule,
    TooltipModule,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
    TableSearchFilter,
    TableSearchInput,
    TableActionButton,
  ],
  providers: [ReportTypeStore],
  templateUrl: './report-type.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ReportTypeComponent implements OnInit {
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly store = inject(ReportTypeStore);
  readonly table = viewChild<Table>('dt');
  readonly loginInfo = signal<LoginInfo | null>(null);
  readonly selectedRow = signal<ReportType | null>(null);
  /** This screen's leaf in `GET /Navigation/my-menu`, which publishes the operations it grants. */
  protected readonly moduleCode = 'INSTITUTION_REPORTING_TYPES';
  readonly reportTypeStatusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];
  protected actionMenuItems: MenuItem[] = [];

  constructor() {
    effect(() => this.setPageHeaderInfo());
    this.initActionMenus();
  }

  async ngOnInit() {
    this.loginInfo.set(await this.#commonService.getLoginInfo());
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Report Types',
      pageDescription: 'Manage report types and their configurations',
      pageIcon: 'pi pi-chart-bar',
      isBreadcrumbShow: false,
    });
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.openDialog(this.selectedRow() ?? undefined),
      },
      { separator: true },
      {
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.confirmDelete(this.selectedRow() ?? undefined),
      },
    ];
  }

  loadReportTypes(event: TableLazyLoadEvent) {
    this.store.loadReportTypes(event);
  }

  onStatusChange(status: boolean | null) {
    const filters = { ...this.store.appliedFilters(), status };
    this.store.loadReportTypes({ first: 0, rows: this.store.pageSize() }, true, filters);
  }

  openDialog(reportType?: ReportType) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(ReportTypeManageDialog, {
      header: reportType ? 'Update Report Type' : 'Add Report Type',
      style: { width: '90vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { reportType },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: boolean) => {
      if (!result) return;

      if (reportType?.id) {
        this.store.reloadReportTypes();
      } else {
        if (this.table()) {
          this.table()!.first = 0;
        }
        this.store.loadReportTypes({ first: 0, rows: this.store.pageSize() }, true);
        this.store.reloadReportTypes();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmDelete(reportType?: ReportType) {
    if (!reportType) return;

    this.#confirmationService.confirm({
      message: `This will permanently delete the <strong>${reportType.typeName}</strong> report type. This action cannot be undone.`,
      header: 'Delete Report Type',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.deleteReportType(reportType);
      },
    });
  }

  confirmToggleStatus(reportType: ReportType) {
    const isDeactivating = !!reportType.isActive;

    this.#confirmationService.confirm({
      message: `This will mark <strong>${reportType.typeName}</strong> as ${
        isDeactivating ? 'Inactive' : 'Active'
      }.${isDeactivating ? ' It will no longer be selectable in report type dropdowns.' : ''}`,
      header: isDeactivating ? 'Deactivate this report type' : 'Activate this report type',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: isDeactivating ? 'Deactivate' : 'Activate',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.toggleReportTypeStatus(reportType);
      },
    });
  }

  searchReportTypes(value: SettledSearchTerm) {
    const table = this.table();
    if (table) table.first = 0;
    this.store.setSearch(value);
  }
}

