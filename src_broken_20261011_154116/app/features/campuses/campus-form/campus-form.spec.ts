import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, IndustriesApi, InstitutionLocationApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { InstitutionLocationRow, InstitutionLocationType } from '@shared/interfaces';

import InstitutionLocationForm from './institution-location-form';
import { InstitutionLocationFormModel } from './institution-location-form.schema';

const location: InstitutionLocationRow = {
  id: 8,
  locationCode: 'JBP_CLIENT_SITE',
  locationName: 'Samdariya Mall',
  locationType: InstitutionLocationType.Branch,
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

const validModel: InstitutionLocationFormModel = {
  locationCode: 'JBP_CLIENT_SITE',
  locationName: 'Samdariya Mall',
  locationType: InstitutionLocationType.Branch,
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

const institutionLocationApiMock = {
  getInstitutionLocation: vi.fn(),
  addInstitutionLocation: vi.fn(),
  updateInstitutionLocation: vi.fn(),
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

function configure(institutionLocationId?: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: InstitutionLocationApi, useValue: institutionLocationApiMock },
      { provide: IndustriesApi, useValue: industriesApiMock },
      { provide: Common, useValue: commonMock },
      { provide: LookupStore, useValue: lookupStoreMock },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: { get: () => institutionLocationId ?? null } },
        },
      },
    ],
  });
}

async function createComponent() {
  // `provideRouter([])` has no routes, so a real post-save navigation would reject with NG04002.
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

  const fixture = TestBed.createComponent(InstitutionLocationForm);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture;
}

describe('InstitutionLocationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    institutionLocationApiMock.getInstitutionLocation.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: location }),
    );
    institutionLocationApiMock.addInstitutionLocation.mockReturnValue(
      of({ isSucceeded: true, message: 'Created', errors: [], data: null }),
    );
    institutionLocationApiMock.updateInstitutionLocation.mockReturnValue(
      of({ isSucceeded: true, message: 'Updated', errors: [], data: null }),
    );
    industriesApiMock.getInstitutionCampusTypeOptions.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [
          {
            id: InstitutionLocationType.HeadOffice,
            code: 'MAIN_CAMPUS',
            name: 'Main Campus',
            description: 'Primary campus',
          },
          {
            id: InstitutionLocationType.Branch,
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
        expect.objectContaining({ id: InstitutionLocationType.HeadOffice, name: 'Main Campus' }),
        expect.objectContaining({ id: InstitutionLocationType.Branch, name: 'Branch Campus' }),
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

      expect(institutionLocationApiMock.addInstitutionLocation).toHaveBeenCalledWith(
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

      expect(institutionLocationApiMock.updateInstitutionLocation).toHaveBeenCalledWith(
        expect.objectContaining({ id: 8, districtId: 34, localityId: 56 }),
      );
    });
  });
});
