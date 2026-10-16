import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { InstitutionsApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { GetInstitutionByIdRes, IInstitution, InstitutionDetail as InstitutionAggregate } from '@shared/interfaces';

import { InstitutionDetail } from './institution-detail';

const institutionRow = {
  id: 'TEN00001',
  companyName: 'Acme Corp',
  institutionCode: 'ACME',
  countryId: 1,
  isVerified: true,
  isActive: true,
} as IInstitution;

const aggregate: InstitutionAggregate = {
  id: 'TEN00001',
  institutionTypeId: 3,
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
      id: 1,
      address: '12 Mill Road',
      logoUrl: null,
      themeColor: null,
      businessType: 'Private',
      industry: 'Manufacturing',
      totalStaffMembers: 120,
      totalBranches: 3,
      foundedYear: 1998,
      websiteUrl: 'https://acme.com',
    },
  ],
  locations: [],
  subscriptions: [
    {
      id: 5,
      subscriptionPlanId: 2,
      subscriptionPlanName: 'Growth',
      subscriptionStartDate: '2026-01-01T00:00:00',
      subscriptionEndDate: null,
      isTrial: true,
      paymentTxnId: null,
      paymentMode: null,
    },
  ],
  departments: [],
  staffMemberCodePatterns: [],
  staffMembers: [],
  loginCredentials: [],
  emailConfigurations: [],
};

const succeeded = (data: InstitutionAggregate | null): GetInstitutionByIdRes =>
  ({ isSucceeded: true, message: '', data }) as GetInstitutionByIdRes;

describe('InstitutionDetail', () => {
  let fixture: ComponentFixture<InstitutionDetail>;
  let getInstitutionById: ReturnType<typeof vi.fn>;

  const lookupStoreMock = {
    countries: () => [
      { id: 1, countryName: 'India', countryCode: 'IN', stdCode: '+91', isActive: true },
    ],
  };

  const create = async () => {
    fixture = TestBed.createComponent(InstitutionDetail);
    fixture.componentRef.setInput('institution', institutionRow);
    fixture.componentRef.setInput('canUpdate', true);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
  };

  const html = () => fixture.nativeElement.textContent as string;

  beforeEach(async () => {
    getInstitutionById = vi.fn().mockReturnValue(of(succeeded(aggregate)));

    await TestBed.configureTestingModule({
      imports: [InstitutionDetail],
      providers: [
        { provide: InstitutionsApi, useValue: { getInstitutionById } },
        { provide: LookupStore, useValue: lookupStoreMock },
      ],
    }).compileComponents();
  });

  it('should fetch the aggregate for the selected row', async () => {
    await create();

    expect(getInstitutionById).toHaveBeenCalledWith('TEN00001');
  });

  it('should show skeletons while the request is in flight', async () => {
    const pending = new Subject<GetInstitutionByIdRes>();
    getInstitutionById.mockReturnValue(pending);

    // Not `create()`: `whenStable()` waits for the pending resource, which is the state under test.
    fixture = TestBed.createComponent(InstitutionDetail);
    fixture.componentRef.setInput('institution', institutionRow);
    fixture.componentRef.setInput('canUpdate', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
    expect(html()).toContain('Loading institution details');
    // A resolved-but-empty result is how failure reads, so an unloaded resource must never
    // fall through to the failure card.
    expect(html()).not.toContain("Couldn't load institution details");
    // Nothing from the row is echoed while loading — the panel is fetch-only.
    expect(html()).not.toContain('acme.com');

    pending.next(succeeded(aggregate));
    pending.complete();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBe(0);
    expect(html()).toContain('acme.com');
  });

  it('should render the fields only the aggregate carries', async () => {
    await create();

    const text = html();
    expect(text).toContain('Manufacturing');
    expect(text).toContain('Growth');
    expect(text).toContain('https://acme.com');
    expect(text).toContain('India');
    // Empty child collections say so rather than rendering a blank card.
    expect(text).toContain('No locations on this institution.');
    // Industry belongs to the company card; the profile card must not repeat it.
    expect(text.match(/Industry/g)?.length ?? 0).toBe(1);
  });

  it('should show the profile logo, and fall back to the building mark when it fails', async () => {
    getInstitutionById.mockReturnValue(
      of(
        succeeded({
          ...aggregate,
          profiles: [{ ...aggregate.profiles[0], logoUrl: 'https://acme.com/logo.png' }],
        }),
      ),
    );

    await create();

    const logo = fixture.nativeElement.querySelector('header img, img[class*="rounded-full"]');
    expect(logo?.getAttribute('src')).toBe('https://acme.com/logo.png');

    logo.dispatchEvent(new Event('error'));
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img[class*="rounded-full"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pi-building')).toBeTruthy();
  });

  it('should use the building mark when the profile carries no logo', async () => {
    await create();

    expect(fixture.nativeElement.querySelector('.pi-building')).toBeTruthy();
  });

  it('should paint a missing value as a placeholder, not as content', async () => {
    await create();

    const placeholder = fixture.nativeElement.querySelector('[aria-label="Not set"]');
    // `paymentMode` and `paymentTxnId` are null on the fixture.
    expect(placeholder?.textContent?.trim()).toBe('—');
    expect(placeholder.className).toContain('text-gray-400');
  });

  it('should cap a long collection and count the rest', async () => {
    const staffMembers = Array.from({ length: 7 }, (_, index) => ({
      id: index + 1,
      employementCode: `EMP-${index}`,
      firstName: `First${index}`,
      middleName: null,
      lastName: 'Last',
      genderId: 1,
      departmentId: null,
      departmentName: null,
      staffEmploymentTypeId: null,
      officialEmail: null,
      dateOfOnBoarding: null,
      countryId: 1,
    }));
    getInstitutionById.mockReturnValue(of(succeeded({ ...aggregate, staffMembers })));

    await create();

    const text = html();
    expect(text).toContain('First4 Last');
    expect(text).not.toContain('First5 Last');
    expect(text).toContain('+2 more');
    // The header still names the true total.
    expect(text).toContain('(7)');
  });

  // Configuration a host reads rarely. Present in the DOM, closed until asked for.
  it('should collapse the three configuration sections by default', async () => {
    await create();

    const sections = fixture.nativeElement.querySelectorAll('details');
    expect(sections.length).toBe(3);
    expect([...sections].every((section: HTMLDetailsElement) => !section.open)).toBe(true);
    expect(html()).toContain('Email Configuration');
  });

  it('should offer a retry when the request fails', async () => {
    getInstitutionById.mockReturnValue(throwError(() => new Error('offline')));

    await create();

    expect(html()).toContain("Couldn't load institution details");
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();

    getInstitutionById.mockReturnValue(of(succeeded(aggregate)));
    fixture.debugElement.nativeElement.querySelector('p-button[label="Retry"] button').click();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();

    expect(getInstitutionById).toHaveBeenCalledTimes(2);
    expect(html()).toContain('Manufacturing');
  });

  // A rejected envelope means the record could not be read; it must not render as an empty institution.
  it('should treat a rejected envelope as a failure', async () => {
    getInstitutionById.mockReturnValue(of({ isSucceeded: false, message: 'no', data: null }));

    await create();

    expect(html()).toContain("Couldn't load institution details");
  });

  // A 403, a 404 and a dropped connection are not the same problem, so the panel repeats what the
  // server said rather than guessing.
  it('should name the failure the server reported', async () => {
    getInstitutionById.mockReturnValue(
      of({ isSucceeded: false, message: 'Institution is not accessible to this host.', data: null }),
    );

    await create();

    expect(html()).toContain('Institution is not accessible to this host.');
    expect(html()).not.toContain('The institution record is temporarily unavailable');
  });

  it('should fall back to the generic line when the failure carries no message', async () => {
    getInstitutionById.mockReturnValue(of({ isSucceeded: false, message: '', data: null }));

    await create();

    expect(html()).toContain('The institution record is temporarily unavailable');
  });

  // The edit route hydrates from this same call, so the button would only bounce the operator back.
  it('should hide the footer edit button when the load failed', async () => {
    getInstitutionById.mockReturnValue(throwError(() => new Error('offline')));

    await create();

    expect(fixture.nativeElement.querySelector('p-button[label="Edit Institution"]')).toBeFalsy();
  });

  // A retry that swapped in skeletons would read as a flicker when the second attempt also fails.
  it('should keep the failure card and spin the retry instead of showing skeletons', async () => {
    const pending = new Subject<GetInstitutionByIdRes>();
    getInstitutionById.mockReturnValue(throwError(() => new Error('offline')));

    await create();

    // The second call never settles, so the panel stays in whatever state a retry puts it in.
    getInstitutionById.mockReturnValue(pending.asObservable());
    fixture.debugElement.nativeElement.querySelector('p-button[label="Retry"] button').click();
    fixture.detectChanges();

    expect(fixture.componentInstance['isRetrying']()).toBe(true);
    expect(fixture.componentInstance['isLoading']()).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBe(0);
    expect(html()).toContain("Couldn't load institution details");

    pending.next(succeeded(aggregate));
    pending.complete();
  });

  it('should emit edit from the footer button', async () => {
    await create();
    const edit = vi.fn();
    fixture.componentInstance.edit.subscribe(edit);

    fixture.debugElement.nativeElement
      .querySelector('p-button[label="Edit Institution"] button')
      .click();

    expect(edit).toHaveBeenCalled();
  });
});
