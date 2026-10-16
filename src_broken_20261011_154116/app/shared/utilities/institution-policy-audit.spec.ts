import { describe, expect, it } from 'vitest';

import { institutionPolicyAuditActorName, institutionPolicyAuditVersion } from './institution-policy-audit';

describe('institutionPolicyAuditActorName', () => {
  it('uses the staffMember name resolved by the audit API', () => {
    expect(institutionPolicyAuditActorName({ changedById: 14, changedByName: 'Anil Gupta' })).toBe(
      'Anil Gupta',
    );
  });

  it.each([null, '', '   '])('falls back to the numeric actor for name %p', (changedByName) => {
    expect(institutionPolicyAuditActorName({ changedById: 14, changedByName })).toBe('StaffMember 14');
  });
});

describe('institutionPolicyAuditVersion', () => {
  const current = { id: 7, number: 3 };

  it('uses the version number returned by the audit API', () => {
    expect(institutionPolicyAuditVersion({ policyVersionId: 5, versionNumber: 2 }, current)).toEqual({
      label: 'v2',
      isRawId: false,
    });
  });

  it('keeps a version number of 0', () => {
    expect(institutionPolicyAuditVersion({ policyVersionId: 5, versionNumber: 0 }, null)).toEqual({
      label: 'v0',
      isRawId: false,
    });
  });

  it.each([null, undefined])(
    'maps the current version id to its number when versionNumber is %p',
    (versionNumber) => {
      expect(
        institutionPolicyAuditVersion(
          { policyVersionId: 7, versionNumber: versionNumber as number | null },
          current,
        ),
      ).toEqual({ label: 'v3', isRawId: false });
    },
  );

  it('falls back to the raw id for an older version', () => {
    expect(institutionPolicyAuditVersion({ policyVersionId: 5, versionNumber: null }, current)).toEqual({
      label: 'ID 5',
      isRawId: true,
    });
  });

  it('returns null for a row that is not version specific', () => {
    expect(institutionPolicyAuditVersion({ policyVersionId: null, versionNumber: null }, current)).toBe(
      null,
    );
  });
});
