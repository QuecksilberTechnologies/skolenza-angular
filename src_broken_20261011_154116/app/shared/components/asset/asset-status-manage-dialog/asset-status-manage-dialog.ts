import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { ColorPickerModule } from '@openng/optimus-ui/colorpicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputGroupModule } from '@openng/optimus-ui/inputgroup';
import { InputGroupAddonModule } from '@openng/optimus-ui/inputgroupaddon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { finalize } from 'rxjs';

import { AssetStatusApi } from '@core/services/asset-status-api';
import { Common } from '@core/services/common';
import {
  AssetStatus,
  AssetStatusForm,
  CreateAssetStatusRequest,
  UpdateAssetStatusRequest,
} from '@shared/interfaces';

@Component({
  selector: 'app-asset-status-manage-dialog',
  imports: [
    ButtonModule,
    TextareaModule,
    InputTextModule,
    ReactiveFormsModule,
    MessageModule,
    AutoFocusModule,
    ColorPickerModule,
    InputGroupModule,
    InputGroupAddonModule,
  ],
  templateUrl: './asset-status-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetStatusManageDialog {
  readonly #commonService = inject(Common);
  readonly #assetStatusApi = inject(AssetStatusApi);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(FormBuilder);
  protected assetStatusForm!: FormGroup;
  protected assetStatus!: AssetStatus;
  protected isSubmitting = signal(false);

  constructor() {
    this.assetStatus = this.#dynamicDialogConfig.data.assetStatus;
    this.assetStatusForm = this.#fb.group({
      statusName: [
        this.assetStatus?.statusName || '',
        [Validators.required, Validators.minLength(3)],
      ],
      color: [this.assetStatus?.colorKey || '#777777'],
      description: [this.assetStatus?.description || ''],
    });
  }

  onColorInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.assetStatusForm.controls['color'].setValue(value);
  }

  async onSubmit() {
    const formValue = this.assetStatusForm.value;
    if (this.assetStatus?.id) {
      this.updateStatus(formValue);
    } else {
      this.addStatus(formValue);
    }
  }

  addStatus(form: AssetStatusForm) {
    const body: CreateAssetStatusRequest = {
      statusName: form.statusName,
      colorKey: form.color,
      description: form.description,
    };

    this.isSubmitting.set(true);
    this.#assetStatusApi
      .createAssetStatus(body)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#dialogRef.close(res);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  updateStatus(form: AssetStatusForm) {
    const body: UpdateAssetStatusRequest = {
      id: this.assetStatus.id,
      statusName: form.statusName,
      colorKey: form.color,
      description: form.description,
      isActive: true,
    };

    this.isSubmitting.set(true);
    this.#assetStatusApi
      .updateAssetStatus(body)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#dialogRef.close(res);
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
