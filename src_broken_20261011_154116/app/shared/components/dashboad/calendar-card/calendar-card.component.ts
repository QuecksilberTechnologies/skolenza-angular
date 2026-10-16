import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { DashboardCard } from '../dashboard-card/dashboard-card';

@Component({
  selector: 'app-calendar-card',
  imports: [DashboardCard],
  templateUrl: './calendar-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarCardComponent {
  title = input<string>();

  // Mock data for Calendar
  calendarEvents = [
    {
      name: 'Holi - India',
      date: '24 - 25, Apr-25 (Tue/Wed)',
      location: 'India',
      image: 'https://images.unsplash.com/photo-1573506154555-62ee33ed5c61?w=96&h=96&fit=crop',
    },
    {
      name: 'Eid-ul-Fitr - India',
      date: '23 - 23, Mar-25 (Wed)',
      location: 'Worldwide',
      image: 'https://images.unsplash.com/photo-1712854482230-c1b62b3a4839?w=96&h=96&fit=crop',
    },
    {
      name: 'Christmas',
      date: '25 - 25, Dec-24 (Wed)',
      location: 'Worldwide',
      image: 'https://images.unsplash.com/photo-1703456777043-629bbbc593f5?w=96&h=96&fit=crop',
    },
    {
      name: 'New Year',
      date: '01 - 01, Jan-25 (Wed)',
      location: 'Worldwide',
      image: 'https://images.unsplash.com/photo-1512248805576-c1b31f6fcab1?w=96&h=96&fit=crop',
    },
  ];
}
