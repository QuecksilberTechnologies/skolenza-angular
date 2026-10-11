import { DeviceSettingsLockModel, deviceSettingsLockSchema } from './device-settings-lock.schema';

const validModel: DeviceSettingsLockModel = {
  doorSensorMode: '0',
  antiPassbackMode: '0',
  wiegandOutput: '0',
  wiegandFormat: '0',
  cardDisplayFormat: '0',
  doorOpenDelaySeconds: 5,
  doorSensorDelaySeconds: 5,
  doorPassword: 123456,
  requiredUsersForDoorOpen: 1,
  accessLimit: 0,
  failedVerificationLimit: 0,
  timeZonePunchLimit: 0,
  blockStrangerAccess: false,
  reverseCardPin: false,
  reverseWiegandOutput: false,
  externalWiegandSnapshotEnabled: false,
  interlockEnabled: false,
  alarmProcessingEnabled: false,
  suppressAccessDeniedLog: false,
  denyOutsideNormallyOpenTimeZone: false,
};

describe('deviceSettingsLockSchema', () => {
  it('accepts a fully selected model', () => {
    expect(deviceSettingsLockSchema.safeParse(validModel).success).toBe(true);
  });

  it.each(['doorSensorMode', 'wiegandFormat'] as const)('requires %s to be picked', (key) => {
    expect(deviceSettingsLockSchema.safeParse({ ...validModel, [key]: '' }).success).toBe(false);
  });

  it('requires doorPassword to be set', () => {
    expect(deviceSettingsLockSchema.safeParse({ ...validModel, doorPassword: null }).success).toBe(
      false,
    );
  });
});
