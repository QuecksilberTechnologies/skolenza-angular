import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormGroup,
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { finalize } from 'rxjs';

import {
  Common,
  StaffMemberDependentApi,
  StaffMemberInsuranceApi,
  PoliciesInsuranceApi,
  PolicyTypeApi,
} from '@core/services';
import {
  CreateStaffMemberInsuranceReq,
  Dependent,
  StaffMemberDependent,
  StaffMemberInsurance,
  InsuranceDetail,
  InsuranceEnrollForm,
  LoginInfo,
  PolicyTypeEnum,
  PolicyTypesName,
} from '@shared/interfaces';

@Component({
  selector: 'app-staffMember-insurance-form',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    SelectModule,
    CheckboxModule,
    DatePickerModule,
    ButtonModule,
    MessageModule,
    TableModule,
    TooltipModule,
  ],
  templateUrl: './staffMember-insurance-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberInsuranceForm implements OnInit {
  readonly #staffMemberInsuranceApi = inject(StaffMemberInsuranceApi);
  readonly #policyTypeApi = inject(PolicyTypeApi);
  readonly #policiesInsuranceApi = inject(PoliciesInsuranceApi);
  readonly #staffMemberDependentApi = inject(StaffMemberDependentApi);
  readonly #commonService = inject(Common);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly staffMemberInsurance = signal<StaffMemberInsurance | undefined>(undefined);
  readonly isSaving = signal(false);
  readonly policyTypes = signal<PolicyTypesName[]>([]);
  readonly #rawInsurancePolicies = signal<InsuranceDetail[]>([]);
  readonly insurancePolicies = computed(() => {
    const raw = this.#rawInsurancePolicies();
    const types = this.policyTypes();
    return raw.map((detail) => ({
      ...detail,
      policyName: types.find((pt) => pt.id === detail.policyTypeId)?.policyName ?? '',
    }));
  });
  readonly staffMemberDependents = signal<StaffMemberDependent[]>([]);
  readonly selectedDependents = signal<Map<number, { relation: number; isCovered: boolean }>>(
    new Map(),
  );
  readonly hasDependentChecked = signal(false);
  readonly isSaveDisabled = computed(
    () => this.isSaving() || (this.hasDependentChecked() && this.selectedDependents().size === 0),
  );
  readonly selectedDependentsCount = computed(() => this.selectedDependents().size);
  readonly today = signal(new Date());
  readonly minEndDate = signal(new Date());
  protected insuranceForm!: FormGroup<InsuranceEnrollForm>;
  protected loginInfo!: LoginInfo;

  constructor() {
    this.staffMemberInsurance.set(this.#dynamicDialogConfig.data.staffMemberInsurance);

    this.initForm();

    this.insuranceForm
      .get('hasDependent')!
      .valueChanges.pipe(takeUntilDestroyed())
      .subscribe((value) => this.hasDependentChecked.set(value));

    effect(() => {
      this.isSaving.set(this.#staffMemberInsuranceApi.isSaving());
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    this.loadPolicyTypes();
    this.loadDependents();

    if (this.staffMemberInsurance()?.id) {
      this.patchForm();
    }
  }

  initForm() {
    this.insuranceForm = this.#fb.group({
      policyTypeId: this.#fb.control<number | null>(null, Validators.required),
      insurancePolicyId: this.#fb.control<number | null>(
        { value: null, disabled: true },
        Validators.required,
      ),
      hasDependent: [false],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    });
  }

  patchForm() {
    const insurance = this.staffMemberInsurance();
    if (!insurance) return;

    this.insuranceForm.patchValue({
      policyTypeId: insurance.policyTypeId ?? null,
      insurancePolicyId: insurance.insurancePolicyId ?? null,
      hasDependent: insurance.hasDependent,
      startDate: insurance.startDate,
      endDate: insurance.endDate,
    });
    this.hasDependentChecked.set(insurance.hasDependent);

    if (insurance.policyTypeId) {
      this.insuranceForm.get('insurancePolicyId')?.enable();
      this.loadInsurancePolicies(insurance.policyTypeId);
    }

    if (insurance.dependents?.length) {
      const map = new Map<number, { relation: number; isCovered: boolean }>();
      for (const dep of insurance.dependents) {
        if (dep.isCovered) {
          map.set(dep.dependentId, { relation: dep.relation, isCovered: dep.isCovered });
        }
      }
      this.selectedDependents.set(map);
    }
  }

  loadPolicyTypes() {
    this.#policyTypeApi
      .getPolicyTypeNames({ IsActive: true, PolicyTypeEnumVal: PolicyTypeEnum.Insurance })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            this.policyTypes.set(res.data ?? []);
          }
        },
      });
  }

  loadInsurancePolicies(policyTypeId: number) {
    const staffMemberId = this.#getTargetStaffMemberId();
    this.#policiesInsuranceApi
      .getInsuranceDetails({
        StaffMemberId: staffMemberId,
        PolicyId: policyTypeId,
        IsActive: true,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            this.#rawInsurancePolicies.set(res.data ?? []);
          }
        },
      });
  }

  loadDependents() {
    const staffMemberId = this.#getTargetStaffMemberId();
    this.#staffMemberDependentApi
      .getStaffMemberDependentsDetail({
        StaffMemberId: staffMemberId,
        UserStaffMemberId: this.loginInfo?.user?.staffMemberId ?? staffMemberId,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            this.staffMemberDependents.set(res.data?.dependents ?? []);
          }
        },
      });
  }

  onPolicyTypeChange(policyTypeId: number | null) {
    const insurancePolicyCtrl = this.insuranceForm.get('insurancePolicyId');
    insurancePolicyCtrl?.setValue(null);
    this.#rawInsurancePolicies.set([]);
    if (policyTypeId) {
      insurancePolicyCtrl?.enable();
      this.loadInsurancePolicies(policyTypeId);
    } else {
      insurancePolicyCtrl?.disable();
    }
  }

  onStartDateChange(date: Date) {
    if (date) {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      this.minEndDate.set(nextDay);

      const endDate = this.insuranceForm.get('endDate')?.value;
      if (endDate && new Date(endDate) <= date) {
        this.insuranceForm.get('endDate')?.setValue('');
      }
    }
  }

  toggleDependent(dependent: StaffMemberDependent, checked: boolean) {
    if (checked && !dependent.hasProofUploaded) {
      this.#commonService.showMessage(
        `Cannot select "${dependent.dependentName}" — document submission is required.`,
        'error',
      );
      return;
    }

    const map = new Map(this.selectedDependents());
    if (checked) {
      map.set(dependent.id, { relation: dependent.relation, isCovered: true });
    } else {
      map.delete(dependent.id);
    }
    this.selectedDependents.set(map);
  }

  isDependentSelected(dependentId: number): boolean {
    return this.selectedDependents().has(dependentId);
  }

  isInvalid(controlName: string) {
    const control = this.insuranceForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onSubmit() {
    if (this.insuranceForm.invalid) {
      this.insuranceForm.markAllAsTouched();
      return;
    }

    const form = this.insuranceForm.getRawValue();
    const staffMemberId = this.#getTargetStaffMemberId();

    const dependents: Dependent[] = [];
    if (form.hasDependent) {
      for (const [dependentId, value] of this.selectedDependents()) {
        dependents.push({
          dependentId,
          relation: value.relation,
          isCovered: value.isCovered,
        });
      }

      if (dependents.length === 0) {
        this.#commonService.showMessage(
          'Please select at least one dependent or uncheck "Has Dependent".',
          'error',
        );
        return;
      }
    }

    const enrollmentId = this.staffMemberInsurance()?.id;
    const body: CreateStaffMemberInsuranceReq = {
      staffMemberId,
      ...(enrollmentId ? { staffMemberInsuranceEnrollmentId: enrollmentId } : {}),
      policyTypeId: form.policyTypeId ?? 0,
      insurancePolicyId: form.insurancePolicyId ?? 0,
      hasDependent: form.hasDependent,
      startDate: form.startDate,
      endDate: form.endDate,
      dependents,
    };

    this.#staffMemberInsuranceApi.setIsSaving(true);
    this.#staffMemberInsuranceApi
      .createInsurance(body)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.#staffMemberInsuranceApi.setIsSaving(false)),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#dialogRef.close(res.data);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  onCancel(): void {
    this.#dialogRef.close();
  }

  #getTargetStaffMemberId(): string {
    return (
      this.#route.snapshot.queryParamMap.get('staffMemberId') ?? this.loginInfo?.user?.staffMemberId ?? ''
    );
  }
}
