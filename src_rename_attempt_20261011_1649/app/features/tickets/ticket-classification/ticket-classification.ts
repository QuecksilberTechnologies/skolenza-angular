import { ChangeDetectionStrategy, Component, DestroyRef, inject, viewChild } from '@angular/core';
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
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { SettledSearchTerm } from '@shared/interfaces';

import { TicketClassification } from '../models';
import { TicketsStore } from '../tickets.store';
import { TicketClassificationManageDialog } from './ticket-classification-manage-dialog/ticket-classification-manage-dialog';

@Component({
  selector: 'app-ticket-classification',
  imports: [
    TableModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    MenuModule,
    ContextMenuModule,
    TagModule,
    TableLoader,
    TableEmptyMessage,
    TableSearchInput,
    TableInlineFilters,
    TableSearchFilter,
  ],
  templateUrl: './ticket-classification.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TicketClassificationComponent {
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #store = inject(TicketsStore);
  readonly table = viewChild<Table>('dt');
  protected selectedRow!: TicketClassification;
  protected actionMenuItems: MenuItem[] = [];
  readonly classifications = this.#store.classifications;
  readonly totalRecords = this.#store.classificationTotalRecords;
  readonly pageSize = this.#store.classificationPageSize;
  readonly isLoading = this.#store.isClassificationLoading;

  constructor() {
    this.setPageHeaderInfo();
    this.initActionMenus();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Ticket Classifications',
      pageDescription: 'Manage ticket classifications for better organization',
      pageIcon: 'pi pi-tags',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Tickets', routerLink: '/app/tickets' },
      { label: 'Ticket Classifications' },
    ]);
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.createEditClassification(this.selectedRow),
      },
      { separator: true },
      {
        label: 'Delete',
        styleClass: '!text-red-500 font-medium',
        icon: 'pi pi-trash !text-red-500',
        command: () => this.confirmDeleteClassification(this.selectedRow),
      },
    ];
  }

  getClassifications(event: TableLazyLoadEvent) {
    this.#store.loadClassifications(event);
  }

  createEditClassification(classification?: TicketClassification) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(
      TicketClassificationManageDialog,
      {
        header: classification ? 'Update Classification' : 'Add Classification',
        style: { width: '90vw', maxWidth: '40rem' },
        contentStyle: { overflow: 'hidden' },
        modal: true,
        closable: true,
        focusOnShow: false,
        data: { classification },
      },
    );

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: boolean) => {
      if (result) this.#store.reloadClassifications();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmDeleteClassification(classification: TicketClassification) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${classification.classificationName}</strong>?`,
      header: 'Delete Classification',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Classification',
      rejectLabel: 'Keep Classification',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.#store.deleteClassification(classification),
    });
  }

  onSearch(value: SettledSearchTerm) {
    this.#store.setClassificationSearch(value);
  }
}
