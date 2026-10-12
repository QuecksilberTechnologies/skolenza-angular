import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { RoleDashboardApi } from '@core/services';

import { StaffMemberDashboardStore } from './dashboard-staff-member/staff-member-dashboard.store';
import { ExternalDashboardStore } from './dashboard-external/external-dashboard.store';
import { ManagerDashboardStore } from './dashboard-manager/manager-dashboard.store';

const metrics = {
  data: { metrics: [{ code: 'TOTAL', label: 'Total', value: 4, unit: null }] },
  source: null,
  isPlaceholder: true,
  placeholderFields: null,
};
const items = {
  data: [{ code: 'A', title: 'Item', subtitle: null, status: null, date: null }],
  source: null,
  isPlaceholder: false,
  placeholderFields: null,
};

const reply = (data: unknown) => of({ isSucceeded: true, message: '', errors: [], data });

describe('persona dashboard stores', () => {
  const apiMock = { getDashboard: vi.fn() };

  beforeEach(() => {
    apiMock.getDashboard.mockReset();
    TestBed.configureTestingModule({
      providers: [
        ManagerDashboardStore,
        StaffMemberDashboardStore,
        ExternalDashboardStore,
        { provide: RoleDashboardApi, useValue: apiMock },
      ],
    });
  });

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  it('manager store reads STAFF_MANAGER and exposes its sections', async () => {
    apiMock.getDashboard.mockReturnValue(
      reply({ staffManager: { teamSummary: metrics, teamLeave: items } }),
    );

    const store = TestBed.inject(ManagerDashboardStore);
    await settle();

    expect(apiMock.getDashboard).toHaveBeenCalledWith('STAFF_MANAGER');
    expect(store.teamSummary()?.data.metrics).toHaveLength(1);
    expect(store.teamSummary()?.isPlaceholder).toBe(true);
    expect(store.teamLeave()?.data).toHaveLength(1);
    expect(store.teamBirthdays()).toBeNull();
  });

  it('workforce store reads STAFF_MEMBER and exposes its sections', async () => {
    apiMock.getDashboard.mockReturnValue(
      reply({ staffMember: { myLeave: metrics, myTasks: items } }),
    );

    const store = TestBed.inject(StaffMemberDashboardStore);
    await settle();

    expect(apiMock.getDashboard).toHaveBeenCalledWith('STAFF_MEMBER');
    expect(store.myLeave()?.data.metrics?.[0].value).toBe(4);
    expect(store.myTasks()?.data).toHaveLength(1);
    expect(store.announcements()).toBeNull();
  });

  it('external store reads EXTERNAL_USER and exposes its sections', async () => {
    apiMock.getDashboard.mockReturnValue(
      reply({ externalUser: { clientSummary: metrics, openTickets: items } }),
    );

    const store = TestBed.inject(ExternalDashboardStore);
    await settle();

    expect(apiMock.getDashboard).toHaveBeenCalledWith('EXTERNAL_USER');
    expect(store.clientSummary()?.data.metrics).toHaveLength(1);
    expect(store.openTickets()?.data).toHaveLength(1);
    expect(store.documents()).toBeNull();
  });

  it('flags a failed request so the page can show an error instead of empty cards', async () => {
    apiMock.getDashboard.mockReturnValue(throwError(() => new Error('down')));

    const store = TestBed.inject(ManagerDashboardStore);
    await settle();

    expect(store.hasError()).toBe(true);
    expect(store.teamSummary()).toBeNull();
  });

  it('flags an unsuccessful envelope as an error too', async () => {
    apiMock.getDashboard.mockReturnValue(
      of({ isSucceeded: false, message: 'nope', errors: [], data: null }),
    );

    const store = TestBed.inject(ManagerDashboardStore);
    await settle();

    expect(store.hasError()).toBe(true);
  });

  it('merges summary and attendance into one overview without repeating a figure', async () => {
    const metric = (code: string, label: string, value: number) => ({
      code,
      label,
      value,
      unit: null,
    });
    apiMock.getDashboard.mockReturnValue(
      reply({
        staffManager: {
          teamSummary: {
            ...metrics,
            isPlaceholder: false,
            data: {
              metrics: [
                metric('TEAM_MEMBERS', 'Team Members', 8),
                metric('PRESENT_TODAY', 'Present Today', 6),
                metric('ON_LEAVE', 'On Leave', 1),
                metric('ON_NOTICE', 'On Notice', 1),
                metric('PENDING_APPROVALS', 'Pending Approvals', 2),
              ],
            },
          },
          teamAttendance: {
            ...metrics,
            data: {
              metrics: [
                metric('PRESENT', 'Present', 6),
                metric('ABSENT', 'Absent', 1),
                metric('ON_LEAVE', 'On Leave', 1),
              ],
            },
          },
        },
      }),
    );

    const store = TestBed.inject(ManagerDashboardStore);
    await settle();

    expect(store.teamOverview()?.data.metrics?.map((m) => m.code)).toEqual([
      'TEAM_MEMBERS',
      'PRESENT_TODAY',
      'ABSENT',
      'ON_LEAVE',
      'ON_NOTICE',
      'PENDING_APPROVALS',
    ]);
    // attendance is sample data, so the merged card is too
    expect(store.teamOverview()?.isPlaceholder).toBe(true);
  });

  it('reports all-sample-data only when every present section is a placeholder', async () => {
    apiMock.getDashboard.mockReturnValue(
      reply({ staffManager: { teamSummary: metrics, teamLeave: items } }),
    );

    const store = TestBed.inject(ManagerDashboardStore);
    await settle();

    // teamLeave (items) is real data
    expect(store.allPlaceholder()).toBe(false);
  });

  it('reports all-sample-data when every section is a placeholder', async () => {
    apiMock.getDashboard.mockReturnValue(
      reply({ staffManager: { teamSummary: metrics, teamAttendance: metrics } }),
    );

    const store = TestBed.inject(ManagerDashboardStore);
    await settle();

    expect(store.allPlaceholder()).toBe(true);
  });

  it('does not flag a successful read', async () => {
    apiMock.getDashboard.mockReturnValue(reply({ staffManager: {} }));

    const store = TestBed.inject(ManagerDashboardStore);
    await settle();

    expect(store.hasError()).toBe(false);
  });
});
