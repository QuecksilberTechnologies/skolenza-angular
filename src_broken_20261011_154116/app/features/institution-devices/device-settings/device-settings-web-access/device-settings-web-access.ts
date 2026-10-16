import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type FieldTree,
  form,
  FormField,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { Common, InstitutionDeviceConfigurationApi } from '@core/services';
import { UpdateInstitutionDeviceWebAccessReq } from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import { DeviceSettingsStore } from '../device-settings.store';
import { nullable, queuedResultMessage } from '../device-settings.utils';
import {
  DeviceSettingsWebAccessModel,
  deviceSettingsWebAccessSchema,
} from './device-settings-web-access.schema';

const emptyModel: DeviceSettingsWebAccessModel = {
  localWebServerEnabled: true,
  newWebServerPassword: '',
};

@Component({
  selector: 'app-device-settings-web-access',
  imports: [FormField, ButtonModule, InputTextModule, MessageModule, ToggleSwitchModule],
  templateUrl: './device-settings-web-access.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeviceSettingsWebAccess {
  readonly #configurationApi = inject(InstitutionDeviceConfigurationApi);
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly store = inject(DeviceSettingsStore);

  protected readonly isSaving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly model = signal<DeviceSettingsWebAccessModel>(emptyModel);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, deviceSettingsWebAccessSchema);
  });

  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
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
        'This may change or remove technician access to the device local web console. Push anyway?',
      header: 'Push Local Web UI/API Settings',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Push settings',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.#push(institutionId, institutionDeviceId),
    });
  }

  #push(institutionId: string, institutionDeviceId: string): void {
    submit(this.f, async () => {
      const value = this.model();
      const body: UpdateInstitutionDeviceWebAccessReq = {
        institutionId,
        institutionDeviceId: String(institutionDeviceId),
        currentWebServerPassword: this.store.currentWebServerPassword(),
        localWebServerEnabled: value.localWebServerEnabled,
        newWebServerPassword: nullable(value.newWebServerPassword),
      };

      this.isSaving.set(true);
      this.#configurationApi
        .updateWebAccessSettings(body)
        .pipe(
          finalize(() => {
            this.isSaving.set(false);
            this.store.setCurrentWebServerPassword(null);
            this.model.update((m) => ({ ...m, newWebServerPassword: '' }));
          }),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.#commonService.showMessage(
              queuedResultMessage(res),
              res.isSucceeded ? 'success' : 'error',
            );
            if (res.isSucceeded) {
              this.store.reloadTelemetry();
            }
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }
}
