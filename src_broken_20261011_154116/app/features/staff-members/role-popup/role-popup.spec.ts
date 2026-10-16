import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, RolesApi } from '@core/services';
import { IStaffMember, Role, UserRole } from '@shared/interfaces';

import { RolePopup } from './role-popup';

function createRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 1,
    roleName: 'StaffMember',
    roleType: 2,
    roleTypeName: 'StaffMember',
    isActive: true,
    ...overrides,
  };
}

function createUserRole(overrides: Partial<UserRole> = {}): UserRole {
  return {
    roleName: 'StaffMember',
    userRoleId: 1,
    roleId: 1,
    isActive: true,
    isPrimaryRole: false,
    roleType: 2,
    ...overrides,
  };
}

const staffMember = { staffMemberId: 'emp-1', firstName: 'Asha' } as IStaffMember;

describe('RolePopup', () => {
  let fixture: ComponentFixture<RolePopup>;

  /** Loads the popup with the roles on offer and the ones the staffMember already holds. */
  const open = (roles: Role[], userRoles: UserRole[]) => {
    const rolesApi = TestBed.inject(RolesApi) as unknown as {
      getRoleOptions: ReturnType<typeof vi.fn>;
      getAllUserRoles: ReturnType<typeof vi.fn>;
    };
    rolesApi.getRoleOptions.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: roles }),
    );
    rolesApi.getAllUserRoles.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: userRoles }),
    );

    fixture.componentRef.setInput('staffMember', staffMember);
    fixture.componentRef.setInput('userStaffMemberId', 'emp-9');
    fixture.detectChanges();

    return fixture.componentInstance;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolePopup],
      providers: [
        MessageService,
        {
          provide: RolesApi,
          useValue: { getRoleOptions: vi.fn(), getAllUserRoles: vi.fn() },
        },
        { provide: Common, useValue: { showMessage: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolePopup);
  });

  it('recognises Super Admin however the institution spells it', () => {
    const popup = open(
      [createRole({ id: 5, roleName: 'Super-Admin', roleType: 1 }), createRole()],
      [createUserRole({ roleId: 5, roleName: 'Super-Admin', roleType: 1 })],
    );

    expect(popup.hasSuperAdminSelected()).toBe(true);
    expect(popup.isMultiSelectAllowed()).toBe(false);
  });

  it('reports itself read-only when every role is locked', () => {
    const popup = open(
      [createRole({ id: 5, roleName: 'Super-Admin', roleType: 1 }), createRole()],
      [createUserRole({ roleId: 5, roleName: 'Super-Admin', roleType: 1, isPrimaryRole: true })],
    );

    expect(popup.isReadOnly()).toBe(true);
  });

  it('stays editable while a role can still be picked', () => {
    const popup = open(
      [createRole(), createRole({ id: 2, roleName: 'HR Manager' })],
      [createUserRole()],
    );

    expect(popup.isReadOnly()).toBe(false);
  });

  it('keeps only the active roles for the read-only view', () => {
    const popup = open(
      [createRole({ id: 5, roleName: 'Super-Admin', roleType: 1 })],
      [
        createUserRole({ roleId: 5, roleName: 'Super-Admin', roleType: 1, isPrimaryRole: true }),
        createUserRole({ roleId: 6, roleName: 'Retired', isActive: false }),
      ],
    );

    expect(popup.heldRoles().map((role) => role.roleName)).toEqual(['Super-Admin']);
  });

  it('explains why Save is off', () => {
    const popup = open([createRole()], [createUserRole()]);
    expect(popup.saveHint()).toBe('No changes to save');

    popup.onToggleRole(createRole());
    expect(popup.saveHint()).toBe('Select at least one role');
  });

  it('drops the hint once the selection has changed', () => {
    const popup = open([createRole(), createRole({ id: 2, roleName: 'HR Manager' })], []);

    popup.onToggleRole(createRole({ id: 2, roleName: 'HR Manager' }));

    expect(popup.saveHint()).toBe('');
  });
});
