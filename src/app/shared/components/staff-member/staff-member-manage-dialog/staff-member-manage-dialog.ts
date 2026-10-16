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
import { ActivatedRoute, Router } from '@angular/router';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputGroupModule } from '@openng/optimus-ui/inputgroup';
import { InputGroupAddonModule } from '@openng/optimus-ui/inputgroupaddon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { Droplet, LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';

import { Common } from '@core/services/common';
import { RolesApi } from '@core/services/roles-api';
import { StaffMembersApi } from '@core/services/staff-member-api';
import { StaffMemberBasicAPI } from '@core/services/staff-member-basic-api';
import { StaffProfessionalStructureApi } from '@core/services/staff-professional-structure-api';
import { LookupStore } from '@core/stores';
import { TrimInput } from '@shared/directives';
import {
  BasicForm,
  BloodGroup,
  CreateStaffMemberReq,
  GetRolesReq,
  IStaffMemberBasicInfo,
  InstitutionStaffCategory,
  LoginInfo,
  Role,
  StaffPositionMaster,
  StaffProfessionalMaster,
  StaffProfessionalMasterType,
  UpdateStaffMemberBasicReq,
  UpdateStaffMemberOfficialReq,
} from '@shared/interfaces';
import { BLOOD_GROUPS } from '@shared/utilities/common-data';
import { InstitutionRoleTypeId } from '@shared/utilities/login-info';
import { PERSON_NAME_PATTERN } from '@shared/utilities/validation-regex';
import { contactNumberValidator } from '@shared/validators/contact.validators';

import { CountrySelect } from '../../country-select/country-select';

@Component({
  selector: 'app-staff-member-manage-dialog',
  imports: [
    ButtonModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    ReactiveFormsModule,
    MessageModule,
    AutoFocusModule,
    CheckboxModule,
    LucideAngularModule,
    InputGroupModule,
    InputGroupAddonModule,
    TrimInput,
    CountrySelect,
  ],
  templateUrl: './staff-member-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberManageDialog implements OnInit {
  readonly #staffMemberApi = inject(StaffMembersApi);
  readonly #staffMemberBasicAPI = inject(StaffMemberBasicAPI);
  readonly #rolesApi = inject(RolesApi);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly #dialogRef = inject(DynamicDialogRef, { optional: true });
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig, {
    optional: true,
  });
  readonly #router = inject(Router);
  readonly #professionalApi = inject(StaffProfessionalStructureApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #lookupStore = inject(LookupStore);
  protected readonly isPageMode = !this.#dialogRef;
  readonly staffMemberBasic = signal<IStaffMemberBasicInfo | undefined>(undefined);
  readonly departmentOptions = this.#lookupStore.departmentOptions;
  readonly roleOptions = signal<Role[]>([]);
  readonly bloodGroupOptions = signal<BloodGroup[]>(BLOOD_GROUPS);
  readonly relationsOptions = this.#lookupStore.relations;
  readonly isLoadingRelations = this.#lookupStore.isLoadingRelations;
  readonly isLoadingDepartments = this.#lookupStore.isLoadingDepartmentOptions;
  readonly isLoadingRoles = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly selectedDialCode = signal('');
  readonly Droplet = Droplet;

  readonly gendersOptions = this.#lookupStore.genders;
  readonly isLoadingGenders = this.#lookupStore.isLoadingGenders;
  readonly staffEmploymentTypeOptions = this.#lookupStore.staffEmploymentTypes;
  readonly isLoadingStaffEmploymentTypes = this.#lookupStore.isLoadingStaffEmploymentTypes;
  readonly staffCategoryOptions = signal<InstitutionStaffCategory[]>([]);
  readonly allJobFamilyOptions = signal<StaffProfessionalMaster[]>([]);
  readonly jobFamilyOptions = signal<StaffProfessionalMaster[]>([]);
  readonly categoryPositionOptions = signal<StaffPositionMaster[]>([]);
  readonly positionOptions = signal<StaffPositionMaster[]>([]);
  readonly isLoadingProfessionalStructure = signal(false);
  readonly isLoadingStaffCategories = signal(false);
  readonly countries = this.#lookupStore.countries;
  readonly isLoadingCountries = this.#lookupStore.isLoadingCountries;
  protected staffMemberForm!: FormGroup<BasicForm>;
  protected loginInfo!: LoginInfo;
  protected today = new Date();
  protected maxDateOfBirth = new Date(
    this.today.getFullYear() - 18,
    this.today.getMonth(),
    this.today.getDate(),
  );

  constructor() {
    const navigationState = this.#router.getCurrentNavigation()?.extras.state;
    this.staffMemberBasic.set(
      this.#dynamicDialogConfig?.data?.staffMemberBasic ?? navigationState?.['staffMemberBasic'],
    );

    this.initForm();

    effect(() => {
      this.isLoadingRoles.set(this.#rolesApi.isLoadingRoles());
      this.roleOptions.set(this.#rolesApi.roles());
    });

    effect(() => {
      // Update dial code when countries load and we have an staffMember with a countryId
      const countryId = this.staffMemberBasic()?.countryId;
      const loadedCountries = this.countries();
      if (countryId && loadedCountries.length > 0) {
        const country = loadedCountries.find((c) => c.id === countryId);
        if (country?.stdCode) {
          this.selectedDialCode.set(country.stdCode);
          this.#updatePhoneValidators(country.countryCode ?? '');

          // Strip dial code from phone fields if they were patched before countries loaded
          const mobile = this.staffMemberForm.controls.mobileNumber.value;
          if (mobile?.startsWith(country.stdCode)) {
            this.staffMemberForm.controls.mobileNumber.setValue(
              mobile.slice(country.stdCode.length),
              {
                emitEvent: false,
              },
            );
          }
          const emergency = this.staffMemberForm.controls.emergencyContactNumber.value;
          if (emergency?.startsWith(country.stdCode)) {
            this.staffMemberForm.controls.emergencyContactNumber.setValue(
              emergency.slice(country.stdCode.length),
              { emitEvent: false },
            );
          }
        }
      }
    });
  }

  async ngOnInit() {
    if (this.isPageMode) {
      const pageTitle = this.staffMemberBasic()?.id ? 'Edit Staff Member' : 'Add Staff Member';
      this.#commonService.setPageHeaderInfo({
        pageTitle,
        pageDescription: this.staffMemberBasic()?.id
          ? 'Update employment, professional assignment and contact information'
          : 'Create a staff account and assign its professional position',
        pageIcon: 'pi pi-user-plus',
        isBreadcrumbShow: true,
      });
      this.#commonService.setBreadcrumbItems([
        { label: 'Staff Directory', routerLink: '/app/staff' },
        { label: pageTitle },
      ]);
    }

    this.loginInfo = await this.#commonService.getLoginInfo();

    if (this.#rolesApi.roles().length === 0) {
      await this.getRoles();
    }

    this.loadProfessionalStructure();

    if (this.staffMemberBasic()?.id) {
      this.patchForm();
    }
  }

  initForm() {
    this.staffMemberForm = this.#fb.group({
      firstName: [
        '',
        [Validators.required, Validators.minLength(3), Validators.pattern(PERSON_NAME_PATTERN)],
      ],
      middleName: ['', [Validators.pattern(PERSON_NAME_PATTERN)]],
      lastName: ['', [Validators.required, Validators.pattern(PERSON_NAME_PATTERN)]],
      dateOfBirth: [this.maxDateOfBirth, Validators.required],
      dateOfOnBoarding: [new Date(), Validators.required],
      dateOfExit: [new Date()],
      genderId: new FormControl<number | undefined>(undefined, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      countryId: new FormControl<number | undefined>(undefined, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      departmentId: new FormControl<number | undefined>(undefined, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      staffEmploymentTypeId: new FormControl<number | undefined>(undefined, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      institutionStaffCategoryMasterId: new FormControl<number | undefined>(undefined, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      staffJobFamilyMasterId: new FormControl<number | undefined>(undefined, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      staffPositionMasterId: new FormControl<number | undefined>(undefined, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      roleId: new FormControl<number | undefined>(undefined, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      officialEmail: ['', [Validators.required, Validators.email]],
      staffMemberDocumentId: [''],
      mobileNumber: [{ value: '', disabled: true }, contactNumberValidator('')],
      emergencyContactPerson: [
        { value: '', disabled: true },
        [
          Validators.minLength(3),
          Validators.maxLength(50),
          Validators.pattern(PERSON_NAME_PATTERN),
        ],
      ],
      emergencyContactNumber: [{ value: '', disabled: true }, contactNumberValidator('')],
      bloodGroup: [{ value: '', disabled: true }],
      relation: [{ value: 0, disabled: true }],
      isMarried: [{ value: false, disabled: false }],
      hasPermanent: [{ value: false, disabled: true }],
      isEditAllowed: [{ value: true, disabled: true }],
      isInfoVerified: [{ value: false, disabled: true }],
      isActive: [{ value: true, disabled: true }],
    });
  }

  async patchForm() {
    const roleTypeId = this.loginInfo?.user?.primaryRole?.roleTypeId;
    const isEdit = this.staffMemberBasic() && this.staffMemberBasic()?.id ? true : false;

    // Disable the following fields if the user is Admin (roleTypeId 1) or HR (roleTypeId 3)
    if (
      isEdit &&
      (roleTypeId === InstitutionRoleTypeId.InstitutionAdministrator ||
        roleTypeId === InstitutionRoleTypeId.StaffManager)
    ) {
      this.staffMemberForm.controls.officialEmail.disable();
      this.staffMemberForm.controls.staffMemberDocumentId.disable();
      this.staffMemberForm.controls.hasPermanent.enable();
      this.staffMemberForm.controls.isEditAllowed.disable();
      this.staffMemberForm.controls.isInfoVerified?.disable();
      this.staffMemberForm.controls.isActive?.disable();
      this.staffMemberForm.controls.mobileNumber?.enable();
      this.staffMemberForm.controls.emergencyContactPerson?.enable();
      this.staffMemberForm.controls.emergencyContactNumber?.enable();
      this.staffMemberForm.controls.bloodGroup?.enable();
      this.staffMemberForm.controls.relation?.enable();
      this.staffMemberForm.controls.roleId?.enable();
      this.staffMemberForm.controls.roleId.clearValidators();
      this.staffMemberForm.controls.roleId.updateValueAndValidity();
      this.staffMemberForm.controls.countryId.disable();
    }

    // Disable the following fields if the user is an StaffMember (roleTypeId 2)
    if (isEdit && roleTypeId === InstitutionRoleTypeId.StaffMember) {
      this.staffMemberForm.controls.officialEmail.disable();
      this.staffMemberForm.controls.departmentId?.disable();
      this.staffMemberForm.controls.staffEmploymentTypeId.disable();
      this.staffMemberForm.controls.institutionStaffCategoryMasterId.disable();
      this.staffMemberForm.controls.staffJobFamilyMasterId.disable();
      this.staffMemberForm.controls.staffPositionMasterId.disable();
      this.staffMemberForm.controls.dateOfExit.disable();
      this.staffMemberForm.controls.hasPermanent.disable();
      this.staffMemberForm.controls.isEditAllowed.disable();
      this.staffMemberForm.controls.isInfoVerified?.disable();
      this.staffMemberForm.controls.isActive?.disable();
      this.staffMemberForm.controls.roleId?.disable();
      this.staffMemberForm.controls.roleId.clearValidators();
      this.staffMemberForm.controls.roleId.updateValueAndValidity();
      this.staffMemberForm.controls.countryId.disable();
    }

    const role = this.roleOptions().find((r) => r.id === this.staffMemberBasic()?.roleId);

    const country = this.countries().find((c) => c.id === this.staffMemberBasic()?.countryId);
    const dialCode = country?.stdCode ?? '';
    this.selectedDialCode.set(dialCode);
    this.#updatePhoneValidators(country?.countryCode ?? '');

    this.staffMemberForm.patchValue({
      firstName: this.staffMemberBasic()?.firstName,
      middleName: this.staffMemberBasic()?.middleName,
      lastName: this.staffMemberBasic()?.lastName,
      dateOfBirth: new Date(this.staffMemberBasic()?.dateOfBirth ?? new Date()),
      dateOfOnBoarding: this.staffMemberBasic()?.dateOfOnBoarding
        ? new Date(String(this.staffMemberBasic()?.dateOfOnBoarding))
        : new Date(),
      dateOfExit: new Date(this.staffMemberBasic()?.dateOfExit ?? new Date()),
      genderId: this.staffMemberBasic()?.genderId,
      countryId: this.staffMemberBasic()?.countryId,
      officialEmail: this.staffMemberBasic()?.officialEmail,
      departmentId: this.staffMemberBasic()?.departmentId,
      staffEmploymentTypeId: this.staffMemberBasic()?.staffEmploymentTypeId,
      institutionStaffCategoryMasterId: this.staffMemberBasic()?.institutionStaffCategoryMasterId,
      staffJobFamilyMasterId: this.staffMemberBasic()?.professionalProfile?.staffJobFamilyMasterId,
      staffPositionMasterId: this.staffMemberBasic()?.professionalProfile?.staffPositionMasterId,
      roleId: role?.id,
      hasPermanent: this.staffMemberBasic()?.hasPermanent,
      isEditAllowed: this.staffMemberBasic()?.isEditAllowed,
      isInfoVerified: this.staffMemberBasic()?.isInfoVerified,
      isActive: this.staffMemberBasic()?.isActive,
      mobileNumber: this.#stripDialCode(this.staffMemberBasic()?.mobileNumber, dialCode),
      emergencyContactPerson: this.staffMemberBasic()?.emergencyContactPerson,
      emergencyContactNumber: this.#stripDialCode(
        this.staffMemberBasic()?.emergencyContactNumber,
        dialCode,
      ),
      bloodGroup: this.staffMemberBasic()?.bloodGroup,
      relation: this.staffMemberBasic()?.relation,
      isMarried: this.staffMemberBasic()?.isMarried,
    });
  }

  isInvalid(controlName: string) {
    const control = this.staffMemberForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onDepartmentChange(departmentId: string): void {
    const selectedPosition = this.categoryPositionOptions().find(
      (position) => position.id === this.staffMemberForm.controls.staffPositionMasterId.value,
    );
    if (selectedPosition?.departmentId && selectedPosition.departmentId !== Number(departmentId)) {
      this.staffMemberForm.controls.staffPositionMasterId.setValue(undefined);
    }
    this.filterPositions(this.staffMemberForm.controls.staffJobFamilyMasterId.value);
  }

  onStaffCategoryChange(institutionStaffCategoryMasterId: number): void {
    this.staffMemberForm.controls.staffJobFamilyMasterId.setValue(undefined);
    this.staffMemberForm.controls.staffPositionMasterId.setValue(undefined);
    this.loadPositions(institutionStaffCategoryMasterId);
  }

  onJobFamilyChange(jobFamilyId: number): void {
    this.staffMemberForm.controls.staffPositionMasterId.setValue(undefined);
    this.filterPositions(jobFamilyId);
  }

  private loadProfessionalStructure(): void {
    this.isLoadingProfessionalStructure.set(true);
    this.isLoadingStaffCategories.set(true);
    this.#professionalApi
      .getCategories()
      .pipe(
        finalize(() => this.isLoadingStaffCategories.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response) =>
          this.staffCategoryOptions.set(response.isSucceeded ? response.data : []),
        error: (error) => this.#commonService.showMessage(error.message, 'error'),
      });
    this.#professionalApi
      .getMasters(StaffProfessionalMasterType.JobFamily)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.allJobFamilyOptions.set(response.isSucceeded ? response.data : []);
          this.loadPositions(
            this.staffMemberForm.controls.institutionStaffCategoryMasterId.value,
            this.staffMemberForm.controls.staffJobFamilyMasterId.value,
          );
        },
        error: (error) => this.#commonService.showMessage(error.message, 'error'),
      });
  }

  private loadPositions(institutionStaffCategoryMasterId?: number, jobFamilyId?: number): void {
    this.#professionalApi
      .getPositions(institutionStaffCategoryMasterId)
      .pipe(
        finalize(() => this.isLoadingProfessionalStructure.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response) => {
          const positions = response.isSucceeded ? response.data : [];
          this.categoryPositionOptions.set(positions);
          const availableFamilyIds = new Set(
            positions.map((position) => position.staffJobFamilyMasterId),
          );
          this.jobFamilyOptions.set(
            this.allJobFamilyOptions().filter((family) => availableFamilyIds.has(family.id)),
          );
          this.filterPositions(jobFamilyId);
        },
        error: (error) => this.#commonService.showMessage(error.message, 'error'),
      });
  }

  private filterPositions(jobFamilyId?: number): void {
    this.positionOptions.set(
      jobFamilyId
        ? this.categoryPositionOptions().filter(
            (position) =>
              position.staffJobFamilyMasterId === jobFamilyId &&
              (!position.departmentId ||
                position.departmentId === Number(this.staffMemberForm.controls.departmentId.value)),
          )
        : [],
    );
  }

  async getRoles() {
    const info = this.loginInfo?.user;
    if (!info) return;
    const body: GetRolesReq = {
      UserStaffMemberId: info.staffMemberId,
      IsActive: true,
    };

    this.#rolesApi.setIsLoadingRoles(true);
    this.#rolesApi
      .getRoleOptions(body)
      .pipe(
        finalize(() => this.#rolesApi.setIsLoadingRoles(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#rolesApi.setRoles(res.isSucceeded ? res.data : []);
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  async onCreate() {
    if (this.staffMemberForm.invalid) return;

    const roleTypeId = this.loginInfo?.user?.primaryRole?.roleTypeId;
    if (!this.staffMemberBasic()?.id) {
      this.processCreateStaffMember();
    } else if (
      this.staffMemberBasic()?.id &&
      (roleTypeId === InstitutionRoleTypeId.InstitutionAdministrator ||
        roleTypeId === InstitutionRoleTypeId.StaffManager)
    ) {
      this.processUpdateByAdminHR();
    } else {
      this.processUpdateByStaffMember();
    }
  }

  processCreateStaffMember() {
    const form = this.staffMemberForm.getRawValue();
    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) return;

    const body: CreateStaffMemberReq = {
      firstName: form.firstName?.trim() ?? '',
      middleName: form.middleName?.trim() ?? undefined,
      lastName: form.lastName?.trim() ?? '',
      dateOfBirth: form.dateOfBirth ? form.dateOfBirth.toISOString() : '',
      dateOfOnBoarding: form.dateOfOnBoarding ? form.dateOfOnBoarding.toISOString() : '',
      officialEmail: form.officialEmail?.trim() || '',
      departmentId: Number(form.departmentId) || 0,
      staffEmploymentTypeId: Number(form.staffEmploymentTypeId) || 0,
      institutionStaffCategoryMasterId: Number(form.institutionStaffCategoryMasterId) || 0,
      staffPositionMasterId: Number(form.staffPositionMasterId) || 0,
      roleId: Number(form.roleId) || 0,
      genderId: Number(form.genderId) || 0,
      userStaffMemberId: sessionUser?.staffMemberId,
      staffMemberDocumentId: Number(form.staffMemberDocumentId) || 0,
      countryId: Number(form.countryId) || 0,
      isActive: true,
      hasPermanent: false,
    };

    this.isSaving.set(true);
    this.#staffMemberApi
      .createStaffMember(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: async (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.finish(res);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  processUpdateByAdminHR() {
    const queryStaffMemberId = this.#route.snapshot.queryParamMap.get('staffMemberId');
    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) return;
    const form = this.staffMemberForm.getRawValue();

    const body: UpdateStaffMemberOfficialReq = {
      userStaffMemberId: sessionUser.staffMemberId,
      staffMemberId: queryStaffMemberId ?? sessionUser.staffMemberId,
      firstName: form.firstName?.trim() || '',
      middleName: form.middleName?.trim() || '',
      lastName: form.lastName?.trim() || '',
      departmentId: form.departmentId || 0,
      staffEmploymentTypeId: form.staffEmploymentTypeId || 0,
      institutionStaffCategoryMasterId: form.institutionStaffCategoryMasterId || 0,
      staffPositionMasterId: form.staffPositionMasterId || 0,
      genderId: form.genderId || 0,
      countryId: form.countryId || 0,
      dateOfBirth: form.dateOfBirth ? form.dateOfBirth.toISOString() : '',
      dateOfOnBoarding: form.dateOfOnBoarding ? form.dateOfOnBoarding.toISOString() : '',
      dateOfExit: form.dateOfExit ? form.dateOfExit.toISOString() : '',
      isMarried: form.isMarried ?? false,
      isEditAllowed: form.isEditAllowed,
      isInfoVerified: form.isInfoVerified,
      isActive: form.isActive,
      hasPermanent: form.hasPermanent,
      mobileNumber: this.#prependDialCode(form.mobileNumber),
      emergencyContactPerson: form.emergencyContactPerson?.trim() || '',
      emergencyContactNumber: this.#prependDialCode(form.emergencyContactNumber),
      bloodGroup: form.bloodGroup?.trim() || '',
      relation: Number(form.relation) || 0,
      description: '',
      remark: '',
    };

    this.isSaving.set(true);
    this.#staffMemberBasicAPI
      .updateStaffMemberOfficialBasics(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: async (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#staffMemberBasicAPI.updateStaffMemberOfficialSignal(body, this.gendersOptions());
            this.finish(res);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  processUpdateByStaffMember() {
    const queryStaffMemberId = this.#route.snapshot.queryParamMap.get('staffMemberId');

    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) return;
    const form = this.staffMemberForm.getRawValue();

    const body: UpdateStaffMemberBasicReq = {
      userStaffMemberId: sessionUser.staffMemberId,
      staffMemberId: queryStaffMemberId ?? sessionUser.staffMemberId,
      firstName: form.firstName?.trim() || '',
      middleName: form.middleName?.trim() || '',
      lastName: form.lastName?.trim() || '',
      dateOfBirth: form.dateOfBirth?.toISOString() ?? '',
      genderId: form.genderId || 0,
      isMarried: form.isMarried ?? false,
      mobileNumber: this.staffMemberBasic()?.mobileNumber ?? '',
      emergencyContactPerson: form.emergencyContactPerson?.trim() || '',
      emergencyContactNumber: this.staffMemberBasic()?.emergencyContactNumber?.toString() || '',
      bloodGroup: this.staffMemberBasic()?.bloodGroup || '',
      relation: Number(this.staffMemberBasic()?.relation) || 0,
      description: '',
      remark: '',
    };

    this.isSaving.set(true);
    this.#staffMemberBasicAPI
      .updateStaffMemberBasics(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: async (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#staffMemberBasicAPI.updateStaffMemberBasicSignal(body, this.gendersOptions());
            this.finish(res);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  onCountryChange(countryId: number) {
    const country = this.countries().find((c) => c.id === countryId);
    this.selectedDialCode.set(country?.stdCode ?? '');
    this.#updatePhoneValidators(country?.countryCode ?? '');
  }

  onCancel(): void {
    this.finish();
  }

  private finish(result?: unknown): void {
    if (this.#dialogRef) {
      this.#dialogRef.close(result);
      return;
    }
    void this.#router.navigate(['/app/staff']);
  }

  #updatePhoneValidators(countryCode: string) {
    const validator = contactNumberValidator(countryCode);

    const mobileCtrl = this.staffMemberForm.controls.mobileNumber;
    mobileCtrl.setValidators(validator);
    mobileCtrl.updateValueAndValidity();

    const emergencyCtrl = this.staffMemberForm.controls.emergencyContactNumber;
    emergencyCtrl.setValidators(validator);
    emergencyCtrl.updateValueAndValidity();
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
}
