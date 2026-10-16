import {
  DeviceSettingsWebAccessModel,
  deviceSettingsWebAccessSchema,
} from './device-settings-web-access.schema';

const validModel: DeviceSettingsWebAccessModel = {
  localWebServerEnabled: true,
  newWebServerPassword: '',
};

describe('deviceSettingsWebAccessSchema', () => {
  it('accepts a blank new password', () => {
    expect(deviceSettingsWebAccessSchema.safeParse(validModel).success).toBe(true);
  });

  it('accepts a valid new password', () => {
    expect(
      deviceSettingsWebAccessSchema.safeParse({ ...validModel, newWebServerPassword: 'abcd' })
        .success,
    ).toBe(true);
  });

  it('rejects a new password under 4 characters', () => {
    expect(
      deviceSettingsWebAccessSchema.safeParse({ ...validModel, newWebServerPassword: 'ab' })
        .success,
    ).toBe(false);
  });

  it('rejects a new password over 128 characters', () => {
    expect(
      deviceSettingsWebAccessSchema.safeParse({
        ...validModel,
        newWebServerPassword: 'a'.repeat(129),
      }).success,
    ).toBe(false);
  });
});
