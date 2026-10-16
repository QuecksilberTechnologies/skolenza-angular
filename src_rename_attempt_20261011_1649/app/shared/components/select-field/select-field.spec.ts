import { ApplicationRef, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { SelectField } from './select-field';

@Component({
  imports: [ReactiveFormsModule, SelectField],
  template: `
    <form [formGroup]="form">
      <app-select-field
        controlName="department"
        optionLabel="name"
        optionValue="id"
        placeholder="Select Department"
        emptyTitle="No departments"
        emptyDetail="Nothing configured yet."
        [options]="options"
      />
    </form>
  `,
})
class HostComponent {
  readonly options = [
    { id: 1, name: 'Engineering' },
    { id: 2, name: 'Finance' },
  ];
  readonly form = new FormGroup({ department: new FormControl<number | null>(null) });
}

describe('SelectField', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const stabilize = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await stabilize();
  });

  it('should create', () => {
    expect(host).toBeTruthy();
  });

  it('binds to the control on the surrounding form group', async () => {
    host.form.patchValue({ department: 2 });
    await stabilize();

    expect(fixture.nativeElement.textContent).toContain('Finance');
  });

  it('reflects later control updates', async () => {
    host.form.patchValue({ department: 2 });
    await stabilize();
    host.form.patchValue({ department: 1 });
    await stabilize();

    expect(fixture.nativeElement.textContent).toContain('Engineering');
    expect(fixture.nativeElement.textContent).not.toContain('Finance');
  });

  // The host is a custom element, so it defaults to display:inline and vertical
  // margins from `space-y-*` on the wrapping div would be dropped.
  it('carries a block host class so vertical spacing utilities apply', () => {
    const el: HTMLElement = fixture.nativeElement.querySelector('app-select-field');

    expect(el.classList.contains('block')).toBe(true);
  });

  it('shows the placeholder while the control is empty', async () => {
    await stabilize();

    expect(fixture.nativeElement.textContent).toContain('Select Department');
  });
});
