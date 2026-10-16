import { describe, expect, it } from 'vitest';

import { applicabilityStaffMemberTarget, targetsSavedStaffMember } from './applicability-staffMember';

describe('applicabilityStaffMemberTarget', () => {
  it('sends a saved numeric id back unchanged when no staffMember is picked', () => {
    const row = { staffMemberPublicId: null, savedStaffMemberId: 123 };

    expect(targetsSavedStaffMember(row)).toBe(true);
    expect(applicabilityStaffMemberTarget(row)).toEqual({ staffMemberId: 123, staffMemberPublicId: null });
  });

  it('sends only the encoded id once an staffMember is picked', () => {
    const row = { staffMemberPublicId: 'enc-1', savedStaffMemberId: 123 };

    expect(targetsSavedStaffMember(row)).toBe(false);
    expect(applicabilityStaffMemberTarget(row)).toEqual({
      staffMemberId: null,
      staffMemberPublicId: 'enc-1',
    });
  });

  it('sends no target for an empty row', () => {
    expect(applicabilityStaffMemberTarget({ staffMemberPublicId: null, savedStaffMemberId: null })).toEqual({
      staffMemberId: null,
      staffMemberPublicId: null,
    });
  });

  it('treats a blank encoded id as no pick, never sending both ids', () => {
    expect(applicabilityStaffMemberTarget({ staffMemberPublicId: '', savedStaffMemberId: 123 })).toEqual({
      staffMemberId: 123,
      staffMemberPublicId: null,
    });
    expect(applicabilityStaffMemberTarget({ staffMemberPublicId: '', savedStaffMemberId: null })).toEqual({
      staffMemberId: null,
      staffMemberPublicId: null,
    });
  });
});
