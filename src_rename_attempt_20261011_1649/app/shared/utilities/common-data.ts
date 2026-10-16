import {
  AttendanceLocationScope,
  AttendanceLocationScopeOption,
  BloodGroup,
  DeviceCommunicationType,
  DeviceCommunicationTypeOption,
  DeviceType,
  DeviceTypeOption,
  HybridType,
  HybridTypeOption,
  Relation,
  CampusType,
  CampusTypeOption,
  WorkMode,
  WorkModeOption,
  WorkModeOverrideApprovalStatus,
  WorkModeOverrideApprovalStatusOption,
  WorkPatternDay,
  WorkPatternDayOption,
} from '@shared/interfaces';

export const BLOOD_GROUPS: BloodGroup[] = [
  { id: 1, code: 'A+', label: 'A Positive' },
  { id: 2, code: 'A-', label: 'A Negative' },
  { id: 3, code: 'B+', label: 'B Positive' },
  { id: 4, code: 'B-', label: 'B Negative' },
  { id: 5, code: 'AB+', label: 'AB Positive' },
  { id: 6, code: 'AB-', label: 'AB Negative' },
  { id: 7, code: 'O+', label: 'O Positive' },
  { id: 8, code: 'O-', label: 'O Negative' },
];

export const RELATIONS_DEPENDANT: Relation[] = [
  { id: 1, code: 'SPOUSE', label: "StaffMember's Spouse" },
  { id: 2, code: 'PARENT', label: "StaffMember's Parent" },
  { id: 3, code: 'IN_LAWS', label: "StaffMember's In-Laws" },
  { id: 4, code: 'CHILDREN', label: "Children's" },
];

export const DEVICE_TYPES: DeviceTypeOption[] = [
  { id: DeviceType.FaceRecognition, code: 'FACE_RECOGNITION', label: 'Face Recognition' },
  { id: DeviceType.Fingerprint, code: 'FINGERPRINT', label: 'Fingerprint' },
  { id: DeviceType.Card, code: 'CARD', label: 'Card' },
  { id: DeviceType.MultiBiometric, code: 'MULTI_BIOMETRIC', label: 'Multi Biometric' },
  { id: DeviceType.AttendanceTerminal, code: 'ATTENDANCE_TERMINAL', label: 'Attendance Terminal' },
  { id: DeviceType.AccessControl, code: 'ACCESS_CONTROL', label: 'Access Control' },
  {
    id: DeviceType.AttendanceAndAccessControl,
    code: 'ATTENDANCE_AND_ACCESS_CONTROL',
    label: 'Attendance & Access Control',
  },
];

export const DEVICE_COMMUNICATION_TYPES: DeviceCommunicationTypeOption[] = [
  { id: DeviceCommunicationType.Http, code: 'HTTP', label: 'HTTP' },
  { id: DeviceCommunicationType.Https, code: 'HTTPS', label: 'HTTPS' },
  { id: DeviceCommunicationType.WebSocket, code: 'WEB_SOCKET', label: 'WebSocket' },
  { id: DeviceCommunicationType.Wss, code: 'WSS', label: 'WSS' },
  { id: DeviceCommunicationType.Mqtt, code: 'MQTT', label: 'MQTT' },
  { id: DeviceCommunicationType.Mqtts, code: 'MQTTS', label: 'MQTTS' },
];

/** Institution location types using the backend enum's exact numeric contract. */
export const CAMPUS_TYPES: CampusTypeOption[] = [
  { id: CampusType.HeadOffice, code: 'MAIN_CAMPUS', label: 'Main Campus' },
  { id: CampusType.Branch, code: 'BRANCH_CAMPUS', label: 'Branch Campus' },
  { id: CampusType.Office, code: 'ADMINISTRATIVE_CAMPUS', label: 'Administrative Campus' },
  { id: CampusType.Plant, code: 'PLANT', label: 'Plant' },
  { id: CampusType.Warehouse, code: 'WAREHOUSE', label: 'Warehouse' },
  { id: CampusType.ClientSite, code: 'CLIENT_SITE', label: 'Client Site' },
  { id: CampusType.ProjectSite, code: 'PROJECT_SITE', label: 'Project Site' },
  { id: CampusType.Campus, code: 'ACADEMIC_CAMPUS', label: 'Academic Campus' },
  { id: CampusType.RemoteOffice, code: 'VIRTUAL_OR_REMOTE_CAMPUS', label: 'Virtual / Remote Campus' },
];

export const ATTENDANCE_LOCATION_SCOPES: AttendanceLocationScopeOption[] = [
  {
    id: AttendanceLocationScope.PrimaryLocationOnly,
    code: 'PRIMARY_LOCATION_ONLY',
    label: 'Primary Location Only',
  },
  {
    id: AttendanceLocationScope.AssignedLocations,
    code: 'ASSIGNED_LOCATIONS',
    label: 'Assigned Locations',
  },
  {
    id: AttendanceLocationScope.AnyCampus,
    code: 'ANY_CAMPUS',
    label: 'Any Institution Location',
  },
  { id: AttendanceLocationScope.RemoteAnywhere, code: 'REMOTE_ANYWHERE', label: 'Remote Anywhere' },
];

export const WORK_MODES: WorkModeOption[] = [
  { id: WorkMode.Office, code: 'OFFICE', label: 'Office' },
  { id: WorkMode.WorkFromHome, code: 'WORK_FROM_HOME', label: 'Work From Home' },
  { id: WorkMode.Hybrid, code: 'HYBRID', label: 'Hybrid' },
  { id: WorkMode.Field, code: 'FIELD', label: 'Field' },
  { id: WorkMode.ClientSite, code: 'CLIENT_SITE', label: 'Client Site' },
];

/** Shared lookup size for complete dropdown option lists in staffMember work configuration. */
export const STAFF_MEMBER_WORK_LOOKUP_PAGE_SIZE = 500;
export const WORK_MODE_OVERRIDE_REASON_MAX_LENGTH = 500;

/** Modes that describe one concrete day's place of work. */
export const CONCRETE_WORK_MODES = WORK_MODES.filter((mode) => mode.id !== WorkMode.Hybrid);

/** Arrangement-level rule: these modes need an authoritative primary location. */
export const workModeRequiresPrimaryLocation = (workMode: WorkMode | null): boolean =>
  workMode === WorkMode.Office || workMode === WorkMode.Hybrid || workMode === WorkMode.ClientSite;

/** Day-level rule: these modes need a physical execution location. */
export const workModeRequiresExecutionLocation = (workMode: WorkMode | null): boolean =>
  workMode === WorkMode.Office || workMode === WorkMode.Field || workMode === WorkMode.ClientSite;

export const workModeDisallowsLocation = (workMode: WorkMode | null): boolean =>
  workMode === WorkMode.WorkFromHome;

/** Inclusive coverage check; a null outer end date covers only an open-ended inner window. */
export const dateWindowCovers = (
  outerFrom: string,
  outerTo: string | null | undefined,
  innerFrom: string,
  innerTo: string | null | undefined,
): boolean => outerFrom <= innerFrom && (innerTo ? !outerTo || outerTo >= innerTo : !outerTo);

/** Mirrors the API rule used when a work arrangement validates its primary location. */
export const isCampusTypeCompatibleWithWorkMode = (
  workMode: WorkMode,
  locationType: CampusType,
): boolean => {
  switch (workMode) {
    case WorkMode.ClientSite:
      return locationType === CampusType.ClientSite;
    case WorkMode.Office:
    case WorkMode.Hybrid:
      return [
        CampusType.HeadOffice,
        CampusType.Branch,
        CampusType.Office,
        CampusType.Plant,
        CampusType.Warehouse,
        CampusType.Campus,
        CampusType.RemoteOffice,
      ].includes(locationType);
    case WorkMode.Field:
      return [CampusType.ClientSite, CampusType.ProjectSite].includes(locationType);
    case WorkMode.WorkFromHome:
      return false;
  }
};

export const HYBRID_TYPES: HybridTypeOption[] = [
  { id: HybridType.Fixed, code: 'FIXED', label: 'Fixed' },
  { id: HybridType.Flexible, code: 'FLEXIBLE', label: 'Flexible' },
];

export const WORK_PATTERN_DAYS: WorkPatternDayOption[] = [
  { id: WorkPatternDay.Monday, code: 'MONDAY', label: 'Monday' },
  { id: WorkPatternDay.Tuesday, code: 'TUESDAY', label: 'Tuesday' },
  { id: WorkPatternDay.Wednesday, code: 'WEDNESDAY', label: 'Wednesday' },
  { id: WorkPatternDay.Thursday, code: 'THURSDAY', label: 'Thursday' },
  { id: WorkPatternDay.Friday, code: 'FRIDAY', label: 'Friday' },
  { id: WorkPatternDay.Saturday, code: 'SATURDAY', label: 'Saturday' },
  { id: WorkPatternDay.Sunday, code: 'SUNDAY', label: 'Sunday' },
];

export const WORK_MODE_OVERRIDE_STATUSES: WorkModeOverrideApprovalStatusOption[] = [
  { id: WorkModeOverrideApprovalStatus.Pending, code: 'PENDING', label: 'Pending' },
  { id: WorkModeOverrideApprovalStatus.Approved, code: 'APPROVED', label: 'Approved' },
  { id: WorkModeOverrideApprovalStatus.Rejected, code: 'REJECTED', label: 'Rejected' },
  { id: WorkModeOverrideApprovalStatus.Cancelled, code: 'CANCELLED', label: 'Cancelled' },
];

export const PROFILE_TABS = {
  StaffMember: 1,
  Bank: 2,
  Contact: 3,
  Experience: 4,
  Identity: 5,
  Education: 6,
  Dependent: 7,
  Insurance: 8,
};
