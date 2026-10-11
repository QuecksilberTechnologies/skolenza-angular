import { DeviceSettingsBellModel, deviceSettingsBellSchema } from './device-settings-bell.schema';

const validModel: DeviceSettingsBellModel = {
  bellCount: 1,
  ringStyle: '0',
  bellOutput: '0',
};

describe('deviceSettingsBellSchema', () => {
  it('accepts a fully selected model', () => {
    expect(deviceSettingsBellSchema.safeParse(validModel).success).toBe(true);
  });

  it('requires bellCount to be set', () => {
    expect(deviceSettingsBellSchema.safeParse({ ...validModel, bellCount: null }).success).toBe(
      false,
    );
  });

  it.each(['ringStyle', 'bellOutput'] as const)('requires %s to be picked', (key) => {
    expect(deviceSettingsBellSchema.safeParse({ ...validModel, [key]: '' }).success).toBe(false);
  });

  it('rejects a negative bell count', () => {
    expect(deviceSettingsBellSchema.safeParse({ ...validModel, bellCount: -1 }).success).toBe(
      false,
    );
  });
});
