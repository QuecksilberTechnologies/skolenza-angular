import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { TableModule } from '@openng/optimus-ui/table';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';

import { ISupportAgent } from '../models';
import { TicketsStore } from '../tickets.store';
import TicketAgentAddDialog from './ticket-agent-add-dialog/ticket-agent-add-dialog';

@Component({
  selector: 'app-ticket-agents',
  imports: [
    UserAvatar,
    CardModule,
    ButtonModule,
    TableModule,
    TooltipModule,
    TableSearchFilter,
    TableEmptyMessage,
    TableLoader,
    MenuModule,
    ContextMenuModule,
    ConfirmDialogModule,
    TableInlineFilters,
    TableSearchInput,
  ],
  templateUrl: './ticket-agents.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TicketAgents implements OnInit {
  readonly #store = inject(TicketsStore);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly supportTeams = this.#store.supportTeams;
  protected selectedRow!: ISupportAgent;
  protected actionMenuItems: MenuItem[] = [];

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Support Teams',
      pageDescription: 'View and manage support teams',
      pageIcon: 'pi pi-users',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Tickets', routerLink: '/app/tickets' },
      { label: 'Support Teams' },
    ]);

    this.initActionMenus();
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.onEditSupportTeam(this.selectedRow),
      },
      { separator: true },
      {
        label: 'Remove',
        styleClass: '!text-red-500 font-medium',
        icon: 'pi pi-trash !text-red-500',
        command: () => this.confirmDeleteType(this.selectedRow),
      },
    ];
  }

  async ngOnInit() {
    await this.#store.loadSupportTeams();
  }

  onAddSupportTeam() {
    const ref: DynamicDialogRef | null = this.#dialogService.open(TicketAgentAddDialog, {
      header: 'Add support team member',
      style: { width: '90vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { agents: this.supportTeams() },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((agent: ISupportAgent) => {
      if (agent) this.#store.addAgent(agent);
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  onEditSupportTeam(agent: ISupportAgent) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(TicketAgentAddDialog, {
      header: 'Edit support team member',
      style: { width: '90vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: {
        agent,
        agents: this.supportTeams(),
      },
    });

    ref?.onClose
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((updatedAgent: ISupportAgent) => {
        if (updatedAgent) this.#store.updateAgent(updatedAgent);
      });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmDeleteType(supportAgent: ISupportAgent) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to remove <strong>${supportAgent.agentName}</strong>?`,
      header: 'Remove Support Team',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Remove Support Team',
      rejectLabel: 'Keep Support Team',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.#store.removeAgent(supportAgent.id),
    });
  }
}
