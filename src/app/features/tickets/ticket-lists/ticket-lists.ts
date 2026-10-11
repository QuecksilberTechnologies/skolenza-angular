import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { BadgeModule } from '@openng/optimus-ui/badge';
import { ButtonModule } from '@openng/optimus-ui/button';
import { Card } from '@openng/optimus-ui/card';
import { ChipModule } from '@openng/optimus-ui/chip';
import { ConfirmDialog } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { SelectModule } from '@openng/optimus-ui/select';
import { SplitButtonModule } from '@openng/optimus-ui/splitbutton';
import { TableModule, TableLazyLoadEvent } from '@openng/optimus-ui/table';

import { Common } from '@core/services';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import {
  AssetStatsLoader,
  TableInlineFilters,
  TableSearchInput,
  TableLoader,
  TableEmptyMessage,
} from '@shared/index';
import { LoginInfo } from '@shared/interfaces';

import { ITicket, ITicketAgentSummary } from '../models';
import TicketStats from '../ticket-stats/ticket-stats';
import { TicketsStore } from '../tickets.store';
import { AssigneeCell } from './assignee-cell/assignee-cell';
import TicketManageDialog from './ticket-manage-dialog/ticket-manage-dialog';

/** Status/priority pill colours. Literal class strings so Tailwind can scan them. */
const PILL_CLASS: Record<string, string> = {
  red: 'bg-red-50! text-red-700! dark:bg-red-400/10! dark:text-red-300! dark:ring-1! dark:ring-inset! dark:ring-red-400/25!',
  amber:
    'bg-amber-50! text-amber-700! dark:bg-amber-400/10! dark:text-amber-300! dark:ring-1! dark:ring-inset! dark:ring-amber-400/25!',
  blue: 'bg-blue-50! text-blue-700! dark:bg-blue-400/10! dark:text-blue-300! dark:ring-1! dark:ring-inset! dark:ring-blue-400/25!',
  emerald:
    'bg-emerald-50! text-emerald-700! dark:bg-emerald-400/10! dark:text-emerald-300! dark:ring-1! dark:ring-inset! dark:ring-emerald-400/25!',
  zinc: 'bg-zinc-100! text-zinc-600! dark:bg-zinc-400/10! dark:text-zinc-300! dark:ring-1! dark:ring-inset! dark:ring-zinc-400/25!',
};

@Component({
  selector: 'app-ticket-lists',
  imports: [
    UserAvatar,
    ButtonModule,
    SplitButtonModule,
    Card,
    TableModule,
    TableSearchInput,
    TableInlineFilters,
    SelectModule,
    ClipboardModule,
    ChipModule,
    BadgeModule,
    MenuModule,
    ContextMenuModule,
    AssigneeCell,
    TableLoader,
    TableEmptyMessage,
    ConfirmDialog,
    TicketStats,
    AssetStatsLoader,
  ],
  templateUrl: './ticket-lists.html',
  styleUrl: './ticket-lists.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TicketLists implements OnInit {
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #router = inject(Router);
  readonly store = inject(TicketsStore);
  readonly #clipboard = inject(Clipboard);
  readonly #confirmationService = inject(ConfirmationService);
  readonly pageNumber = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly sortBy = signal<string | null>('updated');
  readonly sortOrder = signal<string | null>('desc');
  readonly selectedTickets = signal<ITicket[]>([]);

  protected readonly statusOptions = ['Open', 'Pending', 'Solved', 'Reopened', 'On Hold'];
  protected readonly priorityOptions = ['High', 'Urgent', 'Medium', 'Low'];

  protected readonly departmentOptions = computed(() => [
    ...new Set(this.store.tickets().map((t) => t.department)),
  ]);

  protected onLazyLoad(event: TableLazyLoadEvent) {
    const { page, rows, sortField, sortOrder } = this.#commonService.getPaginationParam(event);
    this.pageNumber.set(page);
    this.pageSize.set(rows);
    this.sortBy.set((sortField as string) ?? 'updated');
    this.sortOrder.set(sortOrder);
    this.#loadTickets();
  }

  #loadTickets() {
    return this.store.loadTickets({
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    });
  }

  protected primaryActionItems: MenuItem[] = [];
  protected actionMenuItems: MenuItem[] = [];
  protected selectedRow!: ITicket;
  protected loginInfo!: LoginInfo;

  constructor() {
    this.setPageHeaderInfo();
    this.initPrimaryActionItems();
    this.initActionMenus();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Tickets',
      pageDescription: 'Manage your tickets',
      pageIcon: 'pi pi-ticket',
      isBreadcrumbShow: false,
    });
  }

  initPrimaryActionItems() {
    this.primaryActionItems = [
      {
        label: 'Ticket Classifications',
        icon: 'pi pi-tags',
        routerLink: ['/app/tickets/classifications'],
      },
      {
        label: 'Ticket Header',
        icon: 'pi pi-list',
        routerLink: ['/app/tickets/headers'],
      },
      {
        label: 'Ticket Types',
        icon: 'pi pi-list',
        routerLink: ['/app/tickets/types'],
      },
      {
        label: 'Support Teams',
        icon: 'pi pi-users',
        routerLink: ['/app/tickets/support-teams'],
      },
    ];
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'Open Ticket',
        icon: 'pi pi-external-link',
        command: () => this.onTicketClick(this.selectedRow),
      },
      {
        label: 'Copy Ticket ID',
        icon: 'pi pi-link',
        command: () => this.copyTicketId(this.selectedRow),
      },
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.upserTicket(this.selectedRow),
      },
      {
        separator: true,
      },
      {
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.deleteTicket(this.selectedRow),
      },
    ];
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();

    await Promise.all([
      this.store.initialize(),
      this.store.loadCategories(),
      this.store.loadAgentsSummary(),
    ]);
  }

  protected upserTicket(ticket?: ITicket) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(TicketManageDialog, {
      header: `${ticket ? 'Edit Ticket' : 'Create Ticket'}`,
      style: { width: '90vw', maxWidth: '50rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: {
        ticket: ticket,
        classificationOptions: this.store.classificationOptions(),
        requestedForUserId: this.store.userNumericStaffMemberId(),
      },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(async (result) => {
      if (result) {
        await this.#loadTickets();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  protected priorityPillClass(priority: string): string {
    if (priority === 'High' || priority === 'Urgent') return PILL_CLASS['red'];
    if (priority === 'Medium') return PILL_CLASS['amber'];
    return PILL_CLASS['blue'];
  }

  protected statusPillClass(status: string): string {
    switch (status) {
      case 'Open':
        return PILL_CLASS['blue'];
      case 'Pending':
        return PILL_CLASS['amber'];
      case 'Solved':
        return PILL_CLASS['emerald'];
      case 'Reopened':
        return PILL_CLASS['red'];
      default:
        return PILL_CLASS['zinc'];
    }
  }

  protected slaTextClass(slaStatus: string): string {
    if (slaStatus === 'overdue') return 'text-red-600 dark:text-red-400';
    if (slaStatus === 'met') return 'text-emerald-600 dark:text-emerald-400';
    return 'text-zinc-500 dark:text-zinc-400';
  }

  protected slaProgressClass(slaStatus: string): string {
    if (slaStatus === 'overdue') return 'bg-red-500 dark:bg-red-400';
    return 'bg-amber-500 dark:bg-amber-400';
  }

  protected onAgentSelected(ticket: ITicket, agent: ITicketAgentSummary): void {
    ticket.assignedTo = agent.name;
    ticket.assignedToInitial = agent.initial;
  }

  protected onUnassigned(ticket: ITicket): void {
    ticket.assignedTo = '';
    ticket.assignedToInitial = '';
  }

  protected copyTicketId(ticket: ITicket) {
    this.#clipboard.copy(ticket.id);
    this.#commonService.showMessage('Ticket ID copied. You can now paste it.', 'success');
  }

  protected onTicketClick(ticket: ITicket) {
    this.#router.navigate(['/app/tickets', ticket.id]);
  }

  deleteTicket(_ticket: ITicket) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete this ticket?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, delete',
      rejectLabel: 'No, cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.#commonService.showMessage(
          'This operation is not yet implemented. Please check back later.',
          'warn',
        );
      },
    });
  }
}
