import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';

import { Common } from '@core/services';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';

import { TicketType } from '../models';
import { TicketsStore } from '../tickets.store';
import { TicketTypeManageDialog } from './ticket-type-manage-dialog/ticket-type-manage-dialog';

@Component({
  selector: 'app-ticket-type',
  imports: [
    TableModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    MenuModule,
    ContextMenuModule,
    TagModule,
    SelectModule,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
    TableSearchFilter,
    TableSearchInput,
  ],
  templateUrl: './ticket-type.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TicketTypeComponent {
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #store = inject(TicketsStore);
  readonly types = this.#store.types;
  readonly totalRecords = this.#store.typeTotalRecords;
  readonly pageSize = this.#store.typePageSize;
  readonly isLoading = this.#store.isTypeLoading;
  readonly classificationOptions = this.#store.classificationOptions;
  readonly headerOptions = this.#store.headerOptions;
  readonly typeSelectedClassificationId = this.#store.typeSelectedClassificationId;
  protected selectedRow!: TicketType;
  protected actionMenuItems: MenuItem[] = [];

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Ticket Types',
      pageDescription: 'Manage ticket types for better organization',
      pageIcon: 'pi pi-list',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Tickets', routerLink: '/app/tickets' },
      { label: 'Ticket Types' },
    ]);

    this.initActionMenus();
    this.#store.initialize();
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.createEditType(this.selectedRow),
      },
      { separator: true },
      {
        label: 'Delete',
        styleClass: '!text-red-500 font-medium',
        icon: 'pi pi-trash !text-red-500',
        command: () => this.confirmDeleteType(this.selectedRow),
      },
    ];
  }

  getTypes(event: TableLazyLoadEvent) {
    this.#store.loadTypes(event);
  }

  onClassificationChange(classificationId: string | null) {
    this.#store.setTypeClassificationFilter(classificationId);
  }

  onHeaderChange(headerId: string | null) {
    this.#store.setTypeHeaderFilter(headerId);
  }

  createEditType(type?: TicketType) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(TicketTypeManageDialog, {
      header: type ? 'Update Ticket Type' : 'Add Ticket Type',
      style: { width: '90vw', maxWidth: '50rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: {
        type,
        classificationOptions: this.classificationOptions(),
        selectedClassificationId: this.typeSelectedClassificationId(),
        initialHeaderOptions: this.headerOptions(),
      },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: boolean) => {
      if (result) this.#store.reloadTypes();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmDeleteType(type: TicketType) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${type.ticketTypeName}</strong>?`,
      header: 'Delete Ticket Type',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Ticket Type',
      rejectLabel: 'Keep Ticket Type',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.#store.deleteType(type),
    });
  }
}
