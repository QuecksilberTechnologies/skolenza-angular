export interface TicketType {
  id: number;
  ticketTypeName: string;
  ticketHeaderId: number;
  ticketHeaderName?: string;
  institutionId?: number;
  classificationId?: string;
  classificationName?: string;
  description?: string;
  responsibleRoleId?: number;
  responsibleRoleName?: string;
  isApprovalRequired?: boolean;
  approvalId?: number;
  approvalRoleName?: string;
  autoApproveIfSameRole?: boolean;
  slaHours?: number;
  isAttachmentRequired?: boolean;
  isActiveForAllUsers?: boolean;
  isActive: boolean;
}

export interface UpsertTicketTypeRequest {
  id?: number;
  ticketTypeName: string;
  ticketHeaderId: number;
  description?: string;
  responsibleRoleId?: number;
  isApprovalRequired?: boolean;
  approvalRoleId?: number;
  autoApproveIfSameRole?: boolean;
  slaHours?: number;
  isAttachmentRequired?: boolean;
  isActiveForAllUsers?: boolean;
  isActive?: boolean;
}

export interface GetTicketTypesRequest {
  UserStaffMemberId?: string;
  PageNumber: number;
  PageSize: number;
  SortBy: string;
  SortOrder: string;
  HeaderId?: string;
  IsActive?: boolean;
}

export interface GetTicketTypesResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: TicketType[];
  totalRecords: number;
}

export interface TicketTypeDdl {
  id: number;
  ticketTypeName: string;
  description?: string;
  isActive: boolean;
}

export interface GetTicketTypeDdlResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: TicketTypeDdl[];
}

export interface PriorityOption {
  id: number;
  label: string;
}

export interface StaffMemberOption {
  numericId: number;
  fullName: string;
}
