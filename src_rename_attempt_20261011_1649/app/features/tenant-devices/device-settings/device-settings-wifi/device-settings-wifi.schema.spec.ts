import { deviceSettingsWifiSchema } from './device-settings-wifi.schema';

describe('deviceSettingsWifiSchema', () => {
  it('accepts a fully blank, DHCP-only model', () => {
    const result = deviceSettingsWifiSchema.safeParse({
      dhcpEnabled: true,
      ipAddress: '',
      subnetMask: '',
      gateway: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a fully populated static model', () => {
    const result = deviceSettingsWifiSchema.safeParse({
      dhcpEnabled: false,
      ipAddress: '192.168.1.201',
      subnetMask: '255.255.255.0',
      gateway: '192.168.1.1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed IPv4 value', () => {
    const result = deviceSettingsWifiSchema.safeParse({
      dhcpEnabled: false,
      ipAddress: 'not-an-ip',
      subnetMask: '',
      gateway: '',
    });
    expect(result.success).toBe(false);
  });
});
