import { DeviceType } from './device';

/**
 * The global device catalog behind `/api/DeviceMaster/*`.
 *
 * ASSUMED CONTRACT — swagger documents the request DTOs but declares every response as a bare
 * `200 OK` with no schema, so the row and envelope shapes below follow the house convention
 * (`{ isSucceeded, message, errors, data }`, paginated reads adding the four page fields).
 */

/** Fields shared by the create and update DTOs and echoed back on reads. */
export interface DeviceMasterFields {
  sNo: string | null;
  deviceCode: string | null;
  deviceName: string | null;
  modelNo: string | null;
  productCode: string | null;
  companyName: string | null;
  brandName: string | null;
  countryOfOrigin: string | null;
  manufacturerWebsite: string | null;
  supportEmail: string | null;
  supportContactNumber: string | null;
  deviceType: DeviceType;
  isAttendanceDevice: boolean;
  isAccessControlDevice: boolean;
  supportsFace: boolean;
  supportsFingerprint: boolean;
  supportsCard: boolean;
  supportsPin: boolean;
  supportsQrCode: boolean;
  supportsTemperature: boolean;
  supportsHttp: boolean;
  supportsHttps: boolean;
  supportsWebSocket: boolean;
  supportsTcpIp: boolean;
  supportsCloudApi: boolean;
  supportsPushSdk: boolean;
  supportsMqtt: boolean;
  supportsMqtts: boolean;
  supportsWifi: boolean;
  supportsEthernet: boolean;
  supportsUsb: boolean;
  supportedTlsVersions: string | null;
  supportedProtocols: string | null;
  maxUserCapacity: number | null;
  maxFaceCapacity: number | null;
  maxFingerprintCapacity: number | null;
  maxCardCapacity: number | null;
  maxAttendanceRecordCapacity: number | null;
  firmwareVersion: string | null;
  softwareVersion: string | null;
  operatingSystem: string | null;
  processorInfo: string | null;
  memoryInfo: string | null;
  storageInfo: string | null;
  displayInfo: string | null;
  cameraInfo: string | null;
  sensorInfo: string | null;
  powerRequirement: string | null;
  operatingTemperature: string | null;
  dimensions: string | null;
  weight: string | null;
  features: string | null;
  technicalSpecifications: string | null;
  price: number | null;
  currencyKey: string | null;
  warrantyPeriodMonths: number | null;
  warrantyDescription: string | null;
  isIntegrationSupported: boolean;
  integrationType: string | null;
  apiDocumentationUrl: string | null;
  sdkDocumentationUrl: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  brochureUrl: string | null;
  manualUrl: string | null;
  shortDescription: string | null;
  description: string | null;
  additionalInfo: string | null;
  remark: string | null;
  isRecommended: boolean;
  isActive: boolean;
}

export interface DeviceMasterRow extends DeviceMasterFields {
  id: number;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isUpdatingStatus?: boolean; // NG
  isDeleting?: boolean; // NG
}

/** Query params are PascalCase on this controller. */
export interface GetDeviceMastersReq {
  Search?: string | null;
  DeviceType?: DeviceType | null;
  IsActive?: boolean | null;
  PageNumber?: number | null;
  PageSize?: number | null;
}

export interface GetDeviceMastersRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: DeviceMasterRow[];
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface GetDeviceMasterRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: DeviceMasterRow | null;
}

export type CreateDeviceMasterReq = DeviceMasterFields;

/** `/update` carries the id in the body and replaces the record, so every field has to be resent. */
export type UpdateDeviceMasterReq = CreateDeviceMasterReq & { id: number };

export interface UpdateDeviceMasterStatusReq {
  id: number;
  isActive: boolean;
}

export interface DeviceMutationRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: unknown;
}
