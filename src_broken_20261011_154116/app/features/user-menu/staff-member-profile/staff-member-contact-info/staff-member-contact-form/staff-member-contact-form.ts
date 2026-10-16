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
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputGroupModule } from '@openng/optimus-ui/inputgroup';
import { InputGroupAddonModule } from '@openng/optimus-ui/inputgroupaddon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectChangeEvent, SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { Common, StaffMemberContactsAPI } from '@core/services';
import { LookupStore } from '@core/stores';
import { CountrySelect } from '@shared/components/country-select/country-select';
import { TrimInput } from '@shared/directives';
import {
  ContactForm,
  ContactType,
  Country,
  CreateStaffMemberContactReq,
  StaffMemberContact,
  LoginInfo,
  UpdateStaffMemberContactReq,
} from '@shared/interfaces';
import { EMAIL_PATTERN, PERSON_NAME_PATTERN } from '@shared/utilities/validation-regex';
import {
  alternateNumberValidator,
  contactNumberValidator,
} from '@shared/validators/contact.validators';

@Component({
  selector: 'app-staffMember-contact-form',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ButtonModule,
    MessageModule,
    ToggleSwitchModule,
    InputGroupModule,
    InputGroupAddonModule,
    TrimInput,
    CountrySelect,
  ],
  templateUrl: './staffMember-contact-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberContactForm implements OnInit {
  readonly #staffMemberContactsAPI = inject(StaffMemberContactsAPI);
  readonly #lookupStore = inject(LookupStore);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #route = inject(ActivatedRoute);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly staffMemberContact = signal<StaffMemberContact | undefined>(undefined);
  readonly contactTypeOptions = signal<ContactType[]>([]);
  readonly relationsOptions = this.#lookupStore.relations;
  readonly countries = this.#lookupStore.countries;
  readonly states = this.#lookupStore.states;
  readonly districts = this.#lookupStore.districts;
  readonly localities = this.#lookupStore.localities;
  readonly isLoadingRelations = this.#lookupStore.isLoadingRelations;
  readonly isLoadingCountries = this.#lookupStore.isLoadingCountries;
  readonly isLoadingStates = this.#lookupStore.isLoadingStates;
  readonly isLoadingDistricts = this.#lookupStore.isLoadingDistricts;
  readonly isLoadingLocalities = this.#lookupStore.isLoadingLocalities;
  readonly isSaving = signal(false);
  readonly selectedDialCode = signal('');
  protected loginInfo!: LoginInfo;
  protected contactForm!: FormGroup<ContactForm>;

  constructor() {
    this.staffMemberContact.set(this.#dynamicDialogConfig.data.staffMemberContact);

    this.contactTypeOptions.set([
      { label: 'Rental', value: ContactType.Rental } as const,
      { label: 'Permanent', value: ContactType.Permanent } as const,
      { label: 'Temporary', value: ContactType.Temporary } as const,
    ] as unknown as ContactType[]);

    this.initForm();

    effect(() => {
      this.isSaving.set(this.#staffMemberContactsAPI.isSaving());
    });

    // Countries
    effect(() => {
      if (this.isLoadingCountries()) {
        this.contactForm.get('countryId')?.disable();
      } else {
        this.contactForm.get('countryId')?.enable();
      }
    });

    // States
    effect(() => {
      if (this.isLoadingStates()) {
        this.contactForm.controls.stateId?.disable();
      } else {
        this.contactForm.controls.stateId.enable();
      }
    });

    // Districts and localities
    effect(() => {
      if (this.isLoadingDistricts()) {
        this.contactForm.controls.districtId?.disable();
      } else {
        this.contactForm.controls.districtId.enable();
      }
    });

    effect(() => {
      if (this.isLoadingLocalities()) {
        this.contactForm.controls.localityId.disable();
      } else {
        this.contactForm.controls.localityId.enable();
      }
    });

    // Set dial codes when countries load and we have an existing contact
    effect(() => {
      const loadedCountries = this.countries();
      const ec = this.staffMemberContact();
      if (ec && loadedCountries.length > 0) {
        const country = loadedCountries.find((c: Country) => c.id === ec.countryId);
        const dialCode = country?.stdCode ?? '';
        this.selectedDialCode.set(dialCode);
        this.#updatePhoneValidators(country?.countryCode ?? '');

        if (dialCode) {
          this.contactForm.patchValue(
            {
              contactNumber: this.#stripDialCode(ec.contactNumber, dialCode),
              alternateNumber: this.#stripDialCode(ec.alternateNumber, dialCode),
            },
            { emitEvent: false },
          );
        }

        if (ec.countryId) {
          this.#lookupStore.loadStates(ec.countryId);
        }
      }
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    this.#lookupStore.initializeGlobalOptions(this.loginInfo?.user?.staffMemberId);

    const ec = this.staffMemberContact();
    if (ec?.id) {
      this.patchForm();
      if (ec.stateId) {
        this.#lookupStore.loadDistricts(ec.stateId);
      }
      if (ec.districtId) {
        this.#lookupStore.loadLocalities(ec.districtId);
      }
    }
  }

  initForm() {
    this.contactForm = this.#fb.group(
      {
        contactName: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(302),
            Validators.pattern(PERSON_NAME_PATTERN),
          ],
        ],
        contactType: new FormControl<number | undefined>(undefined, {
          nonNullable: true,
          validators: [Validators.required],
        }),
        relation: new FormControl<number | undefined>(undefined, {
          nonNullable: true,
          validators: [Validators.required],
        }),
        contactNumber: ['', [Validators.required, contactNumberValidator('')]],
        alternateNumber: ['', contactNumberValidator('')],
        email: ['', [Validators.email, Validators.pattern(EMAIL_PATTERN)]],
        countryId: new FormControl<number | undefined>(undefined, {
          nonNullable: true,
          validators: [Validators.required],
        }),
        stateId: new FormControl<number | undefined>(undefined, {
          nonNullable: true,
          validators: [Validators.required],
        }),
        districtId: new FormControl<number | undefined>(undefined, {
          nonNullable: true,
          validators: [Validators.required],
        }),
        localityId: new FormControl<number | undefined>(undefined, {
          nonNullable: true,
          validators: [Validators.required],
        }),
        houseNo: ['', [Validators.required, Validators.maxLength(20)]],
        landMark: ['', Validators.maxLength(100)],
        street: ['', Validators.maxLength(100)],
        address: ['', [Validators.required, Validators.maxLength(250)]],
        description: ['', Validators.maxLength(250)],
        remark: [''],
        isPrimary: [false],
      },
      {
        validators: [alternateNumberValidator],
      },
    );
  }

  patchForm() {
    const ec = this.staffMemberContact();
    if (ec) {
      // The dial-code effect may already have run; strip again so this patch doesn't restore it.
      const dialCode = this.selectedDialCode();
      this.contactForm.patchValue(
        {
          contactName: ec.contactName ?? '',
          contactType: ec.contactType ?? undefined,
          relation: ec.relation ?? undefined,
          contactNumber: this.#stripDialCode(ec.contactNumber, dialCode),
          alternateNumber: this.#stripDialCode(ec.alternateNumber, dialCode),
          email: ec.email ?? '',
          countryId: ec.countryId ?? undefined,
          stateId: ec.stateId ?? undefined,
          districtId: ec.districtId ?? undefined,
          localityId: ec.localityId ?? undefined,
          houseNo: ec.houseNo ?? '',
          street: ec.street ?? '',
          landMark: ec.landMark ?? '',
          address: ec.address ?? '',
          remark: ec.remark ?? '',
          description: ec.description ?? '',
          isPrimary: ec.isPrimary ?? false,
        },
        { emitEvent: false },
      );

      this.contactForm.controls.remark.disable();
    }
  }

  isInvalid(controlName: string) {
    const control = this.contactForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onCountryChange(event: SelectChangeEvent) {
    const country = this.countries().find((c) => c.id === event.value);
    this.selectedDialCode.set(country?.stdCode ?? '');
    this.#updatePhoneValidators(country?.countryCode ?? '');
    this.contactForm.patchValue({
      stateId: undefined,
      districtId: undefined,
      localityId: undefined,
    });
    this.#lookupStore.loadDistricts(undefined);
    this.#lookupStore.loadLocalities(undefined);
    this.#lookupStore.loadStates(Number(event.value) || undefined);
  }

  onStateChange(event: SelectChangeEvent) {
    this.contactForm.patchValue({ districtId: undefined, localityId: undefined });
    this.#lookupStore.loadLocalities(undefined);
    this.#lookupStore.loadDistricts(Number(event.value) || undefined);
  }

  onDistrictChange(event: SelectChangeEvent) {
    this.contactForm.patchValue({ localityId: undefined });
    this.#lookupStore.loadLocalities(Number(event.value) || undefined);
  }

  async onSubmit() {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    if (this.staffMemberContact()?.id) {
      this.updateContact();
    } else {
      this.addContact();
    }
  }

  addContact() {
    const queryStaffMemberId = this.#route.snapshot.queryParamMap.get('staffMemberId');
    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) return;
    const form = this.contactForm.getRawValue();

    const body: CreateStaffMemberContactReq = {
      userStaffMemberId: sessionUser.staffMemberId,
      staffMemberId: queryStaffMemberId ? queryStaffMemberId : sessionUser.staffMemberId,
      contactName: form.contactName?.trim() || '',
      contactType: form.contactType ? Number(form.contactType) : 0,
      contactNumber: this.#prependDialCode(form.contactNumber),
      alternateNumber: this.#prependDialCode(form.alternateNumber),
      relation: Number(form.relation) || 0,
      email: form.email?.trim() || '',
      countryId: form.countryId ? Number(form.countryId) : 0,
      stateId: form.stateId ? Number(form.stateId) : 0,
      districtId: form.districtId ? Number(form.districtId) : 0,
      localityId: form.localityId ? Number(form.localityId) : 0,
      houseNo: form.houseNo?.trim() || '',
      landMark: form.landMark?.trim() || '',
      street: form.street?.trim() || '',
      address: form.address?.trim() || '',
      remark: form.remark?.trim() || '',
      description: form.description?.trim() || '',
      isPrimary: form.isPrimary,
    };

    this.#staffMemberContactsAPI.setIsSaving(true);
    this.#staffMemberContactsAPI
      .createStaffMemberContact(body)
      .pipe(
        finalize(() => this.#staffMemberContactsAPI.setIsSaving(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: async (res) => {
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

  updateContact() {
    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) return;
    const form = this.contactForm.getRawValue();

    const queryStaffMemberId = this.#route.snapshot.queryParamMap.get('staffMemberId');
    const body: UpdateStaffMemberContactReq = {
      userStaffMemberId: sessionUser.staffMemberId,
      staffMemberId: queryStaffMemberId ? queryStaffMemberId : sessionUser.staffMemberId,
      id: this.staffMemberContact()?.id ?? 0,
      contactName: form.contactName?.trim() || '',
      contactType: form.contactType ? Number(form.contactType) : 0,
      contactNumber: this.#prependDialCode(form.contactNumber),
      alternateNumber: this.#prependDialCode(form.alternateNumber),
      relation: Number(form.relation) || 0,
      email: form.email?.trim() || '',
      countryId: form.countryId ? Number(form.countryId) : 0,
      stateId: form.stateId ? Number(form.stateId) : 0,
      districtId: form.districtId ? Number(form.districtId) : 0,
      localityId: form.localityId ? Number(form.localityId) : 0,
      houseNo: form.houseNo?.trim() || '',
      landMark: form.landMark?.trim() || '',
      street: form.street?.trim() || '',
      address: form.address?.trim() || '',
      description: form.description?.trim() || '',
      isPrimary: form.isPrimary,
    };

    this.#staffMemberContactsAPI.setIsSaving(true);
    this.#staffMemberContactsAPI
      .updateStaffMemberContact(body)
      .pipe(
        finalize(() => this.#staffMemberContactsAPI.setIsSaving(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: async (res) => {
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

  #updatePhoneValidators(countryCode: string) {
    const validator = contactNumberValidator(countryCode);

    const contactNumberCtrl = this.contactForm.controls.contactNumber;
    contactNumberCtrl.setValidators([Validators.required, validator]);
    contactNumberCtrl.updateValueAndValidity();

    const alternateNumberCtrl = this.contactForm.controls.alternateNumber;
    alternateNumberCtrl.setValidators(validator);
    alternateNumberCtrl.updateValueAndValidity();
  }

  #stripDialCode(number: string | null | undefined, dialCode: string): string {
    const trimmed = number?.trim() || '';
    return dialCode && trimmed.startsWith(dialCode) ? trimmed.slice(dialCode.length) : trimmed;
  }

  #prependDialCode(number: string | undefined): string {
    const trimmed = number?.trim() || '';
    const dialCode = this.selectedDialCode();
    return dialCode && trimmed ? `${dialCode}${trimmed}` : trimmed;
  }
}
