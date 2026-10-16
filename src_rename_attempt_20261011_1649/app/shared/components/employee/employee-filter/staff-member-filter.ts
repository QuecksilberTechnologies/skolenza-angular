import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { finalize } from 'rxjs';

import { Common } from '@core/services/common';
import { DesignationsApi } from '@core/services/designations-api';
import { LookupStore } from '@core/stores';
import { TrimInput } from '@shared/directives';
import {
  GetDesignationOptionReq,
  IDesignation,
  IStaffMemberFilter,
  LoginInfo,
} from '@shared/interfaces';

import { SelectField } from '../../select-field/select-field';

@Component({
  selector: 'app-staffMember-filter',
  imports: [ButtonModule, InputTextModule, ReactiveFormsModule, TrimInput, SelectField],
  templateUrl: './staffMember-filter.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberFilter implements OnInit {
  readonly #lookupStore = inject(LookupStore);
  readonly #designationsApi = inject(DesignationsApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly appliedFilters = input<IStaffMemberFilter | null>();
  readonly applyFiltersEvent = output<IStaffMemberFilter | null>();
  readonly closePopup = output();
  readonly designationOptions = signal<IDesignation[]>([]);
  readonly departmentOptions = this.#lookupStore.departmentOptions;
  readonly staffEmploymentTypeOptions = this.#lookupStore.staffEmploymentTypes;
  readonly isLoadingStaffEmploymentTypes = this.#lookupStore.isLoadingStaffEmploymentTypes;
  readonly isLoadingDepartments = this.#lookupStore.isLoadingDepartmentOptions;
  readonly isLoadingDesignation = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  protected staffMemberFilterForm!: FormGroup; // TODO: Add form interface
  protected loginInfo!: LoginInfo;

  constructor() {
    this.initForm();

    effect(() => {
      this.isLoadingDesignation.set(this.#designationsApi.isLoading());
      this.designationOptions.set(this.#designationsApi.designations());
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();

    if (this.appliedFilters()) {
      this.patchForm();
    }
  }

  initForm() {
    this.staffMemberFilterForm = this.#fb.group({
      staffMemberId: [''],
      staffMemberName: [''],
      staffEmploymentType: [null],
      designation: [null],
      department: [null],
      documentStatus: [null],
      staffMemberStatus: [null],
    });
  }

  patchForm() {
    this.staffMemberFilterForm.patchValue({
      staffMemberId: this.appliedFilters()?.staffMemberId,
      staffMemberName: this.appliedFilters()?.staffMemberName,
      staffEmploymentType: this.appliedFilters()?.staffEmploymentType,
      designation: this.appliedFilters()?.designation,
      department: this.appliedFilters()?.department,
      documentStatus: this.appliedFilters()?.documentStatus,
      staffMemberStatus: this.appliedFilters()?.staffMemberStatus,
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
    this.staffMemberFilterForm.reset();
    this.applyFilters();
  }

  async onApply() {
    this.applyFilters();
  }

  applyFilters() {
    const formValue = this.staffMemberFilterForm.getRawValue();
    this.applyFiltersEvent.emit(formValue);
  }
}
