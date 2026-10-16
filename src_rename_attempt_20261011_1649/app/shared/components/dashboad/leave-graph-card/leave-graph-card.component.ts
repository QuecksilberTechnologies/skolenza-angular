import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  input,
  OnInit,
} from '@angular/core';
import { ChartModule } from '@openng/optimus-ui/chart';

import { DashboardCard } from '../dashboard-card/dashboard-card';

@Component({
  selector: 'app-leave-graph-card',
  imports: [DashboardCard, ChartModule],
  templateUrl: './leave-graph-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveGraphCardComponent implements OnInit {
  title = input<string>();
  #cd = inject(ChangeDetectorRef);
  leaveChartData: unknown;
  leaveChartOptions: unknown;

  // Mock data for Leave (simplified for visualization)
  leaveData = [
    { type: 'SL', count: 2, color: 'bg-red-500', description: 'Sick Leave' },
    { type: 'CL', count: 4, color: 'bg-yellow-500', description: 'Casual Leave' },
    { type: 'EL', count: 8, color: 'bg-green-500', description: 'Earned Leave' },
    { type: 'ML', count: 8, color: 'bg-green-500', description: 'Maternity Leave' },
  ];

  ngOnInit() {
    this.leaveChartData = {
      labels: this.leaveData.map((data) => data.type),
      datasets: [
        {
          data: this.leaveData.map((data) => data.count),
          barThickness: 30,
          borderRadius: 6,
          // backgroundColor: this.leaveData.map(data => data.color),
          backgroundColor: [
            'rgb(239, 68, 68)', // Red
            'rgb(245, 158, 11)', // Amber
            'rgb(34, 197, 94)', // Green
            'rgb(34, 197, 94)', // Green
          ],
        },
      ],
    };

    this.leaveChartOptions = {
      layout: {
        padding: 1,
      },
      plugins: {
        legend: false,
      },
    };

    this.#cd.markForCheck();
  }
}
