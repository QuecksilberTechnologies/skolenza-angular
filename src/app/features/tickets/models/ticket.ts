export interface ITicket {
  id: string;
  title: string;
  department: string;
  category: string;
  status: string;
  priority: string;
  requester: string;
  requesterInitial: string;
  assignedTo: string;
  assignedToInitial: string;
  updated: string;
  comments: number;
  attachments: number;
  slaStatus: 'overdue' | 'due' | 'met';
  slaLabel: string;
  slaProgress: number;
}

export interface GetTicketsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: ITicket[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface ITicketCategory {
  id: number;
  categoryName: string;
  colorCode: string;
  ticketCount?: number;
}

export interface ISupportAgent {
  id: number;
  agentName: string;
  email: string;
  department: string;
  positionName: string;
}

export interface ITicketAgentSummary {
  name: string;
  initial: string;
  role: string;
  ticketCount: number;
  online: boolean;
}

export interface ITicketConversation {
  id: number;
  sender: string;
  initial: string;
  role: 'requester' | 'agent';
  message: string;
  timestamp: string;
}

export interface ITicketAttachment {
  id: number;
  fileName: string;
  sizeLabel: string;
  uploadedBy: string;
  uploadedAt: string;
  url?: string;
}

export interface ITicketDetail {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  department: string;
  createdAt: string;
  updatedAt: string;
  dueAt: string;
  slaTotalHours: number;
  slaRemainingHours: number;
  assignedTo: { name: string; initial: string; role: string };
  requester: { name: string; initial: string; role: string };
  conversations: ITicketConversation[];
  attachments: ITicketAttachment[];
}

export interface TicketDetailExtras {
  ticketNumber?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  dueAt?: string;
  slaTotalHours?: number;
  slaRemainingHours?: number;
  requesterRole?: string;
  assigneeRole?: string;
  conversations?: ITicketConversation[];
  attachments?: ITicketAttachment[];
}

export type TicketDetailExtrasMap = Record<string, TicketDetailExtras>;

export interface OpenTicketRequest {
  ticketClassificationId: number;
  ticketHeaderId: number;
  ticketTypeId: number;
  description: string;
  priority: number;
  requestedForUserId: number;
  attachmentUrls: string[];
}

export interface OpenTicketResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: unknown;
}
