import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { StatCard } from '@shared/components/dashboad/stat-card/stat-card';
import { SuperAdminSummary } from '@shared/interfaces';

@Component({
  selector: 'app-admin-dashboard-stats',
  imports: [StatCard, TranslatePipe],
  templateUrl: './admin-dashboard-stats.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardStats {
  readonly summary = input<SuperAdminSummary | null>();
}
