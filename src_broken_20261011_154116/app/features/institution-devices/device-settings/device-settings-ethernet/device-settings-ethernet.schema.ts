import * as z from 'zod';

import { IP_ADDRESS_PATTERN } from '@shared/utilities/validation-regex';

const ipv4 = (label: string) =>
  z.string().refine((value) => value.trim() === '' || IP_ADDRESS_PATTERN.test(value.trim()), {
    message: `${label} must be a valid IPv4 address`,
  });

export const deviceSettingsEthernetSchema = z.object({
  dhcpEnabled: z.boolean(),
  hideIpAddress: z.boolean(),
  ipAddress: ipv4('IP address'),
  subnetMask: ipv4('Subnet mask'),
  gateway: ipv4('Gateway'),
  dnsServer: ipv4('DNS server'),
});

export type DeviceSettingsEthernetModel = z.input<typeof deviceSettingsEthernetSchema>;
