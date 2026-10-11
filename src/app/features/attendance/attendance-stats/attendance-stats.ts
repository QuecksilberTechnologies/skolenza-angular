import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';

@Component({
  selector: 'app-attendance-stats',
  imports: [CardModule],
  templateUrl: './attendance-stats.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceStats {
  readonly stats = input.required<{
    present: number;
    absent: number;
    halfDay: number;
    onLeave: number;
    total: number;
  }>();
}
