import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';

@Component({
  selector: 'app-ticket-stats',
  imports: [CardModule],
  templateUrl: './ticket-stats.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TicketStats {
  readonly newTickets = input();
  readonly openTickets = input();
  readonly solvedTickets = input();
  readonly pendingTickets = input();
}
