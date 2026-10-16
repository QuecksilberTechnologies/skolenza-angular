import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';

import { DashboardCard } from '../dashboard-card/dashboard-card';

@Component({
  selector: 'app-request-status-card',
  imports: [DashboardCard, TableModule, TagModule],
  templateUrl: './request-status-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestStatusCardComponent {
  title = input<string>();

  // Mock data for Request Status
  requestStatus = [
    {
      id: '#7457',
      type: 'Leave Full Day',
      description: 'Need to go Home town',
      days: '2 days',
      status: 'Approved',
    },
    {
      id: '#4477',
      type: 'Leave Full Day',
      description: 'Request Revision',
      days: '1 days',
      status: 'Pending',
    },
    {
      id: '#5500',
      type: 'Leave Full Day',
      description: 'Planned Leave',
      days: '5 days',
      status: 'Approved',
    },
    {
      id: '#1133',
      type: 'Leave Full Day',
      description: 'Planned Leave',
      days: '3 days',
      status: 'Approved',
    },
    {
      id: '#1133',
      type: 'Leave Full Day',
      description: 'Planned Leave',
      days: '3 days',
      status: 'Approved',
    },
  ];
}
