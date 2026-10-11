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
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { Common, InstitutionDeviceConfigurationApi } from '@core/services';
import { UpdateInstitutionDeviceSetupSettingsReq } from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import { DeviceSettingsStore } from '../device-settings.store';
import { queuedResultMessage } from '../device-settings.utils';
import {
  DeviceSettingsDeviceSetupModel,
  deviceSettingsDeviceSetupSchema,
} from './device-settings-device-setup.schema';

const emptyModel: DeviceSettingsDeviceSetupModel = {
  language: '',
  screenWakeUpMethod: '',
  resultDisplayStyle: '',
  faceRecognitionDistance: '',
  voiceVolume: null,
  resultDisplaySeconds: null,
  screenSaverIdleSeconds: null,
  sleepModeSeconds: null,
  faceWakeUpSeconds: null,
  announcePersonName: false,
  detectMultipleFaces: false,
  livenessDetectionEnabled: false,
  showAvatar: false,
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

interface ToggleFieldConfig {
  id: string;
  label: string;
  field: FieldTree<boolean>;
}

@Component({
  selector: 'app-device-settings-device-setup',
  imports: [
    FormField,
    ButtonModule,
    InputNumberModule,
    MessageModule,
    SelectModule,
    ToggleSwitchModule,
  ],
  templateUrl: './device-settings-device-setup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeviceSettingsDeviceSetup {
  readonly #configurationApi = inject(InstitutionDeviceConfigurationApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly store = inject(DeviceSettingsStore);

  protected readonly isSaving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly model = signal<DeviceSettingsDeviceSetupModel>(emptyModel);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, deviceSettingsDeviceSetupSchema);
  });

  protected readonly selectFields: SelectFieldConfig[] = [
    { id: 'language', label: 'Language', key: 'language', field: this.f.language },
    {
      id: 'screenWakeUpMethod',
      label: 'Screen wake-up method',
      key: 'screenWakeUpMethod',
      field: this.f.screenWakeUpMethod,
    },
    {
      id: 'resultDisplayStyle',
      label: 'Result display style',
      key: 'resultDisplayStyle',
      field: this.f.resultDisplayStyle,
    },
    {
      id: 'faceRecognitionDistance',
      label: 'Face recognition distance',
      key: 'faceRecognitionDistance',
      field: this.f.faceRecognitionDistance,
    },
  ];

  protected readonly numberFields: NumberFieldConfig[] = [
    { id: 'voiceVolume', label: 'Voice volume', field: this.f.voiceVolume },
    {
      id: 'resultDisplaySeconds',
      label: 'Result display (seconds)',
      field: this.f.resultDisplaySeconds,
    },
    {
      id: 'screenSaverIdleSeconds',
      label: 'Screen saver idle (seconds)',
      field: this.f.screenSaverIdleSeconds,
    },
    { id: 'sleepModeSeconds', label: 'Sleep mode (seconds)', field: this.f.sleepModeSeconds },
    { id: 'faceWakeUpSeconds', label: 'Face wake-up (seconds)', field: this.f.faceWakeUpSeconds },
  ];

  protected readonly toggleFields: ToggleFieldConfig[] = [
    { id: 'announcePersonName', label: 'Announce person name', field: this.f.announcePersonName },
    {
      id: 'detectMultipleFaces',
      label: 'Detect multiple faces',
      field: this.f.detectMultipleFaces,
    },
    {
      id: 'livenessDetectionEnabled',
      label: 'Liveness detection',
      field: this.f.livenessDetectionEnabled,
    },
    { id: 'showAvatar', label: 'Show avatar', field: this.f.showAvatar },
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
      const body: UpdateInstitutionDeviceSetupSettingsReq = {
        institutionId,
        institutionDeviceId: String(institutionDeviceId),
        currentWebServerPassword: this.store.currentWebServerPassword(),
        language: Number(value.language),
        screenWakeUpMethod: Number(value.screenWakeUpMethod),
        resultDisplayStyle: Number(value.resultDisplayStyle),
        faceRecognitionDistance: Number(value.faceRecognitionDistance),
        voiceVolume: value.voiceVolume as number,
        resultDisplaySeconds: value.resultDisplaySeconds as number,
        screenSaverIdleSeconds: value.screenSaverIdleSeconds as number,
        sleepModeSeconds: value.sleepModeSeconds as number,
        faceWakeUpSeconds: value.faceWakeUpSeconds as number,
        announcePersonName: value.announcePersonName,
        detectMultipleFaces: value.detectMultipleFaces,
        livenessDetectionEnabled: value.livenessDetectionEnabled,
        showAvatar: value.showAvatar,
      };

      this.isSaving.set(true);
      this.#configurationApi
        .updateDeviceSetupSettings(body)
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
