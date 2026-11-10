import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';
import { TagModule } from '@openng/optimus-ui/tag';

import { CurrencySymbolPipe } from '@shared/pipes';
import { percentOf } from '@shared/utilities/percent-of';
import { progressTone } from '@shared/utilities/progress-tone';

export interface LocationFeeSummary {
  id: number;
  locationName: string;
  totalStudents: number;
  /** Amount due for the period across every student at the location. */
  expectedAmount: number;
  collectedAmount: number;
  fullyPaidCount: number;
  partiallyPaidCount: number;
  notPaidCount: number;
}

/**
 * Static figures until the fee-collection API lands. Swap this for a store input when it does;
 * the template only reads the `LocationFeeSummary` shape.
 */
const SAMPLE_LOCATIONS: LocationFeeSummary[] = [
  {
    id: 1,
    locationName: 'Main Campus',
    totalStudents: 420,
    expectedAmount: 1_260_000,
    collectedAmount: 1_050_400,
    fullyPaidCount: 330,
    partiallyPaidCount: 52,
    notPaidCount: 38,
  },
  {
    id: 2,
    locationName: 'North Branch',
    totalStudents: 260,
    expectedAmount: 780_000,
    collectedAmount: 561_600,
    fullyPaidCount: 172,
    partiallyPaidCount: 40,
    notPaidCount: 48,
  },
  {
    id: 3,
    locationName: 'City Junior Wing',
    totalStudents: 180,
    expectedAmount: 540_000,
    collectedAmount: 486_000,
    fullyPaidCount: 158,
    partiallyPaidCount: 14,
    notPaidCount: 8,
  },
];

const LOCATIONS = SAMPLE_LOCATIONS.map((location) => {
  const percent = percentOf(location.collectedAmount, location.expectedAmount);
  return {
    ...location,
    pendingAmount: Math.max(0, location.expectedAmount - location.collectedAmount),
    percent,
    tone: progressTone(percent),
  };
});

const TOTALS = (() => {
  const sum = LOCATIONS.reduce(
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
})();

@Component({
  selector: 'app-fee-collection-card',
  imports: [CardModule, CurrencyPipe, CurrencySymbolPipe, TagModule],
  templateUrl: './fee-collection-card.html',
  host: { class: 'block md:col-span-2' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeeCollectionCard {
  readonly title = input('Fee Collection');
  /** Defaults to the current month so the label never goes stale. */
  readonly period = input(
    new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date()),
  );
  /** ISO code rendered through `currencySymbol`; the fee-collection API should supply it. */
  readonly currencyKey = input('INR');

  protected readonly locations = LOCATIONS;
  protected readonly totals = TOTALS;
}
