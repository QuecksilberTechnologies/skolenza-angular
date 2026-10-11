export interface GetDistrictsReq {
  UserStaffMemberId: string;
  StateId: number;
  TodaysDate: string;
}

export interface GetDistrictsRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: District[];
}

export interface District {
  id: number;
  stateId: number;
  districtName: string;
  isActive: boolean;
}
