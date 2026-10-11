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
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { finalize } from 'rxjs';

import { Common, InstitutionDeviceConfigurationApi } from '@core/services';
import { UpdateInstitutionDeviceSerialSettingsReq } from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import { DeviceSettingsStore } from '../device-settings.store';
import { queuedResultMessage } from '../device-settings.utils';
import {
  DeviceSettingsSerialModel,
  deviceSettingsSerialSchema,
} from './device-settings-serial.schema';

const emptyModel: DeviceSettingsSerialModel = {
  baudRate: '',
  serialFunction: '',
  deviceAddress: null,
  networkPort: null,
};

interface SelectFieldConfig {
  id: string;
  label: string;
  key: string;
  field: FieldTree<string>;
}

interface NumberFieldConfig {
  id: string;
  label: string;
  field: FieldTree<number | null>;
}

@Component({
  selector: 'app-device-settings-serial',
  imports: [FormField, ButtonModule, InputNumberModule, MessageModule, SelectModule],
  templateUrl: './device-settings-serial.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeviceSettingsSerial {
  readonly #configurationApi = inject(InstitutionDeviceConfigurationApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly store = inject(DeviceSettingsStore);

  protected readonly isSaving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly model = signal<DeviceSettingsSerialModel>(emptyModel);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, deviceSettingsSerialSchema);
  });

  protected readonly selectFields: SelectFieldConfig[] = [
    { id: 'baudRate', label: 'Baud rate', key: 'baudRate', field: this.f.baudRate },
    {
      id: 'serialFunction',
      label: 'Serial function',
      key: 'serialFunction',
      field: this.f.serialFunction,
    },
  ];

  protected readonly numberFields: NumberFieldConfig[] = [
    { id: 'deviceAddress', label: 'Device address', field: this.f.deviceAddress },
    { id: 'networkPort', label: 'Network port', field: this.f.networkPort },
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

    submit(this.f, async () => {
      const value = this.model();
      const body: UpdateInstitutionDeviceSerialSettingsReq = {
        institutionId,
        institutionDeviceId: String(institutionDeviceId),
        currentWebServerPassword: this.store.currentWebServerPassword(),
        baudRate: Number(value.baudRate),
        serialFunction: Number(value.serialFunction),
        deviceAddress: value.deviceAddress as number,
        networkPort: value.networkPort as number,
      };

      this.isSaving.set(true);
      this.#configurationApi
        .updateSerialSettings(body)
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
