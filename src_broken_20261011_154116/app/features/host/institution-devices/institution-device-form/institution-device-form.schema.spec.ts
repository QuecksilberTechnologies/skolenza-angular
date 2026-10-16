import { InstitutionDeviceFormModel, institutionDeviceSchema } from './institution-device-form.schema';

const validModel = (overrides: Partial<InstitutionDeviceFormModel> = {}): InstitutionDeviceFormModel => ({
  institutionId: 'TEN00005',
  institutionLocationId: 9,
  deviceMasterId: 3,

  deviceCode: 'HO-GATE-01',
  deviceName: 'Head Office Main Gate',

  installedDateTime: null,
  installedBy: null,
  installationRemark: '',

  isAttendanceDevice: true,

  description: '',
  remark: '',

  isActive: true,
  ...overrides,
});

const messagesFor = (model: InstitutionDeviceFormModel, field: string): string[] => {
  const result = institutionDeviceSchema.safeParse(model);
  if (result.success) {
    return [];
  }
  return result.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
};

describe('institutionDeviceSchema', () => {
  it('accepts a model with only the required fields filled', () => {
    expect(institutionDeviceSchema.safeParse(validModel()).success).toBe(true);
  });

  it.each([
    ['institutionId', { institutionId: null }, 'Institution is required'],
    ['institutionId', { institutionId: '  ' }, 'Institution is required'],
    ['institutionLocationId', { institutionLocationId: null }, 'Location is required'],
    ['deviceMasterId', { deviceMasterId: null }, 'Device model is required'],
    ['deviceCode', { deviceCode: '   ' }, 'Device code is required'],
    ['deviceName', { deviceName: '' }, 'Device name is required'],
  ])('requires %s', (field, overrides, message) => {
    expect(messagesFor(validModel(overrides as Partial<InstitutionDeviceFormModel>), field)).toContain(
      message,
    );
  });

  it('caps the free-text fields', () => {
    expect(messagesFor(validModel({ deviceCode: 'x'.repeat(51) }), 'deviceCode')).toHaveLength(1);
    expect(messagesFor(validModel({ deviceName: 'x'.repeat(151) }), 'deviceName')).toHaveLength(1);
    expect(
      messagesFor(validModel({ installationRemark: 'x'.repeat(501) }), 'installationRemark'),
    ).toHaveLength(1);
    expect(messagesFor(validModel({ remark: 'x'.repeat(501) }), 'remark')).toHaveLength(1);
    expect(messagesFor(validModel({ description: 'x'.repeat(2001) }), 'description')).toHaveLength(
      1,
    );
  });

  // No control writes it; the form only has to carry back whatever `get-by-id` returned.
  it('takes installedBy as a number or null', () => {
    expect(institutionDeviceSchema.safeParse(validModel({ installedBy: 12 })).success).toBe(true);
    expect(institutionDeviceSchema.safeParse(validModel({ installedBy: null })).success).toBe(true);
  });

  it('takes the installation stamp as a date or null', () => {
    expect(
      institutionDeviceSchema.safeParse(validModel({ installedDateTime: new Date('2026-01-10') }))
        .success,
    ).toBe(true);
    expect(messagesFor(validModel({ installedDateTime: null }), 'installedDateTime')).toEqual([]);
  });
});
