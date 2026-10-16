import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AuthApi, Common, IndustriesApi, InstitutionsApi } from '@core/services';
import { LookupStore } from '@core/stores';

import Registration from './registration';
import { RegistrationModel } from './registration.schema';

const india = { id: 1, countryName: 'India', countryCode: 'IN', stdCode: '+91', isActive: true };
const australia = {
  id: 2,
  countryName: 'Australia',
  countryCode: 'AU',
  stdCode: '+61',
  isActive: true,
};

const validModel: RegistrationModel = {
  companyName: 'Acme Technologies',
  companyEmailDomain: 'acme.com',
  institutionEmail: 'contact@acme.com',
  contactPersonName: 'John Doe',
  contactNumber: '9876543210',
  countryId: 1,
  genderId: 1,
  institutionTypeId: 2,
  prefix: 'ACME',
};

/** `loadBrandLogos` / `brandLogos` are for `app-auth-header-logo`, which the page renders. */
const institutionsApiMock = {
  registerInstitution: vi.fn(),
  loadBrandLogos: vi.fn().mockResolvedValue(undefined),
  brandLogos: signal<Record<string, string | null>>({
    darkSmall: null,
    darkLarge: null,
    lightSmall: null,
    lightLarge: null,
    favicon: null,
  }),
};
const industriesApiMock = { getIndustries: vi.fn() };
const authApiMock = { isAuthenticatedUser: vi.fn() };
const commonMock = { showMessage: vi.fn() };
const isLoadingGenders = signal(false);
const lookupStoreMock = {
  countries: () => [india, australia],
  isLoadingCountries: () => false,
  genders: () => [{ id: 1, genderName: 'Male' }],
  isLoadingGenders,
  initializeGlobalOptions: vi.fn(),
};

/** `planId` follows the query string, so the route stub exposes `queryParamMap` as a stream. */
function configure(planId = '18') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      MessageService,
      DatePipe,
      { provide: InstitutionsApi, useValue: institutionsApiMock },
      { provide: IndustriesApi, useValue: industriesApiMock },
      { provide: AuthApi, useValue: authApiMock },
      { provide: Common, useValue: commonMock },
      { provide: LookupStore, useValue: lookupStoreMock },
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: of(convertToParamMap({ planId })) },
      },
    ],
  });
}

async function createComponent(): Promise<ComponentFixture<Registration>> {
  // `provideRouter([])` has no routes, so a real post-save navigation rejects with NG04002 and
  // surfaces as an unhandled rejection that fails the whole run.
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

  const fixture = TestBed.createComponent(Registration);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  fixture.detectChanges();
  return fixture;
}

/** First message the field is reporting, which is what the template renders. */
function errorOf(field: () => { errorSummary(): readonly { message?: string }[] }) {
  return field()
    .errorSummary()
    .find((error) => error.message)?.message;
}

describe('Registration', () => {
  let component: Registration;
  let fixture: ComponentFixture<Registration>;

  beforeEach(async () => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
    // jsdom implements no layout, so the scroll a blocked submit performs has to be stubbed.
    Element.prototype.scrollIntoView = vi.fn();
    industriesApiMock.getIndustries.mockReturnValue(
      of({ isSucceeded: true, data: [{ id: 2, institutionTypeName: 'School' }], message: '' }),
    );
    institutionsApiMock.registerInstitution.mockReturnValue(
      of({ isSucceeded: true, message: '', data: { emailSent: true } }),
    );

    configure();
    fixture = await createComponent();
    component = fixture.componentInstance;
  });

  async function setModel(patch: Partial<RegistrationModel>) {
    component['model'].update((m) => ({ ...m, ...patch }));
    await TestBed.inject(ApplicationRef).whenStable();
  }

  // ─── Creation ───────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('checks the session and loads the global lookups on init', () => {
    expect(authApiMock.isAuthenticatedUser).toHaveBeenCalled();
    expect(lookupStoreMock.initializeGlobalOptions).toHaveBeenCalled();
  });

  it('loads the industries for the plan in the query string', () => {
    expect(component['planId']()).toBe(18);
    expect(industriesApiMock.getIndustries).toHaveBeenCalledWith(18);
  });

  it('starts invalid and empty', () => {
    expect(component['f']().invalid()).toBe(true);
    expect(component['model']().companyName).toBe('');
    expect(component['model']().countryId).toBeNull();
  });

  // ─── Validation ──────────────────────────────────────────────────────────────

  describe('companyName', () => {
    it('is required', async () => {
      await setModel({ companyName: '' });
      expect(errorOf(component['f'].companyName)).toBe('Institution name is required.');
    });

    it('demands at least 2 characters', async () => {
      await setModel({ companyName: 'A' });
      expect(component['f'].companyName().invalid()).toBe(true);
    });

    it('rejects a name starting with a number', async () => {
      await setModel({ companyName: '1Tech Corp' });
      expect(component['f'].companyName().invalid()).toBe(true);
    });

    it('accepts a valid name', async () => {
      await setModel({ companyName: 'Acme Technologies Pvt. Ltd.' });
      expect(component['f'].companyName().invalid()).toBe(false);
    });
  });

  describe('companyEmailDomain', () => {
    it('rejects a www prefix', async () => {
      await setModel({ companyEmailDomain: 'www.example.com' });
      expect(component['f'].companyEmailDomain().invalid()).toBe(true);
    });

    it('rejects a string that is not a domain', async () => {
      await setModel({ companyEmailDomain: 'not-a-domain' });
      expect(component['f'].companyEmailDomain().invalid()).toBe(true);
    });

    it('accepts a bare domain', async () => {
      await setModel({ companyEmailDomain: 'example.com' });
      expect(component['f'].companyEmailDomain().invalid()).toBe(false);
    });
  });

  describe('institutionEmail', () => {
    it('rejects a personal email provider', async () => {
      await setModel({ institutionEmail: 'user@yahoo.com' });
      expect(errorOf(component['f'].institutionEmail)).toContain('Personal email addresses');
    });

    it('accepts a Gmail address, which the blocklist deliberately leaves out', async () => {
      await setModel({ institutionEmail: 'user@gmail.com' });
      expect(component['f'].institutionEmail().invalid()).toBe(false);
    });

    it('reports a malformed address as malformed, not as personal', async () => {
      await setModel({ institutionEmail: 'notanemail' });
      expect(errorOf(component['f'].institutionEmail)).toBe(
        'Please enter a valid email address (e.g. user@example.com).',
      );
    });

    it('accepts a company address', async () => {
      await setModel({ institutionEmail: 'contact@acme.com' });
      expect(component['f'].institutionEmail().invalid()).toBe(false);
    });
  });

  describe('contactPersonName', () => {
    it('rejects a name with digits', async () => {
      await setModel({ contactPersonName: 'John1 Doe' });
      expect(component['f'].contactPersonName().invalid()).toBe(true);
    });

    it('rejects 3 or more consecutive repeated characters', async () => {
      await setModel({ contactPersonName: 'Palllvi' });
      expect(errorOf(component['f'].contactPersonName)).toContain('consecutive repeated');
    });

    it('rejects a name over 50 characters', async () => {
      await setModel({ contactPersonName: 'A'.repeat(51) });
      expect(component['f'].contactPersonName().invalid()).toBe(true);
    });

    it('accepts a valid name', async () => {
      await setModel({ contactPersonName: 'John Doe' });
      expect(component['f'].contactPersonName().invalid()).toBe(false);
    });
  });

  describe('contactNumber', () => {
    it('is required', async () => {
      await setModel({ contactNumber: '' });
      expect(errorOf(component['f'].contactNumber)).toBe('Mobile number is required');
    });

    it('rejects non-numeric input', async () => {
      await setModel({ contactNumber: '12345abcde' });
      expect(component['f'].contactNumber().invalid()).toBe(true);
    });

    it('rejects an all-zero number', async () => {
      await setModel({ contactNumber: '0000000000' });
      expect(component['f'].contactNumber().invalid()).toBe(true);
    });

    it('applies the length rule of the selected country', async () => {
      await setModel({ countryId: australia.id, contactNumber: '123456789' });
      expect(component['f'].contactNumber().invalid()).toBe(false);

      await setModel({ contactNumber: '1234567890' });
      expect(errorOf(component['f'].contactNumber)).toBe('Mobile number must be exactly 9 digits');
    });

    it('accepts a 10 digit Indian number', async () => {
      await setModel({ countryId: india.id, contactNumber: '9876543210' });
      expect(component['f'].contactNumber().invalid()).toBe(false);
    });
  });

  describe('required selects', () => {
    it('demand a country, a gender and an industry', () => {
      expect(errorOf(component['f'].countryId)).toBe('Please select a country');
      expect(errorOf(component['f'].genderId)).toBe('Please select a gender');
      expect(errorOf(component['f'].institutionTypeId)).toBe('Please select an institution type');
    });

    it('clear once a value is chosen', async () => {
      await setModel({ countryId: 1, genderId: 1, institutionTypeId: 2 });
      expect(component['f'].countryId().invalid()).toBe(false);
      expect(component['f'].genderId().invalid()).toBe(false);
      expect(component['f'].institutionTypeId().invalid()).toBe(false);
    });
  });

  describe('prefix', () => {
    it('is required', async () => {
      await setModel({ prefix: '' });
      expect(errorOf(component['f'].prefix)).toBe('Prefix is required.');
    });

    it('is capped at 10 characters', async () => {
      await setModel({ prefix: 'A'.repeat(11) });
      expect(component['f'].prefix().invalid()).toBe(true);
    });
  });

  // ─── Dial code ───────────────────────────────────────────────────────────────

  describe('dialCode', () => {
    it('follows the selected country', async () => {
      await setModel({ countryId: australia.id });
      expect(component['dialCode']()).toBe('+61');
    });

    it('is empty while no country is selected', () => {
      expect(component['dialCode']()).toBe('');
    });
  });

  // ─── Submit ──────────────────────────────────────────────────────────────────

  describe('onRegister()', () => {
    it('sends nothing while a lookup is still in flight', async () => {
      // A disabled field is skipped by validation, so the form reads as valid with `null` ids.
      isLoadingGenders.set(true);
      await setModel(validModel);
      component.onRegister();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(institutionsApiMock.registerInstitution).not.toHaveBeenCalled();
      isLoadingGenders.set(false);
    });

    it('reveals the errors and sends nothing while invalid', async () => {
      component.onRegister();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(component['submitted']()).toBe(true);
      expect(institutionsApiMock.registerInstitution).not.toHaveBeenCalled();
    });

    it('sends the collected values, with the derived institution code', async () => {
      await setModel(validModel);
      component.onRegister();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(institutionsApiMock.registerInstitution).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionPlanId: 18,
          institutionName: 'Acme Technologies',
          institutionCode: 'AT',
          institutionEmailDomain: 'acme.com',
          institutionEmail: 'contact@acme.com',
          contactPersonName: 'John Doe',
          contactNumber: '+919876543210',
          countryId: 1,
          genderId: 1,
          institutionTypeId: 2,
          staffCodePrefix: 'ACME',
        }),
      );
    });

    it('navigates to the email check on success', async () => {
      await setModel(validModel);
      component.onRegister();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(
        ['/auth/registration-email-check'],
        { queryParams: { email: 'contact@acme.com', emailSent: true } },
      );
    });

    it('reports the actual unsent state on the email check page', async () => {
      institutionsApiMock.registerInstitution.mockReturnValue(
        of({
          isSucceeded: true,
          message: 'Institution created successfully, but welcome email could not be sent.',
          data: { emailSent: false },
        }),
      );
      await setModel(validModel);
      component.onRegister();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(
        ['/auth/registration-email-check'],
        { queryParams: { email: 'contact@acme.com', emailSent: false } },
      );
    });

    it('treats a success without an emailSent flag as sent', async () => {
      institutionsApiMock.registerInstitution.mockReturnValue(
        of({ isSucceeded: true, message: '', data: null }),
      );
      await setModel(validModel);
      component.onRegister();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(
        ['/auth/registration-email-check'],
        { queryParams: { email: 'contact@acme.com', emailSent: true } },
      );
    });

    it('reports a rejected registration', async () => {
      institutionsApiMock.registerInstitution.mockReturnValue(
        of({ isSucceeded: false, message: 'Email already exists', errors: [], data: null }),
      );
      await setModel(validModel);
      component.onRegister();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(commonMock.showMessage).toHaveBeenCalledWith('Email already exists', 'error');
    });

    it('combines the API message with distinct registration details', async () => {
      institutionsApiMock.registerInstitution.mockReturnValue(
        of({
          isSucceeded: false,
          message:
            'Institution registration could not complete while loading the selected plan modules.',
          errors: ['The selected plan has no active module mapping.', '', 42],
          errorCode: 'INSTITUTION_REGISTRATION_FAILED',
          data: null,
        }),
      );
      await setModel(validModel);
      component.onRegister();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(commonMock.showMessage).toHaveBeenCalledWith(
        'Institution registration could not complete while loading the selected plan modules. The selected plan has no active module mapping.',
        'error',
      );
    });

    it('shows validation details when the failed envelope has no message', async () => {
      institutionsApiMock.registerInstitution.mockReturnValue(
        of({
          isSucceeded: false,
          message: '',
          errors: ['Company email is already registered.', 'Select an active subscription plan.'],
          data: null,
        }),
      );
      await setModel(validModel);
      component.onRegister();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(commonMock.showMessage).toHaveBeenCalledWith(
        'Company email is already registered. Select an active subscription plan.',
        'error',
      );
    });

    it('uses an actionable fallback for an empty failed envelope', async () => {
      institutionsApiMock.registerInstitution.mockReturnValue(
        of({ isSucceeded: false, message: '   ', errors: null, data: null }),
      );
      await setModel(validModel);
      component.onRegister();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(commonMock.showMessage).toHaveBeenCalledWith(
        'Institution account could not be created. Review the information and try again.',
        'error',
      );
    });

    it('reports a transport failure', async () => {
      institutionsApiMock.registerInstitution.mockReturnValue(
        throwError(() => new Error('Network error')),
      );
      await setModel(validModel);
      component.onRegister();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(commonMock.showMessage).toHaveBeenCalledWith('Network error', 'error');
      expect(component['isLoading']()).toBe(false);
    });

    it('uses an actionable fallback for an unknown transport failure', async () => {
      institutionsApiMock.registerInstitution.mockReturnValue(throwError(() => ({ status: 0 })));
      await setModel(validModel);
      component.onRegister();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(commonMock.showMessage).toHaveBeenCalledWith(
        'Unable to create the institution account. Check the connection and try again.',
        'error',
      );
      expect(component['isLoading']()).toBe(false);
    });
  });

  // ─── Industries ──────────────────────────────────────────────────────────────

  describe('industries', () => {
    it('reports a failed lookup', async () => {
      TestBed.resetTestingModule();
      industriesApiMock.getIndustries.mockReturnValue(
        of({ isSucceeded: false, data: [], message: 'Industries error' }),
      );
      configure();
      await createComponent();

      expect(commonMock.showMessage).toHaveBeenCalledWith('Industries error', 'error');
    });

    it('reports a transport failure', async () => {
      TestBed.resetTestingModule();
      industriesApiMock.getIndustries.mockReturnValue(throwError(() => new Error('Server down')));
      configure();
      await createComponent();

      expect(commonMock.showMessage).toHaveBeenCalledWith('Server down', 'error');
    });
  });
});
