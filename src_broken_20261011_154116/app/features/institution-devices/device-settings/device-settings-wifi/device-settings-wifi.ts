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
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { Common, InstitutionDeviceConfigurationApi } from '@core/services';
import { UpdateInstitutionDeviceWifiSettingsReq } from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import { DeviceSettingsStore } from '../device-settings.store';
import { queuedResultMessage, undefinedIfBlank } from '../device-settings.utils';
import { DeviceSettingsWifiModel, deviceSettingsWifiSchema } from './device-settings-wifi.schema';

const emptyModel: DeviceSettingsWifiModel = {
  dhcpEnabled: true,
  ipAddress: '',
  subnetMask: '',
  gateway: '',
};

interface TextFieldConfig {
  id: string;
  label: string;
  placeholder: string;
  field: FieldTree<string>;
}

@Component({
  selector: 'app-device-settings-wifi',
  imports: [FormField, ButtonModule, InputTextModule, ToggleSwitchModule],
  templateUrl: './device-settings-wifi.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeviceSettingsWifi {
  readonly #configurationApi = inject(InstitutionDeviceConfigurationApi);
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly store = inject(DeviceSettingsStore);

  protected readonly isSaving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly model = signal<DeviceSettingsWifiModel>(emptyModel);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, deviceSettingsWifiSchema);
  });

  protected readonly textFields: TextFieldConfig[] = [
    {
      id: 'ipAddress',
      label: 'IP address',
      placeholder: 'e.g. 192.168.1.201',
      field: this.f.ipAddress,
    },
    {
      id: 'subnetMask',
      label: 'Subnet mask',
      placeholder: 'e.g. 255.255.255.0',
      field: this.f.subnetMask,
    },
    { id: 'gateway', label: 'Gateway', placeholder: 'e.g. 192.168.1.1', field: this.f.gateway },
  ];

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
      message: 'This may change how the device reaches the network. Push anyway?',
      header: 'Push WiFi Settings',
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
      const isStatic = !value.dhcpEnabled;
      const body: UpdateInstitutionDeviceWifiSettingsReq = {
        institutionId,
        institutionDeviceId: String(institutionDeviceId),
        currentWebServerPassword: this.store.currentWebServerPassword(),
        dhcpEnabled: value.dhcpEnabled,
        ...(isStatic
          ? {
              ipAddress: undefinedIfBlank(value.ipAddress),
              subnetMask: undefinedIfBlank(value.subnetMask),
              gateway: undefinedIfBlank(value.gateway),
            }
          : {}),
      };

      this.isSaving.set(true);
      this.#configurationApi
        .updateWifiSettings(body)
        .pipe(
          finalize(() => {
            this.isSaving.set(false);
            this.store.setCurrentWebServerPassword(null);
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
