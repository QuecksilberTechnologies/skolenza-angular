import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { RoleDashboardApi } from '@core/services';

import { AdminDashboardStore } from './admin-dashboard.store';

const section = <T>(data: T) => ({
  data,
  source: null,
  isPlaceholder: false,
  placeholderFields: null,
});

const response = () => ({
  isSucceeded: true,
  message: '',
  errors: [],
  data: {
    roleTypeCode: 'INSTITUTION_ADMIN',
    roleTypeName: 'Institution Administrator',
    generatedAtUtc: '2026-10-10T00:00:00Z',
    institutionAdministrator: {
      summary: section({
        totalStaffMembers: 12,
        newHiresThisMonth: 2,
        openPositions: 10,
        pendingApprovals: 3,
      }),
      staffMemberOverview: section({ total: 12, active: 10, inactive: 2, onLeave: 1 }),
      currentlyOnLeave: section([]),
      staffMembersOnNotice: section([]),
      exitedStaffMembers: section([]),
      locations: section({ total: 0, active: 0, headOffice: 0, locations: [] }),
      upcomingBirthdays: section([]),
      recentOnboarding: section([]),
      departmentHeadcount: section([
        { departmentId: 1, departmentName: 'Engineering', headcount: 8 },
      ]),
      storageStatus: section({ capacityGigabytes: 50, usedGigabytes: 31.4, categories: [] }),
      hiringPipeline: section({ totalApplicants: 148, stages: [] }),
    },
  },
});

describe('AdminDashboardStore', () => {
  const apiMock = { getDashboard: vi.fn() };

  beforeEach(() => {
    apiMock.getDashboard.mockReset().mockReturnValue(of(response()));
    TestBed.configureTestingModule({
      providers: [AdminDashboardStore, { provide: RoleDashboardApi, useValue: apiMock }],
    });
  });

  async function createStore() {
    const store = TestBed.inject(AdminDashboardStore);
    await TestBed.inject(ApplicationRef).whenStable();
    return store;
  }

  it('loads every widget from the one INSTITUTION_ADMIN call', async () => {
    const store = await createStore();

    expect(apiMock.getDashboard).toHaveBeenCalledTimes(1);
    expect(apiMock.getDashboard).toHaveBeenCalledWith('INSTITUTION_ADMIN');
    expect(store.isLoading()).toBe(false);
    expect(store.summary()?.totalStaffMembers).toBe(12);
    expect(store.staffMemberOverview()?.active).toBe(10);
    expect(store.departmentHeadcount()).toHaveLength(1);
    expect(store.storage()?.capacityGigabytes).toBe(50);
    expect(store.hiringPipeline()?.totalApplicants).toBe(148);
  });

  it('reshapes exits into list rows and keeps the section flags', async () => {
    const res = response();
    res.data.institutionAdministrator.exitedStaffMembers = {
      ...section([]),
      isPlaceholder: true,
      data: [
        {
          staffMemberId: 'enc-1',
          staffMemberName: 'Ravi Das',
          departmentName: 'Finance',
          positionName: 'Analyst',
          dateOfExit: '2026-10-01T00:00:00Z',
        },
      ],
    } as never;
    apiMock.getDashboard.mockReturnValue(of(res));

    const store = await createStore();

    expect(store.exitedStaffMembers()?.isPlaceholder).toBe(true);
    expect(store.exitedStaffMembers()?.data[0]).toMatchObject({
      title: 'Ravi Das',
      subtitle: 'Analyst · Finance',
      date: '2026-10-01',
    });
  });

  it('resolves every widget to null when the call fails', async () => {
    apiMock.getDashboard.mockReturnValue(throwError(() => new Error('Forbidden')));

    const store = await createStore();

    expect(store.summary()).toBeNull();
    expect(store.birthdays()).toBeNull();
    expect(store.dashboardResource.error()).toBeUndefined();
  });

  it('treats an unsucceeded envelope as no data', async () => {
    apiMock.getDashboard.mockReturnValue(
      of({ isSucceeded: false, message: 'Nope', errors: [], data: null }),
    );

    const store = await createStore();

    expect(store.staffMemberOverview()).toBeNull();
  });

  it('reload refetches the whole dashboard', async () => {
    const store = await createStore();

    store.reload();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(apiMock.getDashboard).toHaveBeenCalledTimes(2);
  });

  it('reports loading only for the card whose refresh started the reload', async () => {
    const store = await createStore();
    const pending = new Subject<ReturnType<typeof response>>();
    apiMock.getDashboard.mockReturnValue(pending);

    store.reload('upcoming-birthdays');
    TestBed.tick();

    expect(store.isSectionLoading('upcoming-birthdays')).toBe(true);
    expect(store.isSectionLoading('recent-onboarding')).toBe(false);

    pending.next(response());
    pending.complete();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.isSectionLoading('upcoming-birthdays')).toBe(false);
    // cleared, so the next load not started by a card spins every card again
    expect(store.refreshingSection()).toBeNull();
  });

  it('reports loading for every card on a page-wide reload', async () => {
    const store = await createStore();
    apiMock.getDashboard.mockReturnValue(new Subject());

    store.reload();
    TestBed.tick();

    expect(store.isSectionLoading('upcoming-birthdays')).toBe(true);
    expect(store.isSectionLoading('recent-onboarding')).toBe(true);
  });
});
