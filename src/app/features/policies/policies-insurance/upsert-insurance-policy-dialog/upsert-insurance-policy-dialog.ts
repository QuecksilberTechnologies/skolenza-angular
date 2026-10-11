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
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputGroupModule } from '@openng/optimus-ui/inputgroup';
import { InputGroupAddonModule } from '@openng/optimus-ui/inputgroupaddon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectChangeEvent, SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { formatISO, parseISO } from 'date-fns';
import { finalize } from 'rxjs';

import { Common, PolicyTypeApi } from '@core/services';
import { PoliciesInsuranceApi } from '@core/services/policies-insurance-api';
import { LookupStore } from '@core/stores';
import { CountrySelect } from '@shared/components/country-select/country-select';
import { TrimInput } from '@shared/directives';
import {
  Country,
  GetPolicyTypeNamesReq,
  InsurancePolicy,
  InsurancePolicyForm,
  LoginInfo,
  PolicyTypeEnum,
  PolicyTypesName,
  UpsertInsurancePolicyReq,
} from '@shared/interfaces';
import { contactNumberValidator } from '@shared/validators/contact.validators';

@Component({
  selector: 'app-upsert-insurance-policy-dialog',
  imports: [
    ReactiveFormsModule,
    AutoFocusModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    SelectModule,
    ButtonModule,
    MessageModule,
    DatePickerModule,
    InputGroupModule,
    InputGroupAddonModule,
    TrimInput,
    CountrySelect,
  ],
  templateUrl: './upsert-insurance-policy-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertInsurancePolicyDialog implements OnInit {
  readonly #policiesInsuranceApi = inject(PoliciesInsuranceApi);
  readonly #policyTypeApi = inject(PolicyTypeApi);
  readonly #lookupStore = inject(LookupStore);
  readonly #commonService = inject(Common);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #config = inject(DynamicDialogConfig);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly countries = this.#lookupStore.countries;
  readonly policyTypeNames = signal<PolicyTypesName[]>([]);
  readonly selectedDialCode = signal('');
  readonly #selectedCountryCode = signal('');
  readonly isLoadingNames = signal<boolean>(false);
  readonly isLoadingCountries = this.#lookupStore.isLoadingCountries;
  readonly isSaving = signal<boolean>(false);
  readonly startDateValue = signal<Date | null>(null);
  readonly endDateValue = signal<Date | null>(null);
  protected insurancePolicyForm!: FormGroup<InsurancePolicyForm>;
  protected loginInfo!: LoginInfo;
  protected insurancePolicy!: InsurancePolicy;

  constructor() {
    this.insurancePolicy = this.#config.data?.insurancePolicy;

    this.initForm();

    // Track date values for min/max constraints
    this.insurancePolicyForm.controls.startDate.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((value) => this.startDateValue.set(value instanceof Date ? value : null));

    this.insurancePolicyForm.controls.endDate.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((value) => this.endDateValue.set(value instanceof Date ? value : null));

    // Countries
    effect(() => {
      if (this.isLoadingCountries()) {
        this.insurancePolicyForm.get('countryId')?.disable();
      } else {
        this.insurancePolicyForm.get('countryId')?.enable();
      }
    });

    // Set dial codes when countries load and we have an existing policy
    effect(() => {
      const loadedCountries = this.countries();
      const ip = this.insurancePolicy;
      if (ip && loadedCountries.length > 0) {
        const country = loadedCountries.find((c: Country) => c.id === ip.countryId);
        const dialCode = country?.stdCode ?? '';
        this.selectedDialCode.set(dialCode);
        this.#updatePhoneValidators(country?.countryCode ?? '');

        if (dialCode) {
          this.insurancePolicyForm.patchValue(
            {
              agentContactNumber: this.#stripDialCode(ip.agentContactNumber, dialCode),
              agentOfficeNumber: this.#stripDialCode(ip.agentOfficeNumber, dialCode),
            },
            { emitEvent: false },
          );
        }
      }
    });

    effect(() => {
      this.isLoadingNames.set(this.#policyTypeApi.isLoadingNames());
      this.policyTypeNames.set(this.#policyTypeApi.policyTypeNames());
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();

    if (this.#policyTypeApi.policyTypeNames().length === 0) {
      await this.getPolicyTypeNames();
    }

    if (this.insurancePolicy) {
      this.patchForm();
    }
  }

  initForm() {
    this.insurancePolicyForm = this.#fb.group({
      insurancePolicyName: ['', [Validators.required, Validators.maxLength(100)]],
      insurancePolicyNumber: ['', [Validators.required, Validators.maxLength(50)]],
      providerName: ['', [Validators.required, Validators.maxLength(100)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      policyTypeId: new FormControl<number | undefined>(undefined, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      countryId: new FormControl<number | undefined>(undefined, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      agentName: ['', [Validators.maxLength(100)]],
      agentContactNumber: ['', [contactNumberValidator('')]],
      agentOfficeNumber: ['', [contactNumberValidator('')]],
      maxSpouseAllowed: [0, [Validators.min(0)]],
      maxChildAllowed: [0, [Validators.min(0)]],
      remark: ['', [Validators.maxLength(250)]],
      description: ['', [Validators.maxLength(500)]],
      staffMemberAllowed: [true],
      parentsAllowed: [true],
      inLawsAllowed: [true],
      isActive: [true],
    }) as FormGroup<InsurancePolicyForm>;
  }

  patchForm() {
    const ip = this.insurancePolicy;

    const startDate = ip?.startDate ? parseISO(ip.startDate) : '';
    const endDate = ip?.endDate ? parseISO(ip.endDate) : '';

    // Initialize date signals for min/max constraints
    if (startDate instanceof Date) this.startDateValue.set(startDate);
    if (endDate instanceof Date) this.endDateValue.set(endDate);

    // Try to find the country's dial code so we can strip it from stored numbers
    const country = this.countries().find((c: Country) => c.id === ip?.countryId);
    const dialCode = country?.stdCode ?? '';

    this.insurancePolicyForm.patchValue({
      insurancePolicyName: ip?.insurancePolicyName || '',
      insurancePolicyNumber: ip?.insurancePolicyNumber || '',
      providerName: ip?.providerName || '',
      startDate: startDate,
      endDate: endDate,
      policyTypeId: ip?.policyTypeId,
      countryId: ip?.countryId || 0,
      agentName: ip?.agentName || '',
      agentContactNumber: this.#stripDialCode(ip?.agentContactNumber, dialCode),
      agentOfficeNumber: this.#stripDialCode(ip?.agentOfficeNumber, dialCode),
      maxSpouseAllowed: ip?.maxSpouseAllowed || 0,
      maxChildAllowed: ip?.maxChildAllowed || 0,
      remark: ip?.remark || '',
      description: ip?.description || '',
      staffMemberAllowed: ip?.staffMemberAllowed ?? false,
      parentsAllowed: ip?.parentsAllowed ?? false,
      inLawsAllowed: ip?.inLawsAllowed ?? false,
    });
  }

  isInvalid(controlName: string) {
    const control = this.insurancePolicyForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onCountryChange(event: SelectChangeEvent) {
    const country = this.countries().find((c) => c.id === event.value);
    this.selectedDialCode.set(country?.stdCode ?? '');
    this.#updatePhoneValidators(country?.countryCode ?? '');
  }

  #updatePhoneValidators(countryCode: string) {
    this.#selectedCountryCode.set(countryCode);
    const validator = contactNumberValidator(countryCode);

    const contactNumberCtrl = this.insurancePolicyForm.controls.agentContactNumber;
    contactNumberCtrl.setValidators(validator);
    contactNumberCtrl.updateValueAndValidity();

    const officeNumberCtrl = this.insurancePolicyForm.controls.agentOfficeNumber;
    officeNumberCtrl.setValidators(validator);
    officeNumberCtrl.updateValueAndValidity();
  }

  #stripDialCode(number: string | undefined, dialCode: string): string {
    const trimmed = number?.trim() || '';
    return dialCode && trimmed.startsWith(dialCode) ? trimmed.slice(dialCode.length) : trimmed;
  }

  #prependDialCode(number: string | undefined): string {
    const trimmed = number?.trim() || '';
    const dialCode = this.selectedDialCode();
    return dialCode && trimmed ? `${dialCode}${trimmed}` : trimmed;
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

  onSubmit() {
    const form = this.insurancePolicyForm.getRawValue();

    const req: UpsertInsurancePolicyReq = {
      policyTypeId: form.policyTypeId,
      countryId: form.countryId,
      insurancePolicyName: form.insurancePolicyName?.trim(),
      insurancePolicyNumber: form.insurancePolicyNumber?.trim(),
      providerName: form.providerName?.trim(),
      startDate: formatISO(form.startDate),
      endDate: formatISO(form.endDate),
      agentName: form.agentName?.trim(),
      agentContactNumber: this.#prependDialCode(form.agentContactNumber),
      agentOfficeNumber: this.#prependDialCode(form.agentOfficeNumber),
      staffMemberAllowed: form.staffMemberAllowed,
      maxSpouseAllowed: form.maxSpouseAllowed,
      maxChildAllowed: form.maxChildAllowed,
      parentsAllowed: form.parentsAllowed,
      inLawsAllowed: form.inLawsAllowed,
      isActive: true,
      remark: form.remark?.trim(),
      description: form.description?.trim(),
    };

    if (this.insurancePolicy?.insurancePolicyId) {
      req.id = this.insurancePolicy?.insurancePolicyId;
    }

    const endpoint = this.insurancePolicy?.insurancePolicyId
      ? this.#policiesInsuranceApi.updateInsurancePolicies(req)
      : this.#policiesInsuranceApi.createInsurancePolicies(req);

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
