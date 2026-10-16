import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { IndustriesApi, SubscriptionsApi, InstitutionsApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { InstitutionDetail, CampusType } from '@shared/interfaces';

import InstitutionForm from './institution-form';
import { InstitutionFormModel } from './institution-form.schema';

/**
 * `get-institution-by-id` answers with the whole aggregate, so this one fixture is everything the edit
 * form hydrates from. Two quirks of the real payload are reproduced deliberately: the contact
 * number carries a space, and `runningNumberLength` is a number where the write DTOs take a string.
 */
const institution: InstitutionDetail = {
  id: 'TEN00007',
  institutionTypeId: 7,
  institutionTypeName: 'University',
  companyName: 'Acme Corp',
  institutionCode: 'ACME',
  companyEmailDomain: 'acme.com',
  institutionEmail: 'admin@acme.com',
  contactPersonName: 'Jane Doe',
  genderId: 2,
  contactNumber: '+9199999 99999',
  countryId: 1,
  defaultCurrency: 1,
  isVerified: true,
  isActive: true,
  profiles: [
    {
      id: 18,
      address: '9 Residency Road',
      logoUrl: 'https://acme.com/logo.png',
      themeColor: '#95a800',
      businessType: 'Software services',
      industry: 'Retail',
      totalStaffMembers: 325,
      totalBranches: 6,
      foundedYear: 2016,
      websiteUrl: 'https://acme.com',
    },
  ],
  locations: [
    {
      id: 88,
      locationCode: 'HQ-BLR-001',
      locationName: 'Acme Head Office',
      locationType: CampusType.HeadOffice,
      countryId: 1,
      stateId: 12,
      districtId: 34,
      localityId: 56,
      address: '9 Residency Road, Level 4',
      landmark: 'Near the metro',
      postalCode: '560025',
      latitude: 12.9698,
      longitude: 77.7499,
      geoFenceRadiusMeters: 250,
      timeZoneId: 'Asia/Kolkata',
      isHeadOffice: true,
      isGeoFenceEnabled: true,
      isAttendanceAllowed: true,
      isBiometricEnabled: true,
    },
  ],
  subscriptions: [
    {
      id: 57,
      subscriptionPlanId: 3,
      subscriptionPlanName: 'Growth',
      subscriptionStartDate: '2026-08-01T00:00:00Z',
      subscriptionEndDate: '2026-09-01T00:00:00Z',
      isTrial: true,
      paymentTxnId: null,
      paymentMode: null,
    },
  ],
  departments: [],
  staffMemberCodePatterns: [
    {
      id: 17,
      prefix: 'EMP',
      includeYear: false,
      includeMonth: false,
      includeDepartment: false,
      separator: '-',
      runningNumberLength: 4,
      lastUsedNumber: 1,
    },
  ],
  staffMembers: [],
  loginCredentials: [],
  // Read-only on the detail drawer; the host form neither hydrates nor sends it.
  emailConfigurations: [],
};

const country = { id: 1, countryName: 'India', countryCode: 'IN', stdCode: '+91', isActive: true };

/** A model that satisfies every rule in `institutionCreateSchema`, so submit actually reaches the API. */
const validCreateModel: InstitutionFormModel = {
  companyName: 'Acme Corp',
  institutionCode: 'ACME',
  companyEmailDomain: 'acme.com',
  institutionEmail: 'admin@acme.com',
  contactPersonName: 'Jane Doe',
  contactNumber: '9999999999',
  countryId: 1,
  genderId: 1,
  subscriptionPlanId: 3,
  institutionTypeId: 5,
  defaultCurrency: null,
  isActive: true,
  profile: {
    businessType: 'Software services',
    websiteUrl: 'https://acme.com',
    logoUrl: 'https://acme.com/logo.png',
    themeColor: '#2563eb',
    totalStaffMembers: 250,
    totalBranches: 4,
    foundedYear: 2014,
  },
  initialLocation: {
    locationCode: 'HO-BLR',
    locationName: 'Bengaluru Head Office',
    locationType: CampusType.HeadOffice,
    stateId: 12,
    districtId: 34,
    localityId: 56,
    address: '12 MG Road, Level 4',
    landmark: '',
    postalCode: '560001',
    latitude: null,
    longitude: null,
    isGeoFenceEnabled: false,
    geoFenceRadiusMeters: null,
    timeZoneId: 'Asia/Kolkata',
    isAttendanceAllowed: true,
    isBiometricEnabled: false,
  },
  staffMemberCodePattern: {
    prefix: 'EMP',
    separator: '-',
    runningNumberLength: '4',
    includeYear: true,
    includeMonth: false,
    includeDepartment: false,
  },
};

const institutionsApiMock = {
  getInstitutionById: vi.fn(),
  createInstitutionByHost: vi.fn(),
  updateInstitutionByHost: vi.fn(),
  activateInstitution: vi.fn(),
  deactivateInstitution: vi.fn(),
};
const subscriptionsApiMock = { getAllSubscriptionPlan: vi.fn() };
const industriesApiMock = {
  getIndustries: vi.fn(),
  getInstitutionCategoryOptions: vi.fn(),
  getInstitutionCampusTypeOptions: vi.fn(),
};
const lookupStoreMock = {
  countries: () => [country],
  isLoadingCountries: () => false,
  genders: () => [{ id: 1, genderName: 'Female' }],
  isLoadingGenders: () => false,
  currencies: () => [
    { id: 1, code: 'INR', name: 'Indian Rupee', symbol: '₹', isActive: true },
    { id: 2, code: 'USD', name: 'US Dollar', symbol: '$', isActive: true },
  ],
  isLoadingCurrencies: () => false,
  states: () => [{ id: 12, countryId: 1, stateName: 'Karnataka', isActive: true }],
  isLoadingStates: () => false,
  districts: () => [{ id: 34, stateId: 12, districtName: 'Bengaluru Urban', isActive: true }],
  isLoadingDistricts: () => false,
  localities: () => [{ id: 56, districtId: 34, localityName: 'Indiranagar', isActive: true }],
  isLoadingLocalities: () => false,
  loadStates: vi.fn(),
  loadDistricts: vi.fn(),
  loadLocalities: vi.fn(),
};

/** `institutionId` is read from the snapshot, so the route stub only has to expose the param map. */
function configure(institutionId?: string) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      MessageService,
      DatePipe,
      { provide: InstitutionsApi, useValue: institutionsApiMock },
      { provide: SubscriptionsApi, useValue: subscriptionsApiMock },
      { provide: IndustriesApi, useValue: industriesApiMock },
      { provide: LookupStore, useValue: lookupStoreMock },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => institutionId ?? null } } },
      },
    ],
  });
}

async function createComponent() {
  // `provideRouter([])` has no routes, so a real post-save navigation rejects with
  // NG04002 and surfaces as an unhandled rejection that fails the whole run.
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

  const fixture = TestBed.createComponent(InstitutionForm);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('InstitutionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    institutionsApiMock.getInstitutionById.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: institution }),
    );
    institutionsApiMock.createInstitutionByHost.mockReturnValue(
      of({ isSucceeded: true, message: 'Created', errors: null, data: null }),
    );
    institutionsApiMock.updateInstitutionByHost.mockReturnValue(
      of({ isSucceeded: true, message: 'Updated', errors: [], data: null }),
    );
    institutionsApiMock.activateInstitution.mockReturnValue(
      of({ isSucceeded: true, message: 'Activated', errors: [], data: null }),
    );
    institutionsApiMock.deactivateInstitution.mockReturnValue(
      of({ isSucceeded: true, message: 'Deactivated', errors: [], data: null }),
    );
    subscriptionsApiMock.getAllSubscriptionPlan.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [{ id: 3, planName: 'Growth' }] }),
    );
    industriesApiMock.getIndustries.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [{ id: 5, institutionTypeName: 'University' }],
      }),
    );
    industriesApiMock.getInstitutionCategoryOptions.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [{ id: 3, code: 'PRIVATE', name: 'Private', description: 'Private institution.' }],
      }),
    );
    industriesApiMock.getInstitutionCampusTypeOptions.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [{ id: 1, code: 'MAIN_CAMPUS', name: 'Main Campus', description: 'Main campus.' }],
      }),
    );
  });

  describe('create mode', () => {
    beforeEach(() => configure());

    it('starts invalid and shows the create-only sections', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      expect(component['isEditMode']).toBe(false);
      expect(component['f']().invalid()).toBe(true);
      expect(fixture.nativeElement.querySelector('#subscriptionPlanId')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#pattern-prefix')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#profile-businessType')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#location-locationCode')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#isActive')).toBeFalsy();
    });

    it('renders the selected campus type by the API option name', async () => {
      const fixture = await createComponent();
      const campusTypeInput = fixture.nativeElement.querySelector('#location-locationType');

      expect(industriesApiMock.getInstitutionCampusTypeOptions).toHaveBeenCalledTimes(1);
      expect(campusTypeInput?.parentElement?.textContent).toContain('Main Campus');
    });

    it('renders identifier-like numbers without a thousands separator', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component['model'].update((m) => ({
        ...m,
        profile: { ...m.profile, foundedYear: 2016, totalStaffMembers: 2500 },
      }));
      await TestBed.inject(ApplicationRef).whenStable();
      fixture.detectChanges();

      const valueOf = (id: string) =>
        (fixture.nativeElement.querySelector(id) as HTMLInputElement).value;

      // A year is an identifier; a headcount is a quantity and keeps its grouping.
      expect(valueOf('#profile-foundedYear')).toBe('2016');
      expect(valueOf('#profile-totalStaffMembers')).toBe('2,500');
    });

    it('marks every required control as required for assistive tech', async () => {
      const fixture = await createComponent();

      // zod issues carry no field metadata, so the DOM `required` state never gets set and
      // `aria-required` is the only thing that reaches a screen reader.
      for (const id of ['#companyName', '#institutionCode', '#companyEmailDomain', '#institutionEmail']) {
        expect(fixture.nativeElement.querySelector(id).getAttribute('aria-required')).toBe('true');
      }

      // Every select's help slot has to be addressable for its hint and error to be announced.
      for (const id of ['countryId', 'genderId', 'subscriptionPlanId']) {
        expect(fixture.nativeElement.querySelector(`#${id}-help`)).toBeTruthy();
      }
    });

    it('does not fetch industries until a plan is chosen', async () => {
      const fixture = await createComponent();
      expect(industriesApiMock.getIndustries).not.toHaveBeenCalled();

      fixture.componentInstance['model'].update((m) => ({ ...m, subscriptionPlanId: 3 }));
      await TestBed.inject(ApplicationRef).whenStable();

      expect(industriesApiMock.getIndustries).toHaveBeenCalledWith(3);
    });

    it('does not refetch industries when an unrelated field changes', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component['model'].update((m) => ({ ...m, subscriptionPlanId: 3 }));
      await TestBed.inject(ApplicationRef).whenStable();
      expect(industriesApiMock.getIndustries).toHaveBeenCalledTimes(1);

      // A resource reloads on every `params` re-run, so reading the whole model there used to turn
      // each keystroke and toggle into another request.
      component['model'].update((m) => ({
        ...m,
        staffMemberCodePattern: {
          ...m.staffMemberCodePattern,
          includeYear: !m.staffMemberCodePattern.includeYear,
          prefix: 'ACM',
        },
      }));
      await TestBed.inject(ApplicationRef).whenStable();

      expect(industriesApiMock.getIndustries).toHaveBeenCalledTimes(1);
    });

    it('fills the institution code from the company name', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component['model'].update((m) => ({ ...m, companyName: 'Acme Technologies Pvt Ltd' }));
      component.onCompanyNameBlur();

      expect(component['model']().institutionCode).toBe('AT');
    });

    it('clears the state, district and locality when the country changes', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component['model'].update((m) => ({
        ...m,
        countryId: 1,
        initialLocation: { ...m.initialLocation, stateId: 12, districtId: 34, localityId: 56 },
      }));
      component.onCountryChange();

      expect(component['model']().initialLocation.stateId).toBeNull();
      expect(component['model']().initialLocation.districtId).toBeNull();
      expect(component['model']().initialLocation.localityId).toBeNull();
      expect(lookupStoreMock.loadStates).toHaveBeenCalledWith(1);
      expect(lookupStoreMock.loadDistricts).toHaveBeenCalledWith(undefined);
      expect(lookupStoreMock.loadLocalities).toHaveBeenCalledWith(undefined);
    });

    it('clears the locality and reloads localities when the district changes', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component['model'].update((m) => ({
        ...m,
        initialLocation: { ...m.initialLocation, stateId: 12, districtId: 34, localityId: 56 },
      }));
      component.onDistrictChange();

      expect(component['model']().initialLocation.localityId).toBeNull();
      expect(lookupStoreMock.loadLocalities).toHaveBeenCalledWith(34);
    });

    it('requires a radius and coordinates once the geo-fence is on', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component['model'].set({
        ...validCreateModel,
        initialLocation: { ...validCreateModel.initialLocation, isGeoFenceEnabled: true },
      });
      await TestBed.inject(ApplicationRef).whenStable();

      expect(component['f'].initialLocation.geoFenceRadiusMeters().invalid()).toBe(true);
      expect(component['f'].initialLocation.latitude().invalid()).toBe(true);
      expect(component['f'].initialLocation.longitude().invalid()).toBe(true);
    });

    it('creates the institution through the host endpoint with every nested block', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;
      const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      component['model'].set(validCreateModel);
      await TestBed.inject(ApplicationRef).whenStable();

      component.onSubmit();
      await TestBed.inject(ApplicationRef).whenStable();

      // `moduleOperationInterceptor` owns `moduleId` / `operationId` - the form sends neither.
      expect(institutionsApiMock.createInstitutionByHost).toHaveBeenCalledWith({
        subscriptionPlanId: 3,
        institutionTypeId: 5,
        companyName: 'Acme Corp',
        institutionCode: 'ACME',
        companyEmailDomain: 'acme.com',
        genderId: 1,
        institutionEmail: 'admin@acme.com',
        contactPersonName: 'Jane Doe',
        contactNumber: '+919999999999',
        countryId: 1,
        profile: {
          logoUrl: 'https://acme.com/logo.png',
          themeColor: '#2563eb',
          businessType: 'Software services',
          // Filled from the selected industry, not collected twice.
          industry: 'University',
          totalStaffMembers: 250,
          totalBranches: 4,
          foundedYear: 2014,
          websiteUrl: 'https://acme.com',
        },
        initialLocation: {
          locationCode: 'HO-BLR',
          locationName: 'Bengaluru Head Office',
          locationType: CampusType.HeadOffice,
          stateId: 12,
          districtId: 34,
          localityId: 56,
          address: '12 MG Road, Level 4',
          landmark: '',
          postalCode: '560001',
          // Left blank in the form, and `0` is a real coordinate - these go out as null.
          latitude: null,
          longitude: null,
          geoFenceRadiusMeters: null,
          timeZoneId: 'Asia/Kolkata',
          isGeoFenceEnabled: false,
          isAttendanceAllowed: true,
          isBiometricEnabled: false,
        },
        staffMemberCodePattern: {
          prefix: 'EMP',
          separator: '-',
          // The API types the padding width as a string, not a number.
          runningNumberLength: '4',
          includeYear: true,
          includeMonth: false,
          includeDepartment: false,
        },
      });
      // Email configuration is the backend's to manage, so the host form sends none.
      expect(institutionsApiMock.createInstitutionByHost.mock.calls[0][0]).not.toHaveProperty(
        'emailConfiguration',
      );
      // The profile block carries no address - the head office keeps its own.
      expect(institutionsApiMock.createInstitutionByHost.mock.calls[0][0].profile).not.toHaveProperty(
        'address',
      );
      expect(navigateSpy).toHaveBeenCalledWith(['/app/institutions']);
    });
  });

  describe('edit mode', () => {
    beforeEach(() => configure('TEN00007'));

    it('hydrates every block from the one get-institution-by-id call', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;
      const model = component['model']();

      expect(institutionsApiMock.getInstitutionById).toHaveBeenCalledWith('TEN00007');
      // The aggregate carries all of it, so the two side reads the form used to make are gone.
      expect(institutionsApiMock).not.toHaveProperty('getStaffMemberCodePattern');

      expect(model.companyName).toBe('Acme Corp');
      expect(model.genderId).toBe(2);
      expect(model.institutionTypeId).toBe(7);
      expect(model.profile.businessType).toBe('Software services');
      expect(model.profile.totalStaffMembers).toBe(325);
      expect(model.initialLocation.locationCode).toBe('HQ-BLR-001');
      expect(model.initialLocation.stateId).toBe(12);
      expect(model.initialLocation.geoFenceRadiusMeters).toBe(250);
      // A freshly hydrated form is not dirty, so leaving it must not prompt.
      expect(component.canDeactivate()).toBe(true);
    });

    it('renders the same section cards while loading as it does once loaded', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      const headings = () =>
        Array.from(fixture.nativeElement.querySelectorAll('app-section-card h2')).map(
          (h) => (h as HTMLElement).textContent?.trim() ?? '',
        );

      const loaded = headings();

      // A skeleton that does not mirror the form reflows the page the moment the record lands.
      component['isLoading'].set(true);
      await TestBed.inject(ApplicationRef).whenStable();
      fixture.detectChanges();

      expect(headings()).toEqual(loaded);
    });

    it('normalises the two shapes the response and the DTOs disagree on', async () => {
      const fixture = await createComponent();
      const model = fixture.componentInstance['model']();

      // Stored as "+9199999 99999": the dial code comes off and so does the space, or the country
      // phone rule would fail a form the user has not touched.
      expect(model.contactNumber).toBe('9999999999');
      // Returned as the number 4; both write DTOs take a string.
      expect(model.staffMemberCodePattern.runningNumberLength).toBe('4');

      // Both would otherwise fail their own rule on a form nobody has touched.
      expect(fixture.componentInstance['f'].contactNumber().invalid()).toBe(false);
      expect(
        fixture.componentInstance['f'].staffMemberCodePattern.runningNumberLength().invalid(),
      ).toBe(false);
    });

    it('shows the plan read-only and offers industry and gender as real fields', async () => {
      const fixture = await createComponent();

      // The update DTO has no `subscriptionPlanId`, so the plan is reported, not offered.
      expect(fixture.nativeElement.querySelector('#subscriptionPlanId')).toBeFalsy();
      expect(fixture.nativeElement.textContent).toContain('Growth');
      expect(subscriptionsApiMock.getAllSubscriptionPlan).not.toHaveBeenCalled();

      expect(fixture.nativeElement.querySelector('#institutionTypeId')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#genderId')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#pattern-prefix')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#profile-businessType')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#location-locationCode')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#isActive')).toBeTruthy();
    });

    it('loads the industry list from the plan the institution is already on', async () => {
      await createComponent();

      // `get-industries` is plan-scoped, and `subscriptions[0]` is the only place a host session
      // can learn which plan that is.
      expect(industriesApiMock.getIndustries).toHaveBeenCalledWith(3);
    });

    it('seeds the state, district and locality cascade from the hydrated location', async () => {
      await createComponent();

      expect(lookupStoreMock.loadStates).toHaveBeenCalledWith(1);
      expect(lookupStoreMock.loadDistricts).toHaveBeenCalledWith(12);
      expect(lookupStoreMock.loadLocalities).toHaveBeenCalledWith(34);
    });

    it('hydrates a institution with no location as blank, with a zero location id', async () => {
      institutionsApiMock.getInstitutionById.mockReturnValue(
        of({ isSucceeded: true, message: '', errors: [], data: { ...institution, locations: [] } }),
      );

      const fixture = await createComponent();
      const component = fixture.componentInstance;

      expect(component['model']().initialLocation.locationCode).toBe('');
      // Seeded rather than blank, so a new head office starts somewhere sensible.
      expect(component['model']().initialLocation.timeZoneId).toBeTruthy();
      expect(lookupStoreMock.loadDistricts).toHaveBeenCalledWith(undefined);

      // `campusId: 0` is how the backend is asked to create the institution's first location.
      component['model'].set(validCreateModel);
      await TestBed.inject(ApplicationRef).whenStable();
      component.onSubmit();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(institutionsApiMock.updateInstitutionByHost.mock.calls[0][1].selectedLocation).toEqual(
        expect.objectContaining({ campusId: 0 }),
      );
    });

    it('sends a blank head-office geography as null rather than zero', async () => {
      institutionsApiMock.getInstitutionById.mockReturnValue(
        of({ isSucceeded: true, message: '', errors: [], data: { ...institution, locations: [] } }),
      );

      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component.onSubmit();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(institutionsApiMock.updateInstitutionByHost.mock.calls[0][1].selectedLocation).toEqual(
        expect.objectContaining({ stateId: null, districtId: null, localityId: null }),
      );
    });

    it('sends the hydrated values straight back out', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component.onSubmit();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(institutionsApiMock.updateInstitutionByHost).toHaveBeenCalledWith(
        'TEN00007',
        expect.objectContaining({
          companyName: 'Acme Corp',
          contactNumber: '+919999999999',
          countryId: 1,
          // Real form fields now, not passthrough.
          institutionTypeId: 7,
          genderId: 2,
          // Hydrated into the select, and sent back from it.
          defaultCurrency: 1,
          profile: expect.objectContaining({
            businessType: 'Software services',
            totalStaffMembers: 325,
            // Derived from the selected industry, not from `profiles[0].industry`.
            industry: 'University',
          }),
          selectedLocation: expect.objectContaining({
            // The row `#hydrate` picked, so the update replaces it rather than adding one.
            campusId: 88,
            // `selectedLocation` carries its own country, taken from the root of the form.
            countryId: 1,
            locationCode: 'HQ-BLR-001',
          }),
        }),
      );
      const body = institutionsApiMock.updateInstitutionByHost.mock.calls[0][1];
      // Email configuration is the backend's to manage, so the host form sends none.
      expect(body).not.toHaveProperty('emailConfiguration');
      expect(body).not.toHaveProperty('subscriptionPlanId');
      // The profile block carries no address - the head office keeps its own.
      expect(body.profile).not.toHaveProperty('address');
      expect(institutionsApiMock.createInstitutionByHost).not.toHaveBeenCalled();
      expect(institutionsApiMock.activateInstitution).not.toHaveBeenCalled();
      expect(institutionsApiMock.deactivateInstitution).not.toHaveBeenCalled();
    });

    it('lets a self-service institution with no profile or location be saved untouched', async () => {
      // `create-institution` leaves the profile row blank and creates no location, so demanding those
      // blocks on edit would mean a host could not correct a phone number on any legacy institution.
      institutionsApiMock.getInstitutionById.mockReturnValue(
        of({
          isSucceeded: true,
          message: '',
          errors: [],
          data: {
            ...institution,
            profiles: [
              {
                id: 18,
                address: null,
                logoUrl: null,
                themeColor: null,
                businessType: null,
                industry: null,
                totalStaffMembers: null,
                totalBranches: null,
                foundedYear: null,
                websiteUrl: null,
              },
            ],
            locations: [],
          },
        }),
      );

      const fixture = await createComponent();
      const component = fixture.componentInstance;

      expect(component['f']().invalid()).toBe(false);

      component.onSubmit();
      await TestBed.inject(ApplicationRef).whenStable();

      const body = institutionsApiMock.updateInstitutionByHost.mock.calls[0][1];
      expect(body.profile.businessType).toBe('');
      expect(body.selectedLocation.campusId).toBe(0);
    });

    it('drops the geo-fence radius when the fence is switched off', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      // The radius input is only disabled, so it keeps the hydrated 250.
      component['model'].update((m) => ({
        ...m,
        initialLocation: { ...m.initialLocation, isGeoFenceEnabled: false },
      }));
      await TestBed.inject(ApplicationRef).whenStable();

      component.onSubmit();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(
        institutionsApiMock.updateInstitutionByHost.mock.calls[0][1].selectedLocation.geoFenceRadiusMeters,
      ).toBeNull();
    });

    it('leaves an unset currency null rather than coercing it to zero', async () => {
      // The reads return `null` for a institution with no currency, the select stays on its placeholder,
      // and the backend rejects `0` with
      // "One or more selected configuration references are invalid for this institution."
      institutionsApiMock.getInstitutionById.mockReturnValue(
        of({
          isSucceeded: true,
          message: '',
          errors: [],
          data: { ...institution, defaultCurrency: null },
        }),
      );

      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component.onSubmit();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(institutionsApiMock.updateInstitutionByHost.mock.calls[0][1].defaultCurrency).toBeNull();
    });

    it('sends a status change through deactivate-institution, not the update body', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component['model'].update((m) => ({
        ...m,
        isActive: false,
      }));
      await TestBed.inject(ApplicationRef).whenStable();

      component.onSubmit();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(institutionsApiMock.updateInstitutionByHost).toHaveBeenCalledWith(
        'TEN00007',
        expect.not.objectContaining({ isActive: expect.anything() }),
      );
      expect(institutionsApiMock.deactivateInstitution).toHaveBeenCalledWith({ institutionId: 'TEN00007' });
    });

    it('previews the staffMember code read back from the API', async () => {
      const fixture = await createComponent();

      expect(fixture.componentInstance['staffMemberCodePreview']()).toBe('EMP-0001');
    });

    it('blocks navigation once the form is edited', async () => {
      const fixture = await createComponent();
      const component = fixture.componentInstance;

      component['model'].update((m) => ({ ...m, companyName: 'Acme Global' }));

      expect(component.canDeactivate()).toBe(false);
    });
  });
});
