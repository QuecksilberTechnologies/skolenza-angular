/** Query params for `/Option/*` are PascalCase, unlike the newer module endpoints. */
export interface GetOptionsReq {
  StaffMemberId: number;
  RoleId: number;
  PageNumber?: number | null;
  PageSize?: number | null;
  SortBy?: string | null;
  SortOrder?: string | null;
  UserStaffMemberId?: string | null;
}

export interface OptionHasAccessReq {
  RoleIds?: string | null;
  OperationId?: number | null;
  IsActive?: boolean | null;
  HasAccess?: boolean | null;
  PageNumber?: number | null;
  PageSize?: number | null;
  SortBy?: string | null;
  SortOrder?: string | null;
  UserStaffMemberId?: string | null;
}

/** `/Option` reads have no documented response schema and no consumer yet, hence `data: unknown`. */
export interface OptionRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: unknown;
}
