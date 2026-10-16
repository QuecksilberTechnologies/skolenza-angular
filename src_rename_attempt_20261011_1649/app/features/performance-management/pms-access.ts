/** Role helpers for in-page PMS gating. roleTypeId: 0=Host, 1=Admin, 2=StaffMember, 3=Manager. */
export const PmsRole = { Host: 0, Admin: 1, StaffMember: 2, Manager: 3 } as const;

export const isHrAdmin = (role: number): boolean => role === PmsRole.Admin;
export const isManager = (role: number): boolean => role === PmsRole.Manager;
export const isStaffMember = (role: number): boolean => role === PmsRole.StaffMember;

/** HR/Admin or Manager — may manage other people's records. */
export const canManageTeam = (role: number): boolean =>
  role === PmsRole.Admin || role === PmsRole.Manager;
