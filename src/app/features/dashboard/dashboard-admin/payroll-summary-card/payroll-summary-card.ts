import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from '@openng/optimus-ui/card';

import { DashboardCardHeader } from '@shared/components/dashboad/dashboard-card-header/dashboard-card-header';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { DashboardPayrollSummary } from '@shared/interfaces';
import { CurrencySymbolPipe } from '@shared/pipes';
import { percentOf } from '@shared/utilities/percent-of';
import { progressTone } from '@shared/utilities/progress-tone';

const monthLabel = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' });

/** `yyyy-MM` to `Nov 2026`; anything else is shown as sent. */
function formatMonth(month: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(month);
  return match ? monthLabel.format(new Date(+match[1], +match[2] - 1, 1)) : month;
}

/** Month-wise staff salary status: who is paid, who is pending, and the payout. */
@Component({
  selector: 'app-payroll-summary-card',
  imports: [
    CardModule,
    CurrencyPipe,
    CurrencySymbolPipe,
    DashboardCardHeader,
    RouterLink,
    TableEmptyMessage,
  ],
  templateUrl: './payroll-summary-card.html',
  // the static title="..." the parent writes would otherwise render as a native tooltip
  host: { class: 'block', '[attr.title]': 'null' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollSummaryCard {
  readonly title = input<string>();
  readonly summary = input<DashboardPayrollSummary | null>(null);
  /** The backend still fakes this section's values. */
  readonly placeholder = input(false);
  readonly loading = input(false);
  readonly refresh = output<void>();

  protected readonly skeletonRows = [1, 2, 3];

  protected readonly currencyKey = computed(() => this.summary()?.currencyCode ?? 'INR');

  /** Newest first, as the API sends them; the first drives the headline strip. */
  protected readonly months = computed(() =>
    (this.summary()?.months ?? []).map((m) => {
      const percent = percentOf(m.paidCount, m.totalStaff);
      return {
        ...m,
        label: formatMonth(m.month),
        pendingCount: Math.max(0, m.totalStaff - m.paidCount),
        percent,
        tone: progressTone(percent),
      };
    }),
  );

  protected readonly current = computed(() => this.months()[0] ?? null);

  protected readonly totalPayout = computed(() =>
    this.months().reduce((sum, m) => sum + m.paidAmount, 0),
  );
}
