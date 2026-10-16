import { deviceSettingsEthernetSchema } from './device-settings-ethernet.schema';

describe('deviceSettingsEthernetSchema', () => {
  it('accepts a fully blank, DHCP-only model', () => {
    const result = deviceSettingsEthernetSchema.safeParse({
      dhcpEnabled: true,
      hideIpAddress: false,
      ipAddress: '',
      subnetMask: '',
      gateway: '',
      dnsServer: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a fully populated static model', () => {
    const result = deviceSettingsEthernetSchema.safeParse({
      dhcpEnabled: false,
      hideIpAddress: false,
      ipAddress: '192.168.1.201',
      subnetMask: '255.255.255.0',
      gateway: '192.168.1.1',
      dnsServer: '8.8.8.8',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed IPv4 value', () => {
    const result = deviceSettingsEthernetSchema.safeParse({
      dhcpEnabled: false,
      hideIpAddress: false,
      ipAddress: 'not-an-ip',
      subnetMask: '',
      gateway: '',
      dnsServer: '',
    });
    expect(result.success).toBe(false);
  });
});
