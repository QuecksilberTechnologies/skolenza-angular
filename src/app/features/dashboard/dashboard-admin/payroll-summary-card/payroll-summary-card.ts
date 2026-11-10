import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from '@openng/optimus-ui/card';
import { TagModule } from '@openng/optimus-ui/tag';

import { CurrencySymbolPipe } from '@shared/pipes';
import { percentOf } from '@shared/utilities/percent-of';
import { progressTone } from '@shared/utilities/progress-tone';

export interface MonthlyPayrollSummary {
  /** Display label, e.g. `Nov 2026`. */
  month: string;
  totalStaff: number;
  paidCount: number;
  /** Net salary already disbursed for the month. */
  paidAmount: number;
  /** Net salary still owed to staff not yet paid. */
  pendingAmount: number;
}

/**
 * Static figures until the payroll summary API lands. Newest month first; the first entry drives
 * the headline strip. Month labels are the current month and the three before it, so the card
 * never shows a stale period.
 */
const SAMPLE_FIGURES: Omit<MonthlyPayrollSummary, 'month'>[] = [
  { totalStaff: 86, paidCount: 64, paidAmount: 2_368_000, pendingAmount: 812_000 },
  { totalStaff: 85, paidCount: 85, paidAmount: 3_145_000, pendingAmount: 0 },
  { totalStaff: 84, paidCount: 84, paidAmount: 3_108_000, pendingAmount: 0 },
  { totalStaff: 82, paidCount: 81, paidAmount: 2_997_000, pendingAmount: 37_000 },
];

const monthLabel = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' });

function sampleMonths(today: Date): MonthlyPayrollSummary[] {
  return SAMPLE_FIGURES.map((figures, monthsAgo) => ({
    ...figures,
    month: monthLabel.format(new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1)),
  }));
}

@Component({
  selector: 'app-payroll-summary-card',
  imports: [CardModule, CurrencyPipe, CurrencySymbolPipe, RouterLink, TagModule],
  templateUrl: './payroll-summary-card.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollSummaryCard {
  readonly title = input('Staff Payroll');
  /** ISO code rendered through `currencySymbol`; the payroll API should supply it. */
  readonly currencyKey = input('INR');

  protected readonly months = sampleMonths(new Date()).map((m) => {
    const percent = percentOf(m.paidCount, m.totalStaff);
    return {
      ...m,
      pendingCount: Math.max(0, m.totalStaff - m.paidCount),
      percent,
      tone: progressTone(percent),
    };
  });

  protected readonly current = this.months[0];

  protected readonly totalPayout = this.months.reduce((sum, m) => sum + m.paidAmount, 0);
}
