import { canManageTeam, isStaffMember, isHrAdmin, isManager, PmsRole } from './pms-access';

describe('pms-access', () => {
  it('classifies each role id', () => {
    expect(isHrAdmin(PmsRole.Admin)).toBe(true);
    expect(isManager(PmsRole.Manager)).toBe(true);
    expect(isStaffMember(PmsRole.StaffMember)).toBe(true);
    expect(isStaffMember(PmsRole.Manager)).toBe(false);
  });

  it('canManageTeam true for HR/Admin and Manager only', () => {
    expect(canManageTeam(PmsRole.Admin)).toBe(true);
    expect(canManageTeam(PmsRole.Manager)).toBe(true);
    expect(canManageTeam(PmsRole.StaffMember)).toBe(false);
    expect(canManageTeam(PmsRole.Host)).toBe(false);
  });
});
