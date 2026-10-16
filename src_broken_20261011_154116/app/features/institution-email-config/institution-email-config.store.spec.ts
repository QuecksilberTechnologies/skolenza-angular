import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { InstitutionEmailConfigApi } from '@core/services';
import { InstitutionEmailConfigRecord } from '@shared/interfaces';

import { InstitutionEmailConfigStore } from './institution-email-config.store';

function createConfig(overrides: Partial<InstitutionEmailConfigRecord> = {}): InstitutionEmailConfigRecord {
  return {
    id: 1,
    smtpHost: 'smtp.acme.com',
    smtpPort: 587,
    smtpUsername: 'no-reply@acme.com',
    fromEmail: 'no-reply@acme.com',
    fromName: 'Acme HR',
    isActive: true,
    ...overrides,
  };
}

describe('InstitutionEmailConfigStore', () => {
  const apiMock = {
    getInstitutionEmailConfigs: vi.fn(),
    deleteInstitutionEmailConfig: vi.fn(),
  };

  /**
   * The resource loads on injection, so the rows have to come from the API mock rather than from
   * `patchState` — a seeded state would be overwritten the moment the first read settles.
   */
  const createStore = async (configs: InstitutionEmailConfigRecord[]) => {
    apiMock.getInstitutionEmailConfigs.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: configs }),
    );
    const store = TestBed.inject(InstitutionEmailConfigStore);
    await TestBed.inject(ApplicationRef).whenStable();
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getInstitutionEmailConfigs.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );
    apiMock.deleteInstitutionEmailConfig.mockReturnValue(
      of({ isSucceeded: true, message: 'Deleted.', errors: [], data: null }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        InstitutionEmailConfigStore,
        { provide: InstitutionEmailConfigApi, useValue: apiMock },
      ],
    });
  });

  it('loads the whole list on open, and sends no institution id', async () => {
    const store = await createStore([createConfig({ id: 3 })]);

    // The server scopes the request from the session, and `get-all` declares no filters or paging,
    // so the call takes no argument at all.
    expect(apiMock.getInstitutionEmailConfigs).toHaveBeenCalledWith();
    expect(store.configs().map((c) => c.id)).toEqual([3]);
  });

  it('filters the rows already in hand rather than re-querying', async () => {
    const store = await createStore([
      createConfig({ id: 1, smtpHost: 'smtp.acme.com' }),
      createConfig({ id: 2, smtpHost: 'smtp.backup.io', fromName: 'Acme Backup' }),
    ]);
    const callsBefore = apiMock.getInstitutionEmailConfigs.mock.calls.length;

    store.setSearch('backup');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.visibleConfigs().map((c) => c.id)).toEqual([2]);
    expect(apiMock.getInstitutionEmailConfigs.mock.calls.length).toBe(callsBefore);
  });

  it('clears the grid and reports when the list call fails', async () => {
    const store = await createStore([createConfig({ id: 7 })]);
    apiMock.getInstitutionEmailConfigs.mockReturnValue(throwError(() => new Error('boom')));

    store.reloadConfigs();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.configs()).toEqual([]);
  });

  it('reloads the list after a successful delete', async () => {
    const store = await createStore([createConfig({ id: 4 })]);
    const callsBefore = apiMock.getInstitutionEmailConfigs.mock.calls.length;

    store.deleteConfig(createConfig({ id: 4 }));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(apiMock.deleteInstitutionEmailConfig).toHaveBeenCalledWith(4);
    expect(apiMock.getInstitutionEmailConfigs.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('keeps the row and does not reload when the delete is refused', async () => {
    const store = await createStore([createConfig({ id: 5 })]);
    apiMock.deleteInstitutionEmailConfig.mockReturnValue(
      of({ isSucceeded: false, message: 'Not allowed.', errors: [], data: null }),
    );
    const callsBefore = apiMock.getInstitutionEmailConfigs.mock.calls.length;

    store.deleteConfig(createConfig({ id: 5 }));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.configs().map((c) => c.id)).toEqual([5]);
    expect(apiMock.getInstitutionEmailConfigs.mock.calls.length).toBe(callsBefore);
    // The per-row spinner is released whichever way the call goes.
    expect(store.configs()[0].isDeleting).toBe(false);
  });
});
