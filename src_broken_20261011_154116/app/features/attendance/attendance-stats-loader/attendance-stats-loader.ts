import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

@Component({
  selector: 'app-attendance-stats-loader',
  imports: [SkeletonModule],
  templateUrl: './attendance-stats-loader.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceStatsLoader {}
