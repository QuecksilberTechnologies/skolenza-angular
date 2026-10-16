import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { Baby, HeartCrack, LucideAngularModule, TreePalm, User } from 'lucide-angular';
import { finalize } from 'rxjs';

import { Common, LeaveTypes } from '@core/services';
import {
  AddLeaveTypeRequest,
  ILeaveType,
  ILeaveTypeIcon,
  LeaveTypeForm,
  LoginInfo,
  UpdateLeaveTypeRequest,
} from '@shared/interfaces';

@Component({
  selector: 'app-leave-types-manage-dialog',
  imports: [
    ButtonModule,
    TextareaModule,
    InputTextModule,
    ReactiveFormsModule,
    SelectModule,
    MessageModule,
    LucideAngularModule,
  ],
  templateUrl: './leave-types-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveTypesManageDialog {
  readonly #commonService = inject(Common);
  readonly #leaveTypesService = inject(LeaveTypes);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(FormBuilder);
  protected leaveTypeForm!: FormGroup;
  protected leaveType!: ILeaveType;
  protected isSubmitting = signal(false);
  protected typeIcons = signal<ILeaveTypeIcon[]>([]);

  constructor() {
    this.typeIcons.set([
      { iconName: 'TreePalm', icon: TreePalm },
      { iconName: 'HeartCrack', icon: HeartCrack },
      { iconName: 'User', icon: User },
      { iconName: 'Baby', icon: Baby },
    ]);

    this.leaveType = this.#dynamicDialogConfig.data.leaveType;

    this.leaveTypeForm = this.#fb.group({
      typeName: [this.leaveType?.leaveName || null, [Validators.required, Validators.minLength(3)]],
      description: [this.leaveType?.description],
      leaveTypeIcon: '',
    });
  }

  isInvalid(controlName: string) {
    const control = this.leaveTypeForm.get(controlName);
    return control?.invalid && control.touched;
  }

  async onSubmit() {
    const loginInfo = await this.#commonService.getLoginInfo();
    const formValue = this.leaveTypeForm.value;
    if (this.leaveType?.id) {
      this.updateType(formValue, loginInfo);
    } else {
      this.addType(formValue, loginInfo);
    }
  }

  addType(form: LeaveTypeForm, loginInfo: LoginInfo) {
    const sessionUser = loginInfo?.user;
    if (!sessionUser) return;
    const body: AddLeaveTypeRequest = {
      staffMemberId: sessionUser?.staffMemberId,
      roleId: +(sessionUser?.primaryRole?.roleId ?? 0),
      leaveName: form.typeName,
      description: form.description,
      uploadIcon: form.leaveTypeIcon,
      isActive: true,
    };

    this.isSubmitting.set(true);
    this.#leaveTypesService
      .createLeaveType(body)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          this.#commonService.showMessage('Leave type added successfully', 'success');
          this.#dialogRef.close(true);
        },
        error: (error) => this.#commonService.showMessage(error.message, 'error'),
      });
  }

  updateType(form: LeaveTypeForm, loginInfo: LoginInfo) {
    const sessionUser = loginInfo?.user;
    if (!sessionUser) return;
    const body: UpdateLeaveTypeRequest = {
      staffMemberId: sessionUser?.staffMemberId,
      roleId: +(sessionUser?.primaryRole?.roleId ?? 0),
      id: this.leaveType?.id,
      leaveName: form.typeName,
      description: form.description,
      uploadIcon: form.leaveTypeIcon,
      isActive: true,
    };

    this.isSubmitting.set(true);
    this.#leaveTypesService
      .updateLeaveType(body)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          this.#commonService.showMessage('Leave type updated successfully', 'success');
          this.#dialogRef.close(true);
        },
        error: (error) => this.#commonService.showMessage(error.message, 'error'),
      });
  }

  onCancel() {
    this.#dialogRef.close();
  }
}
