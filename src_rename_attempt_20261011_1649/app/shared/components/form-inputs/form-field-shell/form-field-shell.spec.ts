import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, validateStandardSchema } from '@angular/forms/signals';
import * as z from 'zod';

import { FormFieldShell } from './form-field-shell';

const schema = z.object({ name: z.string().min(1, 'Name is required') });

@Component({
  imports: [FormFieldShell],
  template: `
    <app-form-field-shell
      inputId="name"
      label="Name"
      [field]="f.name"
      [required]="required()"
      [hint]="hint()"
      [hintIcon]="hintIcon()"
      [submitted]="submitted()"
      [groupLabel]="groupLabel()"
    >
      <input id="name" />
    </app-form-field-shell>
  `,
})
class HostComponent {
  readonly required = signal(true);
  readonly hint = signal<string | undefined>('Two words is plenty');
  readonly hintIcon = signal(false);
  readonly submitted = signal(false);
  readonly groupLabel = signal(false);

  readonly model = signal({ name: '' });
  readonly f = form(this.model, (p) => validateStandardSchema(p, schema));
}

describe('FormFieldShell', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const stabilize = () => TestBed.inject(ApplicationRef).whenStable();
  const help = () => fixture.nativeElement.querySelector('#name-help') as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await stabilize();
  });

  it('reserves the message slot for an inline hint and announces it politely', () => {
    expect(help().classList).toContain('min-h-5');
    expect(help().getAttribute('aria-live')).toBe('polite');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('puts the hint behind a labelled info button when hintIcon is set', async () => {
    host.hintIcon.set(true);
    await stabilize();
    expect(help().classList).not.toContain('min-h-5');
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('About Name');
    expect(button.querySelector('.pi-info-circle')).not.toBeNull();
    expect(help().querySelector('.sr-only')?.textContent?.trim()).toBe('Two words is plenty');
  });

  it('drops the info button when there is no hint', async () => {
    host.hintIcon.set(true);
    host.hint.set(undefined);
    await stabilize();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('shows the hint while the field has nothing to report', () => {
    expect(help().textContent?.trim()).toBe('Two words is plenty');
    expect(help().querySelector('p-message')).toBeNull();
  });

  it('replaces the hint with the first zod issue once the field earns it', async () => {
    host.submitted.set(true);
    await stabilize();

    expect(help().querySelector('p-message')).not.toBeNull();
    expect(help().textContent).toContain('Name is required');
    expect(help().textContent).not.toContain('Two words is plenty');
  });

  it('stays quiet on an invalid but untouched field', async () => {
    await stabilize();

    expect(help().querySelector('p-message')).toBeNull();
  });

  it('labels a single control with a <label for>, marked required', () => {
    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;

    expect(label.getAttribute('for')).toBe('name');
    expect(label.textContent).toContain('Name');
    expect(label.querySelector('.sr-only')?.textContent).toBe('(required)');
  });

  it('labels a group with an id-bearing <span> instead, for aria-labelledby to point at', async () => {
    host.groupLabel.set(true);
    await stabilize();

    expect(fixture.nativeElement.querySelector('label')).toBeNull();
    expect(fixture.nativeElement.querySelector('#name-label')?.textContent).toContain('Name');
  });
});
