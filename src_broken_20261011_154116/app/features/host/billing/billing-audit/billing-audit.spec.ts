import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { HostBillingApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';

import BillingAudit from './billing-audit';

describe('BillingAudit', () => {
  const hostBillingApiMock = { getAudit: vi.fn() };
  const featurePageStoreMock = { displayNameOf: vi.fn(() => undefined) };

  beforeEach(async () => {
    hostBillingApiMock.getAudit.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        data: {
          items: [
            {
              id: 1,
              institutionId: null,
              entityType: 'BillingRefund',
              entityId: 'de305d54',
              action: 'RefundRequested',
              oldStatus: null,
              newStatus: 'Requested',
              actorType: 'HostUser',
              actorId: 1,
              correlationId: null,
              metadataJson: null,
              addedDateTime: '2026-10-01T10:00:00Z',
            },
          ],
          pageNumber: 1,
          pageSize: 10,
          totalRecords: 1,
        },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [BillingAudit],
      providers: [
        DatePipe,
        MessageService,
        { provide: HostBillingApi, useValue: hostBillingApiMock },
        { provide: FeaturePageStore, useValue: featurePageStoreMock },
      ],
    }).compileComponents();
  });

  it('renders an audit row with its status change', async () => {
    const fixture = TestBed.createComponent(BillingAudit);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();

    const row = (fixture.nativeElement as HTMLElement).querySelector('tbody tr');
    const text = row?.textContent?.replace(/\s+/g, ' ');
    expect(text).toContain('RefundRequested');
    expect(text).toContain('Requested');
    expect(text).toContain('HostUser');
  });
});
