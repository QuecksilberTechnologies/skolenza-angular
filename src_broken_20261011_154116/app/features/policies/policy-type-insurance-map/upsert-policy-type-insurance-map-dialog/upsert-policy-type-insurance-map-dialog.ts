import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { finalize } from 'rxjs';

import { Common, PolicyTypeApi, PolicyTypeInsuranceMapApi } from '@core/services';
import { PoliciesInsuranceApi } from '@core/services/policies-insurance-api';
import {
  GetInsurancePolicyNamesReq,
  GetPolicyTypeNamesReq,
  InsurancePolicyName,
  IPolicyTypeInsuranceMap,
  LoginInfo,
  PolicyType,
  PolicyTypeEnum,
  PolicyTypeInsuranceMapForm,
  PolicyTypesName,
  UpsertPolicyTypeInsuranceMapReq,
} from '@shared/interfaces';

@Component({
  selector: 'app-upsert-policy-type-insurance-map-dialog',
  imports: [ReactiveFormsModule, SelectModule, ButtonModule, MessageModule],
  templateUrl: './upsert-policy-type-insurance-map-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertPolicyTypeInsuranceMapDialog implements OnInit {
  readonly #policyTypeInsuranceMapApi = inject(PolicyTypeInsuranceMapApi);
  readonly #policyTypeApi = inject(PolicyTypeApi);
  readonly #policiesInsuranceApi = inject(PoliciesInsuranceApi);
  readonly #commonService = inject(Common);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #config = inject(DynamicDialogConfig);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly policyTypeNames = signal<PolicyTypesName[]>([]);
  readonly insurancePolicyNames = signal<InsurancePolicyName[]>([]);
  readonly isLoadingPolicyTypeNames = signal<boolean>(false);
  readonly isLoadingInsurancePolicyNames = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  protected policyTypeInsuranceMapForm!: FormGroup<PolicyTypeInsuranceMapForm>;
  protected policyTypeInsuranceMap!: IPolicyTypeInsuranceMap | undefined;
  protected policyType!: PolicyType | undefined;
  protected loginInfo!: LoginInfo;

  constructor() {
    this.initForm();

    effect(() => {
      this.isLoadingPolicyTypeNames.set(this.#policyTypeApi.isLoadingNames());
      this.policyTypeNames.set(this.#policyTypeApi.policyTypeNames());
    });

    effect(() => {
      this.isLoadingInsurancePolicyNames.set(this.#policiesInsuranceApi.isLoadingNames());
      this.insurancePolicyNames.set(this.#policiesInsuranceApi.insurancePolicyNames());
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    this.policyTypeInsuranceMap = this.#config.data?.policyTypeInsuranceMap;
    this.policyType = this.#config.data?.policyType;

    if (this.#policyTypeApi.policyTypeNames().length === 0) {
      await this.getPolicyTypeNames();
    }

    if (this.policyTypeInsuranceMap) {
      this.patchForm();
    }

    if (this.policyType) {
      const policyTypeCtrl = this.policyTypeInsuranceMapForm.controls.policyTypeId;
      policyTypeCtrl.patchValue(this.policyType.id);
      this.getInsurancePolicyNames(this.policyType.id ?? 0);
    }
  }

  initForm() {
    this.policyTypeInsuranceMapForm = this.#fb.group({
      policyTypeId: new FormControl<number | undefined>(undefined, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      insurancePolicyId: new FormControl<number | undefined>(
        { value: undefined, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
    });
  }

  patchForm() {
    this.policyTypeInsuranceMapForm.patchValue({
      policyTypeId: this.policyTypeInsuranceMap?.policyTypeId || 0,
      insurancePolicyId: this.policyTypeInsuranceMap?.insurancePolicyId || 0,
    });

    this.getInsurancePolicyNames(this.policyTypeInsuranceMap?.policyTypeId ?? 0);
  }

  isInvalid(controlName: string) {
    const control = this.policyTypeInsuranceMapForm.get(controlName);
    return control?.invalid && control.touched;
  }

  async getPolicyTypeNames() {
    const req: GetPolicyTypeNamesReq = {
      IsActive: true,
      PolicyTypeEnumVal: PolicyTypeEnum.Insurance,
    };
    this.#policyTypeApi.setIsLoadingNames(true);

    this.#policyTypeApi
      .getPolicyTypeNames(req)
      .pipe(
        finalize(() => this.#policyTypeApi.setIsLoadingNames(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#policyTypeApi.setPolicyTypeNames(res.isSucceeded ? res.data : []);
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err: Error) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  async getInsurancePolicyNames(policyTypeId: number) {
    const req: GetInsurancePolicyNamesReq = {
      PolicyId: policyTypeId,
      IsActive: true,
    };

    this.#policiesInsuranceApi.setIsLoadingNames(true);

    this.#policiesInsuranceApi
      .getInsurancePolicyNames(req)
      .pipe(
        finalize(() => this.#policiesInsuranceApi.setIsLoadingNames(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#policiesInsuranceApi.setInsurancePolicyNames(res.isSucceeded ? res.data : []);

          const insurancePolicyCtrl = this.policyTypeInsuranceMapForm.controls.insurancePolicyId;

          // Enable Insurance Policy field
          insurancePolicyCtrl.reset();
          insurancePolicyCtrl.enable();
          insurancePolicyCtrl.addValidators(Validators.required);
          insurancePolicyCtrl.updateValueAndValidity();

          // Set Insurance Policy if in edit mode
          if (this.policyTypeInsuranceMap) {
            insurancePolicyCtrl.patchValue(this.policyTypeInsuranceMap?.insurancePolicyId ?? 0);
          }

          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err: Error) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  onSubmit() {
    const form = this.policyTypeInsuranceMapForm.getRawValue();

    const req: UpsertPolicyTypeInsuranceMapReq = {
      insurancePolicyId: form.insurancePolicyId ?? 0,
      policyTypeId: form.policyTypeId ?? 0,
      isActive: true,
    };

    if (this.policyTypeInsuranceMap?.id) {
      req.id = this.policyTypeInsuranceMap?.id;
    }

    const endpoint = this.policyTypeInsuranceMap?.id
      ? this.#policyTypeInsuranceMapApi.updatePolicyTypeInsuranceMap(req)
      : this.#policyTypeInsuranceMapApi.mapPolicyTypeInsurance(req);

    this.isSaving.set(true);
    endpoint
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
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

  onCancel() {
    this.#dialogRef.close();
  }
}
