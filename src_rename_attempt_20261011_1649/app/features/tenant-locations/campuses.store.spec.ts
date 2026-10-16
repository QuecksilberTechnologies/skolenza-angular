import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CampusApi, InstitutionsApi } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { CampusRow, CampusType } from '@shared/interfaces';

import { CampusesStore } from './campuses.store';

function createLocation(overrides: Partial<CampusRow> = {}): CampusRow {
  return {
    id: 1,
    locationCode: 'HYD-HO',
    locationName: 'Hyderabad Head Office',
    locationType: CampusType.HeadOffice,
    countryId: 1,
    stateId: 2,
    districtId: 3,
    isHeadOffice: true,
    isGeoFenceEnabled: false,
    isAttendanceAllowed: true,
    isBiometricEnabled: false,
    isActive: true,
    ...overrides,
  };
}

describe('CampusesStore', () => {
  const campusApiMock = {
    getCampuses: vi.fn(),
    setCampusStatus: vi.fn(),
    deleteCampus: vi.fn(),
  };
  const institutionsApiMock = { getInstitutions: vi.fn() };

  const createStore = (campuses: CampusRow[]) => {
    const store = TestBed.inject(CampusesStore);
    patchState(store as never, { campuses });
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    campusApiMock.getCampuses.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [], totalRecords: 0 }),
    );
    campusApiMock.setCampusStatus.mockReturnValue(
      of({ isSucceeded: true, message: 'Status updated.', errors: [], data: null }),
    );
    campusApiMock.deleteCampus.mockReturnValue(
      of({ isSucceeded: true, message: 'Deleted.', errors: [], data: null }),
    );
    institutionsApiMock.getInstitutions.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );
    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        CampusesStore,
        { provide: CampusApi, useValue: campusApiMock },
        { provide: InstitutionsApi, useValue: institutionsApiMock },
        {
          provide: CurrentUserPermissionsStore,
          useValue: { isHostSession: () => false, ensureLoaded: () => Promise.resolve() },
        },
      ],
    });
  });

  it('re-queries with the selected type, geography and status', async () => {
    const store = TestBed.inject(CampusesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setLocationType(CampusType.Plant);
    store.setCountryId(1);
    store.setStateId(2);
    store.setDistrictId(3);
    store.setIsActive(false);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(campusApiMock.getCampuses).toHaveBeenLastCalledWith({
      Search: '',
      InstitutionId: null,
      CountryId: 1,
      StateId: 2,
      DistrictId: 3,
      LocationType: CampusType.Plant,
      IsActive: false,
      PageNumber: 1,
      PageSize: 10,
    });
  });

  it('clears the state and district when the country changes', async () => {
    const store = TestBed.inject(CampusesStore);
    store.setCountryId(1);
    store.setStateId(2);
    store.setDistrictId(3);

    store.setCountryId(9);
    await TestBed.inject(ApplicationRef).whenStable();

    // A state from the previous country would filter the grid down to nothing.
    expect(store.stateId()).toBeNull();
    expect(store.districtId()).toBeNull();
  });

  it('keeps the rows and total from a successful page', async () => {
    campusApiMock.getCampuses.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [createLocation({ id: 7 })],
        totalRecords: 42,
      }),
    );

    const store = TestBed.inject(CampusesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.campuses().map((row) => row.id)).toEqual([7]);
    expect(store.totalRecords()).toBe(42);
  });

  it('sends the requested page back to the API', async () => {
    const store = TestBed.inject(CampusesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.loadPage({ first: 20, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(campusApiMock.getCampuses).toHaveBeenLastCalledWith(
      expect.objectContaining({ PageNumber: 3, PageSize: 10 }),
    );
  });

  it('returns to the first page when a filter changes', async () => {
    const store = TestBed.inject(CampusesStore);
    store.loadPage({ first: 20, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();

    store.setIsActive(true);

    expect(store.pageNumber()).toBe(1);
  });

  it('counts only the filters that are set', () => {
    const store = TestBed.inject(CampusesStore);

    store.setLocationType(CampusType.Branch);
    store.setIsActive(true);

    expect(store.appliedFilterCount()).toBe(2);
  });

  it('clears the grid and reports when the list call fails', async () => {
    const store = createStore([createLocation({ id: 7 })]);
    campusApiMock.getCampuses.mockReturnValue(throwError(() => new Error('boom')));

    store.setIsActive(true);
    await TestBed.inject(ApplicationRef).whenStable();

    // `handleError` rethrows, so a silent failure would leave the stale row on screen.
    expect(store.campuses()).toEqual([]);
    expect(store.totalRecords()).toBe(0);
    expect(store.isLoading()).toBe(false);
  });

  describe('host session', () => {
    beforeEach(() => {
      TestBed.overrideProvider(CurrentUserPermissionsStore, {
        useValue: { isHostSession: () => true, ensureLoaded: () => Promise.resolve() },
      });
    });

    it('leaves ModuleId/OperationId to the interceptor, whatever the session', async () => {
      TestBed.inject(CampusesStore);
      await TestBed.inject(ApplicationRef).whenStable();

      // A host tree publishes `HOST_CAMPUS_LIST` where a institution's publishes
      // `INSTITUTION_CAMPUSES`; the `institutionlocation` route row names both, so neither session needs
      // this store to resolve an id that the backend may renumber.
      const [request] = campusApiMock.getCampuses.mock.lastCall ?? [];
      expect(request).not.toHaveProperty('ModuleId');
      expect(request).not.toHaveProperty('OperationId');
    });
  });

  describe('toggleActive', () => {
    it('sends the flipped status for the row', () => {
      const store = createStore([createLocation({ id: 7, isActive: true })]);

      store.toggleActive(store.campuses()[0]);

      // `ModuleId` / `OperationId` are the interceptor's, not this store's.
      expect(campusApiMock.setCampusStatus).toHaveBeenCalledWith({
        id: 7,
        isActive: false,
      });
    });

    it('clears the row spinner when the call fails', () => {
      campusApiMock.setCampusStatus.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      const store = createStore([createLocation({ id: 7, isActive: true })]);

      store.toggleActive(store.campuses()[0]);

      expect(store.campuses()).toEqual([
        expect.objectContaining({ id: 7, isActive: true, isUpdatingStatus: false }),
      ]);
    });
  });

  describe('deleteCampus', () => {
    it('sends the row id', () => {
      const store = createStore([createLocation({ id: 7 })]);

      store.deleteCampus(store.campuses()[0]);

      expect(campusApiMock.deleteCampus).toHaveBeenCalledWith(7);
    });

    /** A dependency reject arrives as `isSucceeded: false`, and the row has to stop spinning. */
    it('clears the row spinner when the backend rejects the delete', () => {
      campusApiMock.deleteCampus.mockReturnValue(
        of({
          isSucceeded: false,
          message: 'Location is in use by active devices.',
          errors: [],
          data: null,
        }),
      );
      const store = createStore([createLocation({ id: 7 })]);

      store.deleteCampus(store.campuses()[0]);

      expect(store.campuses()).toEqual([
        expect.objectContaining({ id: 7, isDeleting: false }),
      ]);
    });
  });
});

