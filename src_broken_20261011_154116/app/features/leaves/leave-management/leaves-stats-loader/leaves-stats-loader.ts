import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

@Component({
  selector: 'app-leaves-stats-loader',
  imports: [SkeletonModule],
  templateUrl: './leaves-stats-loader.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeavesStatsLoader {}
