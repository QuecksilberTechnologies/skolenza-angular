import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, IndustriesApi, CampusApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { CampusRow, CampusType } from '@shared/interfaces';

import CampusForm from './campus-form';
import { CampusFormModel } from './campus-form.schema';

const location: CampusRow = {
  id: 8,
  locationCode: 'JBP_CLIENT_SITE',
  locationName: 'Samdariya Mall',
  locationType: CampusType.Branch,
  countryId: 1,
  stateId: 20,
  districtId: 34,
  localityId: 56,
  address: 'Napier Town',
  landmark: null,
  postalCode: null,
  latitude: null,
  longitude: null,
  geoFenceRadiusMeters: null,
  timeZoneId: 'Asia/Kolkata',
  isHeadOffice: false,
  isGeoFenceEnabled: false,
  isAttendanceAllowed: true,
  isBiometricEnabled: false,
  isActive: true,
};

const validModel: CampusFormModel = {
  locationCode: 'JBP_CLIENT_SITE',
  locationName: 'Samdariya Mall',
  locationType: CampusType.Branch,
  isHeadOffice: false,
  countryId: 1,
  stateId: 20,
  districtId: 34,
  localityId: 56,
  address: '',
  landmark: '',
  postalCode: '',
  latitude: null,
  longitude: null,
  isGeoFenceEnabled: false,
  geoFenceRadiusMeters: null,
  timeZoneId: 'Asia/Kolkata',
  isAttendanceAllowed: true,
  isBiometricEnabled: false,
  isActive: true,
};

const campusApiMock = {
  getCampus: vi.fn(),
  addCampus: vi.fn(),
  updateCampus: vi.fn(),
};

const industriesApiMock = {
  getInstitutionCampusTypeOptions: vi.fn(),
};

const commonMock = {
  setPageHeaderInfo: vi.fn(),
  setBreadcrumbItems: vi.fn(),
  showMessage: vi.fn(),
};

const lookupStoreMock = {
  countries: () => [],
  isLoadingCountries: () => false,
  states: () => [],
  isLoadingStates: () => false,
  districts: () => [],
  isLoadingDistricts: () => false,
  localities: () => [],
  isLoadingLocalities: () => false,
  loadStates: vi.fn(),
  loadDistricts: vi.fn(),
  loadLocalities: vi.fn(),
};

function configure(campusId?: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: CampusApi, useValue: campusApiMock },
      { provide: IndustriesApi, useValue: industriesApiMock },
      { provide: Common, useValue: commonMock },
      { provide: LookupStore, useValue: lookupStoreMock },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: { get: () => campusId ?? null } },
        },
      },
    ],
  });
}

async function createComponent() {
  // `provideRouter([])` has no routes, so a real post-save navigation would reject with NG04002.
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

  const fixture = TestBed.createComponent(CampusForm);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture;
}

describe('CampusForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    campusApiMock.getCampus.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: location }),
    );
    campusApiMock.addCampus.mockReturnValue(
      of({ isSucceeded: true, message: 'Created', errors: [], data: null }),
    );
    campusApiMock.updateCampus.mockReturnValue(
      of({ isSucceeded: true, message: 'Updated', errors: [], data: null }),
    );
    industriesApiMock.getInstitutionCampusTypeOptions.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [
          {
            id: CampusType.HeadOffice,
            code: 'MAIN_CAMPUS',
            name: 'Main Campus',
            description: 'Primary campus',
          },
          {
            id: CampusType.Branch,
            code: 'BRANCH_CAMPUS',
            name: 'Branch Campus',
            description: 'Additional campus',
          },
        ],
      }),
    );
  });

  describe('create mode', () => {
    beforeEach(() => configure());

    it('keeps each address level disabled until the one above it is picked', async () => {
      const fixture = await createComponent();
      const f = fixture.componentInstance['f'];
      const model = fixture.componentInstance['model'];

      expect(f.stateId().disabled()).toBe(true);
      expect(f.districtId().disabled()).toBe(true);
      expect(f.localityId().disabled()).toBe(true);

      model.update((m) => ({ ...m, countryId: 1, stateId: 20 }));

      expect(f.stateId().disabled()).toBe(false);
      expect(f.districtId().disabled()).toBe(false);
      expect(f.localityId().disabled()).toBe(true);
    });

    it('loads education-specific campus types from the backend contract', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      expect(industriesApiMock.getInstitutionCampusTypeOptions).toHaveBeenCalledTimes(1);
      expect(component['campusTypeOptions']()).toEqual([
        expect.objectContaining({ id: CampusType.HeadOffice, name: 'Main Campus' }),
        expect.objectContaining({ id: CampusType.Branch, name: 'Branch Campus' }),
      ]);
    });

    it('clears the district and locality when the state changes', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component['model'].set(validModel);
      component.onStateChange();

      expect(component['model']().districtId).toBeNull();
      expect(component['model']().localityId).toBeNull();
      expect(lookupStoreMock.loadDistricts).toHaveBeenCalledWith(20);
      expect(lookupStoreMock.loadLocalities).toHaveBeenCalledWith(undefined);
    });

    it('clears the locality and reloads localities when the district changes', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component['model'].set(validModel);
      component.onDistrictChange();

      expect(component['model']().districtId).toBe(34);
      expect(component['model']().localityId).toBeNull();
      expect(lookupStoreMock.loadLocalities).toHaveBeenCalledWith(34);
    });

    it('sends the district and locality on create', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component['model'].set(validModel);
      await TestBed.inject(ApplicationRef).whenStable();
      component.onSubmit();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(campusApiMock.addCampus).toHaveBeenCalledWith(
        expect.objectContaining({
          stateId: 20,
          districtId: 34,
          localityId: 56,
        }),
      );
    });
  });

  describe('edit mode', () => {
    beforeEach(() => configure('8'));

    it('hydrates the geography and seeds every level of the cascade', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      expect(component['model']()).toEqual(
        expect.objectContaining({
          countryId: 1,
          stateId: 20,
          districtId: 34,
          localityId: 56,
        }),
      );
      expect(lookupStoreMock.loadStates).toHaveBeenCalledWith(1);
      expect(lookupStoreMock.loadDistricts).toHaveBeenCalledWith(20);
      expect(lookupStoreMock.loadLocalities).toHaveBeenCalledWith(34);
    });

    it('sends the district and locality on update', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component.onSubmit();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(campusApiMock.updateCampus).toHaveBeenCalledWith(
        expect.objectContaining({ id: 8, districtId: 34, localityId: 56 }),
      );
    });
  });
});
