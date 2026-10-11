import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { SubscriptionsApi } from '@core/services';
import { Currency, SubscriptionPlan } from '@shared/interfaces';

import SubscriptionPlanForm from './subscription-plan-form';

describe('SubscriptionPlanForm', () => {
  let fixture: ComponentFixture<SubscriptionPlanForm>;

  type Spy = ReturnType<typeof vi.fn>;
  let apiMock: { addSubscriptionPlan: Spy; updateSubscriptionPlan: Spy };
  let dialogRefMock: { close: Spy };

  const currencies: Currency[] = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
  ];

  const plan = {
    id: 7,
    planName: 'Pro-Basic',
    maxUsers: 10,
    perDayPrice: 10,
    isFree: false,
    monthlyPrice: 200,
    yearlyPrice: 2199,
    isMostPopular: null,
    isCustom: null,
    currencyKey: 'INR',
    modules: [],
  } satisfies SubscriptionPlan;

  const createComponent = async (data: Record<string, unknown>) => {
    apiMock = {
      addSubscriptionPlan: vi.fn().mockReturnValue(of({ isSucceeded: true, message: 'Added' })),
      updateSubscriptionPlan: vi
        .fn()
        .mockReturnValue(of({ isSucceeded: true, message: 'Updated' })),
    };
    dialogRefMock = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [SubscriptionPlanForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        DatePipe,
        { provide: SubscriptionsApi, useValue: apiMock },
        { provide: DynamicDialogRef, useValue: dialogRefMock },
        { provide: DynamicDialogConfig, useValue: { data } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionPlanForm);
    fixture.detectChanges();

    // `CurrencyStore` loads the dropdown from `public/data/currencies.json`; `whenStable()` would
    // block on that pending resource, so the request is flushed off a plain tick first.
    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .match('data/currencies.json')
      .forEach((req) => req.flush(currencies));
    TestBed.tick();
  };

  const planNameInput = () =>
    fixture.nativeElement.querySelector('#planName') as HTMLInputElement | null;

  it('should create', async () => {
    await createComponent({ isActive: true });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start empty when opened without a plan', async () => {
    await createComponent({ isActive: true });
    expect(planNameInput()?.value).toBe('');
  });

  it('should prefill from the plan it was opened with', async () => {
    await createComponent({ plan, isActive: true });
    expect(planNameInput()?.value).toBe('Pro-Basic');
  });

  it('should close without saving on cancel', async () => {
    await createComponent({ plan, isActive: true });

    fixture.componentInstance.onCancel();

    expect(dialogRefMock.close).toHaveBeenCalledWith();
    expect(apiMock.addSubscriptionPlan).not.toHaveBeenCalled();
    expect(apiMock.updateSubscriptionPlan).not.toHaveBeenCalled();
  });

  describe('free plan', () => {
    it('zeroes and disables the prices when switched on', async () => {
      await createComponent({ plan, isActive: true });
      const component = fixture.componentInstance;

      component['model'].update((m) => ({ ...m, isFree: true }));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component['model']()).toMatchObject({
        perDayPrice: 0,
        monthlyPrice: 0,
        yearlyPrice: 0,
      });
      expect(component['f'].perDayPrice().disabled()).toBe(true);
      expect(component['f'].monthlyPrice().disabled()).toBe(true);
      expect(component['f'].yearlyPrice().disabled()).toBe(true);
    });

    it('settles instead of rewriting the model on every read', async () => {
      await createComponent({ plan, isActive: true });
      const component = fixture.componentInstance;

      component['model'].update((m) => ({ ...m, isFree: true }));
      fixture.detectChanges();
      await fixture.whenStable();

      // Identity must hold across a second flush, or the zeroing effect is looping.
      const settled = component['model']();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component['model']()).toBe(settled);
    });

    it('leaves the prices editable while off', async () => {
      await createComponent({ plan, isActive: true });
      const component = fixture.componentInstance;

      expect(component['model']().perDayPrice).toBe(10);
      expect(component['f'].perDayPrice().disabled()).toBe(false);
    });

    it('zeroes blank prices so a free plan stays submittable', async () => {
      await createComponent({ isActive: true });
      const component = fixture.componentInstance;

      // The prices start null for their placeholders; leaving them null would trip the schema
      // on a plan whose price inputs are disabled, making the error impossible to clear.
      component['model'].update((m) => ({ ...m, planName: 'Pro Free Plan', maxUsers: 5 }));
      component['model'].update((m) => ({ ...m, isFree: true }));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component['model']()).toMatchObject({
        perDayPrice: 0,
        monthlyPrice: 0,
        yearlyPrice: 0,
      });
      expect(component['f']().invalid()).toBe(false);
    });
  });

  describe('empty start', () => {
    it('leaves the numeric fields blank on create so the placeholders show', async () => {
      await createComponent({ isActive: true });
      const component = fixture.componentInstance;

      expect(component['model']()).toMatchObject({
        maxUsers: null,
        perDayPrice: null,
        monthlyPrice: null,
        yearlyPrice: null,
      });
      expect(component['f']().invalid()).toBe(true);
    });

    it('prefills stored numbers on edit, keeping a stored zero as zero', async () => {
      await createComponent({ plan: { ...plan, perDayPrice: 0 }, isActive: true });

      expect(fixture.componentInstance['model']()).toMatchObject({
        maxUsers: 10,
        perDayPrice: 0,
        monthlyPrice: 200,
      });
    });
  });

  describe('active', () => {
    it('seeds from the status the grid is showing', async () => {
      await createComponent({ isActive: false });

      expect(fixture.componentInstance['model']().isActive).toBe(false);
    });

    it('sends the value the user chose', async () => {
      await createComponent({ isActive: true });
      const component = fixture.componentInstance;

      component['model'].update((m) => ({
        ...m,
        planName: 'Pro Team Plan',
        maxUsers: 20,
        perDayPrice: 18,
        monthlyPrice: 349,
        yearlyPrice: 3999,
        isActive: false,
      }));
      component.onSubmit();
      await fixture.whenStable();

      expect(apiMock.addSubscriptionPlan).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  describe('modules', () => {
    it('exposes the plan modules on edit', async () => {
      await createComponent({
        plan: { ...plan, modules: [{ id: 1, displayName: 'Attendance' }] },
        isActive: true,
      });

      expect(fixture.componentInstance['modules']()).toHaveLength(1);
    });

    it('reports none on create', async () => {
      await createComponent({ isActive: true });

      expect(fixture.componentInstance['modules']()).toEqual([]);
    });
  });

  describe('validation', () => {
    /** The schema reports through the same `errors()` channel the template renders. */
    const firstError = (field: 'planName' | 'maxUsers' | 'perDayPrice' | 'currencyKey') =>
      fixture.componentInstance['f'][field]().errors()[0]?.message;

    const withModel = async (patch: Record<string, unknown>) => {
      await createComponent({ isActive: true });
      fixture.componentInstance['model'].update((m) => ({ ...m, ...patch }));
      await fixture.whenStable();
    };

    it('reports a blank plan name as required', async () => {
      await withModel({ planName: '' });
      expect(firstError('planName')).toBe('Plan name is required');
    });

    it('reports a plan name under three characters', async () => {
      await withModel({ planName: 'Pr' });
      expect(firstError('planName')).toBe('Plan name must be at least 3 characters');
    });

    it('rejects a plan name that does not start with a letter', async () => {
      await withModel({ planName: '1Pro' });
      expect(firstError('planName')).toContain('must start with a letter');
    });

    it('accepts a valid plan name', async () => {
      await withModel({ planName: 'Pro Team Plan' });
      expect(fixture.componentInstance['f'].planName().errors()).toEqual([]);
    });

    it('reports a blank max users as required', async () => {
      await withModel({ maxUsers: null });
      expect(firstError('maxUsers')).toBe('Max users is required');
    });

    it('reports a max users below one', async () => {
      await withModel({ maxUsers: 0 });
      expect(firstError('maxUsers')).toBe('Max users must be at least 1');
    });

    it('reports a negative price', async () => {
      await withModel({ perDayPrice: -1 });
      expect(firstError('perDayPrice')).toBe('Per day price cannot be negative');
    });

    it('reports a blank currency as required', async () => {
      await withModel({ currencyKey: '' });
      expect(firstError('currencyKey')).toBe('Currency is required');
    });

    // Proves `appTrimInput` is wired to this input; the directive's own behaviour is covered in
    // `shared/directives/trim-input.spec.ts`.
    it('trims the plan name on blur', async () => {
      await withModel({ planName: '  Pro Team Plan  ' });

      planNameInput()?.dispatchEvent(new Event('blur'));
      await fixture.whenStable();

      expect(fixture.componentInstance['model']().planName).toBe('Pro Team Plan');
    });

    it('leaves a fully filled model valid', async () => {
      await withModel({
        planName: 'Pro Team Plan',
        maxUsers: 25,
        perDayPrice: 18,
        monthlyPrice: 349,
        yearlyPrice: 3999,
      });

      expect(fixture.componentInstance['f']().invalid()).toBe(false);
    });
  });

  describe('currency', () => {
    it('prefixes prices with the selected currency symbol', async () => {
      await createComponent({ plan, isActive: true });
      const component = fixture.componentInstance;

      expect(component['currencySymbol']()).toBe('₹');

      component['model'].update((m) => ({ ...m, currencyKey: 'USD' }));
      expect(component['currencySymbol']()).toBe('$');
    });

    it('falls back to the raw key rather than mislabelling an unknown currency', async () => {
      await createComponent({ plan: { ...plan, currencyKey: 'JPY' }, isActive: true });

      // A valid ISO code the lookup file does not carry a symbol for.
      expect(fixture.componentInstance['currencySymbol']()).toBe('JPY');
    });

    it('lists the currencies from the lookup file', async () => {
      await createComponent({ isActive: true });

      expect(fixture.componentInstance['currencyOptions']()).toEqual([
        { label: 'INR - Indian Rupee (₹)', value: 'INR' },
        { label: 'USD - US Dollar ($)', value: 'USD' },
        { label: 'GBP - British Pound (£)', value: 'GBP' },
      ]);
    });

    it('reformats the price placeholders when the currency changes', async () => {
      await createComponent({ isActive: true });
      const component = fixture.componentInstance;

      expect(component['pricePlaceholders']()).toEqual({
        perDay: 'e.g. ₹ 18',
        monthly: 'e.g. ₹ 349',
        yearly: 'e.g. ₹ 3,999',
      });

      component['model'].update((m) => ({ ...m, currencyKey: 'GBP' }));

      expect(component['pricePlaceholders']()).toEqual({
        perDay: 'e.g. £ 18',
        monthly: 'e.g. £ 349',
        yearly: 'e.g. £ 3,999',
      });
    });

    it('carries the raw key into the placeholders for an unknown currency', async () => {
      await createComponent({ plan: { ...plan, currencyKey: 'JPY' }, isActive: true });

      expect(fixture.componentInstance['pricePlaceholders']().yearly).toBe('e.g. JPY 3,999');
    });
  });
});
