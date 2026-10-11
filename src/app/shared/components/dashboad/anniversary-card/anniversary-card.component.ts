import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Cake, LucideAngularModule } from 'lucide-angular';

import { DashboardCard } from '../dashboard-card/dashboard-card';

@Component({
  selector: 'app-anniversary-card',
  imports: [DashboardCard, LucideAngularModule],
  templateUrl: './anniversary-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnniversaryCardComponent {
  title = input<string>();
  readonly Cake = Cake;

  // Mock data for Anniversary/Teams
  anniversaries = [
    {
      name: 'Sneha',
      type: 'Work Anniversary',
      date: 'June 15, 2025',
      details: 'Marketing Head',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=face',
    },
    {
      name: 'Vikram Singh',
      type: 'Marriage Anniversary',
      date: 'July 30, 2025',
      details: 'Operations Manager',
      avatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=face',
    },
    {
      name: 'Neha Kapoor',
      type: 'Work Anniversary',
      date: 'August 12, 2025',
      details: 'IT Department | Software Engineer',
      avatar:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=face',
    },
  ];
}
