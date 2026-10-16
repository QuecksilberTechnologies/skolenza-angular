import { DeviceConnectionFormModel, deviceConnectionSchema } from './device-connection-form.schema';

const validModel = (
  overrides: Partial<DeviceConnectionFormModel> = {},
): DeviceConnectionFormModel => ({
  ipAddress: '',
  macAddress: '',
  devicePort: null,
  communicationType: 4,

  serverHost: '',
  serverPort: null,
  serverPath: '',
  serverUrl: '',
  pushMode: '',
  heartbeatIntervalSeconds: null,
  timeZoneId: '',
  configuration: '',

  isEnrollmentEnabled: false,
  isAttendancePushEnabled: false,
  isAutoSyncEnabled: false,
  ...overrides,
});

const messagesFor = (model: DeviceConnectionFormModel, field: string): string[] => {
  const result = deviceConnectionSchema.safeParse(model);
  if (result.success) {
    return [];
  }
  return result.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
};

describe('deviceConnectionSchema', () => {
  it('accepts a model with only the required fields filled', () => {
    expect(deviceConnectionSchema.safeParse(validModel()).success).toBe(true);
  });

  it('requires communicationType', () => {
    expect(messagesFor(validModel({ communicationType: null }), 'communicationType')).toContain(
      'Communication type is required',
    );
  });

  it('accepts blank optional patterns but rejects malformed ones', () => {
    expect(messagesFor(validModel({ ipAddress: '' }), 'ipAddress')).toEqual([]);
    expect(messagesFor(validModel({ ipAddress: '192.168.1.50' }), 'ipAddress')).toEqual([]);
    expect(messagesFor(validModel({ ipAddress: '999.1.1.1' }), 'ipAddress')).toHaveLength(1);

    expect(messagesFor(validModel({ macAddress: '00:1A:2B:3C:4D:5E' }), 'macAddress')).toEqual([]);
    expect(messagesFor(validModel({ macAddress: '00-1A-2B' }), 'macAddress')).toHaveLength(1);

    expect(messagesFor(validModel({ serverUrl: 'https://example.com' }), 'serverUrl')).toEqual([]);
    expect(messagesFor(validModel({ serverUrl: 'not a url' }), 'serverUrl')).toHaveLength(1);
  });

  it('keeps ports inside the TCP range', () => {
    expect(messagesFor(validModel({ devicePort: 4370 }), 'devicePort')).toEqual([]);
    expect(messagesFor(validModel({ devicePort: 0 }), 'devicePort')).toHaveLength(1);
    expect(messagesFor(validModel({ serverPort: 65536 }), 'serverPort')).toHaveLength(1);
  });

  it('rejects a negative heartbeat interval', () => {
    expect(
      messagesFor(validModel({ heartbeatIntervalSeconds: 0 }), 'heartbeatIntervalSeconds'),
    ).toEqual([]);
    expect(
      messagesFor(validModel({ heartbeatIntervalSeconds: -1 }), 'heartbeatIntervalSeconds'),
    ).toHaveLength(1);
  });
});
