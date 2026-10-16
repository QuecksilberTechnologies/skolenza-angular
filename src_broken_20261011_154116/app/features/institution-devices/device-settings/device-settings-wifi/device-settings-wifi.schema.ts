import * as z from 'zod';

import { IP_ADDRESS_PATTERN } from '@shared/utilities/validation-regex';

const ipv4 = (label: string) =>
  z.string().refine((value) => value.trim() === '' || IP_ADDRESS_PATTERN.test(value.trim()), {
    message: `${label} must be a valid IPv4 address`,
  });

export const deviceSettingsWifiSchema = z.object({
  dhcpEnabled: z.boolean(),
  ipAddress: ipv4('IP address'),
  subnetMask: ipv4('Subnet mask'),
  gateway: ipv4('Gateway'),
});

export type DeviceSettingsWifiModel = z.input<typeof deviceSettingsWifiSchema>;
