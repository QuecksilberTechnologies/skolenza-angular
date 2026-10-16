import { ChangeDetectionStrategy, Component, input, OnInit } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ChartModule } from '@openng/optimus-ui/chart';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { BurndownData } from '@shared/interfaces';

@Component({
  selector: 'app-project-burndown',
  imports: [ChartModule, CardModule, ButtonModule, TooltipModule],
  templateUrl: './project-burndown.html',
  styleUrls: ['./project-burndown.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectBurndown implements OnInit {
  title = input<string>();
  chartTextColor = document.documentElement.classList.contains('dark') ? '#999' : '#888';
  chartGridColor = document.documentElement.classList.contains('dark') ? '#888' : '#ccc';
  chartData!: BurndownData;

  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: this.chartTextColor,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: this.chartTextColor,
        },
        grid: {
          color: this.chartGridColor,
        },
      },
      y: {
        ticks: {
          color: this.chartTextColor,
        },
        grid: {
          color: this.chartGridColor,
        },
      },
    },
  };

  ngOnInit() {
    this.initChart();
  }

  private initChart() {
    // Example data - replace with actual project data
    this.chartData = {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
      datasets: [
        {
          label: 'Ideal Burndown',
          data: [100, 80, 60, 40, 20, 0],
          borderColor: '#4CAF50',
          tension: 0.4,
          fill: false,
        },
        {
          label: 'Actual Burndown',
          data: [100, 85, 70, 55, 35, 15],
          borderColor: '#2196F3',
          tension: 0.4,
          fill: false,
        },
      ],
    };
  }
}
