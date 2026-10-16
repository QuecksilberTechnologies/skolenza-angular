import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { vi } from 'vitest';

import { Common, RolesApi } from '@core/services';
import { IStaffMember, Role, UserRole } from '@shared/interfaces';

import { StaffMemberRoleCell } from './staffMember-role-cell';

function createUserRole(overrides: Partial<UserRole> = {}): UserRole {
  return {
    roleName: 'Developer',
    userRoleId: 1,
    roleId: 1,
    isActive: true,
    isPrimaryRole: false,
    roleType: 2,
    ...overrides,
  };
}

function createStaffMember(overrides: Partial<IStaffMember> = {}): IStaffMember {
  return {
    staffMemberId: 'emp-2',
    employementCode: 'AX-002',
    firstName: 'Asha',
    middleName: '',
    lastName: 'Rao',
    genderId: 2,
    genderName: 'Female',
    countryId: 1,
    nationality: 'Indian',
    dateOfBirth: '1995-01-01',
    dateOfOnBoarding: '2024-01-01',
    departmentId: 3,
    departmentName: 'Engineering',
    designationId: 4,
    designationName: 'Engineer',
    staffEmploymentTypeId: 1,
    staffEmploymentTypeName: 'Full Time',
    officialEmail: 'asha@skolenza.test',
    countryCode: '+91',
    isActive: true,
    completionPercentage: 80,
    hasImagePicUploaded: false,
    summaryStaffMemberInfo: {} as IStaffMember['summaryStaffMemberInfo'],
    isUpdatingStatus: false,
    ...overrides,
  };
}

describe('StaffMemberRoleCell', () => {
  let fixture: ComponentFixture<StaffMemberRoleCell>;

  /** The chip's derived view for one row. */
  const viewOf = (staffMember: IStaffMember, cachedRoles: Role[] = []) => {
    fixture.componentRef.setInput('staffMember', staffMember);
    fixture.componentRef.setInput('cachedRoles', cachedRoles);
    return fixture.componentInstance['view']();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberRoleCell],
      providers: [
        MessageService,
        { provide: RolesApi, useValue: { getRoleOptions: vi.fn(), getAllUserRoles: vi.fn() } },
        { provide: Common, useValue: { showMessage: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffMemberRoleCell);
    fixture.componentRef.setInput('staffMember', createStaffMember());
    fixture.componentRef.setInput('userStaffMemberId', 'emp-1');
  });

  it('shows the primary role name', () => {
    const view = viewOf(
      createStaffMember({
        userRoles: [
          createUserRole({ roleId: 1, roleName: 'Developer' }),
          createUserRole({ roleId: 2, roleName: 'Manager', isPrimaryRole: true }),
        ],
      }),
    );

    expect(view.displayName).toBe('Manager');
  });

  it('falls back to the only active role when there is no primary', () => {
    const view = viewOf(
      createStaffMember({
        userRoles: [
          createUserRole({ roleId: 1, roleName: 'Developer' }),
          createUserRole({ roleId: 2, roleName: 'Retired', isActive: false }),
        ],
      }),
    );

    expect(view.displayName).toBe('Developer');
  });

  it('shows no name when several active roles share no primary', () => {
    const view = viewOf(
      createStaffMember({
        userRoles: [
          createUserRole({ roleId: 1, roleName: 'Developer' }),
          createUserRole({ roleId: 2, roleName: 'Tester' }),
        ],
      }),
    );

    expect(view.displayName).toBe('');
  });

  it('names the first role the list payload assigned', () => {
    const view = viewOf(
      createStaffMember({
        assignedRoles: [
          { id: 24, code: 'STAFF_MEMBER', name: 'StaffMember', type: 'CUSTOM' },
          { id: 70, code: 'HR_MANAGER', name: 'HR Manager', type: 'CUSTOM' },
        ],
      }),
    );

    expect(view.displayName).toBe('StaffMember');
    expect(view.extraCount).toBe(1);
    expect(view.secondaryNames).toBe('HR Manager');
    expect(view.tooltip).toBe('StaffMember, HR Manager');
  });

  it('prefers a fresh assignment over the list payload roles', () => {
    const view = viewOf(
      createStaffMember({
        assignedRoles: [{ id: 24, code: 'STAFF_MEMBER', name: 'StaffMember', type: 'CUSTOM' }],
        userRoles: [createUserRole({ roleId: 2, roleName: 'Manager', isPrimaryRole: true })],
      }),
    );

    expect(view.displayName).toBe('Manager');
    expect(view.extraCount).toBe(0);
  });

  it('falls back to the flat roleName when there are no user roles', () => {
    expect(viewOf(createStaffMember({ roleName: 'Auditor' })).displayName).toBe('Auditor');
  });

  it('resolves the summary role id against the cached role options', () => {
    const view = viewOf(
      createStaffMember({
        summaryStaffMemberInfo: { roleId: 9 } as IStaffMember['summaryStaffMemberInfo'],
      }),
      [{ id: 9, roleName: 'Support', roleType: 2, roleTypeName: 'StaffMember', isActive: true }],
    );

    expect(view.displayName).toBe('Support');
  });

  it('counts the roles beyond the primary one', () => {
    const view = viewOf(
      createStaffMember({
        userRoles: [
          createUserRole({ roleId: 1, isPrimaryRole: true }),
          createUserRole({ roleId: 2 }),
          createUserRole({ roleId: 3 }),
          createUserRole({ roleId: 4, isActive: false }),
        ],
      }),
    );

    expect(view.extraCount).toBe(2);
  });

  it('counts every active role when there is no primary', () => {
    const view = viewOf(
      createStaffMember({
        userRoles: [createUserRole({ roleId: 1 }), createUserRole({ roleId: 2 })],
      }),
    );

    expect(view.extraCount).toBe(2);
  });

  it('does not count a lone role as extra', () => {
    const view = viewOf(
      createStaffMember({ userRoles: [createUserRole({ roleId: 1, isPrimaryRole: true })] }),
    );

    expect(view.extraCount).toBe(0);
  });

  it('lists the active secondary role names', () => {
    const view = viewOf(
      createStaffMember({
        userRoles: [
          createUserRole({ roleId: 1, roleName: 'Manager', isPrimaryRole: true }),
          createUserRole({ roleId: 2, roleName: 'Reviewer' }),
          createUserRole({ roleId: 3, roleName: 'Retired', isActive: false }),
        ],
      }),
    );

    expect(view.secondaryNames).toBe('Reviewer');
  });

  it('invites the user to assign roles when there are none', () => {
    expect(viewOf(createStaffMember()).tooltip).toBe('Click to assign roles');
  });

  it('lists the assigned roles in the tooltip', () => {
    const view = viewOf(
      createStaffMember({
        userRoles: [
          createUserRole({ roleId: 1, roleName: 'Manager', isPrimaryRole: true }),
          createUserRole({ roleId: 2, roleName: 'Reviewer' }),
        ],
      }),
    );

    expect(view.tooltip).toBe('Manager, Reviewer');
  });
});
