import { Menu, MenuTrigger } from '@angular/aria/menu';
import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { Popup } from '@shared/index';

import { ITicket, ITicketAgentSummary } from '../../models';
import { AssignTicketPopup } from '../assign-ticket-popup/assign-ticket-popup';

@Component({
  selector: 'app-assignee-cell',
  imports: [UserAvatar, Popup, AssignTicketPopup, Menu, MenuTrigger, OverlayModule],
  templateUrl: './assignee-cell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssigneeCell {
  readonly ticket = input.required<ITicket>();
  readonly agents = input.required<ITicketAgentSummary[]>();

  readonly agentSelected = output<ITicketAgentSummary>();
  readonly unassigned = output<void>();

  protected readonly menuRef = viewChild<Menu<unknown>>(Menu);
  protected readonly closeOnScroll = inject(Overlay).scrollStrategies.close();
}
