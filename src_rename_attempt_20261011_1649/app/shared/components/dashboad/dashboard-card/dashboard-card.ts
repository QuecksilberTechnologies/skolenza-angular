import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

@Component({
  selector: 'app-dashboard-card',
  imports: [CardModule, ButtonModule, TooltipModule],
  templateUrl: './dashboard-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardCard {
  title = input<string>();
  badge = input<string>();
  showActions = input<boolean>(true);
}
