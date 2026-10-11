import { summariseInstitutionDeleteImpact } from './institution-delete-impact';

describe('summariseInstitutionDeleteImpact', () => {
  it('reads a flat object of counts', () => {
    expect(summariseInstitutionDeleteImpact({ staffMemberCount: 12, roles: 3 })).toBe(
      '12 staff members, 3 roles',
    );
  });

  it('reads a list of labelled counts', () => {
    expect(
      summariseInstitutionDeleteImpact([
        { label: 'StaffMembers', count: 2 },
        { name: 'departmentCount', count: 1 },
      ]),
    ).toBe('2 staff members, 1 department');
  });

  it('singularises a count of one', () => {
    expect(summariseInstitutionDeleteImpact({ roles: 1 })).toBe('1 role');
  });

  it('skips zero and negative counts', () => {
    expect(summariseInstitutionDeleteImpact({ staffMembers: 0, roles: 2 })).toBe('2 roles');
  });

  // A shape nobody recognises must leave the caller on its generic warning, not invent a number.
  it('returns null for an empty, absent or unreadable payload', () => {
    expect(summariseInstitutionDeleteImpact(null)).toBeNull();
    expect(summariseInstitutionDeleteImpact({})).toBeNull();
    expect(summariseInstitutionDeleteImpact([])).toBeNull();
    expect(summariseInstitutionDeleteImpact({ note: 'deletes everything' })).toBeNull();
    expect(summariseInstitutionDeleteImpact([{ label: 'StaffMembers' }])).toBeNull();
  });
});
