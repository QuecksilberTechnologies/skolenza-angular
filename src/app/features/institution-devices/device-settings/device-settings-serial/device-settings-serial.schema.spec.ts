import {
  DeviceSettingsSerialModel,
  deviceSettingsSerialSchema,
} from './device-settings-serial.schema';

const validModel: DeviceSettingsSerialModel = {
  baudRate: '38400',
  serialFunction: '0',
  deviceAddress: 1,
  networkPort: 5005,
};

describe('deviceSettingsSerialSchema', () => {
  it('accepts a fully selected model', () => {
    expect(deviceSettingsSerialSchema.safeParse(validModel).success).toBe(true);
  });

  it.each(['baudRate', 'serialFunction'] as const)('requires %s to be picked', (key) => {
    expect(deviceSettingsSerialSchema.safeParse({ ...validModel, [key]: '' }).success).toBe(false);
  });

  it.each(['deviceAddress', 'networkPort'] as const)('requires %s to be set', (key) => {
    expect(deviceSettingsSerialSchema.safeParse({ ...validModel, [key]: null }).success).toBe(
      false,
    );
  });

  it('rejects a device address above 9999', () => {
    expect(
      deviceSettingsSerialSchema.safeParse({ ...validModel, deviceAddress: 10000 }).success,
    ).toBe(false);
  });

  it('rejects a non-positive network port', () => {
    expect(deviceSettingsSerialSchema.safeParse({ ...validModel, networkPort: 0 }).success).toBe(
      false,
    );
  });
});
