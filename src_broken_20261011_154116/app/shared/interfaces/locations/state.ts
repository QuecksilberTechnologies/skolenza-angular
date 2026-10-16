export interface GetStatesReq {
  UserStaffMemberId: string;
  CountryId: number;
  TodaysDate: string;
}

export interface GetStatesRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: State[];
}

export interface State {
  id: number;
  countryId: number;
  stateName: string;
  isActive: boolean;
}
