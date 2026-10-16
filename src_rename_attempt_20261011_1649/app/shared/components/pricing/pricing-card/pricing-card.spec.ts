import { DatePipe } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { CurrencyStore } from '@core/stores';
import { SubscriptionPlan } from '@shared/interfaces';
import { PlanFeature } from '@shared/utilities/subscription-plan';

import { PricingCard } from './pricing-card';

function basePlan(features: PlanFeature[] = []): SubscriptionPlan {
  return {
    id: 1,
    planName: 'Basic',
    maxUsers: 10,
    perDayPrice: 0,
    isFree: false,
    monthlyPrice: 0,
    yearlyPrice: 0,
    isActive: true,
    isMostPopular: false,
    isCustom: false,
    currencyKey: 'INR',
    modules: [],
    price: 0,
    period: '/ year',
    features,
  };
}

const A_MODULE = {
  id: 1,
  moduleName: 'HR-Management',
  displayName: 'HR management',
  parentModuleId: 0,
  childModules: [],
  operations: [],
};

function featureList(count: number): PlanFeature[] {
  return Array.from({ length: count }, (_, index) => ({
    key: `feature-${index}`,
    label: `Feature ${index}`,
  }));
}

describe('PricingCard', () => {
  let component: PricingCard;
  let fixture: ComponentFixture<PricingCard>;

  const items = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('ul li') as NodeListOf<HTMLElement>);
  const disclosure = (): HTMLButtonElement | null =>
    fixture.nativeElement.querySelector('button[aria-controls]');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricingCard],
      providers: [
        /** The pipe's lookup is HTTP-backed; a static map keeps the fixture request-free. */
        { provide: CurrencyStore, useValue: { symbols: signal({ INR: '₹', USD: '$' }) } },
        MessageService,
        DatePipe,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PricingCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('subscriptionPlan', basePlan());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('caps the visible list at six features and offers a disclosure for the rest', () => {
    fixture.componentRef.setInput('subscriptionPlan', basePlan(featureList(8)));
    fixture.detectChanges();

    expect(items().length).toBe(6);
    expect(disclosure()?.textContent?.trim()).toBe('+ 2 more modules');
  });

  it('reveals every feature once expanded', () => {
    fixture.componentRef.setInput('subscriptionPlan', basePlan(featureList(8)));
    fixture.detectChanges();

    expect(disclosure()?.getAttribute('aria-expanded')).toBe('false');

    disclosure()?.click();
    fixture.detectChanges();

    expect(items().length).toBe(8);
    expect(disclosure()?.getAttribute('aria-expanded')).toBe('true');
    expect(disclosure()?.textContent?.trim()).toBe('Show less');
  });

  it('renders no disclosure when everything already fits', () => {
    fixture.componentRef.setInput('subscriptionPlan', basePlan(featureList(6)));
    fixture.detectChanges();

    expect(items().length).toBe(6);
    expect(disclosure()).toBeNull();
  });

  it('points aria-controls at the feature list it toggles', () => {
    fixture.componentRef.setInput('subscriptionPlan', basePlan(featureList(8)));
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('ul') as HTMLElement;
    expect(disclosure()?.getAttribute('aria-controls')).toBe(list.id);
    expect(list.id).toBe('plan-features-1');
  });

  it('pluralises the disclosure label for a single hidden feature', () => {
    fixture.componentRef.setInput('subscriptionPlan', basePlan(featureList(7)));
    fixture.detectChanges();

    expect(disclosure()?.textContent?.trim()).toBe('+ 1 more module');
  });

  it('renders the sub-module count as a suffix inside the label, not a sibling', () => {
    // A count rendered as a sibling flex item strands itself at the far edge of a wrapped label.
    fixture.componentRef.setInput('subscriptionPlan', {
      ...basePlan([
        { key: 'module-a', label: 'HR management', count: 4 },
        { key: 'module-b', label: 'Recruit', count: 1 },
      ]),
      modules: [A_MODULE],
    });
    fixture.detectChanges();

    const labels = items().map((item) => item.querySelector('span.text-base') as HTMLElement);
    expect(labels[0].textContent).toContain('+4');
    expect(labels[0].textContent).toContain('4 sub-modules');
    expect(labels[1].textContent).toContain('1 sub-module');
  });

  it('offers a contact route instead of a void when the plan carries no modules', () => {
    const contactLine = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('a[href^="mailto:"]');

    expect(contactLine()?.closest('p')?.textContent).toContain('Full module list on request');
    // The line must sit outside the <ul>, or it would inflate every feature-count assertion.
    expect(items().length).toBe(0);

    fixture.componentRef.setInput('subscriptionPlan', {
      ...basePlan(featureList(2)),
      modules: [A_MODULE],
    });
    fixture.detectChanges();

    expect(contactLine()).toBeNull();
  });

  it('keeps the full plan name reachable when the title is clamped', () => {
    const longName = 'Pro-Adv Included Biomatric And Everything Else Besides';
    fixture.componentRef.setInput('subscriptionPlan', { ...basePlan(), planName: longName });
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('h3') as HTMLElement;
    expect(title.getAttribute('title')).toBe(longName);
  });

  it('claims a yearly saving only when yearly actually costs less', () => {
    const saving = () => fixture.nativeElement.textContent as string;

    // Pro-Adv's real numbers: 300 x 12 = 3,600 against a 30,000 yearly price.
    fixture.componentRef.setInput('subscriptionPlan', {
      ...basePlan(),
      monthlyPrice: 300,
      yearlyPrice: 30000,
      price: 30000,
    });
    fixture.detectChanges();
    expect(saving()).not.toContain('vs monthly');

    fixture.componentRef.setInput('subscriptionPlan', {
      ...basePlan(),
      monthlyPrice: 399,
      yearlyPrice: 3999,
      price: 3999,
    });
    fixture.detectChanges();
    expect(saving()).toContain('Save 16% vs monthly');
  });
});
