import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type FieldTree,
  form,
  FormField,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { MessageModule } from '@openng/optimus-ui/message';
import { finalize } from 'rxjs';

import { Common } from '@core/services/common';
import { InstitutionDeviceConfigurationApi } from '@core/services/institution-device-configuration-api';
import { showFieldError } from '@shared/utilities/field-error';

import {
  ReplaceGatewayUrlModel,
  replaceGatewayUrlSchema,
} from './replace-gateway-url-dialog.schema';

export interface ReplaceGatewayUrlDialogData {
  institutionId: string;
  institutionDeviceId: string;
  /** The device's own web-console password, held by the settings page for the length of a push. */
  currentWebServerPassword: string | null;
  deviceName?: string | null;
}

/**
 * Queues a remote HTTPS gateway-address change.
 *
 * Deliberately not the same action as `RotateGatewayUrlDialog`, and not a variant of it: rotating
 * revokes the old address at once and hands a technician a new URL to type into the device. This
 * queues a *pending* address through the still-active gateway and promotes it only after the device
 * polls it, so nothing breaks if the device is offline. The replacement URL never reaches the
 * browser, which is why this dialog closes on success instead of showing a result the way the
 * rotate dialog does.
 */
@Component({
  selector: 'app-replace-gateway-url-dialog',
  imports: [FormField, ButtonModule, InputNumberModule, MessageModule],
  templateUrl: './replace-gateway-url-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReplaceGatewayUrlDialog {
  readonly #configurationApi = inject(InstitutionDeviceConfigurationApi);
  readonly #commonService = inject(Common);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);

  readonly #data = this.#dialogConfig.data as ReplaceGatewayUrlDialogData | undefined;

  protected readonly deviceName = this.#data?.deviceName || 'this device';
  protected readonly isSaving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly model = signal<ReplaceGatewayUrlModel>({ replacementLifetimeMinutes: 30 });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, replaceGatewayUrlSchema);
  });

  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
  }

  onSubmit(): void {
    if (this.isSaving() || !this.#data) {
      return;
    }

    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) {
      return;
    }

    submit(this.f, async () => {
      this.isSaving.set(true);

      this.#configurationApi
        .replaceHttpsGatewayUrl({
          institutionId: this.#data!.institutionId,
          institutionDeviceId: this.#data!.institutionDeviceId,
          currentWebServerPassword: this.#data!.currentWebServerPassword,
          // The schema has already ruled out null; the fallback only narrows the type.
          replacementLifetimeMinutes: this.model().replacementLifetimeMinutes ?? 30,
        })
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            if (res.isSucceeded) {
              this.#dialogRef.close(true);
            }
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}
