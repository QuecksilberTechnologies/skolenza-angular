import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, validateStandardSchema } from '@angular/forms/signals';
import * as z from 'zod';

import { fieldErrorMessage, showFieldError } from './field-error';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(3, 'Name is too long'),
});

/** A real Signal Form, so the helpers are exercised against real `FieldState` transitions. */
function setup(initial = '') {
  return TestBed.runInInjectionContext(() => {
    const model = signal({ name: initial });
    const f = form(model, (p) => validateStandardSchema(p, schema));
    return { model, f };
  });
}

describe('showFieldError', () => {
  it('stays quiet while the field is valid', () => {
    const { f } = setup('ok');
    f.name().markAsTouched();
    f.name().markAsDirty();

    expect(showFieldError(f.name, true)).toBe(false);
  });

  it('stays quiet on an invalid field the user has not touched', () => {
    const { f } = setup();

    expect(showFieldError(f.name, false)).toBe(false);
  });

  it('stays quiet on blur alone, so tabbing through does not paint the form red', () => {
    const { f } = setup();
    f.name().markAsTouched();

    expect(showFieldError(f.name, false)).toBe(false);
  });

  it('speaks up once the field is both touched and edited', () => {
    const { f } = setup();
    f.name().markAsTouched();
    f.name().markAsDirty();

    expect(showFieldError(f.name, false)).toBe(true);
  });

  it('speaks up after submit regardless of touched or dirty', () => {
    const { f } = setup();

    expect(showFieldError(f.name, true)).toBe(true);
  });
});

describe('fieldErrorMessage', () => {
  it('returns the first zod issue message', () => {
    const { f } = setup();

    expect(fieldErrorMessage(f.name)).toBe('Name is required');
  });

  it('returns undefined for a valid field', () => {
    const { f } = setup('ok');

    expect(fieldErrorMessage(f.name)).toBeUndefined();
  });

  it('skips errors that carry no message, so the shell never renders an empty box', () => {
    // `message` is optional on `ValidationError`; the built-in validators omit it.
    const field = () => ({
      errorSummary: () => [{ message: undefined }, { message: 'The real one' }],
      touched: () => true,
      dirty: () => true,
    });

    expect(fieldErrorMessage(field)).toBe('The real one');
  });

  it('returns undefined when no error has a message', () => {
    const field = () => ({
      errorSummary: () => [{ message: undefined }],
      touched: () => true,
      dirty: () => true,
    });

    expect(fieldErrorMessage(field)).toBeUndefined();
    expect(showFieldError(field, true)).toBe(true);
  });
});
