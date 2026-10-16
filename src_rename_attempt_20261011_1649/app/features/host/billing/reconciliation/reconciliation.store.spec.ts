import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { HostBillingApi } from '@core/services';
import { HostReconciliationSummary } from '@shared/interfaces';

import { ReconciliationStore } from './reconciliation.store';

const SUMMARY: HostReconciliationSummary = {
  stalePendingOrders: 2,
  failedWebhookEvents: 1,
  pendingWebhookEvents: 4,
  failedPaymentAttempts: 3,
  requestedRefunds: 0,
  generatedAt: '2026-10-04T10:00:00Z',
};

describe('ReconciliationStore', () => {
  const hostBillingApiMock = { getReconciliation: vi.fn(), retryWebhook: vi.fn() };
  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    vi.clearAllMocks();
    hostBillingApiMock.getReconciliation.mockReturnValue(
      of({ isSucceeded: true, message: '', data: SUMMARY }),
    );
    hostBillingApiMock.retryWebhook.mockReturnValue(
      of({ isSucceeded: true, message: 'Webhook retry queued successfully.', data: true }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        ReconciliationStore,
        { provide: HostBillingApi, useValue: hostBillingApiMock },
      ],
    });
  });

  it('loads the summary', async () => {
    const store = TestBed.inject(ReconciliationStore);
    await stable();

    expect(store.summary()).toEqual(SUMMARY);
  });

  it('falls back to no summary when the call throws', async () => {
    hostBillingApiMock.getReconciliation.mockReturnValue(throwError(() => new Error('boom')));
    const store = TestBed.inject(ReconciliationStore);
    await stable();

    expect(store.summary()).toBeNull();
  });

  it('falls back to no summary when the API reports a failure', async () => {
    hostBillingApiMock.getReconciliation.mockReturnValue(
      of({ isSucceeded: false, message: 'Denied', data: null }),
    );
    const store = TestBed.inject(ReconciliationStore);
    await stable();

    expect(store.summary()).toBeNull();
  });

  describe('retryWebhook', () => {
    it('requeues the event and refetches the summary', async () => {
      const store = TestBed.inject(ReconciliationStore);
      await stable();

      await expect(store.retryWebhook(42)).resolves.toBe(true);
      await stable();

      expect(hostBillingApiMock.retryWebhook).toHaveBeenCalledWith(42);
      expect(hostBillingApiMock.getReconciliation).toHaveBeenCalledTimes(2);
      expect(store.isRetrying()).toBe(false);
    });

    it('resolves false and leaves the summary alone when the API refuses', async () => {
      hostBillingApiMock.retryWebhook.mockReturnValue(
        of({ isSucceeded: false, message: 'Retry limit reached.', data: false }),
      );
      const store = TestBed.inject(ReconciliationStore);
      await stable();

      await expect(store.retryWebhook(42)).resolves.toBe(false);
      await stable();

      expect(hostBillingApiMock.getReconciliation).toHaveBeenCalledTimes(1);
    });

    it('resolves false and clears the spinner when the call throws', async () => {
      hostBillingApiMock.retryWebhook.mockReturnValue(throwError(() => new Error('boom')));
      const store = TestBed.inject(ReconciliationStore);
      await stable();

      await expect(store.retryWebhook(42)).resolves.toBe(false);
      expect(store.isRetrying()).toBe(false);
    });
  });
});
