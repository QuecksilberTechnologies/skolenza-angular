import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';

import { TrimInput } from './trim-input';

@Component({
  imports: [ReactiveFormsModule, TrimInput],
  template: `
    <form [formGroup]="reactiveForm">
      <input formControlName="name" appTrimInput />
    </form>
  `,
})
class ReactiveHost {
  readonly reactiveForm = new FormGroup({ name: new FormControl('') });
}

@Component({
  imports: [FormField, TrimInput],
  template: `
    <input [formField]="f.name" appTrimInput />
  `,
})
class SignalFormsHost {
  readonly model = signal({ name: '' });
  readonly f = form(this.model);
}

describe('TrimInput', () => {
  const stabilize = () => TestBed.inject(ApplicationRef).whenStable();

  function inputOf(fixture: ComponentFixture<unknown>): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  describe('with Reactive Forms', () => {
    let fixture: ComponentFixture<ReactiveHost>;
    let host: ReactiveHost;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [ReactiveHost] }).compileComponents();
      fixture = TestBed.createComponent(ReactiveHost);
      host = fixture.componentInstance;
      await stabilize();
    });

    it('trims surrounding whitespace on blur', async () => {
      host.reactiveForm.setValue({ name: '  padded  ' });
      await stabilize();

      inputOf(fixture).dispatchEvent(new Event('blur'));
      await stabilize();

      expect(host.reactiveForm.value.name).toBe('padded');
      expect(inputOf(fixture).value).toBe('padded');
    });

    it('leaves an already-clean value alone', async () => {
      host.reactiveForm.setValue({ name: 'clean' });
      await stabilize();

      inputOf(fixture).dispatchEvent(new Event('blur'));
      await stabilize();

      expect(host.reactiveForm.value.name).toBe('clean');
    });
  });

  describe('with Signal Forms', () => {
    let fixture: ComponentFixture<SignalFormsHost>;
    let host: SignalFormsHost;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [SignalFormsHost] }).compileComponents();
      fixture = TestBed.createComponent(SignalFormsHost);
      host = fixture.componentInstance;
      await stabilize();
    });

    // `[formField]` provides an `InteropNgControl` that has no `setValue`, so the directive has to
    // go through the field state instead — and through `controlValue`, which is what reaches the DOM.
    it('trims surrounding whitespace on blur', async () => {
      host.model.set({ name: '  padded  ' });
      await stabilize();

      inputOf(fixture).dispatchEvent(new Event('blur'));
      await stabilize();

      expect(host.f.name().value()).toBe('padded');
      expect(inputOf(fixture).value).toBe('padded');
    });

    it('leaves an already-clean value alone', async () => {
      host.model.set({ name: 'clean' });
      await stabilize();

      inputOf(fixture).dispatchEvent(new Event('blur'));
      await stabilize();

      expect(host.f.name().value()).toBe('clean');
    });

    it('trims a whitespace-only value down to empty', async () => {
      host.model.set({ name: '   ' });
      await stabilize();

      inputOf(fixture).dispatchEvent(new Event('blur'));
      await stabilize();

      expect(host.f.name().value()).toBe('');
      expect(inputOf(fixture).value).toBe('');
    });
  });
});
