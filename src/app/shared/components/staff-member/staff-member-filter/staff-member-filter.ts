import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { StaffProfessionalStructureApi } from '@core/services/staff-professional-structure-api';
import { LookupStore } from '@core/stores';
import { TrimInput } from '@shared/directives';
import { StaffPositionMaster, IStaffMemberFilter, LoginInfo } from '@shared/interfaces';

import { SelectField } from '../../select-field/select-field';

@Component({
  selector: 'app-staff-member-filter',
  imports: [ButtonModule, InputTextModule, ReactiveFormsModule, TrimInput, SelectField],
  templateUrl: './staff-member-filter.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberFilter implements OnInit {
  readonly #lookupStore = inject(LookupStore);
  readonly #professionalApi = inject(StaffProfessionalStructureApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly appliedFilters = input<IStaffMemberFilter | null>();
  readonly applyFiltersEvent = output<IStaffMemberFilter | null>();
  readonly closePopup = output();
  readonly positionOptions = signal<StaffPositionMaster[]>([]);
  readonly departmentOptions = this.#lookupStore.departmentOptions;
  readonly staffEmploymentTypeOptions = this.#lookupStore.staffEmploymentTypes;
  readonly isLoadingStaffEmploymentTypes = this.#lookupStore.isLoadingStaffEmploymentTypes;
  readonly isLoadingDepartments = this.#lookupStore.isLoadingDepartmentOptions;
  readonly isLoadingPositions = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  protected staffMemberFilterForm!: FormGroup; // TODO: Add form interface
  protected loginInfo!: LoginInfo;

  constructor() {
    this.initForm();
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
      position: [null],
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
      position: this.appliedFilters()?.position,
      department: this.appliedFilters()?.department,
      documentStatus: this.appliedFilters()?.documentStatus,
      staffMemberStatus: this.appliedFilters()?.staffMemberStatus,
    });
  }

  async onDepartmentChange(departmentId: string) {
    await this.getPositions(Number(departmentId));
  }

  async getPositions(departmentId?: number) {
    if (!departmentId) return;

    this.isLoadingPositions.set(true);
    this.positionOptions.set([]);
    this.staffMemberFilterForm.controls['position'].setValue(null);
    this.#professionalApi
      .getPositions()
      .pipe(
        finalize(() => this.isLoadingPositions.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: async (res) => {
          this.positionOptions.set(
            res.isSucceeded
              ? res.data.filter(
                  (position) => !position.departmentId || position.departmentId === departmentId,
                )
              : [],
          );
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
