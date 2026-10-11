export enum AttendanceStatus {
  Present = 1,
  Absent = 2,
  HalfDay = 3,
  OnLeave = 4,
  Holiday = 5,
  Weekend = 6,
}

export interface AttendanceRecord {
  id: number;
  staffMemberId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  totalHours: number;
  status: AttendanceStatus;
  remark: string;
}

export interface GetAttendanceResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: AttendanceRecord[];
  totalRecords: number;
}

export interface GetStaffMembersShortResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: StaffMemberShort[];
}

export interface StaffMemberShort {
  staffMemberId: string;
  staffMemberFullName: string;
  designationName: string;
  departmentName: string;
  profileImageLink: string;
}
