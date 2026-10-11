import { ChangeDetectionStrategy, Component } from '@angular/core';

import { StatCard } from '@shared/components/dashboad/stat-card/stat-card';

@Component({
  selector: 'app-admin-dashboard-stats-loader',
  imports: [StatCard],
  templateUrl: './admin-dashboard-stats-loader.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardStatsLoader {}
