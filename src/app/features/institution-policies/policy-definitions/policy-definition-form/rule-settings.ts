import { InstitutionPolicyRuleSettingDefinition } from '@shared/interfaces';

export type RuleSettingValue = string | number | boolean | string[] | number[] | null;

/** One key of a rule's `ruleConfiguration` JSON object, rendered from API metadata. */
export interface RuleSettingRow {
  key: string;
  value: RuleSettingValue;
}

export const newRuleSettingRow = (): RuleSettingRow => ({ key: '', value: '' });

const ACCRUAL_CYCLES: Readonly<Record<string, number>> = {
  MONTHLY: 12,
  QUARTERLY: 4,
  YEARLY: 1,
};

/** Calculates the recurring credit from the yearly entitlement. The leave ledger must credit the
 *  remaining balance in the final cycle so rounding can never change the yearly total. */
export function calculateAccrualAmountPerCycle(
  annualEntitlement: number,
  frequency: string,
): number | null {
  const cycles = ACCRUAL_CYCLES[frequency.trim().toUpperCase()];
  if (!Number.isFinite(annualEntitlement) || annualEntitlement <= 0 || !cycles) return null;
  return Number((annualEntitlement / cycles).toFixed(6));
}

/** Returns an Accrual settings row set whose derived amount matches its authoritative inputs. */
export function synchronizeAccrualAmount(settings: RuleSettingRow[]): RuleSettingRow[] {
  const annual = settings.find((setting) => setting.key === 'annualEntitlement')?.value;
  const frequency = settings.find((setting) => setting.key === 'frequency')?.value;
  const amount =
    typeof annual === 'number' && typeof frequency === 'string'
      ? calculateAccrualAmountPerCycle(annual, frequency)
      : null;
  const current = settings.find((setting) => setting.key === 'amountPerCycle')?.value;
  if (current === amount) return settings;

  return settings.map((setting) =>
    setting.key === 'amountPerCycle' ? { ...setting, value: amount } : setting,
  );
}

/** Text that reads as a JSON number, boolean, `null`, quoted string, object or array. Anything
 *  else is saved as a plain string, so `12` saves as `12` and `DAY` as `"DAY"` without the user
 *  typing quotes. */
const JSON_LITERAL = /^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null|["[{].*)$/s;

function toJsonValue(raw: string): unknown {
  const text = raw.trim();
  if (!JSON_LITERAL.test(text)) return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function parseRuleSettingValue(valueJson: string | null | undefined): RuleSettingValue {
  if (!valueJson) return null;
  try {
    const value: unknown = JSON.parse(valueJson);
    return isRuleSettingValue(value) ? value : null;
  } catch {
    return null;
  }
}

function isRuleSettingValue(value: unknown): value is RuleSettingValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    (Array.isArray(value) && value.every((item) => typeof item === 'string')) ||
    (Array.isArray(value) && value.every((item) => typeof item === 'number'))
  );
}

/** A string is shown bare unless bare text would save back as another type (`"12"`, `"true"`),
 *  in which case it keeps its quotes. Non-strings are shown as JSON. */
function toDisplayText(value: unknown): string {
  if (typeof value === 'string' && toJsonValue(value) === value) return value;
  return JSON.stringify(value);
}

/** Rows to the JSON object string the API expects. */
export function serializeRuleSettings(rows: RuleSettingRow[]): string {
  return JSON.stringify(
    Object.fromEntries(
      rows.map((row) => [
        row.key.trim(),
        typeof row.value === 'string' ? toJsonValue(row.value) : row.value,
      ]),
    ),
  );
}

/** The API's JSON object string back to rows; round-trips through {@link serializeRuleSettings}.
 *  The backend only stores objects, so anything else yields no rows. */
export function parseRuleSettings(json: string): RuleSettingRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
  return Object.entries(parsed).map(([key, value]) => ({
    key,
    value: typeof value !== 'string' && isRuleSettingValue(value) ? value : toDisplayText(value),
  }));
}

const DATA_TYPE_CHECKS: Record<string, (item: unknown) => boolean> = {
  BOOLEAN: (item) => typeof item === 'boolean',
  INTEGER: (item) => Number.isInteger(item),
  DECIMAL: (item) => typeof item === 'number' && Number.isFinite(item),
  STRING: (item) => typeof item === 'string',
  CODE: (item) => typeof item === 'string',
};

const isBlankSettingValue = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

/** Checks one setting's value against its API definition; `undefined` when it is valid. A missing
 *  definition means the setting no longer exists for the selected rule type. */
export function ruleSettingValueError(
  definition: InstitutionPolicyRuleSettingDefinition | undefined,
  value: unknown,
): string | undefined {
  if (!definition) return 'The selected rule setting is no longer available.';
  if (isBlankSettingValue(value)) {
    return definition.isRequired ? `${definition.name} is required.` : undefined;
  }
  if (definition.allowMultiple && !Array.isArray(value)) {
    return `${definition.name} requires one or more selections.`;
  }

  const items: unknown[] = Array.isArray(value) && definition.allowMultiple ? value : [value];
  const optionKeys = definition.options.map((option) =>
    JSON.stringify(parseRuleSettingValue(option.valueJson)),
  );

  for (const item of items) {
    const message = settingItemError(definition, item, optionKeys);
    if (message) return message;
  }
  return undefined;
}

function settingItemError(
  definition: InstitutionPolicyRuleSettingDefinition,
  item: unknown,
  optionKeys: string[],
): string | undefined {
  const { name, minimumValue, maximumValue, regexPattern } = definition;

  const matchesDataType =
    Object.hasOwn(DATA_TYPE_CHECKS, definition.dataTypeCode) &&
    DATA_TYPE_CHECKS[definition.dataTypeCode](item);
  if (!matchesDataType) return `${name} has an invalid value.`;
  if (
    typeof item === 'number' &&
    ((minimumValue != null && item < minimumValue) || (maximumValue != null && item > maximumValue))
  ) {
    return `${name} must be between ${minimumValue ?? 'the minimum'} and ${maximumValue ?? 'the maximum'}.`;
  }
  if (typeof item === 'string' && regexPattern && !new RegExp(regexPattern).test(item)) {
    return `${name} has an invalid format.`;
  }
  if (optionKeys.length > 0 && !optionKeys.includes(JSON.stringify(item))) {
    return `${name} contains an unsupported selection.`;
  }
  return undefined;
}
