import * as z from 'zod';

import { EMAIL_PATTERN, URL_PATTERN } from '@shared/utilities/validation-regex';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates the
 * model in place — the numbers stay `number | null` so their placeholders show, and `onSubmit()` is
 * still what narrows and trims them for the request body.
 */
const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

const optionalUrl = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || URL_PATTERN.test(value), `${label} must be a valid URL`);

/** Blank stays `null` so the input shows its placeholder; a filled value has to clear `minimum`. */
const optionalNumber = (label: string, minimum: number) =>
  z.number().min(minimum, `${label} cannot be less than ${minimum}`).nullable();

export const deviceMasterSchema = z.object({
  sNo: optionalText(100, 'Serial number'),
  deviceCode: z
    .string()
    .trim()
    .min(1, 'Device code is required')
    .max(50, 'Device code must be at most 50 characters'),
  deviceName: z
    .string()
    .trim()
    .min(1, 'Device name is required')
    .max(150, 'Device name must be at most 150 characters'),
  modelNo: optionalText(100, 'Model no'),
  productCode: optionalText(100, 'Product code'),
  companyName: optionalText(150, 'Company name'),
  brandName: optionalText(150, 'Brand name'),
  countryOfOrigin: optionalText(100, 'Country of origin'),
  manufacturerWebsite: optionalUrl('Manufacturer website'),
  supportEmail: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || EMAIL_PATTERN.test(value),
      'Support email must be a valid email address',
    ),
  supportContactNumber: optionalText(20, 'Support contact number'),
  deviceType: z
    .number()
    .nullable()
    .refine((value) => value !== null, 'Device type is required'),

  isAttendanceDevice: z.boolean(),
  isAccessControlDevice: z.boolean(),
  supportsFace: z.boolean(),
  supportsFingerprint: z.boolean(),
  supportsCard: z.boolean(),
  supportsPin: z.boolean(),
  supportsQrCode: z.boolean(),
  supportsTemperature: z.boolean(),

  supportsHttp: z.boolean(),
  supportsHttps: z.boolean(),
  supportsWebSocket: z.boolean(),
  supportsTcpIp: z.boolean(),
  supportsCloudApi: z.boolean(),
  supportsPushSdk: z.boolean(),
  supportsMqtt: z.boolean(),
  supportsMqtts: z.boolean(),
  supportsWifi: z.boolean(),
  supportsEthernet: z.boolean(),
  supportsUsb: z.boolean(),
  supportedTlsVersions: optionalText(100, 'TLS versions'),
  supportedProtocols: optionalText(200, 'Protocols'),

  maxUserCapacity: optionalNumber('Max user capacity', 0),
  maxFaceCapacity: optionalNumber('Max face capacity', 0),
  maxFingerprintCapacity: optionalNumber('Max fingerprint capacity', 0),
  maxCardCapacity: optionalNumber('Max card capacity', 0),
  maxAttendanceRecordCapacity: optionalNumber('Max attendance record capacity', 0),

  firmwareVersion: optionalText(50, 'Firmware version'),
  softwareVersion: optionalText(50, 'Software version'),
  operatingSystem: optionalText(100, 'Operating system'),
  processorInfo: optionalText(200, 'Processor info'),
  memoryInfo: optionalText(200, 'Memory info'),
  storageInfo: optionalText(200, 'Storage info'),
  displayInfo: optionalText(200, 'Display info'),
  cameraInfo: optionalText(200, 'Camera info'),
  sensorInfo: optionalText(200, 'Sensor info'),
  powerRequirement: optionalText(200, 'Power requirement'),
  operatingTemperature: optionalText(100, 'Operating temperature'),
  dimensions: optionalText(100, 'Dimensions'),
  weight: optionalText(50, 'Weight'),

  price: optionalNumber('Price', 0),
  currencyKey: optionalText(10, 'Currency'),
  warrantyPeriodMonths: optionalNumber('Warranty period', 0),
  warrantyDescription: optionalText(500, 'Warranty description'),

  isIntegrationSupported: z.boolean(),
  integrationType: optionalText(100, 'Integration type'),
  apiDocumentationUrl: optionalUrl('API documentation URL'),
  sdkDocumentationUrl: optionalUrl('SDK documentation URL'),

  imageUrl: optionalUrl('Image URL'),
  thumbnailUrl: optionalUrl('Thumbnail URL'),
  brochureUrl: optionalUrl('Brochure URL'),
  manualUrl: optionalUrl('Manual URL'),

  shortDescription: optionalText(300, 'Short description'),
  description: optionalText(2000, 'Description'),
  features: optionalText(2000, 'Features'),
  technicalSpecifications: optionalText(2000, 'Technical specifications'),
  additionalInfo: optionalText(2000, 'Additional info'),
  remark: optionalText(500, 'Remark'),

  isRecommended: z.boolean(),
  isActive: z.boolean(),
});

/** `z.input`, not `z.infer` — the trailing `.refine` on `deviceType` narrows null out of the output
 *  type, but the model has to keep holding null for the empty select. */
export type DeviceMasterFormModel = z.input<typeof deviceMasterSchema>;
