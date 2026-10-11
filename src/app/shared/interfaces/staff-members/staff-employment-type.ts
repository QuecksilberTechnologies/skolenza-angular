export interface GetStaffEmploymentTypesRequest {
  InstitutionId?: number;
  StaffMemberId?: number;
  RoleId?: number;
  IsActive?: boolean;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string | string[] | null | undefined;
  SortOrder?: string;
  UserStaffMemberId: string;
  Id?: string;
}

export interface GetStaffEmploymentTypeOptionReq {
  UserStaffMemberId: string;
  TodaysDate?: string;
}

export interface GetStaffEmploymentTypesResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: StaffEmploymentType[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface StaffEmploymentType {
  id: number;
  typeName: string;
  description: string;
  remark?: string | null;
  isActive: boolean;
  /** Drives the per-row spinner on the status toggle button. */
  isUpdatingStatus?: boolean;
  addedById: number;
  addedDateTime: Date;
  updatedById: null;
  updatedDateTime: null;
}

export interface AddStaffEmploymentTypeRequest {
  typeName: string;
  description: string;
  remark: string;
  isActive: boolean;
}

export interface UpdateStaffEmploymentTypeRequest extends AddStaffEmploymentTypeRequest {
  id: number;
}

export interface DeleteStaffEmploymentTypeRequest {
  Id: number;
}
