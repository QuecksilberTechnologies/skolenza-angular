export interface GetCountriesReq {
  UserStaffMemberId: string;
  TodaysDate: string;
}

export interface GetCountriesRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: Country[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface Country {
  id: number;
  countryName: string;
  countryCode: string;
  stdCode: string;
  isActive: boolean;
}
