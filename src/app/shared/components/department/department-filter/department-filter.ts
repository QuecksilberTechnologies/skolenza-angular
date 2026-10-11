import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { finalize } from 'rxjs';

import { Common } from '@core/services/common';
import { DesignationsApi } from '@core/services/designations-api';
import { LookupStore } from '@core/stores';
import { GetDesignationOptionReq, IDepartmentFilter, IDesignation, LoginInfo } from '@shared/index';

import { SelectField } from '../../select-field/select-field';

@Component({
  selector: 'app-department-filter',
  imports: [ButtonModule, ReactiveFormsModule, SelectField],
  templateUrl: './department-filter.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentFilter implements OnInit {
  readonly #lookupStore = inject(LookupStore);
  readonly #designationsApi = inject(DesignationsApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly closePopup = output();
  readonly applyFiltersEvent = output<IDepartmentFilter | null>();
  readonly isSaving = signal<boolean>(false);
  readonly departmentOptions = this.#lookupStore.departmentOptions;
  readonly designationOptions = signal<IDesignation[]>([]);
  readonly isLoadingDepartments = this.#lookupStore.isLoadingDepartmentOptions;
  protected departmentFilterForm!: FormGroup; // TODO: Add form interface
  protected loginInfo!: LoginInfo;

  public statusNameOptions = [
    { id: true, statusName: 'Active' },
    { id: false, statusName: 'Inactive' },
  ];

  constructor() {
    this.initForm();
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
  }

  initForm() {
    this.departmentFilterForm = this.#fb.group({
      department: [null],
      status: [null],
    });
  }

  async onDepartmentChange(departmentId: string) {
    await this.getDesignations(Number(departmentId));
  }

  async getDesignations(departmentId?: number) {
    if (!departmentId) return;

    const body: GetDesignationOptionReq = {
      UserStaffMemberId: this.loginInfo?.user?.staffMemberId ?? '',
      DepartmentId: departmentId,
      IsActive: true,
    };

    this.#designationsApi.setIsLoading(true);
    this.#designationsApi.setDesignations([]);

    this.#designationsApi
      .getDesignationOptions(body)
      .pipe(
        finalize(() => this.#designationsApi.setIsLoading(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: async (res) => {
          this.#designationsApi.setDesignations(res.isSucceeded ? res.data : []);
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
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
