import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, validateStandardSchema } from '@angular/forms/signals';
import * as z from 'zod';

import { FormTextarea } from './form-textarea';

const schema = z.object({ bio: z.string().max(5, 'Bio is too long') });

@Component({
  imports: [FormTextarea],
  template: `
    <app-form-textarea inputId="bio" label="Bio" [field]="f.bio" [submitted]="false" />
  `,
})
class HostComponent {
  readonly model = signal({ bio: '' });
  readonly f = form(this.model, (p) => validateStandardSchema(p, schema));
}

/**
 * `pTextarea` cannot use `[formField]`, so this component owns the binding by hand — which
 * is exactly what these tests cover.
 */
describe('FormTextarea', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const stabilize = () => TestBed.inject(ApplicationRef).whenStable();
  const textarea = () => fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

  const type = async (value: string) => {
    textarea().value = value;
    textarea().dispatchEvent(new Event('input'));
    await stabilize();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await stabilize();
  });

  it('renders the field value', async () => {
    host.model.set({ bio: 'seeded' });
    await stabilize();

    expect(textarea().value).toBe('seeded');
  });

  it('writes what the user types back to the field and marks it dirty', async () => {
    await type('hello');

    expect(host.model().bio).toBe('hello');
    expect(host.f.bio().dirty()).toBe(true);
  });

  it('does not mark the field touched until blur', async () => {
    await type('hello');

    expect(host.f.bio().touched()).toBe(false);

    textarea().dispatchEvent(new Event('blur'));
    await stabilize();

    expect(host.f.bio().touched()).toBe(true);
  });

  it('feeds the schema, so validation runs off the written value', async () => {
    await type('far too long');

    expect(host.f.bio().errors()[0]?.message).toBe('Bio is too long');
  });

  it('leaves maxlength off unless one is given', () => {
    expect(textarea().hasAttribute('maxlength')).toBe(false);
  });
});

@Component({
  imports: [FormTextarea],
  template: `
    <app-form-textarea inputId="bio" label="Bio" [field]="f.bio" [maxlength]="5" />
  `,
})
class CappedHostComponent {
  readonly model = signal({ bio: '' });
  readonly f = form(this.model, (p) => validateStandardSchema(p, schema));
}

describe('FormTextarea with maxlength', () => {
  it('caps typing on the native textarea', async () => {
    await TestBed.configureTestingModule({ imports: [CappedHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(CappedHostComponent);
    await TestBed.inject(ApplicationRef).whenStable();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.getAttribute('maxlength')).toBe('5');
  });
});
