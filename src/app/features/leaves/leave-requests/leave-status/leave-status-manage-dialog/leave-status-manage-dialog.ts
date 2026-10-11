import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { ColorPickerModule } from '@openng/optimus-ui/colorpicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { TextareaModule } from '@openng/optimus-ui/textarea';

import { Common } from '@core/services';
import { ILeaveStatus, LeaveStatusForm, LoginInfo } from '@shared/interfaces';

@Component({
  selector: 'app-leave-status-manage-dialog',
  imports: [
    ButtonModule,
    TextareaModule,
    InputTextModule,
    ColorPickerModule,
    ReactiveFormsModule,
    MessageModule,
  ],
  templateUrl: './leave-status-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveStatusManageDialog {
  readonly #commonService = inject(Common);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(FormBuilder);
  protected leaveStatusForm!: FormGroup;
  protected leaveStatus!: ILeaveStatus;
  protected isSubmitting = signal(false);

  constructor() {
    this.leaveStatus = this.#dynamicDialogConfig.data.leaveStatus;

    this.leaveStatusForm = this.#fb.group({
      statusName: [
        this.leaveStatus?.statusName || null,
        [Validators.required, Validators.minLength(3)],
      ],
      color: ['#000000', Validators.required],
      description: [this.leaveStatus?.description || '', [Validators.required]],
    });
  }

  isInvalid(controlName: string) {
    const control = this.leaveStatusForm.get(controlName);
    return control?.invalid && control.touched;
  }

  async onSubmit() {
    const loginInfo = await this.#commonService.getLoginInfo();
    const formValue = this.leaveStatusForm.value;
    if (this.leaveStatus?.id) {
      this.updateStatus(formValue, loginInfo);
    } else {
      this.addStatus(formValue, loginInfo);
    }
  }

  // BACKEND PENDING — wire to /Leave/add-leave-status when available
  addStatus(form: LeaveStatusForm, loginInfo: LoginInfo) {
    void form;
    void loginInfo;
    this.#commonService.showMessage('Add leave status API not yet available', 'info');
  }

  // BACKEND PENDING — wire to /Leave/update-leave-status when available
  updateStatus(form: LeaveStatusForm, loginInfo: LoginInfo) {
    void form;
    void loginInfo;
    this.#commonService.showMessage('Update leave status API not yet available', 'info');
  }

  onCancel() {
    this.#dialogRef.close();
  }
}
