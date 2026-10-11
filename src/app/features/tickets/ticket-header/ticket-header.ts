import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
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
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';

import { Common } from '@core/services';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { SettledSearchTerm } from '@shared/interfaces';

import { TicketHeader } from '../models';
import { TicketsStore } from '../tickets.store';
import { TicketHeaderManageDialog } from './ticket-header-manage-dialog/ticket-header-manage-dialog';

@Component({
  selector: 'app-ticket-header',
  imports: [
    FormsModule,
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
  templateUrl: './ticket-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TicketHeaderComponent {
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #store = inject(TicketsStore);
  readonly #defaultSet = signal(false);
  readonly headers = this.#store.headers;
  readonly totalRecords = this.#store.headerTotalRecords;
  readonly pageSize = this.#store.headerPageSize;
  readonly isLoading = this.#store.isHeaderLoading;
  readonly classificationOptions = this.#store.classificationOptions;
  readonly headerSelectedClassificationId = this.#store.headerSelectedClassificationId;
  protected selectedRow!: TicketHeader;
  protected actionMenuItems: MenuItem[] = [];

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Ticket Headers',
      pageDescription: 'Manage ticket headers for better organization',
      pageIcon: 'pi pi-list',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Tickets', routerLink: '/app/tickets' },
      { label: 'Ticket Headers' },
    ]);

    this.initActionMenus();
    this.#store.initialize();

    effect(() => {
      const options = this.classificationOptions();
      if (options.length && !this.#defaultSet()) {
        this.#defaultSet.set(true);
        this.#store.setHeaderClassificationFilter(String(options[0].id));
      }
    });
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.createEditHeader(this.selectedRow),
      },
      { separator: true },
      {
        label: 'Delete',
        styleClass: '!text-red-500 font-medium',
        icon: 'pi pi-trash !text-red-500',
        command: () => this.confirmDeleteHeader(this.selectedRow),
      },
    ];
  }

  getHeaders(event: TableLazyLoadEvent) {
    this.#store.loadHeaders(event);
  }

  onClassificationChange(classificationId: string | null) {
    this.#store.setHeaderClassificationFilter(classificationId);
  }

  createEditHeader(header?: TicketHeader) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(TicketHeaderManageDialog, {
      header: header ? 'Update Header' : 'Add Header',
      style: { width: '90vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { header, classificationOptions: this.classificationOptions() },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: boolean) => {
      if (result) this.#store.reloadHeaders();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmDeleteHeader(header: TicketHeader) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${header.headerName}</strong>?`,
      header: 'Delete Header',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Header',
      rejectLabel: 'Keep Header',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.#store.deleteHeader(header),
    });
  }

  onSearch(value: SettledSearchTerm) {
    this.#store.setHeaderSearch(value);
  }
}
