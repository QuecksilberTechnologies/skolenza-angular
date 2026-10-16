import { HttpClient } from '@angular/common/http';
import { computed, DestroyRef, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { TableLazyLoadEvent } from '@openng/optimus-ui/table';
import { catchError, delay, firstValueFrom, from, map, of, switchMap, tap } from 'rxjs';

import { Common } from '@core/services';
import { SettledSearchTerm } from '@shared/interfaces';
import { TicketApi } from '@tickets/ticket-api';

import {
  DeleteTicketClassificationRequest,
  DeleteTicketHeaderRequest,
  GetTicketClassificationsRequest,
  GetTicketHeadersRequest,
  GetTicketsResponse,
  GetTicketTypesRequest,
  ISupportAgent,
  ITicket,
  ITicketAgentSummary,
  ITicketCategory,
  ITicketDetail,
  TicketClassification,
  TicketClassificationDdl,
  TicketDetailExtras,
  TicketDetailExtrasMap,
  TicketHeader,
  TicketsState,
  TicketType,
} from './models';

const UPDATED_WEIGHT: Record<string, number> = {
  hour: 1,
  hours: 1,
  day: 24,
  days: 24,
  week: 24 * 7,
  weeks: 24 * 7,
};

const STATUS_WEIGHT: Record<string, number> = {
  Reopened: 0,
  Open: 1,
  Pending: 2,
  'On Hold': 3,
  Solved: 4,
};

// Recency of an "x hours/days ago" label as hours-ago (smaller = more recent).
function updatedScore(s: string): number {
  const m = s.match(/(\d+)\s*(hour|hours|day|days|week|weeks)/i);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return +m[1] * (UPDATED_WEIGHT[m[2].toLowerCase()] ?? 1);
}

// Generic ticket comparator used to simulate server-side sorting on the mock dataset.
function sortTickets(rows: ITicket[], field: string, dir: string | null): ITicket[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let va: number | string;
    let vb: number | string;
    if (field === 'updated') {
      // Recent-first means ascending updatedScore; flip so 'desc' = most recent.
      va = -updatedScore(a.updated);
      vb = -updatedScore(b.updated);
    } else if (field === 'status') {
      va = STATUS_WEIGHT[a.status] ?? 99;
      vb = STATUS_WEIGHT[b.status] ?? 99;
    } else {
      va = (a as unknown as Record<string, string | number>)[field] ?? '';
      vb = (b as unknown as Record<string, string | number>)[field] ?? '';
    }
    if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * sign;
    return ((va as number) - (vb as number)) * sign;
  });
}

// Compose a full ticket detail by joining the list row (identity, source of truth) with
// per-id extras (rich content). Missing extras fall back to generic, list-derived values.
function buildTicketDetail(ticket: ITicket, extras?: TicketDetailExtras): ITicketDetail {
  const slaTotalHours = extras?.slaTotalHours ?? 8;
  const slaRemainingHours =
    extras?.slaRemainingHours ?? Math.round((slaTotalHours * (100 - ticket.slaProgress)) / 100);

  const conversations = extras?.conversations ?? [
    {
      id: 1,
      sender: ticket.requester,
      initial: ticket.requesterInitial,
      role: 'requester' as const,
      message: `Hi, I need help regarding "${ticket.title}".`,
      timestamp: ticket.updated,
    },
    ...(ticket.assignedTo
      ? [
          {
            id: 2,
            sender: ticket.assignedTo,
            initial: ticket.assignedToInitial,
            role: 'agent' as const,
            message: `Thanks for reaching out. We're looking into your ${ticket.category} request and will update you shortly.`,
            timestamp: ticket.updated,
          },
        ]
      : []),
  ];

  return {
    id: ticket.id,
    ticketNumber: extras?.ticketNumber ?? `#${ticket.id}`,
    title: ticket.title,
    description: extras?.description ?? `Ticket "${ticket.title}" is currently ${ticket.status}.`,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    department: ticket.department,
    createdAt: extras?.createdAt ?? '',
    updatedAt: extras?.updatedAt ?? '',
    dueAt: extras?.dueAt ?? '',
    slaTotalHours,
    slaRemainingHours,
    assignedTo: {
      name: ticket.assignedTo,
      initial: ticket.assignedToInitial,
      role: extras?.assigneeRole ?? 'Support Agent',
    },
    requester: {
      name: ticket.requester,
      initial: ticket.requesterInitial,
      role: extras?.requesterRole ?? 'Requester',
    },
    conversations,
    attachments: extras?.attachments ?? [],
  };
}

const initialState: TicketsState = {
  userStaffMemberId: undefined,
  userNumericStaffMemberId: 0,
  userRoleId: 0,

  tickets: [],
  supportTeams: [],
  categories: [],
  agentsSummary: [],
  ticketDetail: null,
  ticketTotalRecords: 0,
  isLoading: false,

  classificationTableEnabled: false,
  classifications: [],
  classificationTotalRecords: 0,
  classificationPageNumber: 1,
  classificationPageSize: 10,
  classificationSortBy: 'id',
  classificationSortOrder: 'desc',
  classificationSearchTerm: null,

  headers: [],
  headerTotalRecords: 0,
  headerPageNumber: 1,
  headerPageSize: 10,
  headerSortBy: 'headerName',
  headerSortOrder: 'asc',
  headerSearchTerm: null,
  headerSelectedClassificationId: null,

  types: [],
  typeTotalRecords: 0,
  typePageNumber: 1,
  typePageSize: 10,
  typeSortBy: 'ticketTypeName',
  typeSortOrder: 'asc',
  typeSelectedClassificationId: null,
  typeSelectedHeaderId: null,
};

export const TicketsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const ticketMasterApi = inject(TicketApi);
    const commonService = inject(Common);

    // Shared classification DDL — loaded once on init for all dropdowns
    const classificationOptionsResource = rxResource({
      stream: () =>
        ticketMasterApi.getClassificationDdl().pipe(
          map((res) => (res.isSucceeded ? res.data : [])),
          catchError(() => of([] as TicketClassificationDdl[])),
        ),
    });

    // Classification admin table — only fires when the classification page is active
    const classificationsResource = rxResource({
      params: () => {
        const userStaffMemberId = store.userStaffMemberId();
        if (userStaffMemberId === undefined || !store.classificationTableEnabled()) return undefined;
        return {
          userStaffMemberId,
          pageNumber: store.classificationPageNumber(),
          pageSize: store.classificationPageSize(),
          sortBy: store.classificationSortBy(),
          sortOrder: store.classificationSortOrder(),
          searchTerm: store.classificationSearchTerm(),
        };
      },
      stream: ({ params }) => {
        const req: GetTicketClassificationsRequest = {
          PageNumber: params.pageNumber,
          PageSize: params.pageSize,
          SortBy: params.sortBy,
          SortOrder: params.sortOrder,
          SearchTerm: params.searchTerm ?? '',
          UserStaffMemberId: params.userStaffMemberId,
        };
        return ticketMasterApi.getClassifications(req).pipe(
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            patchState(store, {
              classifications: res.isSucceeded ? res.data : [],
              classificationTotalRecords: res.isSucceeded
                ? (res.totalRecords ?? res.data.length)
                : 0,
            });
          }),
          map((res) => res.data),
          catchError(() => of([] as TicketClassification[])),
        );
      },
    });

    // Header admin table
    const headersResource = rxResource({
      params: () => {
        const userStaffMemberId = store.userStaffMemberId();
        if (userStaffMemberId === undefined) return undefined;
        return {
          pageNumber: store.headerPageNumber(),
          pageSize: store.headerPageSize(),
          sortBy: store.headerSortBy(),
          sortOrder: store.headerSortOrder(),
          searchTerm: store.headerSearchTerm(),
          classificationId: store.headerSelectedClassificationId(),
        };
      },
      stream: ({ params }) => {
        const req: GetTicketHeadersRequest = {
          PageNumber: params.pageNumber,
          PageSize: params.pageSize,
          SortBy: params.sortBy,
          SortOrder: params.sortOrder,
          SearchTerm: params.searchTerm ?? '',
          TicketClassifyId: params.classificationId ? +params.classificationId : undefined,
        };
        return ticketMasterApi.getHeaders(req).pipe(
          tap((res) => {
            if (!res.isSucceeded && res.errors?.length)
              commonService.showMessage(res.message, 'error');
            const classifOptions = classificationOptionsResource.value() ?? [];
            const headers = (res.isSucceeded && res.data ? res.data : []).map((h) => {
              const classificationId = h.classificationId || params.classificationId || '';
              return {
                ...h,
                classificationId,
                classificationName:
                  h.classificationName ||
                  classifOptions.find((c) => String(c.id) === classificationId)
                    ?.classificationName ||
                  '',
              };
            });
            patchState(store, {
              headers,
              headerTotalRecords:
                res.isSucceeded && res.data ? (res.totalRecords ?? res.data.length) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? res.data : [])),
          catchError(() => of([] as TicketHeader[])),
        );
      },
    });

    // Header options for the type admin filter dropdown
    const headerOptionsResource = rxResource({
      params: () => {
        const classificationId = store.typeSelectedClassificationId();
        return classificationId ? { classificationId } : undefined;
      },
      stream: ({ params }) => {
        const req: GetTicketHeadersRequest = {
          PageNumber: 1,
          PageSize: 1000,
          SortBy: 'headerName',
          SortOrder: 'asc',
          IsActive: true,
          TicketClassifyId: +params.classificationId,
        };
        return ticketMasterApi.getHeaders(req).pipe(
          map((res) =>
            (res.isSucceeded ? res.data : []).map((h) => ({
              ...h,
              classificationId: h.classificationId || params.classificationId,
            })),
          ),
          catchError(() => of([] as TicketHeader[])),
        );
      },
    });

    // Type admin table
    const typesResource = rxResource({
      params: () => {
        const userStaffMemberId = store.userStaffMemberId();
        if (userStaffMemberId === undefined) return undefined;
        return {
          userStaffMemberId,
          pageNumber: store.typePageNumber(),
          pageSize: store.typePageSize(),
          sortBy: store.typeSortBy(),
          sortOrder: store.typeSortOrder(),
          headerId: store.typeSelectedHeaderId(),
        };
      },
      stream: ({ params }) => {
        const req: GetTicketTypesRequest = {
          UserStaffMemberId: params.userStaffMemberId,
          PageNumber: params.pageNumber,
          PageSize: params.pageSize,
          SortBy: params.sortBy,
          SortOrder: params.sortOrder,
          HeaderId: params.headerId ?? undefined,
        };
        return ticketMasterApi.getTypes(req).pipe(
          tap((res) => {
            if (!res.isSucceeded && res.errors?.length)
              commonService.showMessage(res.message, 'error');
            patchState(store, {
              types: res.isSucceeded && res.data ? res.data : [],
              typeTotalRecords:
                res.isSucceeded && res.data ? (res.totalRecords ?? res.data.length) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? res.data : [])),
          catchError(() => of([] as TicketType[])),
        );
      },
    });

    return {
      classificationOptionsResource,
      classificationsResource,
      headersResource,
      headerOptionsResource,
      typesResource,
    };
  }),
  withComputed(
    ({
      tickets,
      classificationOptionsResource,
      classificationsResource,
      headersResource,
      headerOptionsResource,
      typesResource,
    }) => ({
      // Ticket stats
      newTickets: computed(() => tickets().filter((t) => t.status === 'Open').length),
      openTickets: computed(
        () => tickets().filter((t) => t.status === 'On Hold' || t.status === 'Reopened').length,
      ),
      solvedTickets: computed(() => tickets().filter((t) => t.status === 'Solved').length),
      pendingTickets: computed(() => tickets().filter((t) => t.status === 'Pending').length),
      totalTickets: computed(() => tickets().length),

      // Shared reference data
      classificationOptions: computed<TicketClassificationDdl[]>(
        () => classificationOptionsResource.value() ?? [],
      ),

      // Admin page loading indicators
      isClassificationLoading: computed(() => classificationsResource.isLoading()),
      isHeaderLoading: computed(() => headersResource.isLoading()),
      isTypeLoading: computed(() => typesResource.isLoading()),

      // Header options for type admin filter
      headerOptions: computed<TicketHeader[]>(() => headerOptionsResource.value() ?? []),
    }),
  ),
  withMethods((store) => {
    const ticketMasterApi = inject(TicketApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);
    const http = inject(HttpClient);

    return {
      // ── User Context ──────────────────────────────────────────────────────────

      async initialize(): Promise<void> {
        if (store.userStaffMemberId() !== undefined) return;
        const loginInfo = await commonService.getLoginInfo();
        patchState(store, {
          userStaffMemberId: loginInfo?.user?.staffMemberId ?? '',
          userNumericStaffMemberId: parseInt(loginInfo?.user?.staffMemberId ?? '0', 10),
          userRoleId: +(loginInfo?.user?.primaryRole?.roleId ?? 0),
        });
      },

      // ── Ticket Operations ─────────────────────────────────────────────────────

      async loadTickets(req?: {
        pageNumber?: number;
        pageSize?: number;
        sortBy?: string | null;
        sortOrder?: string | null;
      }): Promise<void> {
        patchState(store, { isLoading: true });
        try {
          const res = await firstValueFrom(
            http.get<GetTicketsResponse>('data/tickets.json').pipe(delay(600)),
          );
          const pageNumber = req?.pageNumber ?? 1;
          const pageSize = req?.pageSize ?? 10;
          const sorted = sortTickets(res.data, req?.sortBy ?? 'updated', req?.sortOrder ?? 'desc');
          const start = (pageNumber - 1) * pageSize;
          patchState(store, {
            tickets: sorted.slice(start, start + pageSize),
            ticketTotalRecords: sorted.length,
            isLoading: false,
          });
        } catch {
          patchState(store, { isLoading: false });
        }
      },

      async loadSupportTeams(): Promise<void> {
        const supportTeams = await firstValueFrom(
          http.get<ISupportAgent[]>('data/support-teams.json'),
        );
        patchState(store, { supportTeams });
      },

      async loadCategories(): Promise<void> {
        const categories = await firstValueFrom(
          http.get<ITicketCategory[]>('data/ticket-categories.json'),
        );
        patchState(store, { categories });
      },

      async loadAgentsSummary(): Promise<void> {
        const agentsSummary = await firstValueFrom(
          http.get<ITicketAgentSummary[]>('data/ticket-agents-summary.json'),
        );
        patchState(store, { agentsSummary });
      },

      async loadTicketDetail(id: string): Promise<void> {
        patchState(store, { isLoading: true });
        try {
          let tickets = store.tickets();
          if (!tickets.length) {
            const res = await firstValueFrom(http.get<GetTicketsResponse>('data/tickets.json'));
            tickets = res.data;
            patchState(store, { tickets });
          }
          const extras = await firstValueFrom(
            http.get<TicketDetailExtrasMap>('data/ticket-detail-extras.json'),
          );
          const ticket = tickets.find((t) => t.id === id) ?? null;
          patchState(store, {
            ticketDetail: ticket ? buildTicketDetail(ticket, extras[id]) : null,
          });
        } finally {
          patchState(store, { isLoading: false });
        }
      },

      setTicketDetailStatus(status: string): void {
        const detail = store.ticketDetail();
        if (!detail || detail.status === status) return;
        patchState(store, { ticketDetail: { ...detail, status } });
      },

      setTicketDetailPriority(priority: string): void {
        const detail = store.ticketDetail();
        if (!detail || detail.priority === priority) return;
        patchState(store, { ticketDetail: { ...detail, priority } });
      },

      setTicketDetailAssignee(agent: ITicketAgentSummary): void {
        const detail = store.ticketDetail();
        if (!detail) return;
        patchState(store, {
          ticketDetail: {
            ...detail,
            assignedTo: { name: agent.name, initial: agent.initial, role: agent.role },
          },
        });
      },

      clearTicketDetailAssignee(): void {
        const detail = store.ticketDetail();
        if (!detail) return;
        patchState(store, {
          ticketDetail: { ...detail, assignedTo: { name: '', initial: '', role: '' } },
        });
      },

      addAgent(agent: ISupportAgent): void {
        patchState(store, { supportTeams: [agent, ...store.supportTeams()] });
      },

      updateAgent(agent: ISupportAgent): void {
        patchState(store, {
          supportTeams: store.supportTeams().map((a) => (a.id === agent.id ? agent : a)),
        });
      },

      removeAgent(agentId: number): void {
        patchState(store, {
          supportTeams: store.supportTeams().filter((a) => a.id !== agentId),
        });
      },

      // ── Classification Admin ──────────────────────────────────────────────────

      async loadClassifications(event: TableLazyLoadEvent): Promise<void> {
        const { page, rows, sortField, sortOrder } = commonService.getPaginationParam(event);
        const updates: Partial<TicketsState> = {
          classificationTableEnabled: true,
          classificationPageNumber: page,
          classificationPageSize: rows,
          classificationSortBy: (sortField as string) ?? 'id',
          classificationSortOrder: sortOrder,
        };
        if (store.userStaffMemberId() === undefined) {
          const loginInfo = await commonService.getLoginInfo();
          updates.userStaffMemberId = loginInfo?.user?.staffMemberId ?? '';
          updates.userNumericStaffMemberId = parseInt(loginInfo?.user?.staffMemberId ?? '0', 10);
          updates.userRoleId = +(loginInfo?.user?.primaryRole?.roleId ?? 0);
        }
        patchState(store, updates);
      },

      reloadClassifications(): void {
        store.classificationsResource.reload();
      },

      setClassificationSearch(term: SettledSearchTerm): void {
        patchState(store, { classificationSearchTerm: term, classificationPageNumber: 1 });
      },

      deleteClassification(classification: TicketClassification): void {
        if (!classification.id) return;

        from(commonService.getLoginInfo())
          .pipe(
            switchMap((loginInfo) => {
              const body: DeleteTicketClassificationRequest = {
                id: classification.id,
                staffMemberId: parseInt(loginInfo?.user?.staffMemberId ?? '0', 10),
                roleId: +(loginInfo?.user?.primaryRole?.roleId ?? 0),
              };
              return ticketMasterApi.deleteClassification(body);
            }),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.classificationsResource.reload();
                store.classificationOptionsResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      // ── Header Admin ──────────────────────────────────────────────────────────

      loadHeaders(event: TableLazyLoadEvent): void {
        const { page, rows, sortField, sortOrder } = commonService.getPaginationParam(event);
        patchState(store, {
          headerPageNumber: page,
          headerPageSize: rows,
          headerSortBy: (sortField as string) ?? 'headerName',
          headerSortOrder: sortOrder,
        });
      },

      reloadHeaders(): void {
        store.headersResource.reload();
      },

      setHeaderSearch(term: SettledSearchTerm): void {
        patchState(store, { headerSearchTerm: term, headerPageNumber: 1 });
      },

      setHeaderClassificationFilter(classificationId: string | null): void {
        patchState(store, {
          headerSelectedClassificationId: classificationId,
          headerPageNumber: 1,
        });
      },

      deleteHeader(header: TicketHeader): void {
        if (!header.id) return;
        const body: DeleteTicketHeaderRequest = { id: +header.id };
        ticketMasterApi
          .deleteHeader(body)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) store.headersResource.reload();
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      // ── Type Admin ────────────────────────────────────────────────────────────

      loadTypes(event: TableLazyLoadEvent): void {
        const { page, rows, sortField, sortOrder } = commonService.getPaginationParam(event);
        patchState(store, {
          typePageNumber: page,
          typePageSize: rows,
          typeSortBy: (sortField as string) ?? 'ticketTypeName',
          typeSortOrder: sortOrder,
        });
      },

      reloadTypes(): void {
        store.typesResource.reload();
      },

      setTypeClassificationFilter(classificationId: string | null): void {
        patchState(store, {
          typeSelectedClassificationId: classificationId,
          typeSelectedHeaderId: null,
          typePageNumber: 1,
        });
      },

      setTypeHeaderFilter(headerId: string | null): void {
        patchState(store, { typeSelectedHeaderId: headerId, typePageNumber: 1 });
      },

      deleteType(type: TicketType): void {
        if (!type.id) return;
        ticketMasterApi
          .deleteType(type.id)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) store.typesResource.reload();
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);
