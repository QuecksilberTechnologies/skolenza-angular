import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';

import { LookupStore } from '@core/stores';
import { IDepartmentFilter } from '@shared/index';

import { SelectField } from '../../select-field/select-field';

@Component({
  selector: 'app-department-filter',
  imports: [ButtonModule, ReactiveFormsModule, SelectField],
  templateUrl: './department-filter.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentFilter {
  readonly #lookupStore = inject(LookupStore);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly closePopup = output();
  readonly applyFiltersEvent = output<IDepartmentFilter | null>();
  readonly isSaving = signal<boolean>(false);
  readonly departmentOptions = this.#lookupStore.departmentOptions;
  readonly isLoadingDepartments = this.#lookupStore.isLoadingDepartmentOptions;
  protected departmentFilterForm!: FormGroup; // TODO: Add form interface

  public statusNameOptions = [
    { id: true, statusName: 'Active' },
    { id: false, statusName: 'Inactive' },
  ];

  constructor() {
    this.initForm();
  }

  initForm() {
    this.departmentFilterForm = this.#fb.group({
      department: [null],
      status: [null],
    });
  }

  onCancel() {
    this.closePopup.emit();
  }

  onReset() {
    this.departmentFilterForm.reset();
    this.applyFilters();
  }

  async onApply() {
    this.applyFilters();
  }

  applyFilters() {
    const formValue = this.departmentFilterForm.getRawValue();
    this.applyFiltersEvent.emit(formValue);
  }
}
