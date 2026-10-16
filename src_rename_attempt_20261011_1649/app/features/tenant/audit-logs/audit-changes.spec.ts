import { auditChanges, humanize } from './audit-changes';

describe('auditChanges', () => {
  it('lists after-only fields and drops empty ones', () => {
    expect(auditChanges(null, '{"Comments": null, "PolicyStatusId": 3}')).toEqual([
      { key: 'PolicyStatusId', field: 'Policy Status Id', before: null, after: '3' },
    ]);
  });

  it('keeps before and after for changed fields, drops unchanged ones', () => {
    expect(auditChanges('{"StatusId": 2, "Name": "A"}', '{"StatusId": 4, "Name": "A"}')).toEqual([
      { key: 'StatusId', field: 'Status Id', before: '2', after: '4' },
    ]);
  });

  it('reads malformed or non-object payloads as empty', () => {
    expect(auditChanges('{oops', '[1, 2]')).toEqual([]);
  });

  it('stringifies object values', () => {
    expect(auditChanges(null, '{"Rules": {"max": 2}}')).toEqual([
      { key: 'Rules', field: 'Rules', before: null, after: '{"max":2}' },
    ]);
  });
});

describe('humanize', () => {
  it('splits camel and Pascal case into capitalised words', () => {
    expect(humanize('policyStatusId')).toBe('Policy Status Id');
    expect(humanize('PolicyVersion2Id')).toBe('Policy Version2 Id');
  });
});
