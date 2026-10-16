export interface AuditChange {
  /** The raw payload key, unique per row; `field` is its display label. */
  key: string;
  field: string;
  before: string | null;
  after: string | null;
}

/**
 * Turns an audit row's `beforeData` / `afterData` JSON strings into the fields that changed.
 * Fields empty on both sides, or equal on both, are dropped. A payload that is not a JSON object
 * reads as empty, so a malformed row shows no details instead of breaking the grid.
 */
export function auditChanges(beforeData: string | null, afterData: string | null): AuditChange[] {
  const before = parseObject(beforeData);
  const after = parseObject(afterData);
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];

  return fields
    .map((key) => ({
      key,
      field: humanize(key),
      before: formatValue(before[key]),
      after: formatValue(after[key]),
    }))
    .filter((change) => change.after !== change.before);
}

function parseObject(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** `PolicyStatusId` -> `Policy Status Id`. */
export function humanize(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (first) => first.toUpperCase());
}
