import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { HostBillingApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';

import PlanPrices from './plan-prices';

describe('PlanPrices', () => {
  const hostBillingApiMock = { getPlanPrices: vi.fn(), deletePlanPrice: vi.fn() };
  const featurePageStoreMock = {
    displayNameOf: vi.fn(() => undefined),
    canPerform: vi.fn((_code: string, _operation: string) => true),
  };

  const render = async () => {
    const fixture = TestBed.createComponent(PlanPrices);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    featurePageStoreMock.canPerform.mockImplementation(() => true);
    hostBillingApiMock.getPlanPrices.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        data: [
          {
            id: 1,
            subscriptionPlanId: 2,
            planName: 'Growth',
            countryCode: 'IN',
            currencyCode: 'INR',
            billingCycle: 'Yearly',
            baseAmount: 9990,
            effectiveFrom: '2026-10-01',
            effectiveTo: null,
            isActive: true,
          },
        ],
      }),
    );

    await TestBed.configureTestingModule({
      imports: [PlanPrices],
      providers: [
        DatePipe,
        MessageService,
        ConfirmationService,
        DialogService,
        { provide: HostBillingApi, useValue: hostBillingApiMock },
        { provide: FeaturePageStore, useValue: featurePageStoreMock },
      ],
    }).compileComponents();
  });

  it('renders a price row with its open-ended window', async () => {
    const text = (await render()).querySelector('tbody tr')?.textContent?.replace(/\s+/g, ' ');

    expect(text).toContain('Growth');
    expect(text).toContain('Yearly');
    expect(text).toContain('IN / INR');
    expect(text).toContain('From 01 Oct 2026');
    expect(text).toContain('Active');
  });

  it('hides the add button and row actions without the operations', async () => {
    featurePageStoreMock.canPerform.mockImplementation(() => false);
    const element = await render();

    expect(element.textContent).not.toContain('Add Price');
    expect(element.querySelector('app-table-action-button')).toBeNull();
  });
});
