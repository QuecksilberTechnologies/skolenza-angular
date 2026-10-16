import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { OkrApi } from '@core/services';

import { OkrDetailStore } from './okr-detail.store';

describe('OkrDetailStore', () => {
  const okrApiMock = { getOkr: vi.fn(), getOkrDetailExtras: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    okrApiMock.getOkr.mockReturnValue(throwError(() => new Error('boom')));
    okrApiMock.getOkrDetailExtras.mockReturnValue(throwError(() => new Error('boom')));

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        OkrDetailStore,
        { provide: OkrApi, useValue: okrApiMock },
      ],
    });
  });

  it('reports a load error instead of rendering "not found"', async () => {
    // Reading through `hasValue()` keeps `value()` from throwing without collapsing an
    // outage into `null` — the template must not claim the OKR does not exist.
    const store = TestBed.inject(OkrDetailStore);
    store.setOkrId('okr-1');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.okr()).toBeNull();
    expect(store.extras()).toBeNull();
    expect(store.hasLoadError()).toBe(true);
    expect(store.isLoading()).toBe(false);
  });

  it('still renders the OKR when only the extras call fails', async () => {
    okrApiMock.getOkr.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: { id: 'okr-1' } }),
    );

    const store = TestBed.inject(OkrDetailStore);
    store.setOkrId('okr-1');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.okr()).toEqual({ id: 'okr-1' });
    expect(store.extras()).toBeNull();
    expect(store.hasLoadError()).toBe(false);
  });
});
