import { FormControl } from '@angular/forms';

export interface TicketClassification {
  id: number;
  classificationName: string;
  description?: string;
  isActive: boolean;
  isSoftDeleted?: boolean;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
}

export interface UpsertTicketClassificationRequest {
  id?: number;
  classificationName: string;
  description?: string;
  isActive: boolean;
}

export interface DeleteTicketClassificationRequest {
  id: number;
  staffMemberId: number;
  roleId: number;
  institutionId?: number;
}

export interface GetTicketClassificationsRequest {
  UserStaffMemberId?: string;
  PageNumber: number;
  PageSize: number;
  SortBy: string;
  SortOrder: string;
  IsActive?: boolean;
  SearchTerm?: string;
  Id?: number;
}

export interface GetTicketClassificationsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: TicketClassification[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasAllDocUploaded?: boolean;
  completionPercentage?: number;
}

export interface TicketClassificationDdl {
  id: number;
  classificationName: string;
  description?: string;
  isActive: boolean;
}

export interface GetClassificationDdlResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: TicketClassificationDdl[];
}

export interface TicketClassificationForm {
  classificationName: FormControl<string>;
  description: FormControl<string>;
}
