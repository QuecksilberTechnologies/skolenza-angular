import { FormControl } from '@angular/forms';

export interface TicketHeader {
  id: string;
  headerName: string;
  classificationId: string;
  classificationName?: string;
  description?: string;
  isActive: boolean;
}

export interface UpsertTicketHeaderRequest {
  id?: number;
  headerName: string;
  ticketClassificationId: number;
  ticketClassificationName: string;
  description?: string;
  isActive: boolean;
}

export interface DeleteTicketHeaderRequest {
  id: number;
}

export interface GetTicketHeadersRequest {
  PageNumber: number;
  PageSize: number;
  SortBy: string;
  SortOrder: string;
  TicketClassifyId?: number;
  IsActive?: boolean;
  SearchTerm?: string;
}

export interface GetTicketHeadersResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: TicketHeader[];
  totalRecords: number;
}

export interface TicketHeaderForm {
  classificationId: FormControl<number | null>;
  headerName: FormControl<string>;
  description: FormControl<string>;
}
