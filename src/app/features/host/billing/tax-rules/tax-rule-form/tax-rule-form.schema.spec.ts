import { describe, expect, it } from 'vitest';

import { TaxRuleFormModel, taxRuleFormSchema } from './tax-rule-form.schema';

const valid: TaxRuleFormModel = {
  countryCode: 'IN',
  taxCode: 'GST',
  taxName: 'Goods and Services Tax',
  ratePercent: 18,
  effectiveFrom: new Date(2026, 9, 1),
  effectiveTo: null,
  isActive: true,
  configurationJson: '',
};

const messages = (model: TaxRuleFormModel) => {
  const result = taxRuleFormSchema.safeParse(model);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('taxRuleFormSchema', () => {
  it('accepts a rule with no configuration', () => {
    expect(messages(valid)).toEqual([]);
  });

  it('requires the code, name, rate and start date', () => {
    expect(
      messages({ ...valid, taxCode: ' ', taxName: '', ratePercent: null, effectiveFrom: null }),
    ).toEqual([
      'Tax code is required',
      'Tax name is required',
      'Rate is required',
      'Effective from is required',
    ]);
  });

  it('bounds the rate to 0-100', () => {
    expect(messages({ ...valid, ratePercent: 101 })).toEqual(['Rate cannot exceed 100%']);
    expect(messages({ ...valid, ratePercent: -1 })).toEqual(['Rate cannot be negative']);
  });

  it('enforces the backend length limits', () => {
    expect(messages({ ...valid, taxCode: 'X'.repeat(31), taxName: 'Y'.repeat(101) })).toEqual([
      'Tax code cannot exceed 30 characters',
      'Tax name cannot exceed 100 characters',
    ]);
  });

  it('accepts valid JSON and rejects anything else', () => {
    expect(
      messages({ ...valid, configurationJson: '{"intraStateComponents":["CGST","SGST"]}' }),
    ).toEqual([]);
    expect(messages({ ...valid, configurationJson: '{not json' })).toEqual([
      'Configuration must be valid JSON',
    ]);
  });

  it('rejects an end date before the start date, on the end date', () => {
    const result = taxRuleFormSchema.safeParse({ ...valid, effectiveTo: new Date(2026, 8, 30) });

    expect(result.error?.issues[0]).toMatchObject({ path: ['effectiveTo'] });
  });
});
