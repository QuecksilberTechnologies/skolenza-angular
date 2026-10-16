import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { finalize } from 'rxjs';

import { Common, InstitutionDeviceConfigurationApi } from '@core/services';
import { FormNumber } from '@shared/components/form-inputs/form-number/form-number';
import { BootstrapUrlData, InstitutionDeviceRow } from '@shared/interfaces';

import { DeviceBootstrapModel, deviceBootstrapSchema } from './device-bootstrap-dialog.schema';

/** Long enough for a Host to walk to the hardware, short enough to be a sane default. */
const DEFAULT_LIFETIME_MINUTES = 120;

/**
 * Issues the one-time gateway URL a factory-fresh device needs to reach Skolenza for the first time.
 *
 * Two phases in one component: the lifetime form, then the credential. The result replaces the form
 * rather than closing the dialog, because the API returns the URL exactly once and the Host has to
 * transcribe it into the device's own console by hand — closing on success would destroy it.
 *
 * `moduleId` / `operationId` are not sent from here: `moduleOperationInterceptor` resolves them for
 * `POST /InstitutionDeviceConfiguration/issue-bootstrap-url` off the `/InstitutionDeviceConfiguration`
 * controller fallback.
 */
@Component({
  selector: 'app-device-bootstrap-dialog',
  imports: [ButtonModule, TooltipModule, FormNumber],
  templateUrl: './device-bootstrap-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceBootstrapDialog {
  readonly #configurationApi = inject(InstitutionDeviceConfigurationApi);
  readonly #commonService = inject(Common);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #clipboard = inject(Clipboard);

  protected readonly device = this.#dialogConfig.data?.device as InstitutionDeviceRow | undefined;

  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);
  /** Non-null once the URL has been issued — the dialog's second phase. */
  protected readonly result = signal<BootstrapUrlData | null>(null);
  protected readonly hasCopied = signal(false);

  protected readonly model = signal<DeviceBootstrapModel>({
    lifetimeMinutes: DEFAULT_LIFETIME_MINUTES,
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, deviceBootstrapSchema);
  });

  protected expiresOn(value: string | null): string {
    return value ? this.#commonService.getFormattedDate(value, 'dd MMM yyyy, HH:mm') : '';
  }

  onSubmit(): void {
    if (this.isSaving()) return;

    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) return;

    const deviceMasterId = this.device?.deviceMasterId;
    if (!deviceMasterId) {
      this.#commonService.showMessage('This device has no hardware record to set up.', 'error');
      return;
    }

    submit(this.f, async () => {
      const { lifetimeMinutes } = this.model();
      this.isSaving.set(true);

      this.#configurationApi
        .issueBootstrapUrl({ deviceMasterId, lifetimeMinutes: lifetimeMinutes as number })
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            if (res.isSucceeded && res.data) {
              this.result.set(res.data);
              return;
            }
            // Stay on the form: the Host can retry without losing the lifetime they picked.
            this.#commonService.showMessage(res.message, 'error');
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  copyUrl(url: string | null): void {
    if (!url) return;

    this.#clipboard.copy(url);
    this.hasCopied.set(true);
    this.#commonService.showMessage('Gateway URL copied. Enter it in the device now.', 'success');
  }

  onClose(): void {
    this.#dialogRef.close();
  }
}
