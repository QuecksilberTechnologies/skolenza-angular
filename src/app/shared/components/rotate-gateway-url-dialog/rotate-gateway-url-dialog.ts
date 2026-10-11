import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { finalize } from 'rxjs';

import { Common } from '@core/services/common';
import { InstitutionDeviceConfigurationApi } from '@core/services/institution-device-configuration-api';
import { RotateHttpsIngressTokenData } from '@shared/interfaces';

/**
 * Whichever identifier the caller already has on hand - Host has the configuration row's id on its
 * grid, Institution has the device id from its own route. A discriminated union rather than two optional
 * fields, so a caller can't accidentally supply both or neither.
 */
export type RotateGatewayUrlDialogData = {
  deviceName?: string | null;
} & ({ by: 'configuration'; id: number } | { by: 'device'; id: string });

/**
 * Reissues the HTTPS gateway URL's bearer token - allowed for both Host (recovery/provisioning) and
 * Institution admin per `docs/specs/DEVICE_RELATED_API_COMPLETE_HANDOFF.md`.
 *
 * Same two-phase shape as `DeviceBootstrapDialog`: a confirm step, then the result replaces the
 * dialog body rather than closing it, because the URL is shown exactly once.
 */
@Component({
  selector: 'app-rotate-gateway-url-dialog',
  imports: [ButtonModule, TooltipModule],
  templateUrl: './rotate-gateway-url-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RotateGatewayUrlDialog {
  readonly #configurationApi = inject(InstitutionDeviceConfigurationApi);
  readonly #commonService = inject(Common);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #clipboard = inject(Clipboard);

  protected readonly data = this.#dialogConfig.data as RotateGatewayUrlDialogData | undefined;

  protected readonly isSaving = signal(false);
  /** Non-null once the URL has been reissued — the dialog's second phase. */
  protected readonly result = signal<RotateHttpsIngressTokenData | null>(null);
  protected readonly hasCopied = signal(false);

  onConfirm(): void {
    if (this.isSaving()) return;

    this.isSaving.set(true);
    this.#configurationApi
      .rotateHttpsIngressToken({
        institutionDeviceConfigurationId: this.data?.by === 'configuration' ? this.data.id : null,
        institutionDeviceId: this.data?.by === 'device' ? this.data.id : null,
      })
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
          // Stay on the confirm step: the caller can retry without reopening the dialog.
          this.#commonService.showMessage(res.message, 'error');
        },
        error: (err) => this.#commonService.showMessage(err.message, 'error'),
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
