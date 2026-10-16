/**
 * Primary type/category of a biometric or attendance device.
 * Mirrors the backend `DeviceType : short`; values are persisted as SMALLINT.
 *
 * TODO: swagger declares eight values (1-8); the eighth has no published name, so it stays unmapped
 * and `GetDeviceTypePipe` renders it as `-`.
 */
export enum DeviceType {
  /** Face recognition based biometric device. */
  FaceRecognition = 1,
  /** Fingerprint based biometric device. */
  Fingerprint = 2,
  /** RFID, proximity, or smart-card based device. */
  Card = 3,
  /** Device supporting multiple biometric/authentication methods, such as face, fingerprint, card, PIN, or QR code. */
  MultiBiometric = 4,
  /** Dedicated attendance terminal. */
  AttendanceTerminal = 5,
  /** Dedicated access-control terminal. */
  AccessControl = 6,
  /** Combined attendance and access-control device. */
  AttendanceAndAccessControl = 7,
}

export interface DeviceTypeOption {
  id: DeviceType;
  code: string;
  label: string;
}

/**
 * How a device talks to the platform.
 *
 * Mirrors the backend `DeviceCommunicationType`. Swagger publishes it as a bare `1..6` integer enum
 * with no member names; the names below were confirmed against the backend enum. These values are
 * NOT the `DeviceMaster` `supports*` capability flags, which are a separate, longer list.
 */
export enum DeviceCommunicationType {
  Http = 1,
  Https = 2,
  WebSocket = 3,
  Wss = 4,
  Mqtt = 5,
  Mqtts = 6,
}

export interface DeviceCommunicationTypeOption {
  id: DeviceCommunicationType;
  code: string;
  label: string;
}
