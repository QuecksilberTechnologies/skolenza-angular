import { DeviceType } from '@shared/interfaces';

import { DeviceMasterFormModel, deviceMasterSchema } from './device-master-form.schema';

const validModel = (overrides: Partial<DeviceMasterFormModel> = {}): DeviceMasterFormModel => ({
  sNo: 'SN-0001',
  deviceCode: 'ZK-UF100',
  deviceName: 'UFace 100',
  modelNo: '',
  productCode: '',
  companyName: '',
  brandName: '',
  countryOfOrigin: '',
  manufacturerWebsite: '',
  supportEmail: '',
  supportContactNumber: '',
  deviceType: DeviceType.MultiBiometric,

  isAttendanceDevice: true,
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
  ...overrides,
});

const messagesFor = (model: DeviceMasterFormModel, field: string): string[] => {
  const result = deviceMasterSchema.safeParse(model);
  if (result.success) {
    return [];
  }
  return result.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
};

describe('deviceMasterSchema', () => {
  it('accepts a model with only the required fields filled', () => {
    expect(deviceMasterSchema.safeParse(validModel()).success).toBe(true);
  });

  it.each([
    ['deviceCode', { deviceCode: '   ' }, 'Device code is required'],
    ['deviceName', { deviceName: '' }, 'Device name is required'],
    ['deviceType', { deviceType: null }, 'Device type is required'],
  ])('requires %s', (field, overrides, message) => {
    expect(messagesFor(validModel(overrides as Partial<DeviceMasterFormModel>), field)).toContain(
      message,
    );
  });

  it('accepts blank optional patterns but rejects malformed ones', () => {
    expect(messagesFor(validModel({ supportEmail: '' }), 'supportEmail')).toEqual([]);
    expect(
      messagesFor(validModel({ supportEmail: 'support@example.com' }), 'supportEmail'),
    ).toEqual([]);
    expect(messagesFor(validModel({ supportEmail: 'support@' }), 'supportEmail')).toHaveLength(1);

    expect(messagesFor(validModel({ imageUrl: 'https://example.com/a.png' }), 'imageUrl')).toEqual(
      [],
    );
    expect(messagesFor(validModel({ imageUrl: 'example.com' }), 'imageUrl')).toHaveLength(1);
  });

  it('keeps capacities and prices non-negative while allowing blanks', () => {
    expect(messagesFor(validModel({ maxUserCapacity: null }), 'maxUserCapacity')).toEqual([]);
    expect(messagesFor(validModel({ maxUserCapacity: 0 }), 'maxUserCapacity')).toEqual([]);
    expect(messagesFor(validModel({ maxUserCapacity: -1 }), 'maxUserCapacity')).toHaveLength(1);
    expect(messagesFor(validModel({ price: -5 }), 'price')).toHaveLength(1);
  });

  it('caps free-text lengths', () => {
    expect(messagesFor(validModel({ modelNo: 'x'.repeat(101) }), 'modelNo')).toEqual([
      'Model no must be at most 100 characters',
    ]);
  });
});
