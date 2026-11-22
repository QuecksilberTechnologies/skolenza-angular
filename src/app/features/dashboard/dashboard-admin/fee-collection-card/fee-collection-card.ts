import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';
import { TagModule } from '@openng/optimus-ui/tag';

import { DashboardCardHeader } from '@shared/components/dashboad/dashboard-card-header/dashboard-card-header';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { FeeCollectionSummary } from '@shared/interfaces';
import { CurrencySymbolPipe } from '@shared/pipes';
import { percentOf } from '@shared/utilities/percent-of';
import { progressTone } from '@shared/utilities/progress-tone';

const periodLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });

/** `yyyy-MM` to `November 2026`; anything else is shown as sent. */
function formatPeriod(period: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(period);
  return match ? periodLabel.format(new Date(+match[1], +match[2] - 1, 1)) : period;
}

/** Location-wise fee collection: expected, collected and pending, with paid/partial/unpaid counts. */
@Component({
  selector: 'app-fee-collection-card',
  imports: [
    CardModule,
    CurrencyPipe,
    CurrencySymbolPipe,
    DashboardCardHeader,
    TableEmptyMessage,
    TagModule,
  ],
  templateUrl: './fee-collection-card.html',
  // the static title="..." the parent writes would otherwise render as a native tooltip
  host: { class: 'block md:col-span-2', '[attr.title]': 'null' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeeCollectionCard {
  readonly title = input<string>();
  readonly summary = input<FeeCollectionSummary | null>(null);
  /** The backend still fakes this section's values. */
  readonly placeholder = input(false);
  readonly loading = input(false);
  readonly refresh = output<void>();

  protected readonly skeletonRows = [1, 2, 3];

  protected readonly currencyKey = computed(() => this.summary()?.currencyCode ?? 'INR');

  protected readonly period = computed(() => {
    const period = this.summary()?.period;
    return period ? formatPeriod(period) : null;
  });

  protected readonly locations = computed(() =>
    (this.summary()?.locations ?? []).map((location) => {
      const percent = percentOf(location.collectedAmount, location.expectedAmount);
      return {
        ...location,
        pendingAmount: Math.max(0, location.expectedAmount - location.collectedAmount),
        percent,
        tone: progressTone(percent),
      };
    }),
  );

  protected readonly totals = computed(() => {
    const sum = this.locations().reduce(
      (acc, l) => ({
        expected: acc.expected + l.expectedAmount,
        collected: acc.collected + l.collectedAmount,
        students: acc.students + l.totalStudents,
        fullyPaid: acc.fullyPaid + l.fullyPaidCount,
        partiallyPaid: acc.partiallyPaid + l.partiallyPaidCount,
        notPaid: acc.notPaid + l.notPaidCount,
      }),
      { expected: 0, collected: 0, students: 0, fullyPaid: 0, partiallyPaid: 0, notPaid: 0 },
    );
    const percent = percentOf(sum.collected, sum.expected);
    return {
      ...sum,
      pending: Math.max(0, sum.expected - sum.collected),
      percent,
      tone: progressTone(percent),
    };
  });
}
