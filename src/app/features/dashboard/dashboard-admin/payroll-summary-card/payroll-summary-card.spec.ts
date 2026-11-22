import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CurrencyStore } from '@core/stores';
import { DashboardPayrollSummary } from '@shared/interfaces';

import { PayrollSummaryCard } from './payroll-summary-card';

/** Skips the `data/currencies.json` fetch the real store makes. */
const currencyStoreStub = { provide: CurrencyStore, useValue: { symbols: signal({ INR: '₹' }) } };

const summary: DashboardPayrollSummary = {
  currencyCode: 'INR',
  months: [
    { month: '2026-11', totalStaff: 10, paidCount: 6, paidAmount: 60_000, pendingAmount: 40_000 },
    { month: '2026-10', totalStaff: 10, paidCount: 10, paidAmount: 100_000, pendingAmount: 0 },
  ],
};

async function render(inputs: { summary?: DashboardPayrollSummary | null; loading?: boolean }) {
  TestBed.configureTestingModule({ providers: [provideRouter([]), currencyStoreStub] });
  const fixture = TestBed.createComponent(PayrollSummaryCard);
  fixture.componentRef.setInput('title', 'Staff Payroll');
  if (inputs.summary !== undefined) fixture.componentRef.setInput('summary', inputs.summary);
  if (inputs.loading !== undefined) fixture.componentRef.setInput('loading', inputs.loading);
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('PayrollSummaryCard', () => {
  it('headlines the newest month and lists every month from the API data', async () => {
    const el = await render({ summary });
    const text = el.textContent ?? '';

    expect(text).toContain('Salary status: Nov 2026');
    expect(text).toContain('Oct 2026');
    expect(text).toContain('6/10 paid');
    expect(text).toContain('Total payout (2 months)');
    expect(el.querySelectorAll('[role="progressbar"]')).toHaveLength(2);
    expect(el.querySelector('a[href="/app/payroll"]')).not.toBeNull();
  });

  it('shows an empty state when the backend sends no payroll data', async () => {
    const el = await render({ summary: { currencyCode: 'INR', months: [] } });

    expect(el.textContent).toContain('No payroll data yet');
  });

  it('shows skeleton rows instead of the empty state while loading', async () => {
    const el = await render({ summary: null, loading: true });

    expect(el.textContent).not.toContain('No payroll data yet');
    expect(el.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
