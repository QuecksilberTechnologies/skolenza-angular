import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { HostApi } from '@core/services';
import { AuthStore } from '@core/stores';
import { HostUser } from '@shared/interfaces';

import { HostUsersStore } from './host-users.store';

function createHostUser(overrides: Partial<HostUser> = {}): HostUser {
  return {
    id: 1,
    hostRoleId: 2,
    hostRoleName: 'Super Admin',
    name: 'Ada Lovelace',
    loginId: 'ada',
    email: 'ada@skolenza.com',
    mobileNumber: '9876543210',
    isActive: true,
    addedDateTime: '2026-01-01T00:00:00',
    updatedDateTime: null,
    ...overrides,
  };
}

describe('HostUsersStore', () => {
  const hostApiMock = {
    getHostUsers: vi.fn(),
    updateHostUser: vi.fn(),
    deleteHostUser: vi.fn(),
  };

  /** The signed-in host, so `isSelf` guards can be exercised without touching a real session. */
  const authStoreMock = {
    hostUser: vi.fn().mockReturnValue(null),
    sessionHost: vi.fn().mockReturnValue(null),
  };

  const serveUsers = (hostUsers: HostUser[], totalRecords = hostUsers.length) =>
    hostApiMock.getHostUsers.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: hostUsers,
        pageNumber: 1,
        pageSize: 10,
        totalRecords,
        totalPages: 1,
      }),
    );

  const listRequests = () => hostApiMock.getHostUsers.mock.calls.map((call) => call[0]);

  const whenStable = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    vi.clearAllMocks();
    serveUsers([]);
    authStoreMock.hostUser.mockReturnValue(null);
    authStoreMock.sessionHost.mockReturnValue(null);
    hostApiMock.updateHostUser.mockReturnValue(
      of({ isSucceeded: true, message: 'User updated.', errors: [], data: null }),
    );
    hostApiMock.deleteHostUser.mockReturnValue(
      of({ isSucceeded: true, message: 'User deleted.', errors: [], data: null }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        HostUsersStore,
        { provide: HostApi, useValue: hostApiMock },
        { provide: AuthStore, useValue: authStoreMock },
      ],
    });
  });

  describe('list request', () => {
    it('asks for the first page of everything on startup', async () => {
      serveUsers([createHostUser()], 4);

      const store = TestBed.inject(HostUsersStore);
      await whenStable();

      expect(listRequests()).toEqual([{ isActive: null, pageNumber: 1, pageSize: 10 }]);
      expect(store.totalRecords()).toBe(4);
      expect(store.hostUsers().map((user) => user.id)).toEqual([1]);
    });

    it('sends the status filter in a single call', async () => {
      const store = TestBed.inject(HostUsersStore);
      await whenStable();
      hostApiMock.getHostUsers.mockClear();

      store.setStatusFilter(false);
      await whenStable();

      expect(listRequests()).toEqual([{ isActive: false, pageNumber: 1, pageSize: 10 }]);
    });

    it('carries the page and page size the paginator reports', async () => {
      const store = TestBed.inject(HostUsersStore);
      await whenStable();
      hostApiMock.getHostUsers.mockClear();

      store.loadPage({ first: 50, rows: 25 });
      await whenStable();

      expect(listRequests()).toEqual([{ isActive: null, pageNumber: 3, pageSize: 25 }]);
    });

    it('returns to the first page when the filter changes', async () => {
      const store = TestBed.inject(HostUsersStore);
      await whenStable();

      store.loadPage({ first: 20, rows: 10 });
      await whenStable();
      expect(store.pageNumber()).toBe(3);

      store.setStatusFilter(true);
      expect(store.pageNumber()).toBe(1);
    });

    it('empties the page and the total when the call reports a failure', async () => {
      hostApiMock.getHostUsers.mockReturnValue(
        of({ isSucceeded: false, message: 'Nope.', errors: [], data: [] }),
      );

      const store = TestBed.inject(HostUsersStore);
      await whenStable();

      expect(store.hostUsers()).toEqual([]);
      expect(store.totalRecords()).toBe(0);
    });
  });

  describe('mutations', () => {
    it('refetches the page after a delete rather than splicing the row out', async () => {
      serveUsers([createHostUser({ id: 1 }), createHostUser({ id: 2 })], 2);
      const store = TestBed.inject(HostUsersStore);
      await whenStable();
      hostApiMock.getHostUsers.mockClear();

      store.deleteHostUser(createHostUser({ id: 2 }));
      await whenStable();

      expect(hostApiMock.deleteHostUser).toHaveBeenCalledWith({ id: 2 });
      expect(listRequests()).toEqual([{ isActive: null, pageNumber: 1, pageSize: 10 }]);
    });

    it('refetches the page after a status toggle, since the row may leave the filter', async () => {
      serveUsers([createHostUser({ id: 1, isActive: true })]);
      const store = TestBed.inject(HostUsersStore);
      await whenStable();
      hostApiMock.getHostUsers.mockClear();

      store.toggleActive(createHostUser({ id: 1, isActive: true }));
      await whenStable();

      expect(hostApiMock.updateHostUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, isActive: false }),
      );
      expect(listRequests()).toEqual([{ isActive: null, pageNumber: 1, pageSize: 10 }]);
    });

    it('refuses to delete or deactivate the signed-in host', async () => {
      authStoreMock.hostUser.mockReturnValue({ id: 1 });
      const store = TestBed.inject(HostUsersStore);
      await whenStable();

      store.deleteHostUser(createHostUser({ id: 1 }));
      store.toggleActive(createHostUser({ id: 1 }));

      expect(hostApiMock.deleteHostUser).not.toHaveBeenCalled();
      expect(hostApiMock.updateHostUser).not.toHaveBeenCalled();
    });
  });
});
