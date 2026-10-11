import { describe, expect, it } from 'vitest';

import { InstitutionPolicyRuleSettingDefinition } from '@shared/interfaces';

import {
  calculateAccrualAmountPerCycle,
  parseRuleSettings,
  ruleSettingValueError,
  serializeRuleSettings,
  synchronizeAccrualAmount,
} from './rule-settings';

describe('accrual calculation', () => {
  it.each([
    [12, 'MONTHLY', 1],
    [18, 'MONTHLY', 1.5],
    [20, 'MONTHLY', 1.666667],
    [20, 'QUARTERLY', 5],
    [20, 'YEARLY', 20],
  ])('derives %s annual at %s frequency as %s per cycle', (annual, frequency, expected) => {
    expect(calculateAccrualAmountPerCycle(annual, frequency)).toBe(expected);
  });

  it('replaces a manually supplied cycle amount with the calculated value', () => {
    expect(
      synchronizeAccrualAmount([
        { key: 'annualEntitlement', value: 20 },
        { key: 'frequency', value: 'QUARTERLY' },
        { key: 'amountPerCycle', value: 999 },
      ]),
    ).toEqual([
      { key: 'annualEntitlement', value: 20 },
      { key: 'frequency', value: 'QUARTERLY' },
      { key: 'amountPerCycle', value: 5 },
    ]);
  });
});

describe('serializeRuleSettings', () => {
  it('keeps numbers and booleans typed and quotes plain text', () => {
    const json = serializeRuleSettings([
      { key: 'days', value: '12' },
      { key: 'unit', value: 'DAY' },
      { key: 'carryForward', value: 'true' },
    ]);

    expect(JSON.parse(json)).toEqual({ days: 12, unit: 'DAY', carryForward: true });
  });

  it('keeps nested JSON and falls back to text when it is malformed', () => {
    const json = serializeRuleSettings([
      { key: 'months', value: '[1,2]' },
      { key: 'note', value: '{oops' },
    ]);

    expect(JSON.parse(json)).toEqual({ months: [1, 2], note: '{oops' });
  });

  it('saves no settings as an empty object', () => {
    expect(serializeRuleSettings([])).toBe('{}');
  });
});

describe('parseRuleSettings', () => {
  it.each([
    '{"days":12,"unit":"DAY","months":[1,2]}',
    '{"days":"12","flag":"true","empty":"","padded":" x "}',
    '{}',
  ])('round-trips %s', (stored) => {
    expect(serializeRuleSettings(parseRuleSettings(stored))).toBe(stored);
  });

  it('shows a string that looks like another type in quotes', () => {
    expect(parseRuleSettings('{"days":"12"}')).toEqual([{ key: 'days', value: '"12"' }]);
  });

  it('yields no rows when the stored text is not an object', () => {
    expect(parseRuleSettings('[1]')).toEqual([]);
    expect(parseRuleSettings('not json')).toEqual([]);
  });
});

describe('ruleSettingValueError', () => {
  const definition = (
    overrides: Partial<InstitutionPolicyRuleSettingDefinition> = {},
  ): InstitutionPolicyRuleSettingDefinition => ({
    code: 'days',
    name: 'Days',
    dataTypeCode: 'INTEGER',
    isRequired: false,
    allowMultiple: false,
    order: 1,
    options: [],
    dependencies: [],
    ...overrides,
  });

  it('reports a setting the rule type no longer defines', () => {
    expect(ruleSettingValueError(undefined, 1)).toBe(
      'The selected rule setting is no longer available.',
    );
  });

  it('requires a value only when the definition does', () => {
    expect(ruleSettingValueError(definition({ isRequired: true }), '  ')).toBe('Days is required.');
    expect(ruleSettingValueError(definition(), [])).toBeUndefined();
  });

  it('checks the data type, range and format', () => {
    expect(ruleSettingValueError(definition(), 1.5)).toBe('Days has an invalid value.');
    expect(ruleSettingValueError(definition({ minimumValue: 1, maximumValue: 30 }), 31)).toBe(
      'Days must be between 1 and 30.',
    );
    expect(
      ruleSettingValueError(definition({ dataTypeCode: 'STRING', regexPattern: '^[A-Z]+$' }), 'ab'),
    ).toBe('Days has an invalid format.');
    expect(ruleSettingValueError(definition({ minimumValue: 1 }), 5)).toBeUndefined();
    expect(
      ruleSettingValueError(
        definition({ minimumValue: 0, maximumValue: null as unknown as number }),
        30,
      ),
    ).toBeUndefined();
  });

  it('rejects a data type it does not know, even one named like an Object member', () => {
    const unknownType = {
      dataTypeCode: 'toString',
    } as unknown as InstitutionPolicyRuleSettingDefinition;
    expect(ruleSettingValueError(definition(unknownType), 1)).toBe('Days has an invalid value.');
  });

  it('accepts only listed options, every one of them when several are allowed', () => {
    const options = [
      { code: 'WEB', label: 'Web', valueJson: '"WEB"', order: 1 },
      { code: 'MOBILE', label: 'Mobile', valueJson: '"MOBILE"', order: 2 },
    ];
    const multi = definition({ dataTypeCode: 'CODE', allowMultiple: true, options });

    expect(ruleSettingValueError(multi, ['WEB', 'MOBILE'])).toBeUndefined();
    expect(ruleSettingValueError(multi, ['WEB', 'FAX'])).toBe(
      'Days contains an unsupported selection.',
    );
    expect(ruleSettingValueError(multi, 'WEB')).toBe('Days requires one or more selections.');
  });
});
