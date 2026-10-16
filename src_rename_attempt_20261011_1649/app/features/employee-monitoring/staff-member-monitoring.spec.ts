import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ApiError, Common, StaffMembersApi } from '@core/services';
import { AgentStatus, FieldVisit, IStaffMember, ScreenCapture } from '@shared/interfaces';

import { mockCaptures, mockFieldVisits } from './data/staffMember-monitoring.mock';
import StaffMemberMonitoring from './staffMember-monitoring';
import { StaffMemberMonitoringApi } from './staffMember-monitoring-api';
import { StaffMemberMonitoringStore, toDateKey } from './staffMember-monitoring.store';

const ok = <T>(data: T) => of({ isSucceeded: true, message: '', data });

const staffMember = (staffMemberId: string, firstName: string, lastName: string) =>
  ({ staffMemberId, firstName, lastName, designationName: 'Dev', departmentName: 'Eng' }) as IStaffMember;

const staffMembers = [staffMember('E1', 'Asha', 'Rao'), staffMember('E2', 'Kabir', 'Das')];

function agent(staffMemberId: string, deviceName: string, heartbeat: string | null): AgentStatus {
  return {
    agentInstanceId: `a-${deviceName}`,
    staffMemberId,
    deviceName,
    connectionStatus: heartbeat ? 'Online' : 'NeverConnected',
    lastHeartbeatDateTime: heartbeat,
    lastCaptureDateTime: null,
    lastSuccessfulUploadDateTime: null,
    pendingCaptureCount: 0,
    lastErrorCode: null,
    agentVersion: null,
  };
}

function capture(minute: number, hour = 10): ScreenCapture {
  return {
    captureId: `c-${hour}-${minute}`,
    staffMemberId: 'E1',
    capturedAtUtc: new Date(2026, 9, 1, hour, minute).toISOString(),
    monitorNumber: 0,
    imageUrl: 'mock/screens/screen-1.svg',
  };
}

const visit: FieldVisit = {
  id: 'v1',
  staffMemberId: 'E1',
  checkInUtc: new Date(2026, 9, 1, 10, 0).toISOString(),
  checkOutUtc: new Date(2026, 9, 1, 11, 30).toISOString(),
  placeName: 'Client office',
  address: 'Sector 62, Noida',
  latitude: 28.6,
  longitude: 77.3,
  distanceMeters: 2500,
  purpose: 'Demo',
  status: 'Completed',
};

describe('StaffMemberMonitoring', () => {
  const apiMock = {
    getAgentStatuses: vi.fn(() => ok<AgentStatus[]>([])),
    getCaptures: vi.fn(() => ok([capture(5), capture(20), capture(10, 11)])),
    getFieldVisits: vi.fn(() => ok([visit])),
  };
  const staffMembersApiMock = { getAllStaffMembers: vi.fn(() => ok(staffMembers)) };
  const commonMock = {
    showMessage: vi.fn(),
    setPageHeaderInfo: vi.fn(),
    getLoginInfo: vi.fn(async () => ({ user: { staffMemberId: 'ME' } })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: StaffMemberMonitoringApi, useValue: apiMock },
        { provide: StaffMembersApi, useValue: staffMembersApiMock },
        { provide: Common, useValue: commonMock },
        { provide: DialogService, useValue: { open: vi.fn() } },
      ],
    });
  });

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  describe('store', () => {
    function createStore() {
      TestBed.configureTestingModule({ providers: [StaffMemberMonitoringStore] });
      return TestBed.inject(StaffMemberMonitoringStore);
    }

    it('selects the first staffMember and loads that staffMember for today', async () => {
      const store = createStore();
      await stable();

      expect(staffMembersApiMock.getAllStaffMembers).toHaveBeenCalledWith(
        expect.objectContaining({ UserStaffMemberId: 'ME' }),
      );
      expect(store.staffMembers()[0].staffMemberFullName).toBe('Asha Rao');
      expect(store.staffMemberId()).toBe('E1');
      expect(apiMock.getCaptures).toHaveBeenCalledWith({
        staffMemberId: 'E1',
        date: toDateKey(new Date()),
      });
      expect(store.captures()).toHaveLength(3);
    });

    it('refetches when the staffMember or date changes', async () => {
      const store = createStore();
      await stable();

      store.setStaffMember('E2');
      store.setDate(new Date(2026, 8, 15));
      await stable();

      expect(apiMock.getCaptures).toHaveBeenLastCalledWith({
        staffMemberId: 'E2',
        date: '2026-09-15',
      });
      expect(apiMock.getFieldVisits).toHaveBeenLastCalledWith({
        staffMemberId: 'E2',
        date: '2026-09-15',
      });
    });

    it('groups captures by hour', async () => {
      const store = createStore();
      await stable();

      expect(store.captureGroups().map((g) => g.captures.length)).toEqual([2, 1]);
    });

    it('steps through captures and stops at both ends', async () => {
      const store = createStore();
      await stable();

      store.openCapture('c-10-5');
      expect(store.hasPrevious()).toBe(false);
      store.previousCapture();
      expect(store.selectedCapture()?.captureId).toBe('c-10-5');

      store.nextCapture();
      store.nextCapture();
      expect(store.selectedCapture()?.captureId).toBe('c-11-10');
      expect(store.hasNext()).toBe(false);
      expect(store.selectedPosition()).toBe(3);

      store.closeCapture();
      expect(store.selectedCapture()).toBeNull();
    });

    it('sums field time and distance', async () => {
      const store = createStore();
      await stable();

      expect(store.fieldMinutes()).toBe(90);
      expect(store.distanceKm()).toBe(2.5);
    });

    it("shows the selected staffMember's most recently heard-from agent", async () => {
      apiMock.getAgentStatuses.mockReturnValueOnce(
        ok([
          agent('E1', 'OLD-PC', '2026-10-01T08:00:00Z'),
          agent('E2', 'OTHER', '2026-10-01T10:00:00Z'),
          agent('E1', 'NEW-PC', '2026-10-01T09:00:00Z'),
        ]),
      );
      const store = createStore();
      await stable();

      expect(store.agentStatus()?.deviceName).toBe('NEW-PC');
      expect(store.policyMissing()).toBe(false);
    });

    it('flags a missing policy on a 404 status read without toasting', async () => {
      apiMock.getAgentStatuses.mockReturnValueOnce(
        throwError(() => new ApiError('StaffMember monitoring policy was not found.', 404)),
      );
      const store = createStore();
      await stable();

      expect(store.policyMissing()).toBe(true);
      expect(store.agentStatus()).toBeNull();
      expect(commonMock.showMessage).not.toHaveBeenCalled();
    });

    it('toasts and empties the list on a failed response', async () => {
      apiMock.getCaptures.mockReturnValueOnce(
        of({ isSucceeded: false, message: 'Nope', data: [] as ScreenCapture[] }),
      );
      const store = createStore();
      await stable();

      expect(commonMock.showMessage).toHaveBeenCalledWith('Nope', 'error');
      expect(store.captures()).toEqual([]);
      expect(store.capturesFailed()).toBe(true);
    });

    it('defaults to the first staffMember with a registered agent', async () => {
      apiMock.getAgentStatuses.mockReturnValueOnce(ok([agent('E2', 'PC', null)]));
      const store = createStore();
      await stable();

      expect(store.staffMemberId()).toBe('E2');
      expect(apiMock.getCaptures).toHaveBeenCalledTimes(1);
      expect(apiMock.getCaptures).toHaveBeenCalledWith(
        expect.objectContaining({ staffMemberId: 'E2' }),
      );
    });

    it('flags a failed status read as failed, not as no agent', async () => {
      apiMock.getAgentStatuses.mockReturnValueOnce(
        throwError(() => new ApiError('Server error', 500)),
      );
      const store = createStore();
      await stable();

      expect(store.agentStatusFailed()).toBe(true);
      expect(store.policyMissing()).toBe(false);
      expect(commonMock.showMessage).toHaveBeenCalledWith('Server error', 'error');
    });

    it('steps the day and never past today', async () => {
      const store = createStore();
      await stable();

      store.shiftDate(1);
      expect(store.isToday()).toBe(true);

      store.shiftDate(-1);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(store.date()).toBe(toDateKey(yesterday));
    });
  });

  describe('page', () => {
    async function render() {
      const fixture = TestBed.createComponent(StaffMemberMonitoring);
      await stable();
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('renders one labelled tile per screenshot', async () => {
      const host = await render();
      const tiles = host.querySelectorAll<HTMLButtonElement>('button[id^="capture-"]');

      expect(tiles).toHaveLength(3);
      expect(tiles[0].getAttribute('aria-label')).toContain('Open screenshot taken at');
    });

    it('offers to register an agent when the staffMember has none', async () => {
      apiMock.getCaptures.mockReturnValue(ok([]));
      const host = await render();

      expect(host.textContent).toContain('No desktop agent for Asha Rao');
      expect(host.textContent).toContain('Register agent');
      apiMock.getCaptures.mockImplementation(() => ok([capture(5), capture(20), capture(10, 11)]));
    });

    it('shows the empty state when the agent uploaded nothing', async () => {
      apiMock.getAgentStatuses.mockReturnValueOnce(ok([agent('E1', 'PC', '2026-10-01T08:00:00Z')]));
      apiMock.getCaptures.mockReturnValue(ok([]));
      const host = await render();

      expect(host.textContent).toContain('No screenshots for this day');
      apiMock.getCaptures.mockImplementation(() => ok([capture(5), capture(20), capture(10, 11)]));
    });

    it('shows a retryable error, not the empty state, when screenshots fail', async () => {
      apiMock.getCaptures.mockReturnValueOnce(throwError(() => new ApiError('Boom', 500)));
      const host = await render();

      expect(host.textContent).toContain("Couldn't load screenshots");
      expect(host.textContent).not.toContain('No screenshots for this day');
      expect(host.textContent).toContain('Try again');
    });
  });

  describe('mock data', () => {
    it('is stable per staffMember and day, and never in the future', () => {
      const now = new Date(2026, 9, 1, 12, 0);

      expect(mockCaptures('EMP-1001', '2026-10-01', now)).toEqual(
        mockCaptures('EMP-1001', '2026-10-01', now),
      );
      expect(
        mockCaptures('EMP-1001', '2026-10-01', now).every((c) => new Date(c.capturedAtUtc) <= now),
      ).toBe(true);
    });

    it('gives office staff no field visits and weekends nothing', () => {
      expect(mockFieldVisits('EMP-1001', '2026-10-01')).toEqual([]);
      expect(mockCaptures('EMP-1003', '2026-10-03')).toEqual([]);
      expect(mockFieldVisits('EMP-1003', '2026-10-01').length).toBeGreaterThan(0);
    });
  });
});
