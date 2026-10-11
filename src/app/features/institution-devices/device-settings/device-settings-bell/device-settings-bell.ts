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
import { UpdateInstitutionDeviceBellSettingsReq } from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import { DeviceSettingsStore } from '../device-settings.store';
import { queuedResultMessage } from '../device-settings.utils';
import { DeviceSettingsBellModel, deviceSettingsBellSchema } from './device-settings-bell.schema';

const emptyModel: DeviceSettingsBellModel = {
  bellCount: null,
  ringStyle: '',
  bellOutput: '',
};

interface SelectFieldConfig {
  id: string;
  label: string;
  key: string;
  field: FieldTree<string>;
}

@Component({
  selector: 'app-device-settings-bell',
  imports: [FormField, ButtonModule, InputNumberModule, MessageModule, SelectModule],
  templateUrl: './device-settings-bell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeviceSettingsBell {
  readonly #configurationApi = inject(InstitutionDeviceConfigurationApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly store = inject(DeviceSettingsStore);

  protected readonly isSaving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly model = signal<DeviceSettingsBellModel>(emptyModel);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, deviceSettingsBellSchema);
  });

  protected readonly selectFields: SelectFieldConfig[] = [
    { id: 'ringStyle', label: 'Ring style', key: 'ringStyle', field: this.f.ringStyle },
    { id: 'bellOutput', label: 'Bell output', key: 'bellOutput', field: this.f.bellOutput },
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
      const body: UpdateInstitutionDeviceBellSettingsReq = {
        institutionId,
        institutionDeviceId: String(institutionDeviceId),
        currentWebServerPassword: this.store.currentWebServerPassword(),
        bellCount: value.bellCount as number,
        ringStyle: Number(value.ringStyle),
        bellOutput: Number(value.bellOutput),
      };

      this.isSaving.set(true);
      this.#configurationApi
        .updateBellSettings(body)
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
