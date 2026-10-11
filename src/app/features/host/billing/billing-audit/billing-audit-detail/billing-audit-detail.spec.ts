import { formatAuditMetadata } from './billing-audit-detail';

describe('formatAuditMetadata', () => {
  it('re-indents valid JSON', () => {
    expect(formatAuditMetadata('{"amount":250,"currency":"INR"}')).toBe(
      '{\n  "amount": 250,\n  "currency": "INR"\n}',
    );
  });

  it('shows invalid JSON verbatim rather than dropping it', () => {
    expect(formatAuditMetadata('not json {')).toBe('not json {');
  });

  it('returns null when there is nothing to show', () => {
    expect(formatAuditMetadata(null)).toBeNull();
    expect(formatAuditMetadata('   ')).toBeNull();
  });
});
