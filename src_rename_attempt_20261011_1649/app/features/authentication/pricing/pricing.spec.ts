import { DOCUMENT } from '@angular/common';
import { ApplicationRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ApiError, Common, SubscriptionsApi } from '@core/services';
import { CurrencyStore } from '@core/stores';
import { GetAllSubscriptionPlanRes, SubscriptionPlan } from '@shared/interfaces';

import Pricing from './pricing';

function createPlan(partial: Partial<SubscriptionPlan> & Pick<SubscriptionPlan, 'id'>) {
  return {
    planName: 'Plan',
    maxUsers: 10,
    perDayPrice: 0,
    isFree: false,
    monthlyPrice: 0,
    yearlyPrice: 0,
    isMostPopular: false,
    isCustom: false,
    currencyKey: 'INR',
    modules: [],
    ...partial,
  } satisfies SubscriptionPlan;
}

/** Mirrors the live payload closely enough to pin ordering and pricing. */
const PLANS: SubscriptionPlan[] = [
  createPlan({ id: 2, planName: 'Pro-Adv', monthlyPrice: 300, yearlyPrice: 30000 }),
  createPlan({ id: 17, planName: 'Starter Plan', monthlyPrice: 399, yearlyPrice: 3999 }),
  createPlan({ id: 18, planName: 'Growth Plan', monthlyPrice: 699, yearlyPrice: 6999 }),
  createPlan({ id: 19, planName: 'Business Plan', monthlyPrice: 1299, yearlyPrice: 12999 }),
  createPlan({
    id: 20,
    planName: 'Enterprise Plan',
    monthlyPrice: 2499,
    yearlyPrice: 24999,
    isCustom: true,
  }),
];

function createResponse(data: SubscriptionPlan[]): GetAllSubscriptionPlanRes {
  return { isSucceeded: true, message: 'ok', errors: [], data };
}

describe('Pricing', () => {
  let component: Pricing;
  let fixture: ComponentFixture<Pricing>;

  const subscriptionsApiMock = { getAllSubscriptionPlan: vi.fn() };
  const commonMock = { showMessage: vi.fn() };
  const routerMock = { navigate: vi.fn() };

  const cards = (): HTMLElement[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll('app-pricing-card') as NodeListOf<HTMLElement>,
    );

  async function render(): Promise<void> {
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    subscriptionsApiMock.getAllSubscriptionPlan.mockReturnValue(of(createResponse(PLANS)));
    routerMock.navigate.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [Pricing],
      providers: [
        /** The pipe's lookup is HTTP-backed; a static map keeps the fixture request-free. */
        { provide: CurrencyStore, useValue: { symbols: signal({ INR: '₹', USD: '$' }) } },
        { provide: SubscriptionsApi, useValue: subscriptionsApiMock },
        { provide: Common, useValue: commonMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { params: of({}), queryParams: of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Pricing);
    component = fixture.componentInstance;
  });

  it('renders one card per plan once the request settles', async () => {
    await render();

    expect(cards().length).toBe(PLANS.length);
    expect(fixture.nativeElement.textContent).toContain('Business Plan');
  });

  it('swaps the prices when the period changes, without reordering the cards', async () => {
    await render();

    const yearlyOrder = component['store'].displayPlans().map((plan) => plan.id);
    expect(fixture.nativeElement.textContent).toContain('3,999');

    component['onPeriodChange']('monthly');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('399');
    expect(component['store'].displayPlans().map((plan) => plan.id)).toEqual(yearlyOrder);
  });

  it('advertises the real saving rather than a hardcoded one', async () => {
    await render();

    expect(component['store'].maxYearlySaving()).toBe(17);
    expect(fixture.nativeElement.textContent).toContain('Save up to 17%');
  });

  it('gives the billing period control an accessible name', async () => {
    await render();

    const group = fixture.nativeElement.querySelector('[role="group"]') as HTMLElement;
    const label = fixture.nativeElement.querySelector(`#${group.getAttribute('aria-labelledby')}`);
    expect(label?.textContent?.trim()).toBe('Billing period');
  });

  it('routes a self-serve plan to institution registration', async () => {
    await render();

    component['onPlanSelect'](PLANS[1]);

    expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/register-institution'], {
      queryParams: { planId: 17 },
    });
  });

  it('never sends a custom plan down the self-serve route', async () => {
    await render();
    // jsdom's `location` is not redefinable, so the mailto href itself is covered by
    // `salesEnquiryMailto`'s own spec; what matters here is that we never route.
    const view = TestBed.inject(DOCUMENT).defaultView as Window;
    const original = Object.getOwnPropertyDescriptor(view, 'location') as PropertyDescriptor;
    const assign = vi.fn();
    Object.defineProperty(view, 'location', { value: { assign }, configurable: true });

    try {
      component['onPlanSelect'](PLANS[4]);

      expect(routerMock.navigate).not.toHaveBeenCalled();
      expect(assign).toHaveBeenCalledWith(expect.stringContaining('mailto:'));
    } finally {
      Object.defineProperty(view, 'location', original);
    }
  });

  it('surfaces a retryable error when the request fails', async () => {
    subscriptionsApiMock.getAllSubscriptionPlan.mockReturnValue(
      throwError(() => new Error('Network down')),
    );
    await render();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Network down');
    expect(commonMock.showMessage).toHaveBeenCalledWith('Network down', 'error');

    subscriptionsApiMock.getAllSubscriptionPlan.mockReturnValue(of(createResponse(PLANS)));
    component['store'].load();
    await render();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(cards().length).toBe(PLANS.length);
  });

  it('hides the API reason behind a neutral message when the call is rejected', async () => {
    subscriptionsApiMock.getAllSubscriptionPlan.mockReturnValue(
      throwError(() => new ApiError('Forbidden', 403)),
    );
    await render();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      "Plans aren't available right now",
    );
  });

  it('shows the empty state when no plans are published', async () => {
    subscriptionsApiMock.getAllSubscriptionPlan.mockReturnValue(of(createResponse([])));
    await render();

    expect(cards().length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No plans available yet');
  });
});
