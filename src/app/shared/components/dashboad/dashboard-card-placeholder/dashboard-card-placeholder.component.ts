import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProgressSpinnerModule } from '@openng/optimus-ui/progressspinner';

import { DashboardCard } from '../dashboard-card/dashboard-card';

@Component({
  selector: 'app-dashboard-card-placeholder',
  imports: [DashboardCard, ProgressSpinnerModule],
  templateUrl: './dashboard-card-placeholder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardCardPlaceholderComponent {
  title = input<string>();
}
