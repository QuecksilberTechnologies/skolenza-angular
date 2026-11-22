import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CurrencyStore } from '@core/stores';
import { FeeCollectionSummary } from '@shared/interfaces';

import { FeeCollectionCard } from './fee-collection-card';

/** Skips the `data/currencies.json` fetch the real store makes. */
const currencyStoreStub = { provide: CurrencyStore, useValue: { symbols: signal({ INR: '₹' }) } };

const summary: FeeCollectionSummary = {
  period: '2026-11',
  currencyCode: 'INR',
  locations: [
    {
      locationId: 1,
      locationName: 'Main Campus',
      totalStudents: 10,
      expectedAmount: 30_000,
      collectedAmount: 24_000,
      fullyPaidCount: 7,
      partiallyPaidCount: 2,
      notPaidCount: 1,
    },
    {
      locationId: 2,
      locationName: 'North Branch',
      totalStudents: 5,
      expectedAmount: 10_000,
      collectedAmount: 12_000,
      fullyPaidCount: 5,
      partiallyPaidCount: 0,
      notPaidCount: 0,
    },
  ],
};

async function render(inputs: { summary?: FeeCollectionSummary | null; loading?: boolean }) {
  TestBed.configureTestingModule({ providers: [currencyStoreStub] });
  const fixture = TestBed.createComponent(FeeCollectionCard);
  fixture.componentRef.setInput('title', 'Fee Collection');
  if (inputs.summary !== undefined) fixture.componentRef.setInput('summary', inputs.summary);
  if (inputs.loading !== undefined) fixture.componentRef.setInput('loading', inputs.loading);
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('FeeCollectionCard', () => {
  it('renders totals, period and one row per location from the API data', async () => {
    const el = await render({ summary });
    const text = el.textContent ?? '';

    expect(text).toContain('November 2026');
    expect(text).toContain('Main Campus');
    expect(text).toContain('North Branch');
    // 36,000 of 40,000 collected overall
    expect(text).toContain('90%');
    expect(text).toContain('12 paid');
    expect(text).toContain('of 15 students');
    const bars = el.querySelectorAll('[role="progressbar"]');
    expect(bars).toHaveLength(3);
    // over-collection clamps to 100, never past it
    expect(bars[2].getAttribute('aria-valuenow')).toBe('100');
  });

  it('shows an empty state when the backend sends no fee data', async () => {
    const el = await render({ summary: null });

    expect(el.textContent).toContain('No fee data yet');
    expect(el.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('shows skeleton rows instead of the empty state while loading', async () => {
    const el = await render({ summary: null, loading: true });

    expect(el.textContent).not.toContain('No fee data yet');
    expect(el.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
