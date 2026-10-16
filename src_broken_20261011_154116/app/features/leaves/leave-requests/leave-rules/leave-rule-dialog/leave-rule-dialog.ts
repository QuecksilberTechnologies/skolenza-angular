import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { finalize } from 'rxjs';

import { Common, LeaveRule } from '@core/services';
import {
  CreateLeaveRuleRequest,
  ILeaveRule,
  LeaveRuleForm,
  LoginInfo,
  UpdateLeaveRuleRequest,
} from '@shared/interfaces';

import { LeaveStore } from '../../../leave.store';

@Component({
  selector: 'app-leave-rule-dialog',
  imports: [
    ReactiveFormsModule,
    TextareaModule,
    InputTextModule,
    MessageModule,
    ButtonModule,
    CheckboxModule,
    SelectModule,
  ],
  templateUrl: './leave-rule-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveRuleDialog implements OnInit {
  readonly #commonService = inject(Common);
  readonly #leaveStore = inject(LeaveStore);
  readonly #leaveRuleService = inject(LeaveRule);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(FormBuilder);
  readonly leaveRule!: ILeaveRule;
  readonly leaveTypes = this.#leaveStore.leaveTypes;
  readonly isLoadingLeaveTypes = this.#leaveStore.isLoadingTypes;
  readonly isSaving = signal(false);
  protected leaveRuleForm!: FormGroup;

  constructor() {
    this.leaveRule = this.#dynamicDialogConfig.data.leaveRule;
  }

  ngOnInit() {
    this.initForm();

    if (this.leaveRule?.id) {
      this.patchForm();
    }
  }

  initForm() {
    this.leaveRuleForm = this.#fb.group({
      policyLeaveTypeId: ['', [Validators.required]],
      applySandwichRule: [false],
      isHalfDayAllowed: [false],
      halfDayNoticeHours: [0],
      noticePeriodDays: [0],
      maxContinuousLeaves: [0],
      minGapBetweenLeaves: [0],
      remark: [''],
    });
  }

  isInvalid(controlName: string) {
    const control = this.leaveRuleForm.get(controlName);
    return control?.invalid && control.touched;
  }

  patchForm() {
    // TODO: map leaveRule fields to form once API response shape is confirmed
  }

  async onSubmit() {
    const loginInfo = await this.#commonService.getLoginInfo();
    const formValue = this.leaveRuleForm.value;

    if (this.leaveRule?.id) {
      this.updateLeaveRule(formValue, loginInfo);
    } else {
      this.addLeaveRule(formValue, loginInfo);
    }
  }

  addLeaveRule(form: LeaveRuleForm, loginInfo: LoginInfo) {
    const staffMemberId = loginInfo.user?.staffMemberId ?? '';

    const body: CreateLeaveRuleRequest = {
      staffMemberId,
      policyLeaveTypeId: +form.policyLeaveTypeId,
      applySandwichRule: form.applySandwichRule,
      isHalfDayAllowed: form.isHalfDayAllowed,
      halfDayNoticeHours: form.halfDayNoticeHours,
      noticePeriodDays: form.noticePeriodDays,
      maxContinuousLeaves: form.maxContinuousLeaves,
      minGapBetweenLeaves: form.minGapBetweenLeaves,
      remark: form.remark,
      isActive: true,
    };

    this.isSaving.set(true);
    this.#leaveRuleService
      .createLeaveRule(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          this.#commonService.showMessage('Leave rule added successfully', 'success');
          this.#dialogRef.close(true);
        },
        error: (error) => this.#commonService.showMessage(error.message, 'error'),
      });
  }

  updateLeaveRule(form: LeaveRuleForm, loginInfo: LoginInfo) {
    const staffMemberId = loginInfo.user?.staffMemberId ?? '';

    const body: UpdateLeaveRuleRequest = {
      staffMemberId,
      policyLeaveTypeId: +form.policyLeaveTypeId,
      applySandwichRule: form.applySandwichRule,
      isHalfDayAllowed: form.isHalfDayAllowed,
      halfDayNoticeHours: form.halfDayNoticeHours,
      noticePeriodDays: form.noticePeriodDays,
      maxContinuousLeaves: form.maxContinuousLeaves,
      minGapBetweenLeaves: form.minGapBetweenLeaves,
      remark: form.remark,
      isActive: true,
    };

    this.isSaving.set(true);
    this.#leaveRuleService
      .updateLeaveRule(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          this.#commonService.showMessage('Leave rule updated successfully', 'success');
          this.#dialogRef.close(true);
        },
        error: (error) => this.#commonService.showMessage(error.message, 'error'),
      });
  }

  onCancel() {
    this.#dialogRef.close();
  }
}
