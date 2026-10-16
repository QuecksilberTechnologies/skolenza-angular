import {
  DeviceSettingsAppNotificationModel,
  deviceSettingsAppNotificationSchema,
} from './device-settings-app-notification.schema';

const validModel: DeviceSettingsAppNotificationModel = {
  appNotificationEnabled: true,
  appToken: 'a-token',
  notificationType: '0',
};

describe('deviceSettingsAppNotificationSchema', () => {
  it('accepts a fully selected model', () => {
    expect(deviceSettingsAppNotificationSchema.safeParse(validModel).success).toBe(true);
  });

  it('accepts a blank app token when notifications are disabled', () => {
    expect(
      deviceSettingsAppNotificationSchema.safeParse({
        ...validModel,
        appNotificationEnabled: false,
        appToken: '',
      }).success,
    ).toBe(true);
  });

  it('requires an app token when notifications are enabled', () => {
    expect(
      deviceSettingsAppNotificationSchema.safeParse({
        ...validModel,
        appNotificationEnabled: true,
        appToken: '',
      }).success,
    ).toBe(false);
  });

  it('requires notificationType to be picked', () => {
    expect(
      deviceSettingsAppNotificationSchema.safeParse({ ...validModel, notificationType: '' })
        .success,
    ).toBe(false);
  });
});
