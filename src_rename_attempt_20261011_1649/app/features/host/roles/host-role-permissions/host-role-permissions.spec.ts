import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common } from '@core/services/common';
import { CurrentUserPermissionsStore } from '@core/stores';

import HostRolePermissions from './host-role-permissions';
import { HostRolePermissionsStore } from './host-role-permissions.store';

const permissionsStoreMock = { canPerform: () => true };

describe('HostRolePermissions', () => {
  let component: HostRolePermissions;
  let fixture: ComponentFixture<HostRolePermissions>;

  type Spy = ReturnType<typeof vi.fn>;
  let storeMock: {
    loadHostRole: Spy;
    loadPermissions: Spy;
    savePermissions: Spy;
    hostRole: Spy;
    hostModules: Spy;
    rolePermissions: Spy;
    isLoadingRole: Spy;
    isLoadingPermissions: Spy;
    isSaving: Spy;
  };
  let breadcrumbSpy: Spy;

  beforeEach(async () => {
    storeMock = {
      loadHostRole: vi.fn(),
      loadPermissions: vi.fn(),
      savePermissions: vi.fn(),
      hostRole: vi.fn().mockReturnValue({ id: 3, name: 'Billing Admin' }),
      hostModules: vi.fn().mockReturnValue([]),
      rolePermissions: vi.fn().mockReturnValue([]),
      isLoadingRole: vi.fn().mockReturnValue(false),
      isLoadingPermissions: vi.fn().mockReturnValue(false),
      isSaving: vi.fn().mockReturnValue(false),
    };
    breadcrumbSpy = vi.fn();

    await TestBed.configureTestingModule({
      imports: [HostRolePermissions],
      providers: [
        MessageService,
        { provide: ActivatedRoute, useValue: { params: of({ hostRoleId: '3' }) } },
        { provide: CurrentUserPermissionsStore, useValue: permissionsStoreMock },
        {
          provide: Common,
          useValue: {
            showMessage: () => {},
            setPageHeaderInfo: () => {},
            setBreadcrumbItems: breadcrumbSpy,
            resetBreadcrumbItems: () => {},
          },
        },
      ],
    })
      .overrideComponent(HostRolePermissions, {
        set: { providers: [{ provide: HostRolePermissionsStore, useValue: storeMock }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(HostRolePermissions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should read the host role id from the route', () => {
    expect(component.hostRoleId()).toBe(3);
  });

  it('should load the role and its permissions on init', () => {
    expect(storeMock.loadHostRole).toHaveBeenCalledWith(3);
    expect(storeMock.loadPermissions).toHaveBeenCalledWith(3);
  });

  it('should breadcrumb back to the host roles list', () => {
    const items = breadcrumbSpy.mock.calls.at(-1)![0];
    expect(items[0]).toEqual({ label: 'Platform Roles', routerLink: '/app/platform-roles' });
    expect(items[1].label).toContain('Billing Admin');
  });

  it('should save with the host role id', () => {
    const payload = { modules: [] };
    component.onSavePermissions(payload);
    expect(storeMock.savePermissions).toHaveBeenCalledWith(3, payload, expect.any(Function));
  });

  it('canDeactivate should be true when the matrix has no unsaved changes', () => {
    expect(component.canDeactivate()).toBe(true);
  });
});
