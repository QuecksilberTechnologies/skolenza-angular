import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { Clock, Sunrise, Sunset } from 'lucide-angular';

import { Common } from '@core/services';
import { LeaveApi } from '@core/services/leave-api';
import { LeaveRule as LeaveRuleApi } from '@core/services/leave-rule';
import { LeaveTypes as LeaveTypesApi } from '@core/services/leave-types';
import {
  ILeaveBalance,
  ILeaveDuration,
  ILeaveRule,
  ILeaveType,
  LeaveState,
  SubmitLeaveRequestPayload,
} from '@shared/interfaces';

const initialState: LeaveState = {
  leaveTypeCards: [],
  upcomingLeaves: [],
  leaveHistory: [],
  isLoadingMyLeaves: false,

  leaveRequests: [],
  totalRequestRecords: 0,
  isLoadingRequests: false,

  leaveBalances: [],
  totalBalanceRecords: 0,
  isLoadingBalances: false,

  leaveStatus: [],
  isLoadingStatus: false,

  leaveTypes: [],
  isLoadingTypes: false,

  leaveRules: [],
  isLoadingRules: false,
};

export const LeaveStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withProps(() => ({
    leaveDurations: [
      { name: 'Full Day', value: 'full', icon: Clock },
      { name: 'Half Day', value: 'half', icon: Sunrise },
      { name: 'Short Leave', value: 'short', icon: Sunset },
    ] as ILeaveDuration[],
  })),
  withComputed(({ leaveTypeCards, leaveRequests }) => ({
    totalLeaves: computed(() =>
      leaveTypeCards()
        .filter((lt) => lt.isActive)
        .reduce((sum, lt) => sum + (lt.total ?? 0), 0),
    ),
    totalAvailable: computed(() =>
      leaveTypeCards()
        .filter((lt) => lt.isActive)
        .reduce((sum, lt) => sum + (lt.available ?? 0), 0),
    ),
    totalConsumed: computed(() =>
      leaveTypeCards()
        .filter((lt) => lt.isActive)
        .reduce((sum, lt) => sum + (lt.consumed ?? 0), 0),
    ),
    pendingRequests: computed(() => leaveRequests().filter((r) => r.statusText === 'Pending')),
    approvedRequests: computed(() => leaveRequests().filter((r) => r.statusText === 'Approved')),
    rejectedRequests: computed(() => leaveRequests().filter((r) => r.statusText === 'Rejected')),
  })),
  withMethods((store) => {
    const leaveApi = inject(LeaveApi);
    const leaveTypesApi = inject(LeaveTypesApi);
    const leaveRuleApi = inject(LeaveRuleApi);
    const commonService = inject(Common);

    return {
      // ========== My Leaves ==========
      loadMyLeaves(): void {
        patchState(store, { isLoadingMyLeaves: true });
        leaveApi.getMyLeaves().subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              patchState(store, {
                leaveTypeCards: res.data.leaveTypes,
                upcomingLeaves: res.data.upcomingLeaves,
                leaveHistory: res.data.leaveHistory,
              });
            } else {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, { isLoadingMyLeaves: false });
          },
          error: () => patchState(store, { isLoadingMyLeaves: false }),
        });
      },

      deleteUpcomingLeave(id: number): void {
        patchState(store, {
          upcomingLeaves: store.upcomingLeaves().filter((l) => l.id !== id),
        });
      },

      // ========== Requested Leaves ==========
      loadRequestedLeaves(): void {
        patchState(store, { isLoadingRequests: true });
        leaveApi.getRequestedLeaves().subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              patchState(store, {
                leaveRequests: res.data,
                totalRequestRecords: res.totalRecords,
              });
            } else {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, { isLoadingRequests: false });
          },
          error: () => patchState(store, { isLoadingRequests: false }),
        });
      },

      approveLeaveRequest(id: number): void {
        patchState(store, { isLoadingRequests: true });
        leaveApi.approveLeave(id).subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              patchState(store, {
                leaveRequests: store.leaveRequests().map((r) =>
                  r.id === id
                    ? {
                        ...r,
                        statusText: 'Approved',
                        statusColor: '#22c55e',
                        isAccepted: true,
                        isRejected: false,
                      }
                    : r,
                ),
              });
              commonService.showMessage(res.message, 'success');
            } else {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, { isLoadingRequests: false });
          },
          error: (err) => {
            commonService.showMessage(err?.message ?? 'Failed to approve leave', 'error');
            patchState(store, { isLoadingRequests: false });
          },
        });
      },

      rejectLeaveRequest(id: number, reason?: string): void {
        patchState(store, { isLoadingRequests: true });
        leaveApi.rejectLeave(id, reason).subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              patchState(store, {
                leaveRequests: store.leaveRequests().map((r) =>
                  r.id === id
                    ? {
                        ...r,
                        statusText: 'Rejected',
                        statusColor: '#ef4444',
                        isAccepted: false,
                        isRejected: true,
                      }
                    : r,
                ),
              });
              commonService.showMessage(res.message, 'success');
            } else {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, { isLoadingRequests: false });
          },
          error: (err) => {
            commonService.showMessage(err?.message ?? 'Failed to reject leave', 'error');
            patchState(store, { isLoadingRequests: false });
          },
        });
      },

      submitLeaveRequest(payload: SubmitLeaveRequestPayload): void {
        leaveApi.submitLeaveRequest(payload).subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              commonService.showMessage(res.message, 'success');
            } else {
              commonService.showMessage(res.message, 'error');
            }
          },
          error: (err) =>
            commonService.showMessage(err?.message ?? 'Failed to submit leave', 'error'),
        });
      },

      deleteLeaveStatus(id: number): void {
        patchState(store, { isLoadingStatus: true });
        leaveApi.deleteLeaveStatus(id).subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              patchState(store, {
                leaveStatus: store.leaveStatus().filter((s) => s.id !== id),
              });
              commonService.showMessage(res.message, 'success');
            } else {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, { isLoadingStatus: false });
          },
          error: (err) => {
            commonService.showMessage(err?.message ?? 'Failed to delete status', 'error');
            patchState(store, { isLoadingStatus: false });
          },
        });
      },

      // ========== Leave Balances ==========
      loadLeaveBalances(): void {
        patchState(store, { isLoadingBalances: true });
        leaveApi.getLeaveBalances().subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              patchState(store, {
                leaveBalances: res.data,
                totalBalanceRecords: res.totalRecords,
              });
            } else {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, { isLoadingBalances: false });
          },
          error: () => patchState(store, { isLoadingBalances: false }),
        });
      },

      addLeaveBalance(balance: ILeaveBalance): void {
        patchState(store, {
          leaveBalances: [balance, ...store.leaveBalances()],
        });
      },

      updateLeaveBalance(balance: ILeaveBalance): void {
        patchState(store, {
          leaveBalances: store.leaveBalances().map((b) => (b.id === balance.id ? balance : b)),
        });
      },

      deleteLeaveBalance(id: number): void {
        patchState(store, {
          leaveBalances: store.leaveBalances().filter((b) => b.id !== id),
        });
      },

      // ========== Leave Status ==========
      loadLeaveStatus(): void {
        patchState(store, { isLoadingStatus: true });
        leaveApi.getLeaveStatus().subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              patchState(store, { leaveStatus: res.data });
            } else {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, { isLoadingStatus: false });
          },
          error: () => patchState(store, { isLoadingStatus: false }),
        });
      },

      // ========== Leave Types (admin CRUD) ==========
      async loadLeaveTypes(): Promise<void> {
        const loginInfo = await commonService.getLoginInfo();
        const sessionUser = loginInfo?.user;
        if (!sessionUser) return;
        const staffMemberId = sessionUser?.staffMemberId;
        const roleId = +(sessionUser?.primaryRole?.roleId ?? 0);

        patchState(store, { isLoadingTypes: true });
        leaveTypesApi.getAllLeaveTypes(staffMemberId, 0, roleId).subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              patchState(store, { leaveTypes: res.data });
            } else {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, { isLoadingTypes: false });
          },
          error: () => patchState(store, { isLoadingTypes: false }),
        });
      },

      addLeaveType(leaveType: ILeaveType): void {
        patchState(store, {
          leaveTypes: [leaveType, ...store.leaveTypes()],
        });
      },

      updateLeaveType(leaveType: ILeaveType): void {
        patchState(store, {
          leaveTypes: store.leaveTypes().map((t) => (t.id === leaveType.id ? leaveType : t)),
        });
      },

      async deleteLeaveType(leaveType: ILeaveType): Promise<void> {
        const loginInfo = await commonService.getLoginInfo();
        const sessionUser = loginInfo?.user;
        if (!sessionUser) return;
        const staffMemberId = sessionUser?.staffMemberId;
        const roleId = +(sessionUser?.primaryRole?.roleId ?? 0);

        leaveTypesApi.deleteLeaveType({ id: leaveType.id, roleId, staffMemberId }).subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              patchState(store, {
                leaveTypes: store.leaveTypes().filter((t) => t.id !== leaveType.id),
              });
            }
            commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          },
          error: (err) => commonService.showMessage(err.message, 'error'),
        });
      },

      // ========== Leave Rules (admin CRUD) ==========
      async loadLeaveRules(): Promise<void> {
        const loginInfo = await commonService.getLoginInfo();
        const sessionUser = loginInfo?.user;
        if (!sessionUser) return;
        const staffMemberId = sessionUser?.staffMemberId;
        const roleId = +(sessionUser?.primaryRole?.roleId ?? 0);

        patchState(store, { isLoadingRules: true });
        leaveRuleApi.getAllLeaveRules(staffMemberId, 0, roleId).subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              patchState(store, { leaveRules: res.data });
            } else {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, { isLoadingRules: false });
          },
          error: () => patchState(store, { isLoadingRules: false }),
        });
      },

      addLeaveRule(leaveRule: ILeaveRule): void {
        patchState(store, {
          leaveRules: [leaveRule, ...store.leaveRules()],
        });
      },

      updateLeaveRule(leaveRule: ILeaveRule): void {
        patchState(store, {
          leaveRules: store.leaveRules().map((r) => (r.id === leaveRule.id ? leaveRule : r)),
        });
      },

      async deleteLeaveRule(leaveRule: ILeaveRule): Promise<void> {
        const loginInfo = await commonService.getLoginInfo();
        const staffMemberId = loginInfo?.user?.staffMemberId ?? '';

        leaveRuleApi.deleteLeaveRule({ id: leaveRule.id, userId: staffMemberId }).subscribe({
          next: (res) => {
            if (res.isSucceeded) {
              patchState(store, {
                leaveRules: store.leaveRules().filter((r) => r.id !== leaveRule.id),
              });
            }
            commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          },
          error: (err) => commonService.showMessage(err.message, 'error'),
        });
      },

      // ========== Domain Helpers ==========
      getLeaveDaysCount(leave: { startDate: string; endDate: string }): number {
        const startDate = new Date(leave.startDate).getTime();
        const endDate = new Date(leave.endDate).getTime();

        if (isNaN(startDate) || isNaN(endDate)) return 0;

        const msPerDay = 1000 * 60 * 60 * 24;
        const diffDays = Math.floor((endDate - startDate) / msPerDay) + 1;

        return diffDays > 0 ? diffDays : 0;
      },
    };
  }),
);
