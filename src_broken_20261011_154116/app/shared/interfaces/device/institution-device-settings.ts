/**
 * Live device-settings pushes, behind `/api/InstitutionDeviceConfiguration/settings/*`.
 *
 * Institution-only: the backend's `InstitutionDeviceConfigurationPermissionBehavior` denies Host principals
 * on every route in this file - see `docs/specs/InstitutionDeviceRuntimeSettingsUiHandoff.md`. `moduleId` /
 * `operationId` are omitted from the request shapes below - `moduleOperationInterceptor` fills them
 * via the `institutiondeviceconfiguration: 'INSTITUTION_DEVICE_CONFIG'` controller fallback - but that
 * interceptor never touches `institutionId` / `institutionDeviceId`, so both are sent explicitly.
 *
 * `institutionDeviceId` is an opaque token, not the numeric `InstitutionDeviceRow.id` — the handoff doc: "Store
 * it as a string; never parse it or replace it with a database number." In practice it is that same
 * numeric id stringified, so callers keep using `InstitutionDeviceRow.id: number` for routing/lookup and
 * `String(id)` only at the point a request body is built.
 */

interface DeviceSettingsBase {
  institutionId: string;
  institutionDeviceId: string;
  currentWebServerPassword: string | null;
}

export interface UpdateInstitutionDeviceTimeSettingsReq extends DeviceSettingsBase {
  timeFormat: number;
  dateFormat: number;
  daylightSavingEnabled: boolean;
  daylightSavingStart: string | null;
  daylightSavingEnd: string | null;
  networkTimeEnabled: boolean;
  timeZone: number;
  rebootTime1: string | null;
  rebootTime2: string | null;
  rebootTime3: string | null;
}

export interface SyncInstitutionDeviceTimeReq extends DeviceSettingsBase {
  /** ISO UTC string. Omit to let the server use its own UTC clock. */
  utcDateTime?: string;
}

export interface UpdateInstitutionDeviceBellSettingsReq extends DeviceSettingsBase {
  bellCount: number;
  ringStyle: number;
  bellOutput: number;
}

export interface UpdateInstitutionDeviceSetupSettingsReq extends DeviceSettingsBase {
  language: number;
  voiceVolume: number;
  announcePersonName: boolean;
  detectMultipleFaces: boolean;
  resultDisplaySeconds: number;
  screenSaverIdleSeconds: number;
  sleepModeSeconds: number;
  screenWakeUpMethod: number;
  faceWakeUpSeconds: number;
  resultDisplayStyle: number;
  faceRecognitionDistance: number;
  livenessDetectionEnabled: boolean;
  showAvatar: boolean;
}

export interface UpdateInstitutionDeviceAdvancedSettingsReq extends DeviceSettingsBase {
  maximumAdministrators: number;
  verificationMode: number;
  qrCodeMode: number;
  hidePrivacyInformation: boolean;
  faceMatchThreshold: number;
  livenessThreshold: number;
  fingerprintMatchThreshold: number;
  fingerprintsPerUser: number;
  maskDetectionEnabled: boolean;
  maskThreshold: number;
  fillLightMode: number;
  constantFillLightPeriod: string | null;
  exposureCompensation: number;
  palmVeinMatchThreshold: number;
  palmDetectionThreshold: number;
  disableFaceRecognition: boolean;
  onlineDebugEnabled: boolean;
}

export interface UpdateInstitutionDeviceLockSettingsReq extends DeviceSettingsBase {
  doorOpenDelaySeconds: number;
  doorSensorMode: number;
  doorSensorDelaySeconds: number;
  blockStrangerAccess: boolean;
  doorPassword: number;
  requiredUsersForDoorOpen: number;
  antiPassbackMode: number;
  wiegandOutput: number;
  wiegandFormat: number;
  accessLimit: number;
  cardDisplayFormat: number;
  reverseCardPin: boolean;
  reverseWiegandOutput: boolean;
  externalWiegandSnapshotEnabled: boolean;
  interlockEnabled: boolean;
  alarmProcessingEnabled: boolean;
  failedVerificationLimit: number;
  timeZonePunchLimit: number;
  suppressAccessDeniedLog: boolean;
  denyOutsideNormallyOpenTimeZone: boolean;
}

export interface UpdateInstitutionDeviceSerialSettingsReq extends DeviceSettingsBase {
  deviceAddress: number;
  networkPort: number;
  baudRate: number;
  serialFunction: number;
}

/** Static fields are sent only when `dhcpEnabled` is `false` - the handoff doc: "Do not send static
 *  values while DHCP is selected." */
export interface UpdateInstitutionDeviceEthernetSettingsReq extends DeviceSettingsBase {
  dhcpEnabled: boolean;
  hideIpAddress: boolean;
  ipAddress?: string;
  subnetMask?: string;
  gateway?: string;
  dnsServer?: string;
}

/** Same DHCP-conditional rule as Ethernet. */
export interface UpdateInstitutionDeviceWifiSettingsReq extends DeviceSettingsBase {
  dhcpEnabled: boolean;
  ipAddress?: string;
  subnetMask?: string;
  gateway?: string;
}

export interface UpdateInstitutionDeviceAppNotificationSettingsReq extends DeviceSettingsBase {
  appNotificationEnabled: boolean;
  appToken: string | null;
  notificationType: number;
}

export interface UpdateInstitutionDeviceWebAccessReq extends DeviceSettingsBase {
  localWebServerEnabled: boolean;
  newWebServerPassword: string | null;
}

export interface UpdateInstitutionDeviceScreenMenuPinReq extends DeviceSettingsBase {
  /** Numeric, 4-12 digits, kept as a string so a leading zero survives. */
  screenMenuPin: string;
}

export interface ApplyInstitutionDeviceRuntimeConfigurationReq extends DeviceSettingsBase {
  heartbeatIntervalSeconds: number;
  volume: number | null;
  disableLocalWebServer: boolean;
  newWebServerPassword: string | null;
  rebootAfterApply: boolean;
}

export interface RebootInstitutionDeviceReq {
  institutionId: string;
  institutionDeviceId: string;
}

/**
 * A successful settings push means **queued**, not applied - the handoff doc: "A successful
 * settings API result means queued, not necessarily applied." `internalTrackingId` is the
 * user-support reference; there is no public read API for command status yet.
 */
export interface DeviceSettingsQueuedData {
  deviceCommandId: number;
  internalTrackingId: string;
  status: string;
}

export interface DeviceSettingsMutationRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: DeviceSettingsQueuedData | null;
}

export interface DeviceDdlOptionValue {
  value: string;
  label: string;
}

/** One dropdown's worth of options. `key` is the JSON property the selected `value` gets submitted
 *  under on the matching `settings/*` request - see the "Exact DDL-to-request binding" table in
 *  `docs/specs/InstitutionDeviceRuntimeSettingsUiHandoff.md`. */
export interface DeviceDdlOptionSection {
  key: string;
  label: string;
  options: DeviceDdlOptionValue[];
}

export interface DeviceDdlOptionsRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: DeviceDdlOptionSection[];
}

/**
 * `POST /InstitutionDeviceConfiguration/replace-https-gateway-url`.
 *
 * Not the same thing as `rotate-https-ingress-token`: rotating invalidates the old address at once
 * and expects a technician to type the new one into the device. This queues a pending one-time URL
 * through the still-active gateway and promotes it only after the device polls it successfully, so
 * the old address keeps working in the meantime. The raw replacement URL never reaches the browser.
 */
export interface ReplaceHttpsGatewayUrlReq extends DeviceSettingsBase {
  /** 5 to 1440 minutes. */
  replacementLifetimeMinutes: number;
}

/**
 * `POST /InstitutionDeviceConfiguration/dispatch-mqtts-now`. Publishes a command that is **already
 * queued**; it accepts no command name, payload, password or broker credential, and HTTPS devices
 * must never offer it - their queue drains on the next heartbeat poll.
 */
export interface DispatchMqttsNowReq {
  institutionId: string;
  institutionDeviceId: string;
}

export interface DispatchMqttsNowData {
  wasDispatched: boolean;
}

export interface DispatchMqttsNowRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: DispatchMqttsNowData | null;
}
