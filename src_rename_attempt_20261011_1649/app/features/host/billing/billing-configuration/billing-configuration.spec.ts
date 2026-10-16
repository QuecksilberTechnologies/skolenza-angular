import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, HostBillingApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { HostBillingConfiguration } from '@shared/interfaces';

import BillingConfiguration from './billing-configuration';

type Spy = ReturnType<typeof vi.fn>;

const configuration: HostBillingConfiguration = {
  id: 1,
  gatewayCode: 'CASHFREE',
  gatewayName: 'Cashfree Payments',
  environment: 'Sandbox',
  sellerLegalName: 'Example Private Limited',
  sellerBillingEmail: 'billing@example.com',
  sellerBillingPhone: null,
  countryCode: 'IN',
  stateCode: 'MP',
  postalCode: '482001',
  addressLine1: 'Example registered address',
  addressLine2: null,
  taxRegistrationNumber: '23ABCDE1234F1Z5',
  invoicePrefix: 'AXP',
  paymentRetryCount: 3,
  gracePeriodDays: 1,
  paymentTimeoutMinutes: 30,
  reconciliationLookbackDays: 7,
  isActive: true,
  version: 4,
  hasClientId: true,
  hasClientSecret: false,
  hasWebhookSecret: false,
};

describe('BillingConfiguration', () => {
  let fixture: ComponentFixture<BillingConfiguration>;
  let component: BillingConfiguration;
  let apiMock: { getConfiguration: Spy; updateConfiguration: Spy };
  let featurePageStoreMock: { canPerform: Spy; displayNameOf: Spy };

  const build = async () => {
    fixture = TestBed.createComponent(BillingConfiguration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    apiMock = {
      getConfiguration: vi
        .fn()
        .mockReturnValue(of({ isSucceeded: true, message: '', data: configuration })),
      updateConfiguration: vi
        .fn()
        .mockReturnValue(
          of({ isSucceeded: true, message: 'Saved', data: { ...configuration, version: 5 } }),
        ),
    };
    featurePageStoreMock = {
      canPerform: vi.fn().mockReturnValue(true),
      displayNameOf: vi.fn().mockReturnValue(undefined),
    };

    TestBed.configureTestingModule({
      imports: [BillingConfiguration],
      providers: [
        { provide: HostBillingApi, useValue: apiMock },
        { provide: FeaturePageStore, useValue: featurePageStoreMock },
        { provide: Common, useValue: { setPageHeaderInfo: vi.fn(), showMessage: vi.fn() } },
      ],
    });
  });

  it('seeds the form from the loaded record without counting it as an edit', async () => {
    await build();

    expect(component['model']().sellerLegalName).toBe('Example Private Limited');
    expect(component['model']().sellerBillingPhone).toBe('');
    expect(component.canDeactivate()).toBe(true);
  });

  it('reports credential presence and never a value', async () => {
    await build();

    expect(text()).toContain('Client ID: Configured');
    expect(text()).toContain('Client secret: Missing');
    expect(text()).toContain('Webhook secret: Missing');
  });

  it('blocks leaving with unsaved edits, and discard clears them', async () => {
    await build();

    component['model'].update((model) => ({ ...model, invoicePrefix: 'AXN' }));
    expect(component.canDeactivate()).toBe(false);

    component['onDiscard']();
    expect(component['model']().invoicePrefix).toBe('AXP');
    expect(component.canDeactivate()).toBe(true);
  });

  it('saves the normalised body with the loaded version', async () => {
    await build();

    component['model'].update((model) => ({ ...model, invoicePrefix: ' AXN ' }));
    component['onSave']();
    await fixture.whenStable();

    expect(apiMock.updateConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        invoicePrefix: 'AXN',
        sellerBillingPhone: null,
        addressLine2: null,
        version: 4,
      }),
    );
    expect(component.canDeactivate()).toBe(true);
  });

  it('does not send an invalid form', async () => {
    await build();

    component['model'].update((model) => ({ ...model, taxRegistrationNumber: 'nope' }));
    component['onSave']();

    expect(apiMock.updateConfiguration).not.toHaveBeenCalled();
  });

  it('hides Save and explains why without the Update operation', async () => {
    featurePageStoreMock.canPerform.mockReturnValue(false);
    await build();

    expect(text()).not.toContain('Save configuration');
    expect(text()).toContain('do not have permission to change it');
  });
});
