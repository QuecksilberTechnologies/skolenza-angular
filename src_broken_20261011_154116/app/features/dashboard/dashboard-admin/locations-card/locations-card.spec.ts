import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { SuperAdminDashboardApi } from '@core/services';
import {
  SuperAdminLocation,
  SuperAdminLocationOverview,
  InstitutionLocationType,
} from '@shared/interfaces';

import { LocationsCardStore } from './locations-card.store';

function createLocation(overrides: Partial<SuperAdminLocation> = {}): SuperAdminLocation {
  return {
    id: 1,
    code: 'HYD-HO',
    name: 'Hyderabad Head Office',
    locationType: InstitutionLocationType.HeadOffice,
    isHeadOffice: true,
    isActive: true,
    ...overrides,
  };
}

describe('LocationsCardStore', () => {
  const dashboardApiMock = {
    getLocations: vi.fn(),
  };

  const respondWith = (data: SuperAdminLocationOverview) =>
    dashboardApiMock.getLocations.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data }),
    );

  beforeEach(() => {
    vi.clearAllMocks();
    respondWith({ total: 0, active: 0, headOffice: 0, locations: [] });

    TestBed.configureTestingModule({
      providers: [
        LocationsCardStore,
        { provide: SuperAdminDashboardApi, useValue: dashboardApiMock },
      ],
    });
  });

  it('asks the dashboard endpoint for a five-row preview', async () => {
    TestBed.inject(LocationsCardStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(dashboardApiMock.getLocations).toHaveBeenCalledWith({ limit: 5 });
  });

  it('reports the server counts, not the preview row count', async () => {
    respondWith({ total: 42, active: 40, headOffice: 2, locations: [createLocation()] });

    const store = TestBed.inject(LocationsCardStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.totalCount()).toBe(42);
    expect(store.activeCount()).toBe(40);
    expect(store.headOfficeCount()).toBe(2);
    expect(store.topLocations()).toHaveLength(1);
  });

  it('clears the counts when the request fails', async () => {
    respondWith({ total: 3, active: 3, headOffice: 1, locations: [createLocation()] });
    const store = TestBed.inject(LocationsCardStore);
    await TestBed.inject(ApplicationRef).whenStable();

    dashboardApiMock.getLocations.mockReturnValue(throwError(() => new Error('Forbidden')));
    store.reloadLocations();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.totalCount()).toBe(0);
    expect(store.topLocations()).toEqual([]);
  });
});
