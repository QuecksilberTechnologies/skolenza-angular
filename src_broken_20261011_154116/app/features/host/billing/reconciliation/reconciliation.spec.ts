import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { HostBillingApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';

import Reconciliation from './reconciliation';

describe('Reconciliation', () => {
  let fixture: ComponentFixture<Reconciliation>;
  let canRetry: boolean;

  const hostBillingApiMock = { getReconciliation: vi.fn(), retryWebhook: vi.fn() };
  const featurePageStoreMock = {
    canPerform: vi.fn(() => canRetry),
    displayNameOf: vi.fn(() => undefined),
  };

  const render = async () => {
    fixture = TestBed.createComponent(Reconciliation);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    canRetry = true;
    hostBillingApiMock.getReconciliation.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        data: {
          stalePendingOrders: 2,
          failedWebhookEvents: 1,
          pendingWebhookEvents: 4,
          failedPaymentAttempts: 3,
          requestedRefunds: 0,
          generatedAt: '2026-10-04T10:00:00Z',
        },
      }),
    );
    hostBillingApiMock.retryWebhook.mockReturnValue(
      of({ isSucceeded: true, message: 'Webhook retry queued successfully.', data: true }),
    );

    await TestBed.configureTestingModule({
      imports: [Reconciliation],
      providers: [
        DatePipe,
        MessageService,
        { provide: HostBillingApi, useValue: hostBillingApiMock },
        { provide: FeaturePageStore, useValue: featurePageStoreMock },
      ],
    }).compileComponents();
  });

  it('renders one tile per count in a fixed order', async () => {
    const host = await render();

    const tiles = Array.from(host.querySelectorAll('li')).map((li) =>
      li.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(tiles).toHaveLength(5);
    expect(tiles[0]).toContain('Stale pending orders 2');
    expect(tiles[4]).toContain('Requested refunds 0');
  });

  it('colours non-zero issue counts and leaves informational tiles neutral', async () => {
    const host = await render();

    const counts = Array.from(host.querySelectorAll('li > span.text-3xl'));
    expect(counts[1].classList).toContain('text-red-600');
    expect(counts[0].classList).toContain('text-amber-700');
    expect(counts[4].classList).toContain('text-zinc-900');
    expect(host.textContent).not.toContain('All clear');
  });

  it('shows the all-clear state when every issue count is zero', async () => {
    hostBillingApiMock.getReconciliation.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        data: {
          stalePendingOrders: 0,
          failedWebhookEvents: 0,
          pendingWebhookEvents: 0,
          failedPaymentAttempts: 0,
          requestedRefunds: 5,
          generatedAt: '2026-10-04T10:00:00Z',
        },
      }),
    );
    const host = await render();

    expect(host.textContent).toContain('All clear');
    expect(host.querySelector('li > span.text-3xl')?.classList).toContain('text-zinc-900');
  });

  it('hides the retry form without the Update operation', async () => {
    canRetry = false;
    const host = await render();

    expect(host.querySelector('#webhook-event-id')).toBeNull();
  });

  it('does not call the API for an empty event id', async () => {
    const host = await render();

    host.querySelector('form')?.dispatchEvent(new Event('submit'));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(hostBillingApiMock.retryWebhook).not.toHaveBeenCalled();
  });
});
