import { DatePipe } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { IndustriesApi, InstitutionsApi } from '@core/services';
import { CurrencyStore } from '@core/stores';
import { IInstitution, SubscriptionPlan, InstitutionSubscriptionPlan } from '@shared/interfaces';

import { SubscriptionPlanDetail } from './subscription-plan-detail';

describe('SubscriptionPlanDetail', () => {
  let fixture: ComponentFixture<SubscriptionPlanDetail>;
  let component: SubscriptionPlanDetail;

  const industriesApiMock = { getInstitutionSubscriptionPlans: vi.fn() };
  const institutionsApiMock = { getInstitutions: vi.fn() };
  let messageSpy: ReturnType<typeof vi.spyOn>;

  const plan = {
    id: 2,
    planName: 'Pro Team Plan',
    maxUsers: 20,
    perDayPrice: 18,
    isFree: false,
    monthlyPrice: 349,
    yearlyPrice: 3999,
    isMostPopular: true,
    isCustom: false,
    currencyKey: 'INR',
    modules: [],
  } satisfies SubscriptionPlan;

  const row = (overrides: Partial<InstitutionSubscriptionPlan> = {}): InstitutionSubscriptionPlan => ({
    id: 1,
    institutionId: 54,
    subscriptionPlanId: 2,
    subscriptionStartDate: '2026-03-19T00:00:00Z',
    subscriptionEndDate: '2099-01-01T00:00:00Z',
    isActive: true,
    paymentTxnId: null,
    paymentMode: null,
    isTrial: false,
    ...overrides,
  });

  const institution = (overrides: Partial<IInstitution> = {}): IInstitution => ({
    // `/Institution` reports an opaque token; `/Subscription` still reports the number the join matches.
    id: '54',
    companyName: 'TechNova Solutions',
    institutionCode: 'TEC',
    companyEmailDomain: 'technova.io',
    institutionEmail: 'admin@technova.io',
    contactPersonName: 'Sujeet Kumar',
    contactNumber: '98765 43210',
    countryId: 1,
    isVerified: true,
    isActive: true,
    ...overrides,
  });

  const subscriptionsRes = (data: InstitutionSubscriptionPlan[] | null, isSucceeded = true) =>
    of({ isSucceeded, message: '', errors: [], data });

  const institutionsRes = (data: IInstitution[]) =>
    of({
      isSucceeded: true,
      message: '',
      errors: [],
      data,
      pageNumber: 1,
      pageSize: 10,
      totalRecords: data.length,
      totalPages: 1,
    });

  async function createComponent(plansInput: SubscriptionPlan = plan) {
    fixture = TestBed.createComponent(SubscriptionPlanDetail);
    fixture.componentRef.setInput('plan', plansInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    industriesApiMock.getInstitutionSubscriptionPlans.mockReturnValue(subscriptionsRes([row()]));
    institutionsApiMock.getInstitutions.mockReturnValue(institutionsRes([institution()]));

    await TestBed.configureTestingModule({
      imports: [SubscriptionPlanDetail],
      providers: [
        /** The pipe's lookup is HTTP-backed; a static map keeps the fixture request-free. */
        { provide: CurrencyStore, useValue: { symbols: signal({ INR: '₹', USD: '$' }) } },
        MessageService,
        DatePipe,
        { provide: IndustriesApi, useValue: industriesApiMock },
        { provide: InstitutionsApi, useValue: institutionsApiMock },
      ],
    }).compileComponents();

    messageSpy = vi.spyOn(TestBed.inject(MessageService), 'add');
  });

  it('joins subscriptions to institutions and requests only this plan', async () => {
    await createComponent();

    expect(industriesApiMock.getInstitutionSubscriptionPlans).toHaveBeenCalledWith({
      SubscriptionPlanId: 2,
    });
    expect(component['companies']()).toEqual([
      expect.objectContaining({ companyName: 'TechNova Solutions', status: 'Active' }),
    ]);
    expect(component['hasLoadFailed']()).toBe(false);
  });

  it('treats the "no subscribers" envelope as empty, not as an error', async () => {
    industriesApiMock.getInstitutionSubscriptionPlans.mockReturnValue(subscriptionsRes(null, false));

    await createComponent();

    expect(component['companies']()).toEqual([]);
    expect(component['hasLoadFailed']()).toBe(false);
    expect(messageSpy).not.toHaveBeenCalled();
  });

  it('flags a thrown subscriptions request without raising a toast', async () => {
    industriesApiMock.getInstitutionSubscriptionPlans.mockReturnValue(
      throwError(() => new Error('boom')),
    );

    await createComponent();

    expect(component['hasLoadFailed']()).toBe(true);
    expect(messageSpy).not.toHaveBeenCalled();
  });

  it('still lists rows when only the institutions request fails', async () => {
    institutionsApiMock.getInstitutions.mockReturnValue(throwError(() => new Error('boom')));

    await createComponent();

    expect(component['hasLoadFailed']()).toBe(false);
    expect(component['companies']()[0].companyName).toBe('Unknown company');
  });

  it('estimates MRR from current subscribers, counting trials but not lapsed rows', async () => {
    industriesApiMock.getInstitutionSubscriptionPlans.mockReturnValue(
      subscriptionsRes([
        row({ id: 1, institutionId: 54 }),
        row({ id: 2, institutionId: 55, isTrial: true }),
        row({ id: 3, institutionId: 56, subscriptionEndDate: '2020-01-01T00:00:00Z' }),
      ]),
    );
    institutionsApiMock.getInstitutions.mockReturnValue(
      institutionsRes([institution(), institution({ id: '55' }), institution({ id: '56' })]),
    );

    await createComponent();

    // Two current (one active, one trial), one expired — so 2 x 349.
    expect(component['subscriberCount']()).toBe(2);
    expect(component['estimatedMrr']()).toBe(698);
  });

  it('drops rows the server returned for another plan', async () => {
    industriesApiMock.getInstitutionSubscriptionPlans.mockReturnValue(
      subscriptionsRes([row({ id: 1 }), row({ id: 2, subscriptionPlanId: 99 })]),
    );

    await createComponent();

    expect(component['companies']().map((company) => company.id)).toEqual([1]);
  });

  it('reports a failure when the mapping itself throws', async () => {
    // A singular object instead of an array is the shape this endpoint family is prone to.
    industriesApiMock.getInstitutionSubscriptionPlans.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: row() as never }),
    );

    await createComponent();

    expect(component['hasLoadFailed']()).toBe(true);
  });

  it('counts current subscribers only, while the list keeps lapsed rows', async () => {
    industriesApiMock.getInstitutionSubscriptionPlans.mockReturnValue(
      subscriptionsRes([
        row({ id: 1, institutionId: 54 }),
        row({ id: 2, institutionId: 55, isTrial: true }),
        row({ id: 3, institutionId: 56, subscriptionEndDate: '2020-01-01T00:00:00Z' }),
      ]),
    );
    institutionsApiMock.getInstitutions.mockReturnValue(
      institutionsRes([institution(), institution({ id: '55' }), institution({ id: '56' })]),
    );

    await createComponent();

    expect(component['companies']().length).toBe(3);
    expect(component['subscriberCount']()).toBe(2);
  });

  it('emits closePanel and editPlan', async () => {
    await createComponent();

    const closeSpy = vi.fn();
    const editSpy = vi.fn();
    component.closePanel.subscribe(closeSpy);
    component.editPlan.subscribe(editSpy);

    component['onClose']();
    component['onEdit']();

    expect(closeSpy).toHaveBeenCalled();
    expect(editSpy).toHaveBeenCalledWith(plan);
  });

  it('hides the edit action unless the caller grants it', async () => {
    await createComponent();

    const editLabels = () =>
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].filter((b) =>
        b.textContent?.includes('Edit plan'),
      );

    expect(editLabels()).toHaveLength(0);

    fixture.componentRef.setInput('canEdit', true);
    fixture.detectChanges();

    expect(editLabels()).toHaveLength(1);
  });
});
