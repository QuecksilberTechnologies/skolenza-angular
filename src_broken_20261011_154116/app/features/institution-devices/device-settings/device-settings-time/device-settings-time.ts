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
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { Common, InstitutionDeviceConfigurationApi } from '@core/services';
import { SyncInstitutionDeviceTimeReq, UpdateInstitutionDeviceTimeSettingsReq } from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import { DeviceSettingsStore } from '../device-settings.store';
import { nullable, queuedResultMessage } from '../device-settings.utils';
import { DeviceSettingsTimeModel, deviceSettingsTimeSchema } from './device-settings-time.schema';

const emptyModel: DeviceSettingsTimeModel = {
  timeFormat: '',
  dateFormat: '',
  timeZone: '',
  daylightSavingEnabled: false,
  daylightSavingStart: '',
  daylightSavingEnd: '',
  networkTimeEnabled: false,
  rebootTime1: '',
  rebootTime2: '',
  rebootTime3: '',
};

interface SelectFieldConfig {
  id: string;
  label: string;
  key: string;
  field: FieldTree<string>;
}

interface ToggleFieldConfig {
  id: string;
  label: string;
  field: FieldTree<boolean>;
}

interface TextFieldConfig {
  id: string;
  label: string;
  placeholder: string;
  field: FieldTree<string>;
}

@Component({
  selector: 'app-device-settings-time',
  imports: [
    FormField,
    ButtonModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    ToggleSwitchModule,
  ],
  templateUrl: './device-settings-time.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeviceSettingsTime {
  readonly #configurationApi = inject(InstitutionDeviceConfigurationApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly store = inject(DeviceSettingsStore);

  protected readonly isSaving = signal(false);
  protected readonly isSyncing = signal(false);
  protected readonly submitted = signal(false);

  protected readonly model = signal<DeviceSettingsTimeModel>(emptyModel);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, deviceSettingsTimeSchema);
  });

  /** Which choices come from `device-ddl-options/time` is a naming guess against unverified
   *  option keys - see `institution-device-settings.ts`. */
  protected readonly selectFields: SelectFieldConfig[] = [
    { id: 'timeFormat', label: 'Time format', key: 'timeFormat', field: this.f.timeFormat },
    { id: 'dateFormat', label: 'Date format', key: 'dateFormat', field: this.f.dateFormat },
    { id: 'timeZone', label: 'Time zone', key: 'timeZone', field: this.f.timeZone },
  ];

  protected readonly toggleFields: ToggleFieldConfig[] = [
    {
      id: 'networkTimeEnabled',
      label: 'Network time (NTP)',
      field: this.f.networkTimeEnabled,
    },
    {
      id: 'daylightSavingEnabled',
      label: 'Daylight saving',
      field: this.f.daylightSavingEnabled,
    },
  ];

  protected readonly textFields: TextFieldConfig[] = [
    {
      id: 'daylightSavingStart',
      label: 'Daylight saving start',
      placeholder: 'e.g. 03-01 02:00',
      field: this.f.daylightSavingStart,
    },
    {
      id: 'daylightSavingEnd',
      label: 'Daylight saving end',
      placeholder: 'e.g. 11-01 02:00',
      field: this.f.daylightSavingEnd,
    },
    {
      id: 'rebootTime1',
      label: 'Reboot time 1',
      placeholder: 'e.g. 02:00',
      field: this.f.rebootTime1,
    },
    {
      id: 'rebootTime2',
      label: 'Reboot time 2',
      placeholder: 'e.g. 02:00',
      field: this.f.rebootTime2,
    },
    {
      id: 'rebootTime3',
      label: 'Reboot time 3',
      placeholder: 'e.g. 02:00',
      field: this.f.rebootTime3,
    },
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
      const body: UpdateInstitutionDeviceTimeSettingsReq = {
        institutionId,
        institutionDeviceId: String(institutionDeviceId),
        currentWebServerPassword: this.store.currentWebServerPassword(),
        timeFormat: Number(value.timeFormat),
        dateFormat: Number(value.dateFormat),
        timeZone: Number(value.timeZone),
        daylightSavingEnabled: value.daylightSavingEnabled,
        daylightSavingStart: nullable(value.daylightSavingStart),
        daylightSavingEnd: nullable(value.daylightSavingEnd),
        networkTimeEnabled: value.networkTimeEnabled,
        rebootTime1: nullable(value.rebootTime1),
        rebootTime2: nullable(value.rebootTime2),
        rebootTime3: nullable(value.rebootTime3),
      };

      this.isSaving.set(true);
      this.#configurationApi
        .updateTimeSettings(body)
        .pipe(
          finalize(() => {
            this.isSaving.set(false);
            // Input-only secret - cleared whether the push succeeded or failed.
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

  /** "Set clock now" - a lone action separate from the rest of the card's fields. Omitting
   *  `utcDateTime` tells the server to use its own UTC clock rather than a value computed here. */
  syncTimeNow(): void {
    if (this.isSyncing()) return;

    const institutionId = this.store.institutionId();
    const institutionDeviceId = this.store.institutionDeviceId();
    if (!institutionId || !institutionDeviceId) {
      this.#commonService.showMessage(
        'This device has no institution context to push settings to.',
        'error',
      );
      return;
    }

    const body: SyncInstitutionDeviceTimeReq = {
      institutionId,
      institutionDeviceId: String(institutionDeviceId),
      currentWebServerPassword: this.store.currentWebServerPassword(),
    };

    this.isSyncing.set(true);
    this.#configurationApi
      .syncTime(body)
      .pipe(
        finalize(() => {
          this.isSyncing.set(false);
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
  }
}
