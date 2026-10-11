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
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';

import { Common, PolicyMappingLeaveTypeApi } from '@core/services';
import { LookupStore } from '@core/stores';
import {
  IPolicyMappingLeaveType,
  LoginInfo,
  PolicyLeaveTypeMapForm,
  PolicyMappingLeaveTypeMapRequest,
  PolicyType,
} from '@shared/interfaces';

import { LeaveStore } from '../../../leaves/leave.store';

@Component({
  selector: 'app-leave-type-mapping-dialog',
  imports: [
    ButtonModule,
    TextareaModule,
    InputTextModule,
    ReactiveFormsModule,
    SelectModule,
    CheckboxModule,
    MessageModule,
    DatePickerModule,
    LucideAngularModule,
    // JsonPipe,
  ],
  templateUrl: './leave-type-mapping-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveTypeMappingDialog implements OnInit {
  readonly #policyMappingLeaveTypeService = inject(PolicyMappingLeaveTypeApi);
  readonly #leaveStore = inject(LeaveStore);
  // readonly #policyTypeApi = inject(PolicyTypeApi);
  readonly #lookupStore = inject(LookupStore);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(FormBuilder);
  protected policyLeaveTypeMapForm!: FormGroup;
  protected policyTypes = signal<PolicyType[]>([]);
  readonly leaveTypes = this.#leaveStore.leaveTypes;
  protected genders = this.#lookupStore.genders;
  protected isLoadingPolicyTypes = signal(false);
  readonly isLoadingLeaveTypes = this.#leaveStore.isLoadingTypes;
  protected isLoadingGenders = this.#lookupStore.isLoadingGenders;
  protected isSaving = signal(false);
  protected policyMappingLeaveType?: IPolicyMappingLeaveType;
  protected loginInfo!: LoginInfo;

  constructor() {
    this.policyMappingLeaveType = this.#dynamicDialogConfig.data.policyMappingLeaveType;
    this.initForm();

    // effect(() => {
    //   this.policyTypes.set(this.#policyTypeApi.policyTypes());
    // });

    effect(() => {
      if (this.isLoadingPolicyTypes()) {
        this.policyLeaveTypeMapForm.get('policyTypeId')?.disable();
      } else {
        this.policyLeaveTypeMapForm.get('policyTypeId')?.enable();
      }
    });

    effect(() => {
      if (this.isLoadingLeaveTypes()) {
        this.policyLeaveTypeMapForm.get('leaveTypeId')?.disable();
      } else {
        this.policyLeaveTypeMapForm.get('leaveTypeId')?.enable();
      }
    });

    effect(() => {
      if (this.isLoadingGenders()) {
        this.policyLeaveTypeMapForm.get('applicableGenderId')?.disable();
      } else {
        this.policyLeaveTypeMapForm.get('applicableGenderId')?.enable();
      }
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    // this.fetchPolicyTypes();
    this.#leaveStore.loadLeaveTypes();
  }

  initForm() {
    this.policyLeaveTypeMapForm = this.#fb.group({
      policyTypeId: [null, [Validators.required]],
      leaveTypeId: [null, [Validators.required]],
      applicableGenderId: 0,
      isMarriedApplicable: true,
      totalLeavesPerYear: 0,
      monthlyAccrual: true,
      carryForward: true,
      maxCarryForward: 0,
      carryForwardExpiryMonths: 0,
      encashable: true,
      maxEncashable: 0,
      isProofRequired: true,
      proofDocumentType: '',
      effectiveFrom: [new Date()],
      effectiveTo: [new Date()],
      remark: '',
    });
  }

  isInvalid(controlName: string) {
    const control = this.policyLeaveTypeMapForm.get(controlName);
    return control?.invalid && control.touched;
  }

  // async fetchPolicyTypes() {
  //   const loginInfo = await this.#commonService.getLoginInfo();
  //   const sessionUser = loginInfo?.user;
  //   const staffMemberId = sessionUser?.staffMemberId;
  //   const authRoleId = +sessionUser?.primaryRole?.roleId;

  //   this.isLoadingPolicyTypes.set(true);
  //   this.#policyTypeApi
  //     .getPolicyTypes(staffMemberId, 0, authRoleId)
  //     .pipe(
  //       finalize(() => this.isLoadingPolicyTypes.set(false)),
  //       takeUntilDestroyed(this.#destroyRef),
  //     )
  //     .subscribe({
  //       next: (rs) => {
  //         this.#policyTypeApi.setPolicyTypes(rs.data);
  //       },
  //       error: (err) => {
  //         this.#commonService.showMessage(err.message, 'error');
  //       },
  //     });
  // }

  async onSubmit() {
    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) return;
    const staffMemberId = sessionUser?.staffMemberId;
    const staffEmploymentTypeId = +sessionUser?.staffEmploymentTypeId;
    const authRoleId = +(sessionUser?.primaryRole?.roleId ?? 0);

    const form: PolicyLeaveTypeMapForm = this.policyLeaveTypeMapForm.value;

    const body: PolicyMappingLeaveTypeMapRequest = {
      roleId: authRoleId,
      staffMemberId: staffMemberId,
      //   institutionId: userInfo.user.institutionId,
      policyTypeId: form.policyTypeId,
      leaveTypeId: form.leaveTypeId,
      staffEmploymentTypeId: staffEmploymentTypeId,
      applicableGenderId: form.applicableGenderId,
      isMarriedApplicable: form.isMarriedApplicable,
      totalLeavesPerYear: form.totalLeavesPerYear,
      monthlyAccrual: form.monthlyAccrual,
      carryForward: form.carryForward,
      maxCarryForward: form.maxCarryForward,
      carryForwardExpiryMonths: form.carryForwardExpiryMonths,
      encashable: form.encashable,
      maxEncashable: form.maxEncashable,
      isProofRequired: form.isProofRequired,
      proofDocumentType: form.proofDocumentType,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo,
      isActive: true,
      remark: form.remark,
    };

    this.isSaving.set(true);
    this.#policyMappingLeaveTypeService
      .mapPolicyMappingLeaveType(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (rs) => {
          this.#dialogRef.close(rs);
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
