import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { StatusDotSelect } from './status-dot-select';

const OPTIONS = [
  { label: 'Open', value: 'open', color: 'text-green-500' },
  { label: 'Blocked', value: 'blocked', color: 'text-red-500' },
];

@Component({
  imports: [ReactiveFormsModule, StatusDotSelect],
  template: `
    <form [formGroup]="form()">
      <app-status-dot-select
        controlName="status"
        optionLabel="label"
        optionValue="value"
        placeholder="Select status"
        [options]="options"
      />
    </form>
  `,
})
class BoundHost {
  readonly options = OPTIONS;
  readonly form = signal(new FormGroup({ status: new FormControl<string | null>(null) }));

  /** Mirrors a dialog rebuilding its form on reopen. */
  replaceForm() {
    this.form.set(new FormGroup({ status: new FormControl<string | null>(null) }));
  }
}

@Component({
  imports: [ReactiveFormsModule, StatusDotSelect],
  template: `
    <form [formGroup]="form">
      <app-status-dot-select
        controlName="status"
        optionLabel="label"
        optionValue="value"
        placeholder="Filter by Status"
        [options]="options"
        dropdownIcon="pi pi-filter text-gray-400"
      />
    </form>
  `,
})
class FilterHost {
  readonly options = OPTIONS;
  readonly form = new FormGroup({ status: new FormControl<string | null>(null) });
}

describe('StatusDotSelect', () => {
  const stabilize = () => TestBed.inject(ApplicationRef).whenStable();

  describe('bound to a form group', () => {
    let fixture: ComponentFixture<BoundHost>;
    let host: BoundHost;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [BoundHost] }).compileComponents();
      fixture = TestBed.createComponent(BoundHost);
      host = fixture.componentInstance;
      await stabilize();
    });

    it('renders the selected option label and its colour dot', async () => {
      host.form().patchValue({ status: 'blocked' });
      await stabilize();

      expect(fixture.nativeElement.textContent).toContain('Blocked');
      expect(fixture.nativeElement.querySelector('i.pi-circle-on.text-red-500')).toBeTruthy();
    });

    it('re-binds when the host swaps its form group instance', async () => {
      host.form().patchValue({ status: 'open' });
      await stabilize();

      host.replaceForm();
      await stabilize();
      host.form().patchValue({ status: 'blocked' });
      await stabilize();

      expect(fixture.nativeElement.textContent).toContain('Blocked');
    });

    it('keeps the default dropdown icon when none is given', () => {
      expect(fixture.nativeElement.querySelector('.pi-filter')).toBeNull();
    });
  });

  describe('used as a standalone filter', () => {
    let fixture: ComponentFixture<FilterHost>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [FilterHost] }).compileComponents();
      fixture = TestBed.createComponent(FilterHost);
      await stabilize();
    });

    it('renders its placeholder', () => {
      expect(fixture.nativeElement.textContent).toContain('Filter by Status');
    });

    it('projects the filter dropdown icon', () => {
      expect(fixture.nativeElement.querySelector('.pi-filter')).toBeTruthy();
    });
  });
});
