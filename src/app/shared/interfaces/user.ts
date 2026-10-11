export interface GetGenderOptionReq {
  UserStaffMemberId?: string;
  TodaysDate?: string;
}

export interface GetGendersRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IGender[];
}

export interface IGender {
  id: number;
  genderName: string;
}
