import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
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
import { ActivatedRoute, Router } from '@angular/router';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize, Observable } from 'rxjs';

import { CanComponentDeactivate } from '@core/guards';
import { Common, DeviceMasterApi } from '@core/services';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { SkeletonField } from '@shared/components/form-skeleton/form-skeleton-field';
import { SkeletonToggle } from '@shared/components/form-skeleton/form-skeleton-toggle';
import { SectionCard } from '@shared/components/section-card/section-card';
import { ToggleField } from '@shared/components/toggle-field/toggle-field';
import {
  CreateDeviceMasterReq,
  DeviceMasterRow,
  DeviceMutationRes,
  DeviceType,
} from '@shared/interfaces';
import { DEVICE_TYPES } from '@shared/utilities/common-data';
import { showFieldError } from '@shared/utilities/field-error';

import { DeviceMasterFormModel, deviceMasterSchema } from './device-master-form.schema';

const emptyModel: DeviceMasterFormModel = {
  sNo: '',
  deviceCode: '',
  deviceName: '',
  modelNo: '',
  productCode: '',
  companyName: '',
  brandName: '',
  countryOfOrigin: '',
  manufacturerWebsite: '',
  supportEmail: '',
  supportContactNumber: '',
  deviceType: null,

  isAttendanceDevice: false,
  isAccessControlDevice: false,
  supportsFace: false,
  supportsFingerprint: false,
  supportsCard: false,
  supportsPin: false,
  supportsQrCode: false,
  supportsTemperature: false,

  supportsHttp: false,
  supportsHttps: false,
  supportsWebSocket: false,
  supportsTcpIp: false,
  supportsCloudApi: false,
  supportsPushSdk: false,
  supportsMqtt: false,
  supportsMqtts: false,
  supportsWifi: false,
  supportsEthernet: false,
  supportsUsb: false,
  supportedTlsVersions: '',
  supportedProtocols: '',

  maxUserCapacity: null,
  maxFaceCapacity: null,
  maxFingerprintCapacity: null,
  maxCardCapacity: null,
  maxAttendanceRecordCapacity: null,

  firmwareVersion: '',
  softwareVersion: '',
  operatingSystem: '',
  processorInfo: '',
  memoryInfo: '',
  storageInfo: '',
  displayInfo: '',
  cameraInfo: '',
  sensorInfo: '',
  powerRequirement: '',
  operatingTemperature: '',
  dimensions: '',
  weight: '',

  price: null,
  currencyKey: '',
  warrantyPeriodMonths: null,
  warrantyDescription: '',

  isIntegrationSupported: false,
  integrationType: '',
  apiDocumentationUrl: '',
  sdkDocumentationUrl: '',

  imageUrl: '',
  thumbnailUrl: '',
  brochureUrl: '',
  manualUrl: '',

  shortDescription: '',
  description: '',
  features: '',
  technicalSpecifications: '',
  additionalInfo: '',
  remark: '',

  isRecommended: false,
  isActive: true,
};

interface TextFieldConfig {
  id: string;
  label: string;
  field: FieldTree<string>;
  placeholder?: string;
  /** Shown under the field while it has no error, for labels that are easy to mix up. */
  hint?: string;
}

interface NumberFieldConfig {
  id: string;
  label: string;
  field: FieldTree<number | null>;
}

interface ToggleConfig {
  id: string;
  label: string;
  field: FieldTree<boolean>;
}

/** `pTextarea` bypasses `FormField`, so these are bound by hand through `onTextareaInput`. */
interface TextareaConfig {
  id: TextareaKey;
  label: string;
  rows: number;
  maxlength: number;
}

type TextareaKey =
  | 'warrantyDescription'
  | 'shortDescription'
  | 'description'
  | 'features'
  | 'technicalSpecifications'
  | 'additionalInfo'
  | 'remark';

/** Empty strings go to the API as `null`, which is what the nullable DTO fields expect. */
const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

@Component({
  selector: 'app-device-master-form',
  imports: [
    FormField,
    AutoFocusModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    SectionCard,
    FormActionBar,
    SkeletonField,
    SkeletonToggle,
    ToggleField,
  ],
  templateUrl: './device-master-form.html',
  // Fills the router-outlet's leftover height so the page's own scroll box needs no 100vh math.
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeviceMasterForm implements CanComponentDeactivate {
  readonly #deviceMasterApi = inject(DeviceMasterApi);
  readonly #commonService = inject(Common);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  /** Create and edit are separate route configs, so the id cannot change under the component. */
  protected readonly deviceMasterId =
    Number(this.#route.snapshot.paramMap.get('deviceMasterId')) || null;
  protected readonly isEditMode = this.deviceMasterId !== null;

  protected readonly deviceTypeOptions = DEVICE_TYPES;

  protected readonly isSaving = signal(false);
  protected readonly isLoading = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<DeviceMasterFormModel>(emptyModel);
  /** What the server last told us; `canDeactivate` compares against it. */
  readonly #baseline = signal<DeviceMasterFormModel>(emptyModel);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, deviceMasterSchema);
  });

  /**
   * The catalog DTO carries ~70 fields, most of them plain text, numbers, or flags with nothing
   * field-specific about them. They are declared here and looped in the template so the markup
   * stays readable; the required fields keep their own explicit blocks.
   *
   * Model no / product code / manufacturer / brand are indistinguishable from their labels alone,
   * so each carries a hint. `companyName` is labelled "Manufacturer" to stop it reading as a second
   * name for the Manufacturer Support section's subject; the model key is unchanged.
   */
  protected readonly identityFields: TextFieldConfig[] = [
    {
      id: 'sNo',
      label: 'Serial number',
      field: this.f.sNo,
      placeholder: 'e.g. 6613220400123',
      hint: "Serial printed on the manufacturer's label",
    },
    {
      id: 'modelNo',
      label: 'Model number',
      field: this.f.modelNo,
      placeholder: 'e.g. UF-100',
      hint: "Manufacturer's model designation",
    },
    {
      id: 'productCode',
      label: 'Product code',
      field: this.f.productCode,
      placeholder: 'e.g. 88-UF100-BLK',
      hint: "Manufacturer's SKU, if different from the model",
    },
    {
      id: 'companyName',
      label: 'Manufacturer',
      field: this.f.companyName,
      placeholder: 'e.g. ZKTeco',
      hint: 'Company that makes the device',
    },
    {
      id: 'brandName',
      label: 'Brand',
      field: this.f.brandName,
      placeholder: 'e.g. ZKTeco Green Label',
      hint: 'Brand shown on the device, if different',
    },
    {
      id: 'countryOfOrigin',
      label: 'Country of origin',
      field: this.f.countryOfOrigin,
      placeholder: 'e.g. China',
    },
  ];

  protected readonly supportFields: TextFieldConfig[] = [
    {
      id: 'manufacturerWebsite',
      label: 'Manufacturer website',
      field: this.f.manufacturerWebsite,
      placeholder: 'https://example.com',
    },
    {
      id: 'supportEmail',
      label: 'Support email',
      field: this.f.supportEmail,
      placeholder: 'support@example.com',
    },
    { id: 'supportContactNumber', label: 'Support contact', field: this.f.supportContactNumber },
  ];

  protected readonly capabilityToggles: ToggleConfig[] = [
    { id: 'isAttendanceDevice', label: 'Attendance device', field: this.f.isAttendanceDevice },
    {
      id: 'isAccessControlDevice',
      label: 'Access control device',
      field: this.f.isAccessControlDevice,
    },
    { id: 'supportsFace', label: 'Face', field: this.f.supportsFace },
    { id: 'supportsFingerprint', label: 'Fingerprint', field: this.f.supportsFingerprint },
    { id: 'supportsCard', label: 'Card', field: this.f.supportsCard },
    { id: 'supportsPin', label: 'PIN', field: this.f.supportsPin },
    { id: 'supportsQrCode', label: 'QR code', field: this.f.supportsQrCode },
    { id: 'supportsTemperature', label: 'Temperature', field: this.f.supportsTemperature },
  ];

  protected readonly connectivityToggles: ToggleConfig[] = [
    { id: 'supportsHttp', label: 'HTTP', field: this.f.supportsHttp },
    { id: 'supportsHttps', label: 'HTTPS', field: this.f.supportsHttps },
    { id: 'supportsWebSocket', label: 'WebSocket', field: this.f.supportsWebSocket },
    { id: 'supportsTcpIp', label: 'TCP/IP', field: this.f.supportsTcpIp },
    { id: 'supportsCloudApi', label: 'Cloud API', field: this.f.supportsCloudApi },
    { id: 'supportsPushSdk', label: 'Push SDK', field: this.f.supportsPushSdk },
    { id: 'supportsMqtt', label: 'MQTT', field: this.f.supportsMqtt },
    { id: 'supportsMqtts', label: 'MQTTS', field: this.f.supportsMqtts },
    { id: 'supportsWifi', label: 'Wi-Fi', field: this.f.supportsWifi },
    { id: 'supportsEthernet', label: 'Ethernet', field: this.f.supportsEthernet },
    { id: 'supportsUsb', label: 'USB', field: this.f.supportsUsb },
  ];

  protected readonly connectivityFields: TextFieldConfig[] = [
    {
      id: 'supportedTlsVersions',
      label: 'TLS versions',
      field: this.f.supportedTlsVersions,
      placeholder: 'e.g. TLS 1.2, TLS 1.3',
    },
    {
      id: 'supportedProtocols',
      label: 'Protocols',
      field: this.f.supportedProtocols,
      placeholder: 'e.g. ISAPI, ONVIF',
    },
  ];

  protected readonly capacityFields: NumberFieldConfig[] = [
    { id: 'maxUserCapacity', label: 'Users', field: this.f.maxUserCapacity },
    { id: 'maxFaceCapacity', label: 'Faces', field: this.f.maxFaceCapacity },
    { id: 'maxFingerprintCapacity', label: 'Fingerprints', field: this.f.maxFingerprintCapacity },
    { id: 'maxCardCapacity', label: 'Cards', field: this.f.maxCardCapacity },
    {
      id: 'maxAttendanceRecordCapacity',
      label: 'Attendance records',
      field: this.f.maxAttendanceRecordCapacity,
    },
  ];

  protected readonly hardwareFields: TextFieldConfig[] = [
    { id: 'firmwareVersion', label: 'Firmware version', field: this.f.firmwareVersion },
    { id: 'softwareVersion', label: 'Software version', field: this.f.softwareVersion },
    { id: 'operatingSystem', label: 'Operating system', field: this.f.operatingSystem },
    { id: 'processorInfo', label: 'Processor', field: this.f.processorInfo },
    { id: 'memoryInfo', label: 'Memory', field: this.f.memoryInfo },
    { id: 'storageInfo', label: 'Storage', field: this.f.storageInfo },
    { id: 'displayInfo', label: 'Display', field: this.f.displayInfo },
    { id: 'cameraInfo', label: 'Camera', field: this.f.cameraInfo },
    { id: 'sensorInfo', label: 'Sensor', field: this.f.sensorInfo },
    { id: 'powerRequirement', label: 'Power requirement', field: this.f.powerRequirement },
    {
      id: 'operatingTemperature',
      label: 'Operating temperature',
      field: this.f.operatingTemperature,
    },
    { id: 'dimensions', label: 'Dimensions', field: this.f.dimensions },
    { id: 'weight', label: 'Weight', field: this.f.weight },
  ];

  protected readonly integrationFields: TextFieldConfig[] = [
    { id: 'integrationType', label: 'Integration type', field: this.f.integrationType },
    {
      id: 'apiDocumentationUrl',
      label: 'API documentation URL',
      field: this.f.apiDocumentationUrl,
      placeholder: 'https://example.com/api',
    },
    {
      id: 'sdkDocumentationUrl',
      label: 'SDK documentation URL',
      field: this.f.sdkDocumentationUrl,
      placeholder: 'https://example.com/sdk',
    },
  ];

  protected readonly mediaFields: TextFieldConfig[] = [
    { id: 'imageUrl', label: 'Image URL', field: this.f.imageUrl },
    { id: 'thumbnailUrl', label: 'Thumbnail URL', field: this.f.thumbnailUrl },
    { id: 'brochureUrl', label: 'Brochure URL', field: this.f.brochureUrl },
    { id: 'manualUrl', label: 'Manual URL', field: this.f.manualUrl },
  ];

  protected readonly noteFields: TextareaConfig[] = [
    { id: 'shortDescription', label: 'Short description', rows: 2, maxlength: 300 },
    { id: 'description', label: 'Description', rows: 3, maxlength: 2000 },
    { id: 'features', label: 'Features', rows: 3, maxlength: 2000 },
    { id: 'technicalSpecifications', label: 'Technical specifications', rows: 3, maxlength: 2000 },
    { id: 'additionalInfo', label: 'Additional info', rows: 2, maxlength: 2000 },
    { id: 'remark', label: 'Remark', rows: 2, maxlength: 500 },
  ];

  protected readonly isDirty = computed(
    () => JSON.stringify(this.model()) !== JSON.stringify(this.#baseline()),
  );

  canDeactivate(): boolean {
    return !this.isDirty();
  }

  /** Templates call this per field; the rule itself lives in `@shared/utilities/field-error`. */
  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
  }

  constructor() {
    this.#setPageHeaderInfo();

    if (this.deviceMasterId) {
      this.#hydrate(this.deviceMasterId);
    }
  }

  #setPageHeaderInfo(): void {
    const pageTitle = this.isEditMode ? 'Edit Device' : 'Add Device';

    this.#commonService.setPageHeaderInfo({
      pageTitle,
      pageDescription: this.isEditMode
        ? 'Update the catalog record for this device model'
        : 'Add a device model to the catalog',
      pageIcon: 'pi pi-tablet',
      isBreadcrumbShow: true,
    });
    this.#commonService.setBreadcrumbItems([
      { label: 'Device Masters', routerLink: '/app/device-masters' },
      { label: pageTitle },
    ]);
  }

  /** Edits read the row back from the API so the form always reflects server state. */
  #hydrate(id: number): void {
    this.isLoading.set(true);

    this.#deviceMasterApi
      .getDeviceMaster(id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          const device = res.isSucceeded ? res.data : null;
          if (!device) {
            this.#commonService.showMessage(res.message || 'Device not found', 'error');
            this.#leave();
            return;
          }
          this.#setModel(this.#toModel(device));
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
          this.#leave();
        },
      });
  }

  #toModel(device: DeviceMasterRow): DeviceMasterFormModel {
    return {
      ...emptyModel,
      sNo: device.sNo ?? '',
      deviceCode: device.deviceCode ?? '',
      deviceName: device.deviceName ?? '',
      modelNo: device.modelNo ?? '',
      productCode: device.productCode ?? '',
      companyName: device.companyName ?? '',
      brandName: device.brandName ?? '',
      countryOfOrigin: device.countryOfOrigin ?? '',
      manufacturerWebsite: device.manufacturerWebsite ?? '',
      supportEmail: device.supportEmail ?? '',
      supportContactNumber: device.supportContactNumber ?? '',
      deviceType: device.deviceType ?? null,

      isAttendanceDevice: device.isAttendanceDevice ?? false,
      isAccessControlDevice: device.isAccessControlDevice ?? false,
      supportsFace: device.supportsFace ?? false,
      supportsFingerprint: device.supportsFingerprint ?? false,
      supportsCard: device.supportsCard ?? false,
      supportsPin: device.supportsPin ?? false,
      supportsQrCode: device.supportsQrCode ?? false,
      supportsTemperature: device.supportsTemperature ?? false,

      supportsHttp: device.supportsHttp ?? false,
      supportsHttps: device.supportsHttps ?? false,
      supportsWebSocket: device.supportsWebSocket ?? false,
      supportsTcpIp: device.supportsTcpIp ?? false,
      supportsCloudApi: device.supportsCloudApi ?? false,
      supportsPushSdk: device.supportsPushSdk ?? false,
      supportsMqtt: device.supportsMqtt ?? false,
      supportsMqtts: device.supportsMqtts ?? false,
      supportsWifi: device.supportsWifi ?? false,
      supportsEthernet: device.supportsEthernet ?? false,
      supportsUsb: device.supportsUsb ?? false,
      supportedTlsVersions: device.supportedTlsVersions ?? '',
      supportedProtocols: device.supportedProtocols ?? '',

      maxUserCapacity: device.maxUserCapacity ?? null,
      maxFaceCapacity: device.maxFaceCapacity ?? null,
      maxFingerprintCapacity: device.maxFingerprintCapacity ?? null,
      maxCardCapacity: device.maxCardCapacity ?? null,
      maxAttendanceRecordCapacity: device.maxAttendanceRecordCapacity ?? null,

      firmwareVersion: device.firmwareVersion ?? '',
      softwareVersion: device.softwareVersion ?? '',
      operatingSystem: device.operatingSystem ?? '',
      processorInfo: device.processorInfo ?? '',
      memoryInfo: device.memoryInfo ?? '',
      storageInfo: device.storageInfo ?? '',
      displayInfo: device.displayInfo ?? '',
      cameraInfo: device.cameraInfo ?? '',
      sensorInfo: device.sensorInfo ?? '',
      powerRequirement: device.powerRequirement ?? '',
      operatingTemperature: device.operatingTemperature ?? '',
      dimensions: device.dimensions ?? '',
      weight: device.weight ?? '',

      price: device.price ?? null,
      currencyKey: device.currencyKey ?? '',
      warrantyPeriodMonths: device.warrantyPeriodMonths ?? null,
      warrantyDescription: device.warrantyDescription ?? '',

      isIntegrationSupported: device.isIntegrationSupported ?? false,
      integrationType: device.integrationType ?? '',
      apiDocumentationUrl: device.apiDocumentationUrl ?? '',
      sdkDocumentationUrl: device.sdkDocumentationUrl ?? '',

      imageUrl: device.imageUrl ?? '',
      thumbnailUrl: device.thumbnailUrl ?? '',
      brochureUrl: device.brochureUrl ?? '',
      manualUrl: device.manualUrl ?? '',

      shortDescription: device.shortDescription ?? '',
      description: device.description ?? '',
      features: device.features ?? '',
      technicalSpecifications: device.technicalSpecifications ?? '',
      additionalInfo: device.additionalInfo ?? '',
      remark: device.remark ?? '',

      isRecommended: device.isRecommended ?? false,
      isActive: device.isActive ?? true,
    };
  }

  onSubmit(): void {
    if (this.isSaving() || this.isLoading()) {
      return;
    }

    // The button stays enabled while the form is invalid, so submitting is how the user asks
    // "what is wrong?" — reveal everything, then take them to the first field to fix.
    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) {
      this.#focusFirstInvalid();
      return;
    }

    submit(this.f, async () => {
      const body = this.#buildRequest(this.model());
      this.isSaving.set(true);

      const request$: Observable<DeviceMutationRes> = this.deviceMasterId
        ? this.#deviceMasterApi.updateDeviceMaster({ ...body, id: this.deviceMasterId })
        : this.#deviceMasterApi.addDeviceMaster(body);

      request$
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            if (res.isSucceeded) {
              this.#leave();
            }
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  /** The schema validates the model in place, so the request body is where trimming happens. */
  #buildRequest(value: DeviceMasterFormModel): CreateDeviceMasterReq {
    return {
      sNo: nullable(value.sNo),
      deviceCode: nullable(value.deviceCode),
      deviceName: nullable(value.deviceName),
      modelNo: nullable(value.modelNo),
      productCode: nullable(value.productCode),
      companyName: nullable(value.companyName),
      brandName: nullable(value.brandName),
      countryOfOrigin: nullable(value.countryOfOrigin),
      manufacturerWebsite: nullable(value.manufacturerWebsite),
      supportEmail: nullable(value.supportEmail),
      supportContactNumber: nullable(value.supportContactNumber),
      // The schema has already ruled out null; the fallback only narrows the type.
      deviceType: (value.deviceType ?? DeviceType.FaceRecognition) as DeviceType,

      isAttendanceDevice: value.isAttendanceDevice,
      isAccessControlDevice: value.isAccessControlDevice,
      supportsFace: value.supportsFace,
      supportsFingerprint: value.supportsFingerprint,
      supportsCard: value.supportsCard,
      supportsPin: value.supportsPin,
      supportsQrCode: value.supportsQrCode,
      supportsTemperature: value.supportsTemperature,

      supportsHttp: value.supportsHttp,
      supportsHttps: value.supportsHttps,
      supportsWebSocket: value.supportsWebSocket,
      supportsTcpIp: value.supportsTcpIp,
      supportsCloudApi: value.supportsCloudApi,
      supportsPushSdk: value.supportsPushSdk,
      supportsMqtt: value.supportsMqtt,
      supportsMqtts: value.supportsMqtts,
      supportsWifi: value.supportsWifi,
      supportsEthernet: value.supportsEthernet,
      supportsUsb: value.supportsUsb,
      supportedTlsVersions: nullable(value.supportedTlsVersions),
      supportedProtocols: nullable(value.supportedProtocols),

      maxUserCapacity: value.maxUserCapacity,
      maxFaceCapacity: value.maxFaceCapacity,
      maxFingerprintCapacity: value.maxFingerprintCapacity,
      maxCardCapacity: value.maxCardCapacity,
      maxAttendanceRecordCapacity: value.maxAttendanceRecordCapacity,

      firmwareVersion: nullable(value.firmwareVersion),
      softwareVersion: nullable(value.softwareVersion),
      operatingSystem: nullable(value.operatingSystem),
      processorInfo: nullable(value.processorInfo),
      memoryInfo: nullable(value.memoryInfo),
      storageInfo: nullable(value.storageInfo),
      displayInfo: nullable(value.displayInfo),
      cameraInfo: nullable(value.cameraInfo),
      sensorInfo: nullable(value.sensorInfo),
      powerRequirement: nullable(value.powerRequirement),
      operatingTemperature: nullable(value.operatingTemperature),
      dimensions: nullable(value.dimensions),
      weight: nullable(value.weight),

      price: value.price,
      currencyKey: nullable(value.currencyKey),
      warrantyPeriodMonths: value.warrantyPeriodMonths,
      warrantyDescription: nullable(value.warrantyDescription),

      isIntegrationSupported: value.isIntegrationSupported,
      integrationType: nullable(value.integrationType),
      apiDocumentationUrl: nullable(value.apiDocumentationUrl),
      sdkDocumentationUrl: nullable(value.sdkDocumentationUrl),

      imageUrl: nullable(value.imageUrl),
      thumbnailUrl: nullable(value.thumbnailUrl),
      brochureUrl: nullable(value.brochureUrl),
      manualUrl: nullable(value.manualUrl),

      shortDescription: nullable(value.shortDescription),
      description: nullable(value.description),
      features: nullable(value.features),
      technicalSpecifications: nullable(value.technicalSpecifications),
      additionalInfo: nullable(value.additionalInfo),
      remark: nullable(value.remark),

      isRecommended: value.isRecommended,
      isActive: value.isActive,
    };
  }

  /**
   * `pTextarea` subscribes to `ngControl.valueChanges`, which Signal Forms does not provide, so the
   * value is written back by hand instead of through `[formField]`.
   */
  onTextareaInput(key: TextareaKey, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.model.update((m) => ({ ...m, [key]: value }));
    const field = this.f[key] as FieldTree<string>;
    field().markAsDirty();
    field().markAsTouched();
  }

  onCancel(): void {
    this.#router.navigate(['/app/device-masters']);
  }

  /** DOM order of the fields, so a blocked submit lands on the first one that needs attention. */
  #focusFirstInvalid(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const ordered: readonly (readonly [string, boolean])[] = [
      ['deviceCode', this.showError(this.f.deviceCode)],
      ['deviceName', this.showError(this.f.deviceName)],
      ['modelNo', this.showError(this.f.modelNo)],
      ['productCode', this.showError(this.f.productCode)],
      ['companyName', this.showError(this.f.companyName)],
      ['brandName', this.showError(this.f.brandName)],
      ['countryOfOrigin', this.showError(this.f.countryOfOrigin)],
      ['deviceType', this.showError(this.f.deviceType)],
      ['manufacturerWebsite', this.showError(this.f.manufacturerWebsite)],
      ['supportEmail', this.showError(this.f.supportEmail)],
      ['supportContactNumber', this.showError(this.f.supportContactNumber)],
      ['apiDocumentationUrl', this.showError(this.f.apiDocumentationUrl)],
      ['sdkDocumentationUrl', this.showError(this.f.sdkDocumentationUrl)],
      ['imageUrl', this.showError(this.f.imageUrl)],
      ['thumbnailUrl', this.showError(this.f.thumbnailUrl)],
      ['brochureUrl', this.showError(this.f.brochureUrl)],
      ['manualUrl', this.showError(this.f.manualUrl)],
    ];

    const id = ordered.find(([, hasError]) => hasError)?.[0];
    const element = id ? document.getElementById(id) : null;
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element?.focus({ preventScroll: true });
  }

  #setModel(model: DeviceMasterFormModel): void {
    this.model.set(model);
    this.#baseline.set(model);
  }

  /** Leaves without tripping `unsavedChangesGuard`. */
  #leave(): void {
    this.#baseline.set(this.model());
    this.#router.navigate(['/app/device-masters']);
  }
}
