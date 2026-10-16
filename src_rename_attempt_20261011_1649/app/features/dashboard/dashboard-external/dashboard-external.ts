import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Common } from '@core/services';
import { MetricsCard } from '@shared/components/dashboad/metrics-card/metrics-card';
import { WidgetListCard } from '@shared/components/dashboad/widget-list-card/widget-list-card';

import { DashboardGreeting } from '../dashboard-greeting/dashboard-greeting';
import { ExternalDashboardStore } from './external-dashboard.store';

@Component({
  selector: 'app-dashboard-external',
  imports: [DashboardGreeting, MetricsCard, WidgetListCard],
  templateUrl: './dashboard-external.html',
  providers: [ExternalDashboardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DashboardExternal {
  protected readonly store = inject(ExternalDashboardStore);

  constructor() {
    inject(Common).setPageHeaderInfo({
      pageTitle: 'Dashboard',
      pageDescription: 'Overview of your tickets, activity, and documents.',
      pageIcon: 'pi pi-microsoft',
    });
  }
}
