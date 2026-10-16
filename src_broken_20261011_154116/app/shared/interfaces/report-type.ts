export interface AddReportTypeRequest {
  typeName: string;
  description?: string;
  isActive: boolean;
}

export interface UpdateReportTypeRequest {
  id: number;
  staffMemberId: number;
  roleId: number;
  typeName: string;
  description: string;
  isActive: boolean;
}

export interface DeleteReportTypeRequest {
  Id: number;
}

export interface GetReportTypesRequest {
  IsActive?: boolean | null;
  TypeName?: string;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string | string[] | null | undefined;
  SortOrder?: string;
  UserStaffMemberId?: string;
}

export interface GetReportTypesResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: ReportType[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface ReportType {
  id: number;
  typeName: string;
  description?: string;
  isActive?: boolean;
  /** Client-only: drives the per-row spinner on the status toggle. */
  isUpdatingStatus?: boolean;
}

export interface IReportTypeFilter {
  status?: boolean | null;
}
