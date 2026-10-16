import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { HostBillingApi } from '@core/services';
import { HostBillingAuditEntry, SettledSearchTerm } from '@shared/interfaces';

import { BillingAuditStore } from './billing-audit.store';

function createEntry(overrides: Partial<HostBillingAuditEntry> = {}): HostBillingAuditEntry {
  return {
    id: 1,
    institutionId: 5,
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
    ...overrides,
  };
}

describe('BillingAuditStore', () => {
  const hostBillingApiMock = { getAudit: vi.fn() };
  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    vi.clearAllMocks();
    hostBillingApiMock.getAudit.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        data: { items: [createEntry()], pageNumber: 1, pageSize: 10, totalRecords: 31 },
      }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        BillingAuditStore,
        { provide: HostBillingApi, useValue: hostBillingApiMock },
      ],
    });
  });

  it('loads the first page and reads the paging out of `data`', async () => {
    const store = TestBed.inject(BillingAuditStore);
    await stable();

    expect(hostBillingApiMock.getAudit).toHaveBeenCalledWith({
      Search: '',
      PageNumber: 1,
      PageSize: 10,
    });
    expect(store.entries()).toEqual([createEntry()]);
    expect(store.totalRecords()).toBe(31);
  });

  it('re-queries from the first page when the search changes', async () => {
    const store = TestBed.inject(BillingAuditStore);
    await stable();

    store.loadPage({ first: 20, rows: 10 });
    await stable();
    store.setSearch('refund' as SettledSearchTerm);
    await stable();

    expect(hostBillingApiMock.getAudit).toHaveBeenLastCalledWith({
      Search: 'refund',
      PageNumber: 1,
      PageSize: 10,
    });
    expect(store.hasActiveFilters()).toBe(true);
  });

  it('pages through the table event', async () => {
    const store = TestBed.inject(BillingAuditStore);
    await stable();

    store.loadPage({ first: 50, rows: 25 });
    await stable();

    expect(hostBillingApiMock.getAudit).toHaveBeenLastCalledWith({
      Search: '',
      PageNumber: 3,
      PageSize: 25,
    });
  });

  it('clears the grid when the API reports a failure', async () => {
    hostBillingApiMock.getAudit.mockReturnValue(
      of({ isSucceeded: false, message: 'Denied', data: null }),
    );
    const store = TestBed.inject(BillingAuditStore);
    await stable();

    expect(store.entries()).toEqual([]);
    expect(store.totalRecords()).toBe(0);
  });

  it('clears the grid when the call throws', async () => {
    const store = TestBed.inject(BillingAuditStore);
    await stable();

    hostBillingApiMock.getAudit.mockReturnValue(throwError(() => new Error('boom')));
    store.reload();
    await stable();

    // `handleError` rethrows, so a silent failure would leave the stale row on screen.
    expect(store.entries()).toEqual([]);
    expect(store.totalRecords()).toBe(0);
  });
});
