import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { catchError, from, map, Observable, of, switchMap, tap } from 'rxjs';

import { ApiError, Common, StaffMembersApi } from '@core/services';
import {
  AgentStatus,
  MonitoredStaffMember,
  MonitoringPolicy,
  MonitoringResponse,
  ScreenCapture,
} from '@shared/interfaces';

import { StaffMemberMonitoringApi } from './staff-member-monitoring-api';

export type MonitoringTab = 'screenshots' | 'field-work';

export interface CaptureHourGroup {
  /** Start of the hour, local time. */
  hour: Date;
  captures: ScreenCapture[];
}

interface StaffMemberMonitoringState {
  /** The staffMember the user picked; `null` falls back to a default (see `staffMemberId`). */
  pickedStaffMemberId: string | null;
  /** Local calendar day, `yyyy-MM-dd`. */
  date: string;
  activeTab: MonitoringTab;
  selectedCaptureId: string | null;
  /**
   * The policy last saved or returned in this session. The API has no policy read, so the
   * policy dialog opens on this, or on the documented defaults before anything is saved.
   */
  policy: MonitoringPolicy | null;
}

interface AgentStatuses {
  agents: AgentStatus[];
  /** `agent/status` 404s until the Institution saves a monitoring policy. */
  policyMissing: boolean;
  /** Any other failure: the agents are unknown, not absent. */
  failed: boolean;
}

/** Large enough to list a Institution's whole workforce in one select. */
const STAFF_MEMBER_PAGE_SIZE = 500;

export function toDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const initialState: StaffMemberMonitoringState = {
  pickedStaffMemberId: null,
  date: toDateKey(new Date()),
  activeTab: 'screenshots',
  selectedCaptureId: null,
  policy: null,
};

/** Unwraps the envelope, throwing a failed response so it surfaces as an error, not as no data. */
const unwrap = <T>(source: Observable<MonitoringResponse<T>>) =>
  source.pipe(
    map((res) => {
      if (!res.isSucceeded) throw new Error(res.message);
      return res.data;
    }),
  );

export const StaffMemberMonitoringStore = signalStore(
  withState(initialState),
  withProps(() => {
    const api = inject(StaffMemberMonitoringApi);
    const staffMembersApi = inject(StaffMembersApi);
    const commonService = inject(Common);
    const toastError = (err: unknown) => commonService.showMessage((err as Error).message, 'error');

    return {
      _api: api,
      _toastError: toastError,
      staffMembersResource: rxResource<MonitoredStaffMember[], void>({
        stream: () =>
          from(commonService.getLoginInfo()).pipe(
            switchMap((loginInfo) =>
              unwrap(
                staffMembersApi.getAllStaffMembers({
                  UserStaffMemberId: loginInfo?.user?.staffMemberId ?? '',
                  PageNumber: 1,
                  PageSize: STAFF_MEMBER_PAGE_SIZE,
                }),
              ),
            ),
            map((staffMembers) =>
              staffMembers.map((e) => ({
                staffMemberId: e.staffMemberId,
                staffMemberFullName: [e.firstName, e.lastName].filter(Boolean).join(' '),
                designationName: e.designationName,
                departmentName: e.departmentName,
              })),
            ),
            // Settle on an empty list rather than leave the resource in an error state.
            catchError((err: unknown) => {
              toastError(err);
              return of([]);
            }),
          ),
        defaultValue: [],
      }),
      agentStatusResource: rxResource<AgentStatuses, void>({
        stream: () =>
          unwrap(api.getAgentStatuses()).pipe(
            map((agents) => ({ agents, policyMissing: false, failed: false })),
            catchError((err: unknown) => {
              if (err instanceof ApiError && err.status === 404) {
                return of({ agents: [], policyMissing: true, failed: false });
              }
              toastError(err);
              return of({ agents: [], policyMissing: false, failed: true });
            }),
          ),
        defaultValue: { agents: [], policyMissing: false, failed: false },
      }),
    };
  }),
  withComputed((store) => ({
    /**
     * The picked staffMember, else the first one with a registered agent, else the first one.
     * Waits for the first agent read so the default does not switch once it lands.
     */
    staffMemberId: computed(() => {
      const picked = store.pickedStaffMemberId();
      if (picked) return picked;
      const staffMembers = store.staffMembersResource.value();
      if (!staffMembers.length || store.agentStatusResource.status() === 'loading') return null;
      const withAgent = new Set(store.agentStatusResource.value().agents.map((a) => a.staffMemberId));
      return (staffMembers.find((e) => withAgent.has(e.staffMemberId)) ?? staffMembers[0]).staffMemberId;
    }),
  })),
  withProps((store) => {
    const query = () => {
      const staffMemberId = store.staffMemberId();
      return staffMemberId ? { staffMemberId, date: store.date() } : undefined;
    };

    return {
      capturesResource: rxResource({
        params: query,
        stream: ({ params }) =>
          unwrap(store._api.getCaptures(params)).pipe(tap({ error: store._toastError })),
        defaultValue: [],
      }),
      fieldVisitsResource: rxResource({
        params: query,
        stream: ({ params }) =>
          unwrap(store._api.getFieldVisits(params)).pipe(tap({ error: store._toastError })),
        defaultValue: [],
      }),
    };
  }),
  withComputed((store) => {
    // `value()` throws while a resource is in error state.
    const captures = computed(() =>
      store.capturesResource.hasValue() ? store.capturesResource.value() : [],
    );
    const fieldVisits = computed(() =>
      store.fieldVisitsResource.hasValue() ? store.fieldVisitsResource.value() : [],
    );
    const selectedIndex = computed(() =>
      captures().findIndex((c) => c.captureId === store.selectedCaptureId()),
    );
    /** Still choosing the default staffMember, so the staffMember queries have not started. */
    const resolvingStaffMember = computed(
      () =>
        !store.staffMemberId() &&
        (store.staffMembersResource.isLoading() || store.agentStatusResource.status() === 'loading'),
    );

    return {
      staffMembers: computed(() => store.staffMembersResource.value()),
      /** The staffMember's most recently heard-from agent, when they have several devices. */
      agentStatus: computed(() => {
        const agents = store.agentStatusResource
          .value()
          .agents.filter((agent) => agent.staffMemberId === store.staffMemberId());
        const heardAt = (agent: AgentStatus) =>
          agent.lastHeartbeatDateTime ? new Date(agent.lastHeartbeatDateTime).getTime() : 0;
        return agents.sort((a, b) => heardAt(b) - heardAt(a))[0] ?? null;
      }),
      policyMissing: computed(() => store.agentStatusResource.value().policyMissing),
      agentStatusFailed: computed(() => store.agentStatusResource.value().failed),
      captures,
      fieldVisits,
      capturesFailed: computed(() => store.capturesResource.status() === 'error'),
      fieldVisitsFailed: computed(() => store.fieldVisitsResource.status() === 'error'),
      selectedStaffMember: computed(
        () =>
          store.staffMembersResource.value().find((e) => e.staffMemberId === store.staffMemberId()) ?? null,
      ),
      isLoadingCaptures: computed(() => store.capturesResource.isLoading() || resolvingStaffMember()),
      isLoadingFieldVisits: computed(
        () => store.fieldVisitsResource.isLoading() || resolvingStaffMember(),
      ),
      captureGroups: computed<CaptureHourGroup[]>(() => {
        const groups = new Map<number, CaptureHourGroup>();
        for (const capture of captures()) {
          const hour = new Date(capture.capturedAtUtc);
          hour.setMinutes(0, 0, 0);
          const key = hour.getTime();
          if (!groups.has(key)) groups.set(key, { hour, captures: [] });
          groups.get(key)!.captures.push(capture);
        }
        return [...groups.values()];
      }),
      selectedCapture: computed(() => captures()[selectedIndex()] ?? null),
      selectedPosition: computed(() => selectedIndex() + 1),
      hasPrevious: computed(() => selectedIndex() > 0),
      hasNext: computed(() => selectedIndex() >= 0 && selectedIndex() < captures().length - 1),
      fieldMinutes: computed(() =>
        fieldVisits().reduce((total, visit) => {
          const end = visit.checkOutUtc ? new Date(visit.checkOutUtc) : null;
          if (!end || visit.status === 'Missed') return total;
          return total + Math.round((end.getTime() - new Date(visit.checkInUtc).getTime()) / 60000);
        }, 0),
      ),
      distanceKm: computed(
        () => fieldVisits().reduce((total, visit) => total + visit.distanceMeters, 0) / 1000,
      ),
      isToday: computed(() => store.date() === toDateKey(new Date())),
    };
  }),
  withMethods((store) => {
    const step = (offset: number) => {
      const list = store.captures();
      const index = list.findIndex((c) => c.captureId === store.selectedCaptureId());
      const next = list[index + offset];
      if (index >= 0 && next) patchState(store, { selectedCaptureId: next.captureId });
    };

    const setDate = (date: Date | null): void => {
      if (date) patchState(store, { date: toDateKey(date), selectedCaptureId: null });
    };

    return {
      setStaffMember(staffMemberId: string | null): void {
        patchState(store, { pickedStaffMemberId: staffMemberId, selectedCaptureId: null });
      },
      setDate,
      /** Moves the day by `days`, never past today. */
      shiftDate(days: number): void {
        const date = fromDateKey(store.date());
        date.setDate(date.getDate() + days);
        if (date <= new Date()) setDate(date);
      },
      setTab(activeTab: MonitoringTab): void {
        patchState(store, { activeTab });
      },
      openCapture(captureId: string): void {
        patchState(store, { selectedCaptureId: captureId });
      },
      closeCapture(): void {
        patchState(store, { selectedCaptureId: null });
      },
      previousCapture: () => step(-1),
      nextCapture: () => step(1),
      setPolicy(policy: MonitoringPolicy): void {
        patchState(store, { policy });
        store.agentStatusResource.reload();
      },
      reloadAgents(): void {
        store.agentStatusResource.reload();
      },
      reload(): void {
        store.agentStatusResource.reload();
        store.capturesResource.reload();
        store.fieldVisitsResource.reload();
      },
    };
  }),
);
