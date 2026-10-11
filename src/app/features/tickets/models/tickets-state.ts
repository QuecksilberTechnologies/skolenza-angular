import { TicketClassification } from './classification';
import { TicketHeader } from './header';
import {
  ISupportAgent,
  ITicket,
  ITicketAgentSummary,
  ITicketCategory,
  ITicketDetail,
} from './ticket';
import { TicketType } from './type';

export interface TicketsState {
  // User context
  userStaffMemberId: string | undefined;
  userNumericStaffMemberId: number;
  userRoleId: number;

  // Ticket operations (mock data)
  tickets: ITicket[];
  supportTeams: ISupportAgent[];
  categories: ITicketCategory[];
  agentsSummary: ITicketAgentSummary[];
  ticketDetail: ITicketDetail | null;
  ticketTotalRecords: number;
  isLoading: boolean;

  // Classification admin
  classificationTableEnabled: boolean;
  classifications: TicketClassification[];
  classificationTotalRecords: number;
  classificationPageNumber: number;
  classificationPageSize: number;
  classificationSortBy: string;
  classificationSortOrder: string;
  classificationSearchTerm: string | null;

  // Header admin
  headers: TicketHeader[];
  headerTotalRecords: number;
  headerPageNumber: number;
  headerPageSize: number;
  headerSortBy: string;
  headerSortOrder: string;
  headerSearchTerm: string | null;
  headerSelectedClassificationId: string | null;

  // Type admin
  types: TicketType[];
  typeTotalRecords: number;
  typePageNumber: number;
  typePageSize: number;
  typeSortBy: string;
  typeSortOrder: string;
  typeSelectedClassificationId: string | null;
  typeSelectedHeaderId: string | null;
}
