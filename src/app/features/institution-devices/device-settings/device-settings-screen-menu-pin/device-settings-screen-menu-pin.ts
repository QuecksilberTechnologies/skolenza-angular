import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField, submit, validateStandardSchema } from '@angular/forms/signals';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { finalize } from 'rxjs';

import { Common, InstitutionDeviceConfigurationApi } from '@core/services';
import { UpdateInstitutionDeviceScreenMenuPinReq } from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import { DeviceSettingsStore } from '../device-settings.store';
import { queuedResultMessage } from '../device-settings.utils';
import {
  DeviceSettingsScreenMenuPinModel,
  deviceSettingsScreenMenuPinSchema,
} from './device-settings-screen-menu-pin.schema';

const emptyModel: DeviceSettingsScreenMenuPinModel = { screenMenuPin: '' };

@Component({
  selector: 'app-device-settings-screen-menu-pin',
  imports: [FormField, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './device-settings-screen-menu-pin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeviceSettingsScreenMenuPin {
  readonly #configurationApi = inject(InstitutionDeviceConfigurationApi);
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly store = inject(DeviceSettingsStore);

  protected readonly isSaving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly model = signal<DeviceSettingsScreenMenuPinModel>(emptyModel);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, deviceSettingsScreenMenuPinSchema);
  });

  protected showError() {
    return showFieldError(this.f.screenMenuPin, this.submitted());
  }

  onSubmit(): void {
    if (this.isSaving()) return;

    this.submitted.set(true);
    this.f().markAsTouched();
    if (this.f().invalid()) return;

    const institutionId = this.store.institutionId();
    const institutionDeviceId = this.store.institutionDeviceId();
    if (!institutionId || !institutionDeviceId) {
      this.#commonService.showMessage(
        'This device has no institution context to push settings to.',
        'error',
      );
      return;
    }

    this.#confirmationService.confirm({
      message:
        "This sets the device's physical System/Local-Manager menu PIN. It does not hide the System menu.",
      header: 'Push Screen Menu PIN',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Push PIN',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.#push(institutionId, institutionDeviceId),
    });
  }

  #push(institutionId: string, institutionDeviceId: string): void {
    submit(this.f, async () => {
      const value = this.model();
      const body: UpdateInstitutionDeviceScreenMenuPinReq = {
        institutionId,
        institutionDeviceId: String(institutionDeviceId),
        currentWebServerPassword: this.store.currentWebServerPassword(),
        screenMenuPin: value.screenMenuPin,
      };

      this.isSaving.set(true);
      this.#configurationApi
        .updateScreenMenuPinSettings(body)
        .pipe(
          finalize(() => {
            this.isSaving.set(false);
            this.store.setCurrentWebServerPassword(null);
          }),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            // "Never redisplay the PIN after submit" - handoff doc.
            this.#commonService.showMessage(
              queuedResultMessage(res),
              res.isSucceeded ? 'success' : 'error',
            );
            if (res.isSucceeded) {
              this.model.set(emptyModel);
              this.submitted.set(false);
              this.store.reloadTelemetry();
            }
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }
}
