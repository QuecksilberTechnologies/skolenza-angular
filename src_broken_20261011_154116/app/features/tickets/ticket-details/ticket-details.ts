import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Common } from '@core/services';

import { TicketsStore } from '../tickets.store';
import { TicketDetailSidebar } from './ticket-detail-sidebar/ticket-detail-sidebar';
import { TicketDetailsBody } from './ticket-details-body/ticket-details-body';
import { TicketDetailsHeader } from './ticket-details-header/ticket-details-header';
import { TicketDetailsSkeleton } from './ticket-details-skeleton/ticket-details-skeleton';

@Component({
  selector: 'app-ticket-details',
  imports: [TicketDetailsSkeleton, TicketDetailsHeader, TicketDetailsBody, TicketDetailSidebar],
  templateUrl: './ticket-details.html',
  styleUrl: './ticket-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TicketDetails implements OnInit {
  readonly #commonService = inject(Common);
  readonly #route = inject(ActivatedRoute);
  readonly store = inject(TicketsStore);

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Ticket Details',
      pageDescription:
        'Inspect all ticket information and follow the full conversation between requester and support agent.',
      pageIcon: 'pi pi-ticket',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Tickets', routerLink: '/app/tickets' },
      { label: 'Ticket Details' },
    ]);
  }

  async ngOnInit() {
    const id = this.#route.snapshot.paramMap.get('id') ?? '';
    await Promise.all([this.store.loadTicketDetail(id), this.store.loadAgentsSummary()]);
  }

  protected onEdit(): void {
    // TODO: open edit dialog
  }

  protected onCopyLink(): void {
    // TODO: copy ticket URL to clipboard
  }
}
