import { deviceSettingsScreenMenuPinSchema } from './device-settings-screen-menu-pin.schema';

describe('deviceSettingsScreenMenuPinSchema', () => {
  it.each(['1234', '123456789012'])('accepts a %s-digit PIN', (screenMenuPin) => {
    expect(deviceSettingsScreenMenuPinSchema.safeParse({ screenMenuPin }).success).toBe(true);
  });

  it('rejects a PIN under 4 digits', () => {
    expect(deviceSettingsScreenMenuPinSchema.safeParse({ screenMenuPin: '123' }).success).toBe(
      false,
    );
  });

  it('rejects a PIN over 12 digits', () => {
    expect(
      deviceSettingsScreenMenuPinSchema.safeParse({ screenMenuPin: '1234567890123' }).success,
    ).toBe(false);
  });

  it('rejects non-numeric characters', () => {
    expect(deviceSettingsScreenMenuPinSchema.safeParse({ screenMenuPin: '12ab' }).success).toBe(
      false,
    );
  });

  it('rejects a blank PIN', () => {
    expect(deviceSettingsScreenMenuPinSchema.safeParse({ screenMenuPin: '' }).success).toBe(false);
  });
});
