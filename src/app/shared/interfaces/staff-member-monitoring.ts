/**
 * StaffMember monitoring: screenshots from the desktop agent (`skolenza.staffMemberagent`) and field
 * visits. Policy, registration and agent status mirror the backend `StaffMemberMonitoring*DTO`s;
 * captures and visits have no backend read endpoint yet, so their shapes are the UI's proposal.
 */

export type AgentConnectionStatus =
  | 'NeverConnected'
  | 'Online'
  | 'UploadFailure'
  | 'Delayed'
  | 'Unreachable'
  | 'Inactive';

export interface MonitoredStaffMember {
  staffMemberId: string;
  staffMemberFullName: string;
  positionName: string;
  departmentName: string;
}

export interface AgentStatus {
  agentInstanceId: string;
  staffMemberId: string;
  deviceName: string;
  connectionStatus: AgentConnectionStatus;
  lastHeartbeatDateTime: string | null;
  lastCaptureDateTime: string | null;
  lastSuccessfulUploadDateTime: string | null;
  pendingCaptureCount: number;
  lastErrorCode: string | null;
  agentVersion: string | null;
}

/** `StaffMemberMonitoringPolicyResponseDTO`; the upsert request carries the same fields. */
export interface MonitoringPolicy {
  minimumCaptureIntervalSeconds: number;
  maximumCaptureIntervalSeconds: number;
  heartbeatIntervalSeconds: number;
  delayedAfterSeconds: number;
  unreachableAfterSeconds: number;
  offlineRetentionDays: number;
  maximumOfflineBytes: number;
  imageQuality: number;
  captureAllMonitors: boolean;
}

export interface RegisterAgentReq {
  /** Institution-encoded staffMember id. */
  staffMemberId: string;
  deviceName: string;
}

export interface AgentRegistration {
  agentInstanceId: string;
  /** Returned once by the API. Never log, persist or redisplay it after the dialog closes. */
  agentCredential: string;
  policy: MonitoringPolicy;
}

export interface ScreenCapture {
  captureId: string;
  staffMemberId: string;
  capturedAtUtc: string;
  /** Zero-based, as the agent sends it. */
  monitorNumber: number;
  imageUrl: string;
}

export type FieldVisitStatus = 'Completed' | 'InProgress' | 'Missed';

export interface FieldVisit {
  id: string;
  staffMemberId: string;
  checkInUtc: string;
  checkOutUtc: string | null;
  placeName: string;
  address: string;
  latitude: number;
  longitude: number;
  /** Distance travelled from the previous stop. */
  distanceMeters: number;
  purpose: string;
  status: FieldVisitStatus;
}

export interface MonitoringQuery {
  staffMemberId: string;
  /** Local calendar day, `yyyy-MM-dd`. */
  date: string;
}

export interface MonitoringResponse<T> {
  isSucceeded: boolean;
  message: string;
  data: T;
}
