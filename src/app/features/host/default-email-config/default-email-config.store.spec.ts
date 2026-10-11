import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DefaultEmailConfigApi } from '@core/services';
import { DefaultEmailConfigRow } from '@shared/interfaces';

import { DefaultEmailConfigStore } from './default-email-config.store';

function createConfig(overrides: Partial<DefaultEmailConfigRow> = {}): DefaultEmailConfigRow {
  return {
    id: 1,
    configName: 'Default Gmail',
    smtpHost: 'smtp.acme.com',
    smtpPort: 587,
    smtpUsername: 'no-reply@acme.com',
    fromEmail: 'no-reply@acme.com',
    fromName: 'Acme HR',
    isActive: true,
    isDefault: true,
    ...overrides,
  };
}

describe('DefaultEmailConfigStore', () => {
  const apiMock = {
    getDefaultEmailConfigs: vi.fn(),
    deleteDefaultEmailConfig: vi.fn(),
  };

  /**
   * The resource loads on injection, so the rows have to come from the API mock rather than from
   * `patchState` — a seeded state would be overwritten the moment the first read settles.
   */
  const createStore = async (configs: DefaultEmailConfigRow[]) => {
    apiMock.getDefaultEmailConfigs.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: configs }),
    );
    const store = TestBed.inject(DefaultEmailConfigStore);
    await TestBed.inject(ApplicationRef).whenStable();
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getDefaultEmailConfigs.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );
    apiMock.deleteDefaultEmailConfig.mockReturnValue(
      of({ isSucceeded: true, message: 'Deleted.', errors: [], data: null }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        DefaultEmailConfigStore,
        { provide: DefaultEmailConfigApi, useValue: apiMock },
      ],
    });
  });

  it('loads the whole list on open, with no query params', async () => {
    const store = TestBed.inject(DefaultEmailConfigStore);
    apiMock.getDefaultEmailConfigs.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [createConfig({ id: 3 })] }),
    );
    store.reloadConfigs();
    await TestBed.inject(ApplicationRef).whenStable();

    // `get-all` declares no filters or paging, so the call takes no argument at all.
    expect(apiMock.getDefaultEmailConfigs).toHaveBeenCalledWith();
    expect(store.configs().map((c) => c.id)).toEqual([3]);
  });

  it('filters the rows already in hand rather than re-querying', async () => {
    const store = await createStore([
      createConfig({ id: 1, configName: 'Primary relay', smtpHost: 'smtp.acme.com' }),
      createConfig({ id: 2, configName: 'Backup relay', smtpHost: 'smtp.backup.io' }),
    ]);
    const callsBefore = apiMock.getDefaultEmailConfigs.mock.calls.length;

    store.setSearch('backup');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.visibleConfigs().map((c) => c.id)).toEqual([2]);
    expect(apiMock.getDefaultEmailConfigs.mock.calls.length).toBe(callsBefore);
  });

  it('clears the grid and reports when the list call fails', async () => {
    const store = await createStore([createConfig({ id: 7 })]);
    apiMock.getDefaultEmailConfigs.mockReturnValue(throwError(() => new Error('boom')));

    store.reloadConfigs();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.configs()).toEqual([]);
  });

  it('reloads the list after a successful delete', async () => {
    const store = await createStore([createConfig({ id: 4, isActive: false, isDefault: false })]);
    const callsBefore = apiMock.getDefaultEmailConfigs.mock.calls.length;

    store.deleteConfig(createConfig({ id: 4, isActive: false, isDefault: false }));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(apiMock.deleteDefaultEmailConfig).toHaveBeenCalledWith(4);
    expect(apiMock.getDefaultEmailConfigs.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('keeps the row and does not reload when the delete is refused', async () => {
    const store = await createStore([createConfig({ id: 5 })]);
    apiMock.deleteDefaultEmailConfig.mockReturnValue(
      of({
        isSucceeded: false,
        message: 'Replace the active configuration first.',
        errors: [],
        data: null,
      }),
    );
    const callsBefore = apiMock.getDefaultEmailConfigs.mock.calls.length;

    store.deleteConfig(createConfig({ id: 5 }));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.configs().map((c) => c.id)).toEqual([5]);
    expect(apiMock.getDefaultEmailConfigs.mock.calls.length).toBe(callsBefore);
    // The per-row spinner is released whichever way the call goes.
    expect(store.configs()[0].isDeleting).toBe(false);
  });
});
