import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { HostBillingApi } from '@core/services';
import { HostTaxRule } from '@shared/interfaces';

import { TaxRulesStore } from './tax-rules.store';

function createTaxRule(overrides: Partial<HostTaxRule> = {}): HostTaxRule {
  return {
    id: 1,
    countryCode: 'IN',
    taxCode: 'GST',
    taxName: 'Goods and Services Tax',
    ratePercent: 18,
    effectiveFrom: '2026-10-01',
    effectiveTo: null,
    isActive: true,
    configurationJson: null,
    ...overrides,
  };
}

describe('TaxRulesStore', () => {
  const apiMock = {
    getTaxRules: vi.fn(),
    deleteTaxRule: vi.fn(),
  };

  /** The resource loads on injection, so the rows have to come from the API mock. */
  const createStore = async (rows: HostTaxRule[]) => {
    apiMock.getTaxRules.mockReturnValue(of({ isSucceeded: true, message: '', data: rows }));
    const store = TestBed.inject(TaxRulesStore);
    await TestBed.inject(ApplicationRef).whenStable();
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getTaxRules.mockReturnValue(of({ isSucceeded: true, message: '', data: [] }));
    apiMock.deleteTaxRule.mockReturnValue(
      of({ isSucceeded: true, message: 'Tax rule deactivated successfully.', data: true }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        TaxRulesStore,
        { provide: HostBillingApi, useValue: apiMock },
      ],
    });
  });

  it('loads the whole list on open', async () => {
    const store = await createStore([createTaxRule({ id: 3 })]);

    expect(apiMock.getTaxRules).toHaveBeenCalledWith();
    expect(store.rows().map((row) => row.id)).toEqual([3]);
  });

  it('filters the rows already in hand rather than re-querying', async () => {
    const store = await createStore([
      createTaxRule({ id: 1, taxCode: 'GST' }),
      createTaxRule({ id: 2, taxCode: 'VAT', taxName: 'Value Added Tax' }),
    ]);
    const callsBefore = apiMock.getTaxRules.mock.calls.length;

    store.setSearch('value added');

    expect(store.visibleRows().map((row) => row.id)).toEqual([2]);
    expect(apiMock.getTaxRules.mock.calls.length).toBe(callsBefore);
  });

  it('clears the grid when the list call fails', async () => {
    const store = await createStore([createTaxRule()]);
    apiMock.getTaxRules.mockReturnValue(throwError(() => new Error('boom')));

    store.reload();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.rows()).toEqual([]);
  });

  it('clears the grid when the API refuses the read', async () => {
    const store = await createStore([createTaxRule()]);
    apiMock.getTaxRules.mockReturnValue(of({ isSucceeded: false, message: 'Denied', data: null }));

    store.reload();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.rows()).toEqual([]);
  });

  it('reloads the list after a successful deactivate', async () => {
    const store = await createStore([createTaxRule({ id: 4 })]);
    const callsBefore = apiMock.getTaxRules.mock.calls.length;

    store.deactivate(createTaxRule({ id: 4 }));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(apiMock.deleteTaxRule).toHaveBeenCalledWith(4);
    expect(apiMock.getTaxRules.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('keeps the row and does not reload when the deactivate is refused', async () => {
    const store = await createStore([createTaxRule({ id: 5 })]);
    apiMock.deleteTaxRule.mockReturnValue(of({ isSucceeded: false, message: 'No.', data: false }));
    const callsBefore = apiMock.getTaxRules.mock.calls.length;

    store.deactivate(createTaxRule({ id: 5 }));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.rows().map((row) => row.id)).toEqual([5]);
    expect(apiMock.getTaxRules.mock.calls.length).toBe(callsBefore);
    // The per-row spinner is released whichever way the call goes.
    expect(store.rows()[0].isDeactivating).toBe(false);
  });
});
