import { DeviceSettingsTimeModel, deviceSettingsTimeSchema } from './device-settings-time.schema';

const validModel: DeviceSettingsTimeModel = {
  timeFormat: '1',
  dateFormat: '1',
  timeZone: '330',
  daylightSavingEnabled: false,
  daylightSavingStart: '',
  daylightSavingEnd: '',
  networkTimeEnabled: true,
  rebootTime1: '',
  rebootTime2: '',
  rebootTime3: '',
};

describe('deviceSettingsTimeSchema', () => {
  it('accepts a fully selected model', () => {
    expect(deviceSettingsTimeSchema.safeParse(validModel).success).toBe(true);
  });

  it.each(['timeFormat', 'dateFormat', 'timeZone'] as const)('requires %s to be picked', (key) => {
    const result = deviceSettingsTimeSchema.safeParse({ ...validModel, [key]: '' });
    expect(result.success).toBe(false);
  });
});
