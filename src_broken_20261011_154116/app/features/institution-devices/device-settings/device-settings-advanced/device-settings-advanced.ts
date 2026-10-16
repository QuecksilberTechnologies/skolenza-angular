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
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { Common, InstitutionDeviceConfigurationApi } from '@core/services';
import { UpdateInstitutionDeviceAdvancedSettingsReq } from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import { DeviceSettingsStore } from '../device-settings.store';
import { nullable, queuedResultMessage } from '../device-settings.utils';
import {
  DeviceSettingsAdvancedModel,
  deviceSettingsAdvancedSchema,
} from './device-settings-advanced.schema';

const emptyModel: DeviceSettingsAdvancedModel = {
  verificationMode: '',
  qrCodeMode: '',
  fillLightMode: '',
  maximumAdministrators: null,
  faceMatchThreshold: null,
  livenessThreshold: null,
  fingerprintMatchThreshold: null,
  fingerprintsPerUser: null,
  maskThreshold: null,
  exposureCompensation: null,
  palmVeinMatchThreshold: null,
  palmDetectionThreshold: null,
  constantFillLightPeriod: '',
  hidePrivacyInformation: false,
  maskDetectionEnabled: false,
  disableFaceRecognition: false,
  onlineDebugEnabled: false,
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
  selector: 'app-device-settings-advanced',
  imports: [
    FormField,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    ToggleSwitchModule,
  ],
  templateUrl: './device-settings-advanced.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeviceSettingsAdvanced {
  readonly #configurationApi = inject(InstitutionDeviceConfigurationApi);
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly store = inject(DeviceSettingsStore);

  protected readonly isSaving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly model = signal<DeviceSettingsAdvancedModel>(emptyModel);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, deviceSettingsAdvancedSchema);
  });

  protected readonly selectFields: SelectFieldConfig[] = [
    {
      id: 'verificationMode',
      label: 'Verification mode',
      key: 'verificationMode',
      field: this.f.verificationMode,
    },
    { id: 'qrCodeMode', label: 'QR code mode', key: 'qrCodeMode', field: this.f.qrCodeMode },
    {
      id: 'fillLightMode',
      label: 'Fill light mode',
      key: 'fillLightMode',
      field: this.f.fillLightMode,
    },
  ];

  protected readonly numberFields: NumberFieldConfig[] = [
    {
      id: 'maximumAdministrators',
      label: 'Maximum administrators',
      field: this.f.maximumAdministrators,
    },
    { id: 'faceMatchThreshold', label: 'Face match threshold', field: this.f.faceMatchThreshold },
    { id: 'livenessThreshold', label: 'Liveness threshold', field: this.f.livenessThreshold },
    {
      id: 'fingerprintMatchThreshold',
      label: 'Fingerprint match threshold',
      field: this.f.fingerprintMatchThreshold,
    },
    {
      id: 'fingerprintsPerUser',
      label: 'Fingerprints per user',
      field: this.f.fingerprintsPerUser,
    },
    { id: 'maskThreshold', label: 'Mask threshold', field: this.f.maskThreshold },
    {
      id: 'exposureCompensation',
      label: 'Exposure compensation',
      field: this.f.exposureCompensation,
    },
    {
      id: 'palmVeinMatchThreshold',
      label: 'Palm vein match threshold',
      field: this.f.palmVeinMatchThreshold,
    },
    {
      id: 'palmDetectionThreshold',
      label: 'Palm detection threshold',
      field: this.f.palmDetectionThreshold,
    },
  ];

  protected readonly toggleFields: ToggleFieldConfig[] = [
    {
      id: 'hidePrivacyInformation',
      label: 'Hide privacy information',
      field: this.f.hidePrivacyInformation,
    },
    { id: 'maskDetectionEnabled', label: 'Mask detection', field: this.f.maskDetectionEnabled },
    {
      id: 'disableFaceRecognition',
      label: 'Disable face recognition',
      field: this.f.disableFaceRecognition,
    },
    { id: 'onlineDebugEnabled', label: 'Online debug', field: this.f.onlineDebugEnabled },
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

    // Online debug is the one field this card must confirm before pushing - see the handoff doc.
    if (this.model().onlineDebugEnabled) {
      this.#confirmationService.confirm({
        message: 'Online debug exposes diagnostic data from the device. Push anyway?',
        header: 'Enable Online Debug',
        icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
        acceptLabel: 'Push settings',
        rejectLabel: 'Cancel',
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-secondary',
        accept: () => this.#push(institutionId, institutionDeviceId),
      });
      return;
    }

    this.#push(institutionId, institutionDeviceId);
  }

  #push(institutionId: string, institutionDeviceId: string): void {
    submit(this.f, async () => {
      const value = this.model();
      const body: UpdateInstitutionDeviceAdvancedSettingsReq = {
        institutionId,
        institutionDeviceId: String(institutionDeviceId),
        currentWebServerPassword: this.store.currentWebServerPassword(),
        verificationMode: Number(value.verificationMode),
        qrCodeMode: Number(value.qrCodeMode),
        fillLightMode: Number(value.fillLightMode),
        maximumAdministrators: value.maximumAdministrators as number,
        faceMatchThreshold: value.faceMatchThreshold as number,
        livenessThreshold: value.livenessThreshold as number,
        fingerprintMatchThreshold: value.fingerprintMatchThreshold as number,
        fingerprintsPerUser: value.fingerprintsPerUser as number,
        maskThreshold: value.maskThreshold as number,
        exposureCompensation: value.exposureCompensation as number,
        palmVeinMatchThreshold: value.palmVeinMatchThreshold as number,
        palmDetectionThreshold: value.palmDetectionThreshold as number,
        constantFillLightPeriod: nullable(value.constantFillLightPeriod),
        hidePrivacyInformation: value.hidePrivacyInformation,
        maskDetectionEnabled: value.maskDetectionEnabled,
        disableFaceRecognition: value.disableFaceRecognition,
        onlineDebugEnabled: value.onlineDebugEnabled,
      };

      this.isSaving.set(true);
      this.#configurationApi
        .updateAdvancedSettings(body)
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
