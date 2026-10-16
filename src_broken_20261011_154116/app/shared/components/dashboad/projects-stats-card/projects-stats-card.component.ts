import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';

import { ProjectStats } from '@shared/interfaces';

import { DashboardCard } from '../dashboard-card/dashboard-card';

@Component({
  selector: 'app-projects-stats-card',
  imports: [DashboardCard, TableModule, ButtonModule, TagModule],
  templateUrl: './projects-stats-card.component.html',
  styleUrl: './projects-stats-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsStatsCardComponent {
  readonly title = input<string>();

  onImageError(event: Event, name: string) {
    const img = event.target as HTMLImageElement;
    const initials = name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" rx="8" fill="%236366f1"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-size="16" font-family="sans-serif">${initials}</text></svg>`;
    img.src = `data:image/svg+xml,${svg}`;
  }

  projects: ProjectStats[] = [
    {
      item: {
        name: 'Avionica',
        user: 'Esther Howard',
        image: '1.jpg',
      },
      budget: '$256,910',
      progress: { value: '0.4%', trend: 'down' },
      status: 'on-hold',
      view: '',
    },
    {
      item: {
        name: 'Charto CRM',
        user: 'Jenny Wilson',
        image: '2.jpg',
      },
      budget: '$8,220',
      progress: { value: '9.2%', trend: 'up' },
      status: 'active',
      view: '',
    },
    {
      item: {
        name: 'Tower Hill',
        user: 'Cody Fisher',
        image: '3.jpg',
      },
      budget: '$74,000',
      progress: { value: '9.2%', trend: 'up' },
      status: 'completed',
      view: '',
    },
    {
      item: {
        name: '9 Degree',
        user: 'Savannah Nguyen',
        image: '4.jpg',
      },
      budget: '$183,300',
      progress: { value: '0.4%', trend: 'down' },
      status: 'active',
      view: '',
    },
    {
      item: {
        name: 'Mivy App',
        user: 'Jane Cooper',
        image: '5.jpg',
      },
      budget: '$32,400',
      progress: { value: '9.2%', trend: 'up' },
      status: 'active',
      view: '',
    },
  ];
}
