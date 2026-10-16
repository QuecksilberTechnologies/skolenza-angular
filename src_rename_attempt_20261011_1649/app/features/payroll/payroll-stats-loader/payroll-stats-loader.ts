import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

@Component({
  selector: 'app-payroll-stats-loader',
  imports: [CardModule, SkeletonModule],
  templateUrl: './payroll-stats-loader.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollStatsLoader {}
