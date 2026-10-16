export interface UpdateVerifyStatusReq {
  userStaffMemberId: string;
  staffMemberId: string;
  tabInfoType: number;
  isVerified: boolean;
}

export interface UpdateVerifyStatusRes {
  isSucceeded: boolean;
  message: string;
  errors: [];
  data: boolean;
}

export interface UpdateEditStatusReq {
  userStaffMemberId: string;
  staffMemberId: string;
  tabInfoType: number;
  isEditable: boolean;
}

export interface UpdateEditStatusRes {
  isSucceeded: boolean;
  message: string;
  errors: [];
  data: boolean;
}
