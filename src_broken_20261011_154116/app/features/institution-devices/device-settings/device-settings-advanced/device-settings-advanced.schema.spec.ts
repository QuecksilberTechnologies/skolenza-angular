import {
  DeviceSettingsAdvancedModel,
  deviceSettingsAdvancedSchema,
} from './device-settings-advanced.schema';

const validModel: DeviceSettingsAdvancedModel = {
  verificationMode: '1',
  qrCodeMode: '0',
  fillLightMode: '0',
  maximumAdministrators: 5,
  faceMatchThreshold: 80,
  livenessThreshold: 80,
  fingerprintMatchThreshold: 60,
  fingerprintsPerUser: 3,
  maskThreshold: 50,
  exposureCompensation: 0,
  palmVeinMatchThreshold: 60,
  palmDetectionThreshold: 60,
  constantFillLightPeriod: '',
  hidePrivacyInformation: false,
  maskDetectionEnabled: false,
  disableFaceRecognition: false,
  onlineDebugEnabled: false,
};

describe('deviceSettingsAdvancedSchema', () => {
  it('accepts a fully selected model', () => {
    expect(deviceSettingsAdvancedSchema.safeParse(validModel).success).toBe(true);
  });

  it.each(['verificationMode', 'qrCodeMode', 'fillLightMode'] as const)(
    'requires %s to be picked',
    (key) => {
      expect(deviceSettingsAdvancedSchema.safeParse({ ...validModel, [key]: '' }).success).toBe(
        false,
      );
    },
  );

  it.each(['faceMatchThreshold', 'palmDetectionThreshold'] as const)(
    'requires %s to be set',
    (key) => {
      expect(deviceSettingsAdvancedSchema.safeParse({ ...validModel, [key]: null }).success).toBe(
        false,
      );
    },
  );
});
