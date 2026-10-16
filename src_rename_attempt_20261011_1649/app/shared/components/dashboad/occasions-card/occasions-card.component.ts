import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { DashboardCard } from '../dashboard-card/dashboard-card';

@Component({
  selector: 'app-occasions-card',
  imports: [DashboardCard],
  templateUrl: './occasions-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OccasionsCardComponent {
  title = input<string>();

  // Mock data for Occasions
  occasions = [
    {
      name: 'Diwali Celebration',
      date: 'March',
      time: '6:00 PM - 9:00 PM',
      location: 'Office Lobby',
      attire: 'Traditional Attire',
      image: 'https://images.unsplash.com/photo-1577083753695-e010191bacb5?w=96&h=96&fit=crop',
    },
    {
      name: 'Christmas Party',
      date: 'March',
      time: '7:30 PM - 11:00 PM',
      location: 'Conference Hall',
      attire: 'Red & White Theme',
      image: 'https://images.unsplash.com/photo-1640544641634-c4ac3dd1960d?w=96&h=96&fit=crop',
    },
    {
      name: 'New Year Bash',
      date: 'March',
      time: '9:00 PM - 1:00 AM',
      location: 'Rooftop Cafe',
      attire: 'Casual Chic',
      image: 'https://images.unsplash.com/photo-1760563472977-8891a2679984?w=96&h=96&fit=crop',
    },
  ];
}
