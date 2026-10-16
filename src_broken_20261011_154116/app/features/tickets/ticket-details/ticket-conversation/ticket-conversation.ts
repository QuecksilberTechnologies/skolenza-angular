import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { UserAvatar } from '@shared/components/user-avatar/user-avatar';

import { ITicketConversation } from '../../models';

@Component({
  selector: 'app-ticket-conversation',
  imports: [UserAvatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ticket-conversation.html',
})
export class TicketConversation {
  readonly conversations = input.required<ITicketConversation[]>();
}
