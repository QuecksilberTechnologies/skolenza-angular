import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, HostBillingApi } from '@core/services';

import { RefundRequestDialog } from './refund-request-dialog';

describe('RefundRequestDialog', () => {
  const hostBillingApiMock = { requestRefund: vi.fn(), getTransactions: vi.fn() };
  const commonMock = { showMessage: vi.fn() };
  const dialogRefMock = { close: vi.fn() };

  async function createFixture(): Promise<ComponentFixture<RefundRequestDialog>> {
    TestBed.configureTestingModule({
      providers: [
        { provide: HostBillingApi, useValue: hostBillingApiMock },
        { provide: Common, useValue: commonMock },
        { provide: DynamicDialogRef, useValue: dialogRefMock },
        {
          provide: DynamicDialogConfig,
          useValue: { data: { paymentTransactionId: 1, maxAmount: 1000, currencyCode: 'INR' } },
        },
      ],
    });

    const fixture = TestBed.createComponent(RefundRequestDialog);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    return fixture;
  }

  async function submitWith(
    fixture: ComponentFixture<RefundRequestDialog>,
    amount: number,
    reason: string,
  ): Promise<string> {
    const component = fixture.componentInstance;
    component['model'].set({
      transaction: { id: 1, amount: 1000, currencyCode: 'INR', label: '#1' },
      amount,
      reason,
    });
    component.onSubmit();
    await TestBed.inject(ApplicationRef).whenStable();

    const calls = hostBillingApiMock.requestRefund.mock.calls;
    return calls[calls.length - 1][0].idempotencyKey;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    hostBillingApiMock.requestRefund.mockReturnValue(
      of({ isSucceeded: false, message: 'Refund exceeds the refundable balance.', data: null }),
    );
  });

  it('reuses the idempotency key when the same refund is resubmitted', async () => {
    const fixture = await createFixture();

    const first = await submitWith(fixture, 250, 'Partial service refund');
    const second = await submitWith(fixture, 250, 'Partial service refund');

    expect(second).toBe(first);
  });

  it('issues a fresh idempotency key once the refund itself changes', async () => {
    const fixture = await createFixture();

    const first = await submitWith(fixture, 250, 'Partial service refund');
    const changedAmount = await submitWith(fixture, 200, 'Partial service refund');
    const changedReason = await submitWith(fixture, 200, 'Goodwill refund');

    expect(changedAmount).not.toBe(first);
    expect(changedReason).not.toBe(changedAmount);
  });

  it('lists only refundable payments when searching', async () => {
    const row = (id: number, status: string) => ({
      id,
      status,
      institutionName: 'Acme',
      currencyCode: 'INR',
      amount: 1500,
    });
    hostBillingApiMock.getTransactions.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        data: {
          items: [row(1, 'Succeeded'), row(2, 'Failed'), row(3, 'PartiallyRefunded')],
          pageNumber: 1,
          pageSize: 20,
          totalRecords: 3,
        },
      }),
    );
    const fixture = await createFixture();

    fixture.componentInstance.searchTransactions({
      query: ' acme ',
      originalEvent: new Event('x'),
    });

    expect(hostBillingApiMock.getTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ Search: 'acme' }),
    );
    expect(fixture.componentInstance['transactionSuggestions']().map((o) => o.id)).toEqual([1, 3]);
  });
});
