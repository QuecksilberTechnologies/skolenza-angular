import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { CurrentUserPermissionsStore } from '@core/stores';
import { HostUser } from '@shared/interfaces';

import HostUsers from './host-users';
import { HostUsersStore } from './host-users.store';

const allowedOperations = new Set<string>();
const permissionsStoreMock = {
  canPerform: (_moduleName: string, operationName: string) => allowedOperations.has(operationName),
};

describe('HostUsers', () => {
  let component: HostUsers;
  let fixture: ComponentFixture<HostUsers>;

  type Spy = ReturnType<typeof vi.fn>;
  let storeMock: {
    isSelf: Spy;
    reloadHostUsers: Spy;
    setStatusFilter: Spy;
    loadPage: Spy;
    deleteHostUser: Spy;
    toggleActive: Spy;
    hostUsers: Spy;
    statusFilter: Spy;
    pageSize: Spy;
    totalRecords: Spy;
    isLoading: Spy;
  };
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let dialogServiceMock: { open: Spy };
  let onClose$: Subject<unknown>;

  const hostUser = {
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
  } as HostUser;

  beforeEach(async () => {
    allowedOperations.clear();
    for (const operation of ['Add', 'Update', 'Delete']) allowedOperations.add(operation);

    onClose$ = new Subject<unknown>();

    storeMock = {
      isSelf: vi.fn().mockReturnValue(false),
      reloadHostUsers: vi.fn(),
      setStatusFilter: vi.fn(),
      loadPage: vi.fn(),
      deleteHostUser: vi.fn(),
      toggleActive: vi.fn(),
      hostUsers: vi.fn().mockReturnValue([]),
      statusFilter: vi.fn().mockReturnValue(null),
      pageSize: vi.fn().mockReturnValue(10),
      totalRecords: vi.fn().mockReturnValue(0),
      isLoading: vi.fn().mockReturnValue(false),
    };
    dialogServiceMock = {
      open: vi.fn().mockReturnValue({ onClose: onClose$.asObservable(), close: vi.fn() }),
    };

    await TestBed.configureTestingModule({
      imports: [HostUsers],
      providers: [
        DatePipe,
        MessageService,
        ConfirmationService,
        provideRouter([]),
        // Permission gating is covered in the store spec; grant everything here.
        { provide: CurrentUserPermissionsStore, useValue: permissionsStoreMock },
      ],
    })
      .overrideComponent(HostUsers, {
        set: {
          providers: [{ provide: HostUsersStore, useValue: storeMock }],
        },
      })
      .overrideProvider(DialogService, { useValue: dialogServiceMock })
      .compileComponents();

    confirmSpy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');

    fixture = TestBed.createComponent(HostUsers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should link the role name to that role permission page', () => {
    storeMock.hostUsers.mockReturnValue([hostUser]);
    fixture.detectChanges();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
      'a[href*="/app/platform-roles/permissions"]',
    );
    expect(link.getAttribute('href')).toBe('/app/platform-roles/permissions/2');
  });

  describe('action menu', () => {
    it('should offer Edit, Reset Password and Delete for another host user', () => {
      component['selectedRow'].set(hostUser);
      const labels = component['actionMenuItems']()
        .map((i) => i.label)
        .filter(Boolean);
      expect(labels).toEqual(['Edit', 'Reset Password', 'Delete']);
    });

    it('Reset Password command should open the reset dialog', () => {
      component['selectedRow'].set(hostUser);
      component['actionMenuItems']().find((i) => i.label === 'Reset Password')!.command!({});
      expect(dialogServiceMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ header: 'Reset Password', data: { hostUser } }),
      );
    });

    it('Delete command should request confirmation', () => {
      component['selectedRow'].set(hostUser);
      component['actionMenuItems']().find((i) => i.label === 'Delete')!.command!({});
      expect(confirmSpy).toHaveBeenCalled();
    });

    it('should hide Delete for the signed-in host', () => {
      storeMock.isSelf.mockReturnValue(true);
      component['selectedRow'].set(hostUser);
      const items = component['actionMenuItems']();
      expect(items.map((i) => i.label).filter(Boolean)).toEqual(['Edit', 'Reset Password']);
      expect(items.some((i) => i.separator)).toBe(false);
    });
  });

  describe('toggleActive', () => {
    it('should confirm with the user name and delegate to the store on accept', () => {
      component.toggleActive(hostUser);
      const config = confirmSpy.mock.calls[0][0];
      expect(config.message).toContain(hostUser.name);
      config.accept!();
      expect(storeMock.toggleActive).toHaveBeenCalledWith(hostUser);
    });
  });

  describe('createEditHostUser', () => {
    it('should open with Add header when no user', () => {
      component.createEditHostUser();
      expect(dialogServiceMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ header: 'Add Platform User', data: { hostUser: undefined } }),
      );
    });

    it('should open with Update header when editing', () => {
      component.createEditHostUser(hostUser);
      expect(dialogServiceMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ header: 'Update Platform User', data: { hostUser } }),
      );
    });

    it('should not reload when the dialog closes without a result', () => {
      component.createEditHostUser(hostUser);
      onClose$.next(undefined);
      expect(storeMock.reloadHostUsers).not.toHaveBeenCalled();
    });

    it('should reload after a successful save', () => {
      component.createEditHostUser(hostUser);
      onClose$.next({ isSucceeded: true });
      expect(storeMock.reloadHostUsers).toHaveBeenCalled();
    });
  });

  describe('confirmDeleteHostUser', () => {
    it('should confirm with the user name and delete on accept', () => {
      component.confirmDeleteHostUser(hostUser);
      const config = confirmSpy.mock.calls[0][0];
      expect(config.message).toContain('Ada Lovelace');
      config.accept!();
      expect(storeMock.deleteHostUser).toHaveBeenCalledWith(hostUser);
    });
  });

  it('loadUsers should hand the lazy-load event to the store', () => {
    component.loadUsers({ first: 20, rows: 10 });
    expect(storeMock.loadPage).toHaveBeenCalledWith({ first: 20, rows: 10 });
  });

  it('onStatusChange should push the status into the store', () => {
    component.onStatusChange(false);
    expect(storeMock.setStatusFilter).toHaveBeenCalledWith(false);

    component.onStatusChange(null);
    expect(storeMock.setStatusFilter).toHaveBeenCalledWith(null);
  });

  it('drops the Actions column when the role has no row actions', () => {
    allowedOperations.clear();

    const denied = TestBed.createComponent(HostUsers);
    denied.detectChanges();
    const host = denied.nativeElement as HTMLElement;

    expect([...host.querySelectorAll('th')].some((th) => th.textContent?.includes('Actions'))).toBe(
      false,
    );
    expect(host.querySelector('tbody td')?.getAttribute('colspan')).toBe('6');
  });
});
