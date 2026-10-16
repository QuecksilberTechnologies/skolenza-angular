import { ApiEnvelope } from '../common/api-envelope';

/** Backend `AttendancePunchAction`. */
export enum AttendancePunchAction {
  CheckIn = 1,
  CheckOut = 2,
}

/** Server-owned, stable `AttendanceDeviceType.code` values. Only `MOBILE` / `WEB` may self-punch. */
export type AttendanceDeviceTypeCode = 'MOBILE' | 'WEB' | 'BIOMETRIC' | 'MANUAL';

/** `GET /api/Attendance/device-types` row. Ids are server-assigned — match on `code`, never the id. */
export interface AttendanceDeviceTypeOption {
  id: number;
  code: AttendanceDeviceTypeCode;
  name: string;
  requiresDeviceRegistration: boolean;
}

/** One immutable ledger row from `GET /api/Attendance/today`. */
export interface AttendancePunchItem {
  id: number;
  action: AttendancePunchAction;
  attendanceDeviceTypeId: number;
  attendanceDeviceTypeCode: string;
  attendanceDeviceType: string;
  /** Server UTC, the authoritative time of the punch. */
  occurredAtUtc: string;
  institutionLocationId: number | null;
}

export interface AttendanceToday {
  /** Local business date (`yyyy-MM-dd`) of the punch location's timezone. */
  workDate: string;
  isCurrentlyCheckedIn: boolean;
  punches: AttendancePunchItem[];
}

/**
 * `POST /api/Attendance/mark-attendance` body. The staffMember comes from the bearer token; no
 * StaffMemberId / ModuleId / OperationId is accepted.
 */
export interface MarkAttendanceReq {
  action: AttendancePunchAction;
  attendanceDeviceTypeId: number;
  /** Omit to use the arrangement's primary location (or none for Work From Home). */
  institutionLocationId?: number;
  /** Latitude and longitude travel together or not at all. */
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  /** Audit only — the server stamps its own UTC time. */
  clientOccurredAt?: string;
  /** One UUID per button press; reuse it only to retry that same press. */
  idempotencyKey: string;
}

/** The recorded punch, plus where it landed and the state it leaves the staffMember in. */
export interface AttendancePunchResult extends AttendancePunchItem {
  workDate: string;
  distanceFromLocationMeters: number | null;
  isCurrentlyCheckedIn: boolean;
}

export type GetAttendanceTodayRes = ApiEnvelope<AttendanceToday | null>;
export type GetAttendanceDeviceTypesRes = ApiEnvelope<AttendanceDeviceTypeOption[] | null>;
export type MarkAttendanceRes = ApiEnvelope<AttendancePunchResult | null>;
