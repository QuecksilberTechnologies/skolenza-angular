import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';

import { PayrollSummary } from '@shared/interfaces';

@Component({
  selector: 'app-payroll-stats',
  imports: [CardModule, CurrencyPipe],
  templateUrl: './payroll-stats.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollStats {
  readonly summary = input.required<PayrollSummary>();
}
