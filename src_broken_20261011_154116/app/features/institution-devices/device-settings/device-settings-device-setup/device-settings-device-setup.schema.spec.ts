import {
  DeviceSettingsDeviceSetupModel,
  deviceSettingsDeviceSetupSchema,
} from './device-settings-device-setup.schema';

const validModel: DeviceSettingsDeviceSetupModel = {
  language: '1',
  screenWakeUpMethod: '0',
  resultDisplayStyle: '0',
  faceRecognitionDistance: '1',
  voiceVolume: 80,
  resultDisplaySeconds: 3,
  screenSaverIdleSeconds: 60,
  sleepModeSeconds: 0,
  faceWakeUpSeconds: 1,
  announcePersonName: true,
  detectMultipleFaces: false,
  livenessDetectionEnabled: true,
  showAvatar: false,
};

describe('deviceSettingsDeviceSetupSchema', () => {
  it('accepts a fully selected model', () => {
    expect(deviceSettingsDeviceSetupSchema.safeParse(validModel).success).toBe(true);
  });

  it.each(['language', 'faceRecognitionDistance'] as const)('requires %s to be picked', (key) => {
    expect(deviceSettingsDeviceSetupSchema.safeParse({ ...validModel, [key]: '' }).success).toBe(
      false,
    );
  });

  it('requires voiceVolume to be set', () => {
    expect(
      deviceSettingsDeviceSetupSchema.safeParse({ ...validModel, voiceVolume: null }).success,
    ).toBe(false);
  });
});
