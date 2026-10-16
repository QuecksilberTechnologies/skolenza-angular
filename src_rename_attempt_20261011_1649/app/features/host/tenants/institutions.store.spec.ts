import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { MessageService } from '@openng/optimus-ui/api';
import { NEVER, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { InstitutionsApi } from '@core/services';
import { IInstitution, SettledSearchTerm } from '@shared/interfaces';

import { InstitutionsStore } from './institutions.store';

function createInstitution(overrides: Partial<IInstitution> = {}): IInstitution {
  return {
    id: 'TEN00001',
    companyName: 'Acme Corp',
    institutionCode: 'ACME',
    companyEmailDomain: 'acme.com',
    institutionEmail: 'admin@acme.com',
    contactPersonName: 'Jane Doe',
    contactNumber: '9999999999',
    countryId: 1,
    isVerified: true,
    isActive: true,
    ...overrides,
  };
}

describe('InstitutionsStore', () => {
  const institutionsApiMock = {
    getInstitutions: vi.fn(),
    deleteInstitution: vi.fn(),
    resendVerificationEmail: vi.fn(),
    activateInstitution: vi.fn(),
    deactivateInstitution: vi.fn(),
    syncActivePlanEntitlements: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    institutionsApiMock.getInstitutions.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [], totalRecords: 0 }),
    );
    institutionsApiMock.deleteInstitution.mockReturnValue(
      of({ isSucceeded: true, message: 'Deleted', errors: [], data: null }),
    );
    institutionsApiMock.resendVerificationEmail.mockReturnValue(
      of({ isSucceeded: true, message: 'Sent', errors: [], data: null }),
    );
    institutionsApiMock.activateInstitution.mockReturnValue(
      of({ isSucceeded: true, message: 'Activated', errors: [], data: null }),
    );
    institutionsApiMock.deactivateInstitution.mockReturnValue(
      of({ isSucceeded: true, message: 'Deactivated', errors: [], data: null }),
    );
    institutionsApiMock.syncActivePlanEntitlements.mockReturnValue(
      of({ isSucceeded: true, message: 'Synced', errors: [], data: null }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        InstitutionsStore,
        { provide: InstitutionsApi, useValue: institutionsApiMock },
      ],
    });
  });

  it('opens on All, so neither filter reaches the query string', async () => {
    TestBed.inject(InstitutionsStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(institutionsApiMock.getInstitutions).toHaveBeenLastCalledWith({
      IsActive: null,
      IsVerified: null,
      SearchKeyword: '',
      PageNumber: 1,
      PageSize: 10,
    });
  });

  it('re-queries with both filters when either one changes', async () => {
    const store = TestBed.inject(InstitutionsStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setStatusFilter(false);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(institutionsApiMock.getInstitutions).toHaveBeenLastCalledWith({
      IsActive: false,
      IsVerified: null,
      SearchKeyword: '',
      PageNumber: 1,
      PageSize: 10,
    });

    store.setVerifiedFilter(true);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(institutionsApiMock.getInstitutions).toHaveBeenLastCalledWith({
      IsActive: false,
      IsVerified: true,
      SearchKeyword: '',
      PageNumber: 1,
      PageSize: 10,
    });
  });

  it('clears the grid and reports when the list call fails', async () => {
    const store = TestBed.inject(InstitutionsStore);
    await TestBed.inject(ApplicationRef).whenStable();
    patchState(store as never, { institutions: [createInstitution({ id: 'TEN00007' })] });

    institutionsApiMock.getInstitutions.mockReturnValue(throwError(() => new Error('boom')));
    store.setStatusFilter(true);
    await TestBed.inject(ApplicationRef).whenStable();

    // `handleError` rethrows, so a silent failure would leave rows the filter excludes on screen.
    expect(store.institutions()).toEqual([]);
    expect(store.isLoading()).toBe(false);
  });

  it('refetches the page once the delete succeeds, since the total changes too', async () => {
    const store = TestBed.inject(InstitutionsStore);
    await TestBed.inject(ApplicationRef).whenStable();
    const institution = createInstitution({ id: 'TEN00007' });
    patchState(store as never, { institutions: [institution, createInstitution({ id: 'TEN00008' })] });
    const callsBefore = institutionsApiMock.getInstitutions.mock.calls.length;

    store.deleteInstitution(institution);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(institutionsApiMock.deleteInstitution).toHaveBeenCalledWith({ institutionId: 'TEN00007' });
    expect(institutionsApiMock.getInstitutions.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('asks the server for the page the paginator moved to', async () => {
    const store = TestBed.inject(InstitutionsStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.loadPage({ first: 50, rows: 25 });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(institutionsApiMock.getInstitutions).toHaveBeenLastCalledWith({
      IsActive: null,
      IsVerified: null,
      SearchKeyword: '',
      PageNumber: 3,
      PageSize: 25,
    });
  });

  it('sends a new search back to the first page', async () => {
    const store = TestBed.inject(InstitutionsStore);
    await TestBed.inject(ApplicationRef).whenStable();
    store.loadPage({ first: 50, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(store.pageNumber()).toBe(6);

    store.setSearch('acme' as SettledSearchTerm);

    expect(store.search()).toBe('acme');
    expect(store.pageNumber()).toBe(1);
  });

  it('keeps the row when the delete fails', async () => {
    const store = TestBed.inject(InstitutionsStore);
    await TestBed.inject(ApplicationRef).whenStable();
    const institution = createInstitution({ id: 'TEN00007' });
    patchState(store as never, { institutions: [institution] });

    institutionsApiMock.deleteInstitution.mockReturnValue(throwError(() => new Error('boom')));
    store.deleteInstitution(institution);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.institutions().map((t) => t.id)).toEqual(['TEN00007']);
    // The per-row spinner must clear even on the error path.
    expect(store.institutions()[0].isDeleting).toBe(false);
  });

  it('sends the verification email without touching the row', async () => {
    const store = TestBed.inject(InstitutionsStore);
    await TestBed.inject(ApplicationRef).whenStable();
    const institution = createInstitution({ id: 'TEN00007', isVerified: false });
    patchState(store as never, { institutions: [institution] });

    store.sendVerificationEmail(institution);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(institutionsApiMock.resendVerificationEmail).toHaveBeenCalledWith('TEN00007');
    expect(store.institutions()[0].isVerified).toBe(false);
    expect(store.sendingVerification().has('TEN00007')).toBe(false);
  });

  it('holds the in-flight marker across a refetch, so a second send cannot slip through', () => {
    const store = TestBed.inject(InstitutionsStore);
    const institution = createInstitution({ id: 'TEN00007', isVerified: false });
    // A request that never settles: the mail is still on the wire for the rest of the test.
    institutionsApiMock.resendVerificationEmail.mockReturnValue(NEVER);

    store.sendVerificationEmail(institution);
    expect(store.sendingVerification().has('TEN00007')).toBe(true);

    // What a search keystroke or a status toggle does to the list.
    patchState(store as never, { institutions: [createInstitution({ id: 'TEN00007', isVerified: false })] });

    expect(store.sendingVerification().has('TEN00007')).toBe(true);
    store.sendVerificationEmail(institution);
    expect(institutionsApiMock.resendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it('syncs plan entitlements without refetching the list', async () => {
    const store = TestBed.inject(InstitutionsStore);
    await TestBed.inject(ApplicationRef).whenStable();
    const institution = createInstitution({ id: 'TEN00007' });
    patchState(store as never, { institutions: [institution] });
    const callsBefore = institutionsApiMock.getInstitutions.mock.calls.length;

    store.syncPlanEntitlements(institution);
    await TestBed.inject(ApplicationRef).whenStable();

    // `moduleOperationInterceptor` owns `moduleId` / `operationId` - the store sends neither.
    expect(institutionsApiMock.syncActivePlanEntitlements).toHaveBeenCalledWith({
      institutionId: 'TEN00007',
    });
    expect(institutionsApiMock.getInstitutions.mock.calls.length).toBe(callsBefore);
    expect(store.institutions()[0].isSyncingEntitlements).toBe(false);
  });

  it('clears the sync spinner when the call fails', async () => {
    const store = TestBed.inject(InstitutionsStore);
    await TestBed.inject(ApplicationRef).whenStable();
    const institution = createInstitution({ id: 'TEN00007' });
    patchState(store as never, { institutions: [institution] });

    institutionsApiMock.syncActivePlanEntitlements.mockReturnValue(throwError(() => new Error('boom')));
    store.syncPlanEntitlements(institution);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.institutions()[0].isSyncingEntitlements).toBe(false);
  });

  it('deactivates an active row and refetches, since IsActive is a server-side filter', async () => {
    const store = TestBed.inject(InstitutionsStore);
    await TestBed.inject(ApplicationRef).whenStable();
    const institution = createInstitution({ id: 'TEN00007', isActive: true });
    patchState(store as never, { institutions: [institution] });
    const callsBefore = institutionsApiMock.getInstitutions.mock.calls.length;

    store.toggleActive(institution);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(institutionsApiMock.deactivateInstitution).toHaveBeenCalledWith({ institutionId: 'TEN00007' });
    expect(institutionsApiMock.activateInstitution).not.toHaveBeenCalled();
    expect(institutionsApiMock.getInstitutions.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('activates an inactive row and clears the spinner when the call fails', async () => {
    const store = TestBed.inject(InstitutionsStore);
    await TestBed.inject(ApplicationRef).whenStable();
    const institution = createInstitution({ id: 'TEN00007', isActive: false });
    patchState(store as never, { institutions: [institution] });

    institutionsApiMock.activateInstitution.mockReturnValue(throwError(() => new Error('boom')));
    store.toggleActive(institution);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(institutionsApiMock.activateInstitution).toHaveBeenCalledWith({ institutionId: 'TEN00007' });
    expect(store.institutions()[0].isActive).toBe(false);
    expect(store.institutions()[0].isUpdatingStatus).toBe(false);
  });
});
