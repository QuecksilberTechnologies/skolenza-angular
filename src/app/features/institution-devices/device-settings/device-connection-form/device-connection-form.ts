import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type FieldTree,
  form,
  FormField,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { Common, InstitutionDeviceConfigurationApi } from '@core/services';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { SectionCard } from '@shared/components/section-card/section-card';
import { ToggleField } from '@shared/components/toggle-field/toggle-field';
import {
  CreateInstitutionDeviceConfigurationReq,
  DeviceCommunicationType,
  DeviceMutationRes,
  InstitutionDeviceConfigurationRow,
} from '@shared/interfaces';
import { DEVICE_COMMUNICATION_TYPES } from '@shared/utilities/common-data';
import { showFieldError } from '@shared/utilities/field-error';

import { deviceConnectionSchema, DeviceConnectionFormModel } from './device-connection-form.schema';

const emptyModel: DeviceConnectionFormModel = {
  ipAddress: '',
  macAddress: '',
  devicePort: null,
  communicationType: null,

  serverHost: '',
  serverPort: null,
  serverPath: '',
  serverUrl: '',
  pushMode: '',
  heartbeatIntervalSeconds: null,
  timeZoneId: '',
  configuration: '',

  isEnrollmentEnabled: false,
  isAttendancePushEnabled: false,
  isAutoSyncEnabled: false,
};

/** Empty strings go to the API as `null`, which is what the nullable DTO fields expect. */
const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

interface TextFieldConfig {
  id: string;
  label: string;
  field: FieldTree<string>;
  placeholder?: string;
}

interface NumberFieldConfig {
  id: string;
  label: string;
  field: FieldTree<number | null>;
  placeholder?: string;
}

interface ToggleConfig {
  id: string;
  label: string;
  field: FieldTree<boolean>;
  hint?: string;
}

/**
 * Create-or-edit form for a Institution device's own `InstitutionDeviceConfiguration` — the connection record
 * only the Institution admin may write (`docs/specs/DEVICE_RELATED_API_COMPLETE_HANDOFF.md`: Host is
 * rejected on create/update/delete). Unlike the Host catalogue's version of this form, `institutionId`
 * and `institutionDeviceId` are not user input here — both come from the logged-in Institution and the page's
 * own route.
 */
@Component({
  selector: 'app-device-connection-form',
  imports: [
    FormField,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    SectionCard,
    FormActionBar,
    ToggleField,
  ],
  templateUrl: './device-connection-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceConnectionForm {
  readonly #configurationApi = inject(InstitutionDeviceConfigurationApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);

  readonly institutionId = input.required<string>();
  readonly institutionDeviceId = input.required<string>();
  readonly deviceName = input<string | null>(null);
  /** `null` means create; a row means edit that row's connection. */
  readonly existing = input<InstitutionDeviceConfigurationRow | null>(null);
  /** Set when hosted in a dynamic dialog: drops the page column and flushes the action bar. */
  readonly dialog = input(false, { transform: booleanAttribute });

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly isEditMode = computed(() => this.existing() !== null);
  /**
   * The sticky action bar has to span the scroll container, so the page column lives on the
   * sections above it rather than on the form itself.
   */
  protected readonly contentClass = computed(() =>
    this.dialog()
      ? 'flex w-full flex-col gap-4'
      : 'mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 pt-3 pb-6 sm:px-4 sm:pt-4',
  );
  protected readonly communicationTypeOptions = DEVICE_COMMUNICATION_TYPES;

  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<DeviceConnectionFormModel>(this.#toModel(this.existing()));

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, deviceConnectionSchema);
  });

  protected readonly serverTextFields: TextFieldConfig[] = [
    {
      id: 'serverHost',
      label: 'Server host',
      field: this.f.serverHost,
      placeholder: 'e.g. push.example.com',
    },
    { id: 'serverPath', label: 'Server path', field: this.f.serverPath, placeholder: '/iclock' },
    {
      id: 'serverUrl',
      label: 'Server URL',
      field: this.f.serverUrl,
      placeholder: 'https://example.com/iclock',
    },
    { id: 'pushMode', label: 'Push mode', field: this.f.pushMode, placeholder: 'e.g. push' },
    { id: 'timeZoneId', label: 'Time zone', field: this.f.timeZoneId, placeholder: 'Asia/Kolkata' },
  ];

  protected readonly serverNumberFields: NumberFieldConfig[] = [
    { id: 'serverPort', label: 'Server port', field: this.f.serverPort, placeholder: 'e.g. 8080' },
    {
      id: 'heartbeatIntervalSeconds',
      label: 'Heartbeat interval (seconds)',
      field: this.f.heartbeatIntervalSeconds,
      placeholder: 'e.g. 30',
    },
  ];

  protected readonly behaviourToggles: ToggleConfig[] = [
    {
      id: 'isEnrollmentEnabled',
      label: 'Enrollment enabled',
      field: this.f.isEnrollmentEnabled,
      hint: 'StaffMembers can enroll biometrics here',
    },
    {
      id: 'isAttendancePushEnabled',
      label: 'Attendance push',
      field: this.f.isAttendancePushEnabled,
      hint: 'Device pushes punches instead of being polled',
    },
    {
      id: 'isAutoSyncEnabled',
      label: 'Auto sync',
      field: this.f.isAutoSyncEnabled,
      hint: 'StaffMember data syncs to the device automatically',
    },
  ];

  /** Templates call this per field; the rule itself lives in `@shared/utilities/field-error`. */
  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
  }

  #toModel(row: InstitutionDeviceConfigurationRow | null): DeviceConnectionFormModel {
    if (!row) {
      return emptyModel;
    }

    return {
      ipAddress: row.ipAddress ?? '',
      macAddress: row.macAddress ?? '',
      devicePort: row.devicePort ?? null,
      communicationType: row.communicationType ?? null,

      serverHost: row.serverHost ?? '',
      serverPort: row.serverPort ?? null,
      serverPath: row.serverPath ?? '',
      serverUrl: row.serverUrl ?? '',
      pushMode: row.pushMode ?? '',
      heartbeatIntervalSeconds: row.heartbeatIntervalSeconds ?? null,
      timeZoneId: row.timeZoneId ?? '',
      configuration: row.configuration ?? '',

      isEnrollmentEnabled: row.isEnrollmentEnabled ?? false,
      isAttendancePushEnabled: row.isAttendancePushEnabled ?? false,
      isAutoSyncEnabled: row.isAutoSyncEnabled ?? false,
    };
  }

  /**
   * `pTextarea` subscribes to `ngControl.valueChanges`, which Signal Forms does not provide, so the
   * value is written back by hand instead of through `[formField]`.
   */
  onConfigurationInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.model.update((m) => ({ ...m, configuration: value }));
    this.f.configuration().markAsDirty();
    this.f.configuration().markAsTouched();
  }

  onSubmit(): void {
    if (this.isSaving()) {
      return;
    }

    // The button stays enabled while the form is invalid, so submitting is how the user asks
    // "what is wrong?" — reveal everything.
    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) {
      return;
    }

    submit(this.f, async () => {
      const body = this.#buildRequest(this.model());
      this.isSaving.set(true);

      const existing = this.existing();
      const request$ = existing
        ? this.#configurationApi.updateInstitutionDeviceConfiguration({ ...body, id: existing.id })
        : this.#configurationApi.addInstitutionDeviceConfiguration(body);

      request$
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res: DeviceMutationRes) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            if (res.isSucceeded) {
              this.saved.emit();
            }
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  /** The schema validates the model in place, so the request body is where trimming happens. */
  #buildRequest(value: DeviceConnectionFormModel): CreateInstitutionDeviceConfigurationReq {
    return {
      institutionId: this.institutionId(),
      institutionDeviceId: this.institutionDeviceId(),

      ipAddress: nullable(value.ipAddress),
      macAddress: nullable(value.macAddress),
      devicePort: value.devicePort,
      // The schema has already ruled out null.
      communicationType: (value.communicationType ??
        DeviceCommunicationType.Http) as DeviceCommunicationType,

      serverHost: nullable(value.serverHost),
      serverPort: value.serverPort,
      serverPath: nullable(value.serverPath),
      serverUrl: nullable(value.serverUrl),
      pushMode: nullable(value.pushMode),
      heartbeatIntervalSeconds: value.heartbeatIntervalSeconds,
      timeZoneId: nullable(value.timeZoneId),
      configuration: nullable(value.configuration),

      isEnrollmentEnabled: value.isEnrollmentEnabled,
      isAttendancePushEnabled: value.isAttendancePushEnabled,
      isAutoSyncEnabled: value.isAutoSyncEnabled,
    };
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
