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
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { Common, InstitutionDeviceConfigurationApi } from '@core/services';
import { UpdateInstitutionDeviceLockSettingsReq } from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import { DeviceSettingsStore } from '../device-settings.store';
import { queuedResultMessage } from '../device-settings.utils';
import { DeviceSettingsLockModel, deviceSettingsLockSchema } from './device-settings-lock.schema';

const emptyModel: DeviceSettingsLockModel = {
  doorSensorMode: '',
  antiPassbackMode: '',
  wiegandOutput: '',
  wiegandFormat: '',
  cardDisplayFormat: '',
  doorOpenDelaySeconds: null,
  doorSensorDelaySeconds: null,
  doorPassword: null,
  requiredUsersForDoorOpen: null,
  accessLimit: null,
  failedVerificationLimit: null,
  timeZonePunchLimit: null,
  blockStrangerAccess: false,
  reverseCardPin: false,
  reverseWiegandOutput: false,
  externalWiegandSnapshotEnabled: false,
  interlockEnabled: false,
  alarmProcessingEnabled: false,
  suppressAccessDeniedLog: false,
  denyOutsideNormallyOpenTimeZone: false,
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
  selector: 'app-device-settings-lock',
  imports: [
    FormField,
    ButtonModule,
    InputNumberModule,
    MessageModule,
    SelectModule,
    ToggleSwitchModule,
  ],
  templateUrl: './device-settings-lock.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeviceSettingsLock {
  readonly #configurationApi = inject(InstitutionDeviceConfigurationApi);
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly store = inject(DeviceSettingsStore);

  protected readonly isSaving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly model = signal<DeviceSettingsLockModel>(emptyModel);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, deviceSettingsLockSchema);
  });

  protected readonly selectFields: SelectFieldConfig[] = [
    {
      id: 'doorSensorMode',
      label: 'Door sensor mode',
      key: 'doorSensorMode',
      field: this.f.doorSensorMode,
    },
    {
      id: 'antiPassbackMode',
      label: 'Anti-passback mode',
      key: 'antiPassbackMode',
      field: this.f.antiPassbackMode,
    },
    {
      id: 'wiegandOutput',
      label: 'Wiegand output',
      key: 'wiegandOutput',
      field: this.f.wiegandOutput,
    },
    {
      id: 'wiegandFormat',
      label: 'Wiegand format',
      key: 'wiegandFormat',
      field: this.f.wiegandFormat,
    },
    {
      id: 'cardDisplayFormat',
      label: 'Card display format',
      key: 'cardDisplayFormat',
      field: this.f.cardDisplayFormat,
    },
  ];

  protected readonly numberFields: NumberFieldConfig[] = [
    {
      id: 'doorOpenDelaySeconds',
      label: 'Door open delay (seconds)',
      field: this.f.doorOpenDelaySeconds,
    },
    {
      id: 'doorSensorDelaySeconds',
      label: 'Door sensor delay (seconds)',
      field: this.f.doorSensorDelaySeconds,
    },
    { id: 'doorPassword', label: 'Door password', field: this.f.doorPassword },
    {
      id: 'requiredUsersForDoorOpen',
      label: 'Required users for door open',
      field: this.f.requiredUsersForDoorOpen,
    },
    { id: 'accessLimit', label: 'Access limit', field: this.f.accessLimit },
    {
      id: 'failedVerificationLimit',
      label: 'Failed verification limit',
      field: this.f.failedVerificationLimit,
    },
    { id: 'timeZonePunchLimit', label: 'Time zone punch limit', field: this.f.timeZonePunchLimit },
  ];

  protected readonly toggleFields: ToggleFieldConfig[] = [
    {
      id: 'blockStrangerAccess',
      label: 'Block stranger access',
      field: this.f.blockStrangerAccess,
    },
    { id: 'reverseCardPin', label: 'Reverse card PIN', field: this.f.reverseCardPin },
    {
      id: 'reverseWiegandOutput',
      label: 'Reverse Wiegand output',
      field: this.f.reverseWiegandOutput,
    },
    {
      id: 'externalWiegandSnapshotEnabled',
      label: 'External Wiegand snapshot',
      field: this.f.externalWiegandSnapshotEnabled,
    },
    { id: 'interlockEnabled', label: 'Interlock', field: this.f.interlockEnabled },
    {
      id: 'alarmProcessingEnabled',
      label: 'Alarm processing',
      field: this.f.alarmProcessingEnabled,
    },
    {
      id: 'suppressAccessDeniedLog',
      label: 'Suppress access-denied log',
      field: this.f.suppressAccessDeniedLog,
    },
    {
      id: 'denyOutsideNormallyOpenTimeZone',
      label: 'Deny outside normally-open time zone',
      field: this.f.denyOutsideNormallyOpenTimeZone,
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

    this.#confirmationService.confirm({
      message:
        'This changes door, Wiegand, or access-hardware behaviour on a physical lock. Push anyway?',
      header: 'Push Lock Settings',
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
      const body: UpdateInstitutionDeviceLockSettingsReq = {
        institutionId,
        institutionDeviceId: String(institutionDeviceId),
        currentWebServerPassword: this.store.currentWebServerPassword(),
        doorSensorMode: Number(value.doorSensorMode),
        antiPassbackMode: Number(value.antiPassbackMode),
        wiegandOutput: Number(value.wiegandOutput),
        wiegandFormat: Number(value.wiegandFormat),
        cardDisplayFormat: Number(value.cardDisplayFormat),
        doorOpenDelaySeconds: value.doorOpenDelaySeconds as number,
        doorSensorDelaySeconds: value.doorSensorDelaySeconds as number,
        doorPassword: value.doorPassword as number,
        requiredUsersForDoorOpen: value.requiredUsersForDoorOpen as number,
        accessLimit: value.accessLimit as number,
        failedVerificationLimit: value.failedVerificationLimit as number,
        timeZonePunchLimit: value.timeZonePunchLimit as number,
        blockStrangerAccess: value.blockStrangerAccess,
        reverseCardPin: value.reverseCardPin,
        reverseWiegandOutput: value.reverseWiegandOutput,
        externalWiegandSnapshotEnabled: value.externalWiegandSnapshotEnabled,
        interlockEnabled: value.interlockEnabled,
        alarmProcessingEnabled: value.alarmProcessingEnabled,
        suppressAccessDeniedLog: value.suppressAccessDeniedLog,
        denyOutsideNormallyOpenTimeZone: value.denyOutsideNormallyOpenTimeZone,
      };

      this.isSaving.set(true);
      this.#configurationApi
        .updateLockSettings(body)
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
