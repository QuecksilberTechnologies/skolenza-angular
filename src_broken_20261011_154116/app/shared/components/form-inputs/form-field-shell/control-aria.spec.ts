import { ApplicationRef, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';

import { FormAutocomplete } from '../form-autocomplete/form-autocomplete';
import { FormCheckbox } from '../form-checkbox/form-checkbox';
import { FormColor } from '../form-color/form-color';
import { FormCountry } from '../form-country/form-country';
import { FormDateRange } from '../form-date-range/form-date-range';
import { FormDate } from '../form-date/form-date';
import { FormMultiSelect } from '../form-multiselect/form-multiselect';
import { FormNumber } from '../form-number/form-number';
import { FormPassword } from '../form-password/form-password';
import { FormSelect } from '../form-select/form-select';

@Component({
  imports: [
    FormAutocomplete,
    FormCheckbox,
    FormColor,
    FormCountry,
    FormDate,
    FormDateRange,
    FormMultiSelect,
    FormNumber,
    FormPassword,
    FormSelect,
  ],
  template: `
    <app-form-select inputId="select" label="Select" required [field]="f.select" />
    <app-form-country inputId="country" label="Country" required [field]="f.country" />
    <app-form-multiselect inputId="multi" label="Multi" required [field]="f.multi" />
    <app-form-autocomplete inputId="auto" label="Auto" required [field]="f.auto" />
    <app-form-number inputId="number" label="Number" required [field]="f.number" />
    <app-form-password inputId="password" label="Password" required [field]="f.password" />
    <app-form-date inputId="date" label="Date" required [field]="f.date" />
    <app-form-date-range inputId="range" label="Range" required [field]="f.range" />
    <app-form-checkbox inputId="check" label="Check" required [field]="f.check" />
    <app-form-color inputId="color" label="Color" required [field]="f.color" />
  `,
})
class HostComponent {
  readonly model = signal({
    select: null as string | null,
    country: null as number | null,
    multi: [] as string[],
    auto: null as string | null,
    number: null as number | null,
    password: '',
    date: null as Date | null,
    range: null as Date[] | null,
    check: false,
    color: '',
  });
  readonly f = form(this.model);
}

/**
 * `[attr.aria-*]` on an Optimus tag stops at the component host. These pin the attributes to
 * the element that actually takes focus — the one carrying `inputId`.
 */
describe('controlAria wiring', () => {
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await TestBed.inject(ApplicationRef).whenStable();
    root = fixture.nativeElement;
  });

  const focusable = (id: string) => {
    const el = root.querySelector<HTMLElement>(`#${id}`);
    if (!el) throw new Error(`no element with id "${id}"`);
    return el;
  };

  it.each(['select', 'country', 'multi', 'auto', 'number', 'password', 'date', 'range', 'check'])(
    '%s: focusable element names the message slot and is marked required',
    (id) => {
      expect(focusable(id).getAttribute('aria-describedby')).toBe(`${id}-help`);
      expect(focusable(id).getAttribute('aria-required')).toBe('true');
    },
  );

  it('color: the swatch names the message slot, the hex input carries required', () => {
    expect(focusable('color').getAttribute('aria-describedby')).toBe('color-help');
    expect(focusable('color-hex').getAttribute('aria-required')).toBe('true');
  });
});
