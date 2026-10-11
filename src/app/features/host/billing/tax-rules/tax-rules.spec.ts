import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { HostBillingApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';

import TaxRules from './tax-rules';

describe('TaxRules', () => {
  const hostBillingApiMock = { getTaxRules: vi.fn(), deleteTaxRule: vi.fn() };
  const featurePageStoreMock = {
    displayNameOf: vi.fn(() => undefined),
    canPerform: vi.fn((_code: string, _operation: string) => true),
  };

  const render = async () => {
    const fixture = TestBed.createComponent(TaxRules);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    featurePageStoreMock.canPerform.mockImplementation(() => true);
    hostBillingApiMock.getTaxRules.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        data: [
          {
            id: 1,
            countryCode: 'IN',
            taxCode: 'GST',
            taxName: 'Goods and Services Tax',
            ratePercent: 18,
            effectiveFrom: '2026-10-01',
            effectiveTo: '2027-03-31',
            isActive: true,
            configurationJson: null,
          },
        ],
      }),
    );

    await TestBed.configureTestingModule({
      imports: [TaxRules],
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

  it('renders a rule row with its effective window', async () => {
    const text = (await render()).querySelector('tbody tr')?.textContent?.replace(/\s+/g, ' ');

    expect(text).toContain('GST');
    expect(text).toContain('Goods and Services Tax');
    expect(text).toContain('18%');
    expect(text).toContain('01 Oct 2026 – 31 Mar 2027');
    expect(text).toContain('Active');
  });

  it('hides the add button and row actions without the operations', async () => {
    featurePageStoreMock.canPerform.mockImplementation(() => false);
    const element = await render();

    expect(element.textContent).not.toContain('Add Tax Rule');
    expect(element.querySelector('app-table-action-button')).toBeNull();
  });
});
