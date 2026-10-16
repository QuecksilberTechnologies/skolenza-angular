import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { CurrentUserPermissionsStore } from '@core/stores';
import { HostRole } from '@shared/interfaces';

import HostRoles from './host-roles';
import { HostRolesStore } from './host-roles.store';

const allowedOperations = new Set<string>();
const permissionsStoreMock = {
  canPerform: (_moduleName: string, operationName: string) => allowedOperations.has(operationName),
};

describe('HostRoles', () => {
  let component: HostRoles;
  let fixture: ComponentFixture<HostRoles>;

  type Spy = ReturnType<typeof vi.fn>;
  let storeMock: {
    isOwnRole: Spy;
    reloadHostRoles: Spy;
    setStatusFilter: Spy;
    deleteHostRole: Spy;
    toggleActive: Spy;
    hostRoles: Spy;
    filteredHostRoles: Spy;
    statusFilter: Spy;
    isLoading: Spy;
  };
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let dialogServiceMock: { open: Spy };
  let onClose$: Subject<unknown>;

  const hostRole = {
    id: 2,
    name: 'Support Agent',
    description: 'Read-only access to institution data',
    isActive: true,
    addedDateTime: '2026-01-01T00:00:00',
    updatedDateTime: null,
  } as HostRole;

  beforeEach(async () => {
    allowedOperations.clear();
    for (const operation of ['Add', 'Update', 'Delete']) allowedOperations.add(operation);

    onClose$ = new Subject<unknown>();

    storeMock = {
      isOwnRole: vi.fn().mockReturnValue(false),
      reloadHostRoles: vi.fn(),
      setStatusFilter: vi.fn(),
      deleteHostRole: vi.fn(),
      toggleActive: vi.fn(),
      hostRoles: vi.fn().mockReturnValue([]),
      filteredHostRoles: vi.fn().mockReturnValue([]),
      statusFilter: vi.fn().mockReturnValue(null),
      isLoading: vi.fn().mockReturnValue(false),
    };
    dialogServiceMock = {
      open: vi.fn().mockReturnValue({ onClose: onClose$.asObservable(), close: vi.fn() }),
    };

    await TestBed.configureTestingModule({
      imports: [HostRoles],
      providers: [
        DatePipe,
        MessageService,
        ConfirmationService,
        provideRouter([]),
        // Permission gating is covered in the store spec; grant everything here.
        { provide: CurrentUserPermissionsStore, useValue: permissionsStoreMock },
      ],
    })
      .overrideComponent(HostRoles, {
        set: {
          providers: [{ provide: HostRolesStore, useValue: storeMock }],
        },
      })
      .overrideProvider(DialogService, { useValue: dialogServiceMock })
      .compileComponents();

    confirmSpy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');

    fixture = TestBed.createComponent(HostRoles);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('action menu', () => {
    it('should offer Permissions, Edit and Delete for a role the host does not own', () => {
      component['selectedRow'].set(hostRole);
      const labels = component['actionMenuItems']()
        .map((i) => i.label)
        .filter(Boolean);
      expect(labels).toEqual(['Permissions', 'Edit', 'Delete']);
    });

    it('Permissions command should navigate to the role permission page', () => {
      const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      component['selectedRow'].set(hostRole);
      component['actionMenuItems']().find((i) => i.label === 'Permissions')!.command!({});
      expect(navigateSpy).toHaveBeenCalledWith(['/app/platform-roles/permissions', hostRole.id]);
    });

    it('Delete command should request confirmation', () => {
      component['selectedRow'].set(hostRole);
      component['actionMenuItems']().find((i) => i.label === 'Delete')!.command!({});
      expect(confirmSpy).toHaveBeenCalled();
    });

    it('should hide Delete for the signed-in host own role', () => {
      storeMock.isOwnRole.mockReturnValue(true);
      component['selectedRow'].set(hostRole);
      const items = component['actionMenuItems']();
      expect(items.map((i) => i.label).filter(Boolean)).toEqual(['Permissions', 'Edit']);
      expect(items.some((i) => i.separator)).toBe(false);
    });
  });

  describe('toggleActive', () => {
    it('should confirm with the role name and delegate to the store on accept', () => {
      component.toggleActive(hostRole);
      const config = confirmSpy.mock.calls[0][0];
      expect(config.message).toContain('Support Agent');
      config.accept!();
      expect(storeMock.toggleActive).toHaveBeenCalledWith(hostRole);
    });
  });

  describe('createEditHostRole', () => {
    it('should open with Add header when no role', () => {
      component.createEditHostRole();
      expect(dialogServiceMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ header: 'Add Platform Role', data: { hostRole: undefined } }),
      );
    });

    it('should open with Update header when editing', () => {
      component.createEditHostRole(hostRole);
      expect(dialogServiceMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ header: 'Update Platform Role', data: { hostRole } }),
      );
    });

    it('should not reload when the dialog closes without a result', () => {
      component.createEditHostRole(hostRole);
      onClose$.next(undefined);
      expect(storeMock.reloadHostRoles).not.toHaveBeenCalled();
    });

    it('should reload after a successful save', () => {
      component.createEditHostRole(hostRole);
      onClose$.next({ isSucceeded: true });
      expect(storeMock.reloadHostRoles).toHaveBeenCalled();
    });
  });

  describe('confirmDeleteHostRole', () => {
    it('should confirm with the role name and delete on accept', () => {
      component.confirmDeleteHostRole(hostRole);
      const config = confirmSpy.mock.calls[0][0];
      expect(config.message).toContain('Support Agent');
      config.accept!();
      expect(storeMock.deleteHostRole).toHaveBeenCalledWith(hostRole);
    });
  });

  it('searchRoles should filter the table globally', () => {
    const dt = { filterGlobal: vi.fn() } as never;
    component.searchRoles(dt, 'support');
    expect((dt as { filterGlobal: ReturnType<typeof vi.fn> }).filterGlobal).toHaveBeenCalledWith(
      'support',
      'contains',
    );
  });

  it('onStatusChange should push the status into the store', () => {
    component.onStatusChange(false);
    expect(storeMock.setStatusFilter).toHaveBeenCalledWith(false);

    component.onStatusChange(null);
    expect(storeMock.setStatusFilter).toHaveBeenCalledWith(null);
  });

  it('drops the Actions column when the role has no row actions', () => {
    allowedOperations.clear();

    const denied = TestBed.createComponent(HostRoles);
    denied.detectChanges();
    const host = denied.nativeElement as HTMLElement;

    expect([...host.querySelectorAll('th')].some((th) => th.textContent?.includes('Actions'))).toBe(
      false,
    );
    expect(host.querySelector('tbody td')?.getAttribute('colspan')).toBe('4');
  });
});
