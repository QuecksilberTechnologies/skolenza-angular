import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { LeaveBreakdown } from '@shared/interfaces';
import { CardModule } from '@openng/optimus-ui/card';

@Component({
  selector: 'app-leave-breakdown-card',
  imports: [CardModule],
  templateUrl: './leave-breakdown-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveBreakdownCard {
  readonly title = input<string>();

  protected leaveBreakdown = signal<LeaveBreakdown>({
    total: 42,
    change: '+10%',
    types: [
      { type: 'Sick Leave', days: 15, change: '+5%', color: 'bg-orange-400' },
      { type: 'Casual Leave', days: 12, change: '+2%', color: 'bg-blue-400' },
      { type: 'Earned Leave', days: 10, change: '+1%', color: 'bg-green-400' },
      { type: 'Others', days: 5, change: '-2%', color: 'bg-gray-400' },
    ],
  });

  getLeaveTypeWidth(days: number): number {
    const total = this.leaveBreakdown().total;
    return (days / total) * 100;
  }
}
